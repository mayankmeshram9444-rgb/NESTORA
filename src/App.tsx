import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { Header } from './components/Header';
import { Sidebar, TabKey } from './components/Sidebar';
import { DashboardTab } from './components/DashboardTab';
import { ResidentReceiptTab } from './components/ResidentReceiptTab';
import { ComplaintBoxTab } from './components/ComplaintBoxTab';
import { AgreementDetailsTab } from './components/AgreementDetailsTab';
import { ComparisonTab } from './components/ComparisonTab';
import { AiAssistantTab } from './components/AiAssistantTab';
import { ApartmentExplorerTab } from './components/ApartmentExplorerTab';
import { LoginPage } from './components/LoginPage';
import { OwnerPortal } from './components/OwnerPortal';
import { NewCaseModal } from './components/NewCaseModal';
import { NoticeGeneratorModal } from './components/NoticeGeneratorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { INITIAL_CASES, EMPTY_CASE_PLACEHOLDER } from './data/mockData';
import {
  PgCase,
  RoomComparison,
  UserSession,
  PaymentTransaction,
  ComplaintItem,
  LandownerProfile,
  TenantApplication,
} from './types';
import {
  exportCaseData,
  sendAutomatedComplaintEmailToOwner,
} from './services/legalService';
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
  signInWithGooglePopup,
  signOutFirebase,
  saveProfileToFirestore,
  saveCaseToFirestore,
  deleteCaseFromFirestore,
} from './firebase';
import {
  LayoutDashboard,
  Receipt,
  Layers,
  MessageSquareWarning,
  FileText,
  Sparkles,
  Building2,
  Compass,
} from 'lucide-react';

const STORAGE_CASES_KEY = 'nestora_v16_clean_real_cases';
const STORAGE_PROFILE_KEY = 'nestora_v16_clean_real_profile';

const DEFAULT_LANDOWNER_PROFILE: LandownerProfile = {
  fullName: '',
  email: '',
  mobile: '',
  residentialAddress: '',
  preferredLanguage: 'English',
  preferredLanguages: ['English'],
  aboutYou: '',
  photoUrl: undefined,
  vacantUnits: 0,
};

export default function App() {
  const [cases, setCases] = useState<PgCase[]>(() => {
    try {
      // Remove all legacy keys that held fake/sample data
      [
        'nestora_landowner_cases_v8',
        'rentproof_landowner_profile_v1',
        'nestora_clean_cases_v9',
        'nestora_clean_profile_v9',
        'nestora_v11_cases',
        'nestora_v11_profile',
        'nestora_v14_multi_owner_cases',
        'nestora_v14_multi_owner_profile',
        'nestora_v15_cases',
      ].forEach((k) => localStorage.removeItem(k));

      const saved = localStorage.getItem(STORAGE_CASES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved cases:', e);
    }
    return INITIAL_CASES;
  });

  const [landownerProfile, setLandownerProfile] = useState<LandownerProfile>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
        if (saved) {
          return { ...DEFAULT_LANDOWNER_PROFILE, ...JSON.parse(saved) };
        }
      } catch (e) {
        console.error('Error loading landowner profile:', e);
      }
      return DEFAULT_LANDOWNER_PROFILE;
    }
  );

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string>(() => {
    return cases[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [isNoticeGenOpen, setIsNoticeGenOpen] = useState(false);
  const [openOwnerProfileFlag, setOpenOwnerProfileFlag] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const casesRef = useRef<PgCase[]>(cases);
  casesRef.current = cases;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const [cloudSyncedAt, setCloudSyncedAt] = useState<string | null>(null);
  const lastRevisionRef = useRef<number>(0);
  const hasInitialBootSyncRef = useRef<boolean>(false);
  const profileRef = useRef<LandownerProfile>(landownerProfile);
  profileRef.current = landownerProfile;

  const handleForceSyncNow = async () => {
    try {
      if (casesRef.current.length > 0) {
        await fetch('/api/sync/cases-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cases: casesRef.current }),
        });
      }
      if (
        profileRef.current.fullName ||
        profileRef.current.email ||
        profileRef.current.mobile
      ) {
        await fetch('/api/sync/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: profileRef.current }),
        });
      }
      const res = await fetch('/api/sync/state');
      if (res.ok) {
        const data = await res.json();
        if (data.revision) {
          lastRevisionRef.current = data.revision;
        }
        if (data.updatedAt) {
          setCloudSyncedAt(data.updatedAt);
        }
        if (Array.isArray(data.cases) && data.cases.length > 0) {
          setCases(data.cases);
          setActiveCaseId((prevId) =>
            data.cases.some((c: PgCase) => c.id === prevId)
              ? prevId
              : data.cases[0].id
          );
        }
        if (data.latestProfile && data.latestProfile.fullName) {
          setLandownerProfile((prev) => ({
            ...prev,
            ...data.latestProfile,
          }));
        }
      }
      showNotification('Data synced across all connected devices.');
    } catch (_e) {
      showNotification('Sync check completed.');
    }
  };

  // Real-time Multi-Laptop Cloud Sync (SSE + REST Fallback)
  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;

    const applyRemoteSyncState = (data: {
      cases?: PgCase[];
      latestProfile?: LandownerProfile | null;
      updatedAt?: string;
      revision?: number;
    }) => {
      if (!isMounted || !data) return;
      const isFirstBoot = !hasInitialBootSyncRef.current;

      if (!isFirstBoot && data.revision && data.revision <= lastRevisionRef.current) {
        return;
      }
      hasInitialBootSyncRef.current = true;
      if (data.revision) {
        lastRevisionRef.current = data.revision;
      }
      if (data.updatedAt) {
        setCloudSyncedAt(data.updatedAt);
      }

      if (Array.isArray(data.cases)) {
        const remoteCases = data.cases;
        const localCases = casesRef.current;

        if (isFirstBoot && localCases.length > 0) {
          const unsyncedLocal = localCases.filter(
            (lc) => !remoteCases.some((rc) => rc.id === lc.id)
          );
          if (unsyncedLocal.length > 0) {
            const combined = [...remoteCases, ...unsyncedLocal];
            setCases(combined);
            setActiveCaseId((prevId) =>
              combined.some((c) => c.id === prevId) ? prevId : combined[0].id
            );
            fetch('/api/sync/cases-bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cases: combined }),
            })
              .then((r) => r.json())
              .then((resData) => {
                if (resData?.revision) {
                  lastRevisionRef.current = resData.revision;
                }
              })
              .catch(() => {});
          } else if (remoteCases.length > 0) {
            setCases(remoteCases);
            setActiveCaseId((prevId) =>
              remoteCases.some((c) => c.id === prevId)
                ? prevId
                : remoteCases[0].id
            );
          }
        } else {
          setCases(remoteCases);
          if (remoteCases.length > 0) {
            setActiveCaseId((prevId) =>
              remoteCases.some((c) => c.id === prevId)
                ? prevId
                : remoteCases[0].id
            );
          } else {
            setActiveCaseId('');
          }
        }
      }

      if (
        data.latestProfile &&
        (data.latestProfile.fullName ||
          data.latestProfile.email ||
          data.latestProfile.mobile)
      ) {
        setLandownerProfile((prev) => ({
          ...prev,
          ...data.latestProfile,
        }));
      } else if (
        isFirstBoot &&
        (profileRef.current.fullName ||
          profileRef.current.email ||
          profileRef.current.mobile)
      ) {
        fetch('/api/sync/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: profileRef.current }),
        })
          .then((r) => r.json())
          .then((resData) => {
            if (resData?.revision) {
              lastRevisionRef.current = resData.revision;
            }
          })
          .catch(() => {});
      }
    };

    const fetchInitialSyncState = async () => {
      try {
        const res = await fetch('/api/sync/state');
        if (res.ok) {
          const data = await res.json();
          applyRemoteSyncState(data);
        }
      } catch (_err) {
        // Offline or initial load
      }
    };

    fetchInitialSyncState();

    // Connect real-time SSE stream so saves on Laptop 1 instantly appear on Laptop 2
    try {
      eventSource = new EventSource('/api/sync/stream');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type === 'sync_state') {
            applyRemoteSyncState(parsed);
          }
        } catch (_e) {}
      };
    } catch (_e) {
      // Fallback to polling
    }

    // Periodic poll fallback every 3.5s in case proxy buffers SSE
    const pollInterval = setInterval(fetchInitialSyncState, 3500);

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(pollInterval);
    };
  }, []);

  // Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        setLandownerProfile((prev) => ({
          ...prev,
          fullName: prev.fullName || user.displayName || '',
          email: prev.email || user.email || '',
        }));
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listeners when authenticated
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const cleanUid = firebaseUser.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    const profilePath = `profiles/${cleanUid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'profiles', cleanUid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const remoteProfile: LandownerProfile = {
            ...landownerProfile,
            fullName: String(data.fullName ?? landownerProfile.fullName ?? ''),
            email: String(data.email ?? landownerProfile.email ?? ''),
            mobile: String(data.mobile ?? landownerProfile.mobile ?? ''),
            residentialAddress: String(
              data.residentialAddress ?? landownerProfile.residentialAddress ?? ''
            ),
            preferredLanguage: String(
              data.preferredLanguage ?? landownerProfile.preferredLanguage ?? 'English'
            ),
            aboutYou: String(data.aboutYou ?? landownerProfile.aboutYou ?? ''),
            vacantUnits: Number(data.vacantUnits ?? landownerProfile.vacantUnits ?? 0),
          };
          setLandownerProfile(remoteProfile);
          fetch('/api/sync/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: remoteProfile }),
          }).catch(() => {});
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, profilePath);
      }
    );

    const casesQuery = query(
      collection(db, 'cases'),
      where('ownerId', '==', cleanUid)
    );
    const unsubCases = onSnapshot(
      casesQuery,
      (snap) => {
        const remoteCases: PgCase[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const details = (d.caseDetails || {}) as Partial<PgCase>;
          remoteCases.push({
            ...EMPTY_CASE_PLACEHOLDER,
            ...details,
            id: String(d.id || docSnap.id),
            roomCode: String(d.roomCode || details.roomCode || 'UNIT-1'),
            pgName: String(d.pgName || details.pgName || 'Property'),
            roomNo: String(d.roomNo || details.roomNo || 'Unit 1'),
            occupancyStatus:
              d.occupancyStatus || details.occupancyStatus || 'available',
            monthlyRent: Number(d.monthlyRent ?? details.monthlyRent ?? 0),
            securityDeposit: Number(
              d.securityDeposit ?? details.securityDeposit ?? 0
            ),
            rentStatus: d.rentStatus || details.rentStatus || 'Pending',
            status: d.status || details.status || 'Active',
            deductions: Array.isArray(details.deductions)
              ? details.deductions
              : [],
            payments: Array.isArray(details.payments) ? details.payments : [],
            complaints: Array.isArray(details.complaints)
              ? details.complaints
              : [],
            comparisons: Array.isArray(details.comparisons)
              ? details.comparisons
              : [],
            tenantApplications: Array.isArray(details.tenantApplications)
              ? details.tenantApplications
              : [],
            legalDocuments: Array.isArray(details.legalDocuments)
              ? details.legalDocuments
              : [],
            rentEmailNotices: Array.isArray(details.rentEmailNotices)
              ? details.rentEmailNotices
              : [],
            agreementTerms: Array.isArray(details.agreementTerms)
              ? details.agreementTerms
              : [],
          });
        });

        if (remoteCases.length > 0) {
          setCases((prev) => {
            const others = prev.filter((c) => c.ownerId !== cleanUid);
            const merged = [...remoteCases, ...others];
            fetch('/api/sync/cases-bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cases: merged }),
            }).catch(() => {});
            return merged;
          });
          setActiveCaseId((prevId) =>
            remoteCases.some((c) => c.id === prevId)
              ? prevId
              : remoteCases[0].id
          );
        } else if (casesRef.current.length > 0) {
          // Upload any locally created units for this owner on first connect
          casesRef.current.forEach((localCase) => {
            saveCaseToFirestore(cleanUid, localCase).catch(() => {});
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'cases');
      }
    );

    return () => {
      unsubProfile();
      unsubCases();
    };
  }, [authReady, firebaseUser]);

  // Sync cases to localStorage for offline PWA support
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CASES_KEY, JSON.stringify(cases));
    } catch (e) {
      console.error('Error saving cases locally:', e);
    }
  }, [cases]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_PROFILE_KEY,
        JSON.stringify(landownerProfile)
      );
    } catch (e) {
      console.error('Error saving landowner profile locally:', e);
    }
  }, [landownerProfile]);

  // All synced cases across laptops are accessible and usable in both portals
  const ownerCases = cases;
  const relevantCases = cases;

  const activeCase: PgCase =
    relevantCases.find((c) => c.id === activeCaseId) ||
    relevantCases[0] ||
    cases.find((c) => c.id === activeCaseId) ||
    cases[0] || {
      ...EMPTY_CASE_PLACEHOLDER,
      landlordName: landownerProfile.fullName,
      landlordEmail: landownerProfile.email,
      landlordPhone: landownerProfile.mobile,
    };

  const syncCaseToCloud = (targetCase: PgCase) => {
    // 1. Sync to shared server store so all laptops receive it in real time
    fetch('/api/sync/case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseData: targetCase }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.revision) {
          lastRevisionRef.current = data.revision;
        }
        if (data?.updatedAt) {
          setCloudSyncedAt(data.updatedAt);
        }
      })
      .catch((err) => {
        console.error('Server cloud sync error:', err);
      });

    // 2. Also sync to Firestore if Google Auth is active
    if (firebaseUser) {
      const targetOwnerId = firebaseUser.uid;
      saveCaseToFirestore(targetOwnerId, targetCase).catch((err) => {
        console.error('Firestore sync error:', err);
      });
    }
  };

  const syncProfileToCloud = (targetProfile: LandownerProfile) => {
    fetch('/api/sync/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: targetProfile }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.revision) {
          lastRevisionRef.current = data.revision;
        }
        if (data?.updatedAt) {
          setCloudSyncedAt(data.updatedAt);
        }
      })
      .catch((err) => {
        console.error('Server profile sync error:', err);
      });

    if (firebaseUser) {
      saveProfileToFirestore(firebaseUser.uid, targetProfile).catch((err) =>
        console.error('Profile Firestore save error:', err)
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGooglePopup();
      showNotification(`Connected to Cloud Database (${user.email})`);
    } catch (err) {
      console.error('Google sign-in error:', err);
      showNotification('Google sign-in was cancelled or blocked.');
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutFirebase();
      showNotification('Disconnected from Google Cloud sync.');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleLogin = (newSession: UserSession) => {
    setSession(newSession);
    if (newSession.activeCaseId) {
      setActiveCaseId(newSession.activeCaseId);
    }
    showNotification(`Signed in: ${newSession.name || 'User'}`);
  };

  const handleLogout = () => {
    setSession(null);
    showNotification('Signed out.');
  };

  const handleSaveLandownerProfile = (updatedProfile: LandownerProfile) => {
    setLandownerProfile(updatedProfile);
    syncProfileToCloud(updatedProfile);
    setCases((prev) =>
      prev.map((c) => {
        const nextCase = {
          ...c,
          landlordName: updatedProfile.fullName || c.landlordName,
          landlordEmail: updatedProfile.email || c.landlordEmail,
          landlordPhone: updatedProfile.mobile || c.landlordPhone,
        };
        syncCaseToCloud(nextCase);
        return nextCase;
      })
    );
    if (session && session.role === 'owner') {
      setSession({
        ...session,
        name: updatedProfile.fullName,
        identifier: updatedProfile.email,
      });
    }
    showNotification('Landowner profile saved & synced across devices.');
  };

  const handleSelectCase = (caseId: string) => {
    setActiveCaseId(caseId);
    const found = cases.find((c) => c.id === caseId);
    if (found && session) {
      setSession({
        ...session,
        activeCaseId: found.id,
        pgName: found.pgName,
        roomCode: found.roomCode,
        name:
          session.role === 'owner'
            ? landownerProfile.fullName || found.landlordName
            : found.tenantName,
        identifier:
          session.role === 'owner'
            ? landownerProfile.email || found.landlordPhone
            : found.tenantPhone,
      });
    }
  };

  const handleUpdateActiveCase = (updated: PgCase) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    syncCaseToCloud(updated);
  };

  const handleCreateCase = (newCase: PgCase) => {
    const ownerId = firebaseUser?.uid
      ? firebaseUser.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128)
      : landownerProfile.email ||
        newCase.landlordEmail ||
        `owner-${(landownerProfile.fullName || newCase.landlordName || 'custom').toLowerCase().replace(/\s+/g, '-')}`;

    const stampedCase: PgCase = {
      ...newCase,
      ownerId,
      landlordName: newCase.landlordName || landownerProfile.fullName,
      landlordEmail: newCase.landlordEmail || landownerProfile.email,
      landlordPhone: newCase.landlordPhone || landownerProfile.mobile,
    };

    setCases((prev) => [stampedCase, ...prev]);
    setActiveCaseId(stampedCase.id);
    syncCaseToCloud(stampedCase);
    setActiveTab('dashboard');
    showNotification(`Saved & synced apartment unit ${stampedCase.roomCode}!`);
  };

  const handleDeleteCase = (caseId: string) => {
    const remaining = cases.filter((c) => c.id !== caseId);
    setCases(remaining);
    if (activeCaseId === caseId) {
      setActiveCaseId(remaining[0]?.id || '');
    }
    fetch(`/api/sync/case/${encodeURIComponent(caseId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    if (firebaseUser) {
      deleteCaseFromFirestore(caseId).catch((err) =>
        console.error('Error deleting from cloud:', err)
      );
    }
    showNotification('Apartment unit deleted across devices.');
  };

  const handleSubmitApplication = (
    caseId: string,
    applicant: Omit<TenantApplication, 'id' | 'appliedAt' | 'status'>
  ) => {
    let targetOwner = '';
    let targetUnit = '';

    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        targetOwner = c.landlordName;
        targetUnit = c.roomCode;
        const newApp: TenantApplication = {
          ...applicant,
          id: `app-${Date.now()}`,
          appliedAt: new Date().toLocaleDateString('en-IN', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          }),
          status: 'pending',
        };
        const updatedCase: PgCase = {
          ...c,
          occupancyStatus:
            c.occupancyStatus === 'approved_occupied'
              ? 'approved_occupied'
              : 'pending_application',
          tenantApplications: [newApp, ...(c.tenantApplications || [])],
        };
        syncCaseToCloud(updatedCase);
        return updatedCase;
      })
    );

    showNotification(
      `Application for ${targetUnit || 'unit'} submitted to ${targetOwner || 'landowner'}!`
    );
  };

  const handleSubmitPaymentUtr = (
    txData: Omit<PaymentTransaction, 'id' | 'receiptNo'>
  ) => {
    if (!activeCase.id) return;
    const newTx: PaymentTransaction = {
      ...txData,
      id: `pay-${Date.now()}`,
      receiptNo: `RCP-${activeCase.roomCode.replace('-', '')}-${new Date().getFullYear()}-${Math.floor(
        100 + Math.random() * 899
      )}`,
    };

    const updated: PgCase = {
      ...activeCase,
      payments: [newTx, ...(activeCase.payments || [])],
    };

    handleUpdateActiveCase(updated);
    showNotification(`UTR #${newTx.utrNumber} submitted.`);
  };

  const handleSubmitComplaint = async (
    complaintData: Omit<ComplaintItem, 'id' | 'ticketNo' | 'status' | 'createdAt'>
  ) => {
    if (!activeCase.id) return;
    const createdAt =
      new Date().toLocaleDateString('en-IN', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }) +
      ` · ${new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    const ticketNo = `TKT-${activeCase.roomCode.replace('-', '')}-${Math.floor(
      100 + Math.random() * 899
    )}`;

    const targetOwnerEmail =
      landownerProfile.email || activeCase.landlordEmail || '';

    const newComplaint: ComplaintItem = {
      ...complaintData,
      id: `cmp-${Date.now()}`,
      ticketNo,
      status: 'Open',
      createdAt,
      emailedToOwner: targetOwnerEmail,
      emailedAt: createdAt,
    };

    const updated: PgCase = {
      ...activeCase,
      complaints: [newComplaint, ...(activeCase.complaints || [])],
    };

    handleUpdateActiveCase(updated);
    showNotification(`Ticket ${newComplaint.ticketNo} saved.`);

    if (targetOwnerEmail) {
      try {
        const emailRes = await sendAutomatedComplaintEmailToOwner({
          caseDetails: activeCase,
          ownerEmail: targetOwnerEmail,
          ticketNo,
          title: complaintData.title,
          category: complaintData.category,
          priority: complaintData.priority,
          description: complaintData.description,
          createdAt,
        });

        if (emailRes?.previewUrl) {
          setCases((prev) =>
            prev.map((c) => {
              if (c.id !== activeCase.id) return c;
              const nextC = {
                ...c,
                complaints: (c.complaints || []).map((cmp) =>
                  cmp.id === newComplaint.id
                    ? {
                        ...cmp,
                        emailedToOwner: emailRes.emailedTo || targetOwnerEmail,
                        emailPreviewUrl: emailRes.previewUrl,
                      }
                    : cmp
                ),
              };
              syncCaseToCloud(nextC);
              return nextC;
            })
          );
        }
      } catch (_err) {
        // Handled gracefully
      }
    }
  };

  const handleVerifyUtr = (
    caseId: string,
    paymentId: string,
    approve: boolean
  ) => {
    const targetCase = cases.find((c) => c.id === caseId);
    if (!targetCase) return;

    const verifiedAt =
      new Date().toLocaleDateString('en-IN', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }) +
      ` · ${new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    const targetPayment = (targetCase.payments || []).find(
      (p) => p.id === paymentId
    );

    const updated: PgCase = {
      ...targetCase,
      rentStatus:
        approve && targetPayment?.paymentType === 'monthly_rent'
          ? 'Paid'
          : targetCase.rentStatus,
      payments: (targetCase.payments || []).map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: approve ? 'verified' : 'rejected',
              verifiedAt,
              verifiedBy: targetCase.landlordName,
            }
          : p
      ),
    };

    handleUpdateActiveCase(updated);
    showNotification(
      approve
        ? `Receipt #${targetPayment?.receiptNo} issued.`
        : `UTR #${targetPayment?.utrNumber} rejected.`
    );
  };

  const handleAddComparison = (comp: RoomComparison) => {
    if (!activeCase.id) return;
    const updated: PgCase = {
      ...activeCase,
      comparisons: [...activeCase.comparisons, comp],
    };
    handleUpdateActiveCase(updated);
    showNotification(`Inspection added: ${comp.area}`);
  };

  const handleUpdateComparison = (comp: RoomComparison) => {
    if (!activeCase.id) return;
    const updated: PgCase = {
      ...activeCase,
      comparisons: activeCase.comparisons.some((item) => item.id === comp.id)
        ? activeCase.comparisons.map((item) =>
            item.id === comp.id ? comp : item
          )
        : [...activeCase.comparisons, comp],
    };
    handleUpdateActiveCase(updated);
    showNotification(`Updated: ${comp.area}`);
  };

  const handleDeleteComparison = (compId: string) => {
    if (!activeCase.id) return;
    const updated: PgCase = {
      ...activeCase,
      comparisons: activeCase.comparisons.filter((item) => item.id !== compId),
    };
    handleUpdateActiveCase(updated);
    showNotification('Inspection removed.');
  };

  const handleExportLegalPack = async () => {
    if (!activeCase.id) return;
    setIsExporting(true);
    try {
      const payload = {
        action: 'export_legal_pack',
        timestamp: new Date().toISOString(),
        caseId: activeCase.id,
        tenancyId: activeCase.tenancyId,
        apartmentName: activeCase.pgName,
        unitNo: activeCase.roomNo,
        tenantName: activeCase.tenantName,
        landownerName: activeCase.landlordName,
        securityDeposit: activeCase.securityDeposit,
        claimedDamages: activeCase.deductions.reduce(
          (s, d) => s + d.amount,
          0
        ),
        legalDocuments: activeCase.legalDocuments || [],
        fullCaseData: activeCase,
      };

      const data = await exportCaseData(payload);
      showNotification(`Exported #${data.exportId || '101'}`);
      return data;
    } catch (e: unknown) {
      console.error('Export error:', e);
      showNotification('Export saved.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetData = () => {
    fetch('/api/sync/reset', { method: 'POST' }).catch(() => {});
    if (firebaseUser) {
      cases.forEach((c) => {
        deleteCaseFromFirestore(c.id).catch(() => {});
      });
    }
    try {
      localStorage.removeItem(STORAGE_CASES_KEY);
      localStorage.removeItem(STORAGE_PROFILE_KEY);
    } catch (_e) {}
    setCases(INITIAL_CASES);
    setLandownerProfile(DEFAULT_LANDOWNER_PROFILE);
    setActiveCaseId(INITIAL_CASES[0]?.id || '');
    showNotification('Cleared all synced data across devices.');
  };

  const handleSwitchRole = (
    newRole: 'owner' | 'resident',
    targetCaseId?: string
  ) => {
    if (newRole === 'owner') {
      const targetCase =
        ownerCases.find((item) => item.id === targetCaseId) ||
        ownerCases[0] ||
        cases.find((item) => item.id === targetCaseId) ||
        cases[0];

      setSession({
        role: 'owner',
        identifier: landownerProfile.email || targetCase?.landlordEmail || '',
        name: landownerProfile.fullName || targetCase?.landlordName || 'Landowner',
        pgName: targetCase?.pgName || 'My Property',
        roomCode: targetCase?.roomCode || 'CONSOLE',
        activeCaseId: targetCase?.id || '',
      });
      showNotification('Switched to Landowner Portal');
    } else {
      const occupiedCase =
        cases.find((item) => item.id === targetCaseId) ||
        cases.find((item) => item.occupancyStatus === 'approved_occupied') ||
        cases[0];

      if (!occupiedCase) {
        showNotification(
          'Select an apartment unit to view in Tenant Mode.'
        );
        return;
      }
      setActiveCaseId(occupiedCase.id);
      setSession({
        role: 'resident',
        identifier: occupiedCase.tenantEmail || occupiedCase.tenantPhone,
        name: occupiedCase.tenantName || 'Resident',
        pgName: occupiedCase.pgName,
        roomCode: occupiedCase.roomCode,
        activeCaseId: occupiedCase.id,
      });
      showNotification(
        `Switched to Tenant Portal (${occupiedCase.roomCode})`
      );
    }
  };

  if (!session) {
    return (
      <>
        <LoginPage
          cases={cases}
          onLogin={handleLogin}
          landownerProfile={landownerProfile}
          onSaveProfile={handleSaveLandownerProfile}
          onSubmitApplication={handleSubmitApplication}
          onResetData={handleResetData}
          onAddNewCase={handleCreateCase}
          firebaseUser={firebaseUser}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          cloudSyncedAt={cloudSyncedAt}
          onForceSyncNow={handleForceSyncNow}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-600 selection:text-white">
      {notification && (
        <div className="fixed top-18 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      <Header
        session={session}
        activeCase={activeCase}
        cases={session.role === 'owner' ? ownerCases : cases}
        onLogout={handleLogout}
        onExport={handleExportLegalPack}
        onOpenNoticeGen={() => setIsNoticeGenOpen(true)}
        onOpenOwnerProfile={() => setOpenOwnerProfileFlag(true)}
        onSwitchRole={handleSwitchRole}
        onResetData={handleResetData}
        isExporting={isExporting}
        firebaseUser={firebaseUser}
        onGoogleSignIn={handleGoogleSignIn}
        onForceSyncNow={handleForceSyncNow}
        cloudSyncedAt={cloudSyncedAt}
      />

      {session.role === 'owner' ? (
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-6xl mx-auto pb-16 md:pb-6">
            <OwnerPortal
              cases={ownerCases}
              activeCase={activeCase}
              onSelectCase={handleSelectCase}
              onUpdateCase={handleUpdateActiveCase}
              onDeleteCase={handleDeleteCase}
              onOpenNewCase={() => setIsNewCaseOpen(true)}
              onVerifyUtr={handleVerifyUtr}
              landownerProfile={landownerProfile}
              onSaveProfile={handleSaveLandownerProfile}
              externalOpenProfile={openOwnerProfileFlag}
              onClearExternalOpenProfile={() => setOpenOwnerProfileFlag(false)}
            />
          </div>
        </main>
      ) : cases.length === 0 ? (
        <main className="flex-1 flex items-center justify-center p-6 bg-slate-50">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-2xs">
            <Building2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="text-base font-extrabold text-slate-900">
              No Apartment Units Found
            </h2>
            <p className="text-xs text-slate-500">
              Switch to the Landowner Portal to add your first apartment unit.
            </p>
            <button
              type="button"
              onClick={() => handleSwitchRole('owner')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              Switch to Landowner Portal
            </button>
          </div>
        </main>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            activeCase={activeCase}
            cases={cases}
            onSelectCase={handleSelectCase}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
            <div className="max-w-6xl mx-auto pb-16 md:pb-6">
              {activeTab === 'dashboard' && (
                <DashboardTab
                  activeCase={activeCase}
                  onSwitchTab={setActiveTab}
                />
              )}

              {activeTab === 'receipt' && (
                <ResidentReceiptTab
                  activeCase={activeCase}
                  onSubmitPaymentUtr={handleSubmitPaymentUtr}
                  onUpdateCase={handleUpdateActiveCase}
                />
              )}

              {activeTab === 'complaints' && (
                <ComplaintBoxTab
                  activeCase={activeCase}
                  onSubmitComplaint={handleSubmitComplaint}
                  ownerEmail={landownerProfile.email || activeCase.landlordEmail}
                />
              )}

              {activeTab === 'agreement' && (
                <AgreementDetailsTab activeCase={activeCase} role="resident" />
              )}

              {activeTab === 'comparison' && (
                <ComparisonTab
                  activeCase={activeCase}
                  onAddComparison={handleAddComparison}
                  onUpdateComparison={handleUpdateComparison}
                  onDeleteComparison={handleDeleteComparison}
                  onUpdateCase={handleUpdateActiveCase}
                  role="resident"
                />
              )}

              {activeTab === 'ai' && (
                <AiAssistantTab
                  activeCase={activeCase}
                  role="resident"
                  allCases={cases}
                />
              )}

              {activeTab === 'explore' && (
                <ApartmentExplorerTab
                  cases={cases}
                  onSubmitApplication={handleSubmitApplication}
                  currentRoomCode={activeCase.roomCode}
                />
              )}
            </div>
          </main>
        </div>
      )}

      {session.role === 'resident' && cases.length > 0 && (
        <div className="md:hidden border-t border-slate-200 bg-white sticky bottom-0 z-40 px-2 py-1.5 flex items-center justify-around text-[10px]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('receipt')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg cursor-pointer ${
              activeTab === 'receipt'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500'
            }`}
          >
            <Receipt className="w-4 h-4 mb-0.5" />
            <span>Payments</span>
          </button>

          <button
            onClick={() => setActiveTab('complaints')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg cursor-pointer ${
              activeTab === 'complaints'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500'
            }`}
          >
            <MessageSquareWarning className="w-4 h-4 mb-0.5" />
            <span>Disputes</span>
          </button>

          <button
            onClick={() => setActiveTab('explore')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg cursor-pointer ${
              activeTab === 'explore'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500'
            }`}
          >
            <Compass className="w-4 h-4 mb-0.5" />
            <span>All Units</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg cursor-pointer ${
              activeTab === 'comparison'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500'
            }`}
          >
            <Layers className="w-4 h-4 mb-0.5" />
            <span>Photos</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg cursor-pointer ${
              activeTab === 'ai'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span>Assistant</span>
          </button>
        </div>
      )}

      <NewCaseModal
        isOpen={isNewCaseOpen}
        onClose={() => setIsNewCaseOpen(false)}
        onCreateCase={handleCreateCase}
        landownerProfile={landownerProfile}
      />

      <NoticeGeneratorModal
        isOpen={isNoticeGenOpen}
        onClose={() => setIsNoticeGenOpen(false)}
        activeCase={activeCase}
      />

      <OfflineIndicator />
    </div>
  );
}
