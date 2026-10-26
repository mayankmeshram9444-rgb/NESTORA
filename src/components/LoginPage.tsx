import React, { useState, useEffect } from 'react';
import {
  Building2,
  UserCheck,
  ArrowRight,
  Mail,
  Home,
  CheckCircle2,
  RefreshCw,
  User,
  Cloud,
  LogOut,
  Search,
  Filter,
  MapPin,
  Send,
  Calendar,
  Sparkles,
  Check,
  ShieldCheck,
  Phone,
  KeyRound,
  ExternalLink,
  AlertCircle,
  Lock,
  Smartphone,
  MessageSquare,
  Copy,
} from 'lucide-react';
import {
  PgCase,
  UserSession,
  LandownerProfile,
  TenantApplication,
} from '../types';
import { EMPTY_CASE_PLACEHOLDER } from '../data/mockData';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginPageProps {
  cases: PgCase[];
  onLogin: (session: UserSession) => void;
  landownerProfile: LandownerProfile;
  onSaveProfile: (profile: LandownerProfile) => void;
  onSubmitApplication?: (
    caseId: string,
    application: Omit<TenantApplication, 'id' | 'appliedAt' | 'status'>
  ) => void;
  onResetData?: () => void;
  onAddNewCase?: (newCase: PgCase) => void;
  firebaseUser?: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
  onGoogleSignIn?: () => Promise<void>;
  onGoogleSignOut?: () => Promise<void>;
  cloudSyncedAt?: string | null;
  onForceSyncNow?: () => Promise<void> | void;
}

interface PendingUserAuth {
  role: 'owner' | 'resident';
  fullName: string;
  email: string;
  mobile: string;
  propertyName?: string;
  roomCode?: string;
}

interface SmsDispatchInfo {
  delivered: boolean;
  provider: string;
  channel: string;
  mobileFormatted: string;
  whatsappUrl?: string;
  smsUri?: string;
  details?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  cases,
  onLogin,
  landownerProfile,
  onSaveProfile,
  onSubmitApplication,
  onResetData,
  onAddNewCase,
  firebaseUser,
  onGoogleSignIn,
  onGoogleSignOut,
  cloudSyncedAt,
  onForceSyncNow,
}) => {
  const [showOtherDevicePanel, setShowOtherDevicePanel] = useState(false);
  const [copiedDeviceLink, setCopiedDeviceLink] = useState(false);
  const sharedDeviceUrl =
    typeof window !== 'undefined'
      ? window.location.origin.replace('ais-dev-', 'ais-pre-')
      : 'https://ais-pre-hvctcsvaponw4yn4f5ivhi-884251030291.asia-southeast1.run.app';
  const [selectedRole, setSelectedRole] = useState<'owner' | 'resident'>('owner');
  const [tenantViewMode, setTenantViewMode] = useState<'browse' | 'signin'>('browse');

  // OTP Authentication states
  const [authStep, setAuthStep] = useState<'details' | 'otp'>('details');
  const [pendingUser, setPendingUser] = useState<PendingUserAuth | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessNotice, setOtpSuccessNotice] = useState<string | null>(null);
  const [otpPreviewUrl, setOtpPreviewUrl] = useState<string | null>(null);
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);
  const [smsDispatchInfo, setSmsDispatchInfo] = useState<SmsDispatchInfo | null>(null);
  const [isResendingMobile, setIsResendingMobile] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Landowner Inputs (populated automatically when synced from another laptop)
  const [ownerNameInput, setOwnerNameInput] = useState(
    landownerProfile.fullName || cases[0]?.landlordName || firebaseUser?.displayName || ''
  );
  const [ownerEmailInput, setOwnerEmailInput] = useState(
    landownerProfile.email || cases[0]?.landlordEmail || firebaseUser?.email || ''
  );
  const [ownerMobileInput, setOwnerMobileInput] = useState(
    landownerProfile.mobile || cases[0]?.landlordPhone || ''
  );
  const [propertyNameInput, setPropertyNameInput] = useState(
    cases[0]?.pgName || ''
  );

  // Tenant Inputs
  const occupiedUnits = cases.filter(
    (c) => c.occupancyStatus === 'approved_occupied'
  );
  const [selectedUnitCode, setSelectedUnitCode] = useState(
    occupiedUnits[0]?.roomCode || cases[0]?.roomCode || ''
  );
  const [tenantNameInput, setTenantNameInput] = useState(
    occupiedUnits[0]?.tenantName || cases[0]?.tenantName || ''
  );
  const [tenantEmailInput, setTenantEmailInput] = useState(
    occupiedUnits[0]?.tenantEmail || cases[0]?.tenantEmail || ''
  );
  const [tenantMobileInput, setTenantMobileInput] = useState(
    occupiedUnits[0]?.tenantPhone || cases[0]?.tenantPhone || ''
  );

  // Tenant Browse mode Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Tenant Application modal state
  const [openApplyUnitId, setOpenApplyUnitId] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [moveInDate, setMoveInDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [stayDuration, setStayDuration] = useState('11 Months Lease');
  const [applicantNotes, setApplicationNotes] = useState('');
  const [appSubmittedMsg, setAppSubmittedMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Distinct landowners across real units
  const distinctLandowners = Array.from(
    new Set(cases.map((c) => c.landlordName).filter(Boolean))
  );

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (firebaseUser) {
      if (!ownerNameInput && firebaseUser.displayName) {
        setOwnerNameInput(firebaseUser.displayName);
      }
      if (!ownerEmailInput && firebaseUser.email) {
        setOwnerEmailInput(firebaseUser.email);
      }
    }
  }, [firebaseUser]);

  // Keep form inputs synced in usable form when another laptop saves profile or units
  useEffect(() => {
    if (landownerProfile.fullName && !ownerNameInput) {
      setOwnerNameInput(landownerProfile.fullName);
    }
    if (landownerProfile.email && !ownerEmailInput) {
      setOwnerEmailInput(landownerProfile.email);
    }
    if (landownerProfile.mobile && !ownerMobileInput) {
      setOwnerMobileInput(landownerProfile.mobile);
    }
  }, [landownerProfile]);

  useEffect(() => {
    if (cases.length > 0) {
      const first = cases[0];
      if (!ownerNameInput && first.landlordName) {
        setOwnerNameInput(first.landlordName);
      }
      if (!ownerEmailInput && first.landlordEmail) {
        setOwnerEmailInput(first.landlordEmail);
      }
      if (!ownerMobileInput && first.landlordPhone) {
        setOwnerMobileInput(first.landlordPhone);
      }
      if (!propertyNameInput && first.pgName) {
        setPropertyNameInput(first.pgName);
      }
      if (!selectedUnitCode && first.roomCode) {
        setSelectedUnitCode(first.roomCode);
      }
      if (!tenantNameInput && first.tenantName && first.tenantName !== 'Vacant Unit') {
        setTenantNameInput(first.tenantName);
      }
      if (!tenantEmailInput && first.tenantEmail) {
        setTenantEmailInput(first.tenantEmail);
      }
      if (!tenantMobileInput && first.tenantPhone) {
        setTenantMobileInput(first.tenantPhone);
      }
    }
  }, [cases]);

  // Direct Save & Open Portal handler so saved info is immediately usable across laptops
  const handleDirectSaveAndOpenOwner = () => {
    setOtpError(null);
    const fullName = ownerNameInput.trim() || landownerProfile.fullName || cases[0]?.landlordName || 'Landowner';
    const email = ownerEmailInput.trim() || landownerProfile.email || cases[0]?.landlordEmail || 'owner@nestora.app';
    const mobile = ownerMobileInput.trim() || landownerProfile.mobile || cases[0]?.landlordPhone || '';
    const propName = propertyNameInput.trim() || cases[0]?.pgName || 'My Residences';

    const updatedProfile: LandownerProfile = {
      ...landownerProfile,
      fullName,
      email,
      mobile,
    };
    onSaveProfile(updatedProfile);

    let targetCase = cases.find(
      (c) =>
        c.landlordEmail?.toLowerCase() === email.toLowerCase() ||
        c.pgName?.toLowerCase() === propName.toLowerCase()
    ) || cases[0];

    if (!targetCase) {
      const codePrefix =
        propName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'APT';
      const newUnit: PgCase = {
        ...EMPTY_CASE_PLACEHOLDER,
        id: `case-${Date.now()}`,
        ownerId: email.toLowerCase(),
        tenancyId: `TEN-${codePrefix}-101-${new Date().getFullYear()}`,
        roomCode: `${codePrefix}-101`,
        pgName: propName,
        roomNo: 'Flat #101 (Ready for Tenant)',
        sharingType: '2BHK Apartment',
        stayType: 'Monthly Lease (Months)',
        stayDurationLabel: '11 Months Lease',
        occupancyStatus: 'available',
        tenantApplications: [],
        propertyAddress: '',
        landlordName: fullName,
        landlordEmail: email,
        landlordPhone: mobile,
        monthlyRent: 18000,
        securityDeposit: 36000,
        rentDueDay: '5th of every month',
        lockInMonths: 6,
        noticePeriodDays: 30,
        agreementTerms: [
          'Security deposit refundable post move-out inspection.',
          'Electricity sub-meter charges payable monthly.',
          'One month notice required before vacating.',
        ],
      };
      if (onAddNewCase) {
        onAddNewCase(newUnit);
      }
      targetCase = newUnit;
    }

    onLogin({
      role: 'owner',
      identifier: email,
      name: fullName,
      pgName: targetCase?.pgName || propName,
      roomCode: targetCase?.roomCode || 'CONSOLE',
      activeCaseId: targetCase?.id || '',
    });
  };

  const handleDirectOpenTenantUnit = (unit?: PgCase) => {
    const targetCase =
      unit ||
      cases.find((c) => c.roomCode === selectedUnitCode) ||
      occupiedUnits[0] ||
      cases[0];

    if (!targetCase) {
      setOtpError('No apartment unit found yet. Please add a unit in the Landowner Portal first.');
      return;
    }

    const tName = tenantNameInput.trim() || targetCase.tenantName || 'Resident';
    const tEmail = tenantEmailInput.trim() || targetCase.tenantEmail || 'tenant@nestora.app';

    onLogin({
      role: 'resident',
      identifier: tEmail,
      name: tName,
      pgName: targetCase.pgName,
      roomCode: targetCase.roomCode,
      activeCaseId: targetCase.id,
    });
  };

  // Step 1: Send OTP to Email & record Mobile
  const handleSendOtp = async (role: 'owner' | 'resident') => {
    setOtpError(null);
    setOtpSuccessNotice(null);

    const email = (role === 'owner' ? ownerEmailInput : tenantEmailInput).trim();
    const mobile = (role === 'owner' ? ownerMobileInput : tenantMobileInput).trim();
    const fullName = (role === 'owner' ? ownerNameInput : tenantNameInput).trim();
    const propertyName = propertyNameInput.trim();

    if (!fullName) {
      setOtpError('Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setOtpError('Please enter a valid email address where we can send your OTP.');
      return;
    }
    if (!mobile || mobile.replace(/\D/g, '').length < 8) {
      setOtpError('Please enter a valid mobile number (at least 8-10 digits).');
      return;
    }

    // Immediately save & sync entered landowner info to cloud so other devices receive it right away
    if (role === 'owner') {
      onSaveProfile({
        ...landownerProfile,
        fullName,
        email,
        mobile,
      });
      const propLabel = propertyName || cases[0]?.pgName || 'My Residences';
      const existingCase = cases.find(
        (c) =>
          c.landlordEmail?.toLowerCase() === email.toLowerCase() ||
          c.pgName?.toLowerCase() === propLabel.toLowerCase()
      );
      if (!existingCase && onAddNewCase) {
        const codePrefix =
          propLabel.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() ||
          'APT';
        onAddNewCase({
          ...EMPTY_CASE_PLACEHOLDER,
          id: `case-${Date.now()}`,
          ownerId: email.toLowerCase(),
          tenancyId: `TEN-${codePrefix}-101-${new Date().getFullYear()}`,
          roomCode: `${codePrefix}-101`,
          pgName: propLabel,
          roomNo: 'Flat #101 (Ready for Tenant)',
          sharingType: '2BHK Apartment',
          stayType: 'Monthly Lease (Months)',
          stayDurationLabel: '11 Months Lease',
          occupancyStatus: 'available',
          tenantApplications: [],
          propertyAddress: '',
          landlordName: fullName,
          landlordEmail: email,
          landlordPhone: mobile,
          monthlyRent: 18000,
          securityDeposit: 36000,
          rentDueDay: '5th of every month',
          lockInMonths: 6,
          noticePeriodDays: 30,
          agreementTerms: [
            'Security deposit refundable post move-out inspection.',
            'Electricity sub-meter charges payable monthly.',
            'One month notice required before vacating.',
          ],
        });
      }
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          mobile,
          fullName,
          role,
          buildingName: propertyName,
          roomCode: role === 'resident' ? selectedUnitCode : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification OTP.');
      }

      setPendingUser({
        role,
        fullName,
        email,
        mobile,
        propertyName,
        roomCode: role === 'resident' ? selectedUnitCode : undefined,
      });
      setOtpInput('');
      setOtpPreviewUrl(data.previewUrl || null);
      setOtpDevHint(data.otpDevHint || data.otp || null);
      setSmsDispatchInfo(data.smsResult || null);
      setOtpSuccessNotice(
        `Verification code dispatched to ${email} and mobile ${data.smsResult?.mobileFormatted || mobile}.`
      );

      // Trigger Web Notification on desktop/mobile browser if supported
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted' && (data.otpDevHint || data.otp)) {
          try {
            new Notification('Nestora Login OTP', {
              body: `Your OTP is ${data.otpDevHint || data.otp}. Valid for 10 minutes.`,
            });
          } catch (_e) {}
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted' && (data.otpDevHint || data.otp)) {
              new Notification('Nestora Login OTP', {
                body: `Your OTP is ${data.otpDevHint || data.otp}. Valid for 10 minutes.`,
              });
            }
          });
        }
      }

      setAuthStep('otp');
      setResendCooldown(30);
    } catch (err: any) {
      setOtpError(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Re-send verification code strictly to Mobile number
  const handleResendMobileOnly = async () => {
    if (!pendingUser) return;
    setIsResendingMobile(true);
    setOtpError(null);
    try {
      const res = await fetch('/api/auth/resend-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingUser.email,
          mobile: pendingUser.mobile,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to re-send to mobile.');
      }
      if (data.smsResult) {
        setSmsDispatchInfo(data.smsResult);
      }
      if (data.otpDevHint || data.otp) {
        setOtpDevHint(data.otpDevHint || data.otp);
      }
      setOtpSuccessNotice(
        `OTP re-transmitted to mobile: ${data.smsResult?.mobileFormatted || pendingUser.mobile}`
      );
    } catch (err: any) {
      setOtpError(err.message || 'Could not re-dispatch to mobile phone.');
    } finally {
      setIsResendingMobile(false);
    }
  };

  // Step 2: Verify OTP and proceed to session login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    const cleanOtp = otpInput.trim();
    if (cleanOtp.length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingUser.email,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP. Please try again.');
      }

      // Success! Proceed with Role-specific Login
      if (pendingUser.role === 'owner') {
        const updatedProfile: LandownerProfile = {
          ...landownerProfile,
          fullName: pendingUser.fullName,
          email: pendingUser.email,
          mobile: pendingUser.mobile,
        };
        onSaveProfile(updatedProfile);

        // Find existing owner case or initialize first real case if new owner
        const existingOwnerCase = cases.find(
          (c) =>
            c.landlordEmail.toLowerCase() === pendingUser.email.toLowerCase() ||
            c.ownerId === pendingUser.email.toLowerCase()
        );

        let targetCase = existingOwnerCase;

        if (!targetCase) {
          const propName = pendingUser.propertyName || 'My Residences';
          const codePrefix =
            propName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'APT';
          
          const newUnit: PgCase = {
            ...EMPTY_CASE_PLACEHOLDER,
            id: `case-${Date.now()}`,
            ownerId: pendingUser.email.toLowerCase(),
            tenancyId: `TEN-${codePrefix}-101-${new Date().getFullYear()}`,
            roomCode: `${codePrefix}-101`,
            pgName: propName,
            roomNo: 'Flat #101 (Ready for Tenant)',
            sharingType: '2BHK Apartment',
            stayType: 'Monthly Lease (Months)',
            stayDurationLabel: '11 Months Lease',
            occupancyStatus: 'available',
            tenantApplications: [],
            propertyAddress: '',
            landlordName: pendingUser.fullName,
            landlordEmail: pendingUser.email,
            landlordPhone: pendingUser.mobile,
            monthlyRent: 18000,
            securityDeposit: 36000,
            rentDueDay: '5th of every month',
            lockInMonths: 6,
            noticePeriodDays: 30,
            agreementTerms: [
              'Security deposit refundable post move-out inspection.',
              'Electricity sub-meter charges payable monthly.',
              'One month notice required before vacating.',
            ],
          };

          if (onAddNewCase) {
            onAddNewCase(newUnit);
          }
          targetCase = newUnit;
        }

        onLogin({
          role: 'owner',
          identifier: pendingUser.email,
          name: pendingUser.fullName,
          pgName: pendingUser.propertyName || targetCase?.pgName || 'My Residences',
          roomCode: targetCase?.roomCode || 'CONSOLE',
          activeCaseId: targetCase?.id || '',
        });
      } else {
        // Resident Login
        const targetCase =
          cases.find((c) => c.roomCode === pendingUser.roomCode) ||
          cases.find(
            (c) => c.tenantEmail.toLowerCase() === pendingUser.email.toLowerCase()
          ) ||
          occupiedUnits[0] ||
          cases[0];

        onLogin({
          role: 'resident',
          identifier: pendingUser.email,
          name: pendingUser.fullName,
          pgName: targetCase?.pgName || 'Apartment Complex',
          roomCode: targetCase?.roomCode || pendingUser.roomCode || 'TENANT-PORTAL',
          activeCaseId: targetCase?.id || '',
        });
      }
    } catch (err: any) {
      setOtpError(err.message || 'OTP verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleApplySubmit = (e: React.FormEvent, targetCase: PgCase) => {
    e.preventDefault();
    if (!applicantName.trim() || !applicantEmail.trim() || !onSubmitApplication)
      return;

    onSubmitApplication(targetCase.id, {
      applicantName: applicantName.trim(),
      applicantEmail: applicantEmail.trim(),
      applicantPhone: applicantPhone.trim(),
      applicantKycId: 'Aadhaar Verified',
      moveInDate,
      stayDurationLabel: stayDuration,
      notes:
        applicantNotes.trim() ||
        `Application to rent ${targetCase.roomNo} (${targetCase.roomCode}) at ${targetCase.pgName}.`,
    });

    setAppSubmittedMsg(
      `Application for ${targetCase.roomCode} submitted to Landowner ${targetCase.landlordName}! The landowner can review and approve it.`
    );
    setOpenApplyUnitId(null);
    setApplicantName('');
    setApplicantEmail('');
    setApplicantPhone('');
    setApplicationNotes('');
    setTimeout(() => setAppSubmittedMsg(null), 6000);
  };

  // Filtered cases for Tenant Browse
  const filteredCasesForBrowse = cases.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      c.pgName.toLowerCase().includes(q) ||
      c.roomNo.toLowerCase().includes(q) ||
      c.roomCode.toLowerCase().includes(q) ||
      c.landlordName.toLowerCase().includes(q) ||
      c.propertyAddress.toLowerCase().includes(q);

    const matchesOwner =
      ownerFilter === 'all' || c.landlordName === ownerFilter;

    const matchesType =
      typeFilter === 'all' || c.sharingType === typeFilter;

    return matchesSearch && matchesOwner && matchesType;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-extrabold text-white text-lg shadow-sm">
            N
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">
              Nestora
            </h1>
            <p className="text-xs text-slate-500">
              Multi-Landowner Tenancy & Apartment Management Platform
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PWAInstallButton />

          {onResetData && cases.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onResetData();
                    setConfirmClear(false);
                  }}
                  className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="text-xs font-semibold text-slate-600 bg-slate-200 px-2.5 py-1.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Clear All Data</span>
              </button>
            )
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto my-auto space-y-6">
        {/* Cloud Database Connection Banner */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xs font-bold text-slate-900">
                    {firebaseUser
                      ? `Cloud Database Connected (${firebaseUser.email})`
                      : 'Real-Time Multi-Device Cloud Sync Active'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      Live Sync ({cases.length}{' '}
                      {cases.length === 1 ? 'Unit' : 'Units'})
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Any profile, apartment unit, application, rent payment, or inspection saved on one device automatically appears on all other devices in usable form.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onForceSyncNow && (
                <button
                  type="button"
                  onClick={() => onForceSyncNow()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  title="Force push and pull latest data across all devices"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Now</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowOtherDevicePanel((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Open on Other Device</span>
              </button>

              {firebaseUser ? (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Google Cloud Linked</span>
                  </span>
                  {onGoogleSignOut && (
                    <button
                      type="button"
                      onClick={onGoogleSignOut}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                      title="Disconnect Google Account"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                onGoogleSignIn && (
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sign in with Google</span>
                  </button>
                )
              )}
            </div>
          </div>

          {showOtherDevicePanel && (
            <div className="pt-3 border-t border-emerald-100 bg-slate-50/90 rounded-xl p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Open Nestora on Another Laptop, Phone, or Tablet
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Use this shared link on any other device to view and edit all synced units ({cases.length}) and landowner details in real time:
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(sharedDeviceUrl);
                      setCopiedDeviceLink(true);
                      setTimeout(() => setCopiedDeviceLink(false), 3000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    {copiedDeviceLink ? 'Copied Shared Link!' : 'Copy Shared Device Link'}
                  </button>
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 font-mono text-xs text-emerald-800 select-all break-all">
                {sharedDeviceUrl}
              </div>
            </div>
          )}
        </div>

        {appSubmittedMsg && (
          <div className="bg-emerald-900 text-white p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-md animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{appSubmittedMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* OTP VERIFICATION MODAL / VIEW (When authStep === 'otp')                   */}
        {/* ========================================================================= */}
        {authStep === 'otp' && pendingUser ? (
          <div className="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-8 shadow-md max-w-xl mx-auto space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Enter Verification OTP
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Verification code has been dispatched to both your registered{' '}
                <strong className="text-slate-900">Email</strong> and{' '}
                <strong className="text-slate-900">Mobile Number</strong>.
              </p>
            </div>

            {/* Dual Delivery Status Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email Delivery Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Email Delivery</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    Dispatched
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900 truncate" title={pendingUser.email}>
                  {pendingUser.email}
                </div>
                {otpPreviewUrl && (
                  <div className="pt-1">
                    <a
                      href={otpPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Ethereal Email Preview</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Mobile Phone Delivery Card */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mobile SMS & WhatsApp</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900 font-mono">
                  {smsDispatchInfo?.mobileFormatted || pendingUser.mobile}
                </div>
                <div className="text-[11px] text-emerald-800 font-medium truncate">
                  {smsDispatchInfo?.provider || 'SMS Gateway Relay'}
                </div>
              </div>
            </div>

            {/* Direct Mobile Reception Actions (SMS & WhatsApp & Quick-Fill) */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">
                    Mobile Phone Actions & Instant Delivery
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResendMobileOnly}
                  disabled={isResendingMobile}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isResendingMobile ? 'animate-spin' : ''}`} />
                  <span>{isResendingMobile ? 'Sending...' : 'Resend to Phone'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* 1. Receive on WhatsApp Button */}
                <a
                  href={
                    smsDispatchInfo?.whatsappUrl ||
                    `https://api.whatsapp.com/send?phone=${pendingUser.mobile.replace(/\D/g, '')}&text=${encodeURIComponent(
                      `[Nestora] Your login verification OTP is: ${otpDevHint || ''}`
                    )}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Receive on WhatsApp</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>

                {/* 2. Open SMS Messaging App Button */}
                <a
                  href={
                    smsDispatchInfo?.smsUri ||
                    `sms:${pendingUser.mobile.replace(/\D/g, '')}?body=${encodeURIComponent(
                      `[Nestora] Your login verification OTP is: ${otpDevHint || ''}`
                    )}`
                  }
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open in SMS App</span>
                </a>
              </div>

              {/* 3. Quick-fill / Copy Bar */}
              {otpDevHint && (
                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <span>Dispatched Code:</span>
                    <span className="font-mono font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                      {otpDevHint}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpInput(otpDevHint);
                      }}
                      className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] cursor-pointer"
                    >
                      ⚡ Auto-Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(otpDevHint);
                        setCopiedOtp(true);
                        setTimeout(() => setCopiedOtp(false), 2000);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] cursor-pointer flex items-center gap-1"
                    >
                      {copiedOtp ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* OTP Status Notice */}
            {otpSuccessNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{otpSuccessNotice}</span>
              </div>
            )}

            {/* Error Message */}
            {otpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 text-center">
                  Enter 6-Digit OTP Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otpInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpInput(val);
                    }}
                    placeholder="• • • • • •"
                    className="w-full text-center text-2xl font-mono font-black tracking-widest py-3 border-2 border-emerald-500 rounded-2xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center mt-1.5">
                  Code is valid for 10 minutes. Enter to complete login.
                </p>
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || otpInput.trim().length !== 6}
                className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                  isVerifyingOtp || otpInput.trim().length !== 6
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {isVerifyingOtp ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify OTP & Sign In to {pendingUser.role === 'owner' ? 'Landowner Portal' : 'Tenant Portal'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSendingOtp}
                  onClick={() => handleSendOtp(pendingUser.role)}
                  className={`text-xs font-bold cursor-pointer ${
                    resendCooldown > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-emerald-700 hover:underline'
                  }`}
                >
                  {resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : 'Resend Verification Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('details');
                    setOtpError(null);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Change Email / Mobile
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ========================================================================= */
          /* DETAILS INPUT FORM (Landowner & Tenant tabs)                             */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Role Selection Tabs */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('owner');
                  setOtpError(null);
                }}
                className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  selectedRole === 'owner'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Landowner Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('resident');
                  setOtpError(null);
                }}
                className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  selectedRole === 'resident'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Tenant Portal ({cases.length} Units)</span>
              </button>
            </div>

            {/* Selected Role Form */}
            {selectedRole === 'owner' ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm max-w-2xl mx-auto space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                      <Building2 className="w-4 h-4" />
                      <span>Landowner & Property Manager</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900">
                      Landowner Login & Synced Info Form
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Info saved from any laptop automatically loads into this usable form. You can open the portal directly or verify via OTP.
                    </p>
                  </div>
                  {cloudSyncedAt && (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      Synced Across Laptops
                    </span>
                  )}
                </div>

                {/* SYNCED SAVED RECORDS PANEL (Immediately usable on Laptop 2) */}
                {(cases.length > 0 || landownerProfile.fullName) && (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-extrabold text-emerald-950">
                          Saved Info Synced from Cloud ({cases.length} {cases.length === 1 ? 'Apartment Unit' : 'Apartment Units'})
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        Click to Load or Open
                      </span>
                    </div>

                    {cases.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {cases.map((unit) => (
                          <div
                            key={unit.id}
                            className="p-3 rounded-xl bg-white border border-emerald-200/90 shadow-2xs flex flex-col justify-between gap-2.5"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-slate-900 text-white">
                                  {unit.roomCode}
                                </span>
                                <span className="font-mono text-xs font-bold text-emerald-700">
                                  ₹{unit.monthlyRent.toLocaleString('en-IN')}/mo
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {unit.pgName} · {unit.roomNo}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                Owner: {unit.landlordName || landownerProfile.fullName || 'Landowner'} ({unit.landlordEmail || landownerProfile.email || 'No email'})
                              </p>
                              <p className="text-[11px] text-slate-600 truncate">
                                Tenant: <strong className="text-slate-800">{unit.tenantName || 'Vacant'}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setOwnerNameInput(unit.landlordName || landownerProfile.fullName || '');
                                  setOwnerEmailInput(unit.landlordEmail || landownerProfile.email || '');
                                  setOwnerMobileInput(unit.landlordPhone || landownerProfile.mobile || '');
                                  setPropertyNameInput(unit.pgName || '');
                                }}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] cursor-pointer"
                              >
                                Fill Form
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onLogin({
                                    role: 'owner',
                                    identifier: unit.landlordEmail || landownerProfile.email || 'owner@nestora.app',
                                    name: unit.landlordName || landownerProfile.fullName || 'Landowner',
                                    pgName: unit.pgName || 'My Residences',
                                    roomCode: unit.roomCode,
                                    activeCaseId: unit.id,
                                  });
                                }}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer flex items-center justify-center gap-1"
                              >
                                <span>Open Unit</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                        <div className="text-xs">
                          <p className="font-bold text-slate-900">{landownerProfile.fullName}</p>
                          <p className="text-slate-500">{landownerProfile.email} · {landownerProfile.mobile}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleDirectSaveAndOpenOwner}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                        >
                          Open Saved Profile
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {otpError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendOtp('owner');
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Landowner Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={ownerNameInput}
                        onChange={(e) => setOwnerNameInput(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Landowner Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={ownerEmailInput}
                        onChange={(e) => setOwnerEmailInput(e.target.value)}
                        placeholder="e.g. name@example.com"
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Mobile Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        value={ownerMobileInput}
                        onChange={(e) => setOwnerMobileInput(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Property / Building Name
                    </label>
                    <div className="relative">
                      <Home className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={propertyNameInput}
                        onChange={(e) => setPropertyNameInput(e.target.value)}
                        placeholder="e.g. Sunrise Luxury Apartments"
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleDirectSaveAndOpenOwner}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Info & Open Portal</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isSendingOtp ? (
                        <span>Sending OTP...</span>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4 text-emerald-400" />
                          <span>Verify via Email/SMS OTP</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                      <UserCheck className="w-4 h-4" />
                      <span>Tenant & Prospective Resident Portal</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900">
                      Apartment Search & Tenant Access
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Browse apartments synced from all laptops, submit applications, or open your assigned unit directly.
                    </p>
                  </div>

                  {/* Mode Toggle: Browse All vs Sign In */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setTenantViewMode('browse')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        tenantViewMode === 'browse'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Browse All Apartments ({cases.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenantViewMode('signin')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        tenantViewMode === 'signin'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tenant Sign In / Form</span>
                    </button>
                  </div>
                </div>

                {/* Sub-view 1: Browse All Apartments */}
                {tenantViewMode === 'browse' ? (
                  <div className="space-y-5">
                    {/* Search & Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="relative sm:col-span-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search apartments or owner..."
                          className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-emerald-600"
                        />
                      </div>

                      <div>
                        <select
                          value={ownerFilter}
                          onChange={(e) => setOwnerFilter(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-emerald-600 cursor-pointer"
                        >
                          <option value="all">All Landowners ({distinctLandowners.length})</option>
                          {distinctLandowners.map((owner) => (
                            <option key={owner} value={owner}>
                              Owner: {owner}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-emerald-600 cursor-pointer"
                        >
                          <option value="all">All Apartment Types</option>
                          <option value="Studio / 1RK">Studio / 1RK</option>
                          <option value="1BHK Apartment">1BHK Apartment</option>
                          <option value="2BHK Apartment">2BHK Apartment</option>
                          <option value="3BHK Apartment">3BHK Apartment</option>
                        </select>
                      </div>
                    </div>

                    {/* Empty listings note */}
                    {cases.length === 0 ? (
                      <div className="p-8 rounded-3xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-3">
                        <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
                        <h3 className="text-sm font-bold text-slate-800">
                          No Apartments Listed Yet
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Property owners can log in via the Landowner Portal to list their apartments. Once saved on any laptop, tenants can immediately view and use them here.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedRole('owner')}
                          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-slate-800"
                        >
                          Landowner Login to List Units
                        </button>
                      </div>
                    ) : (
                      /* Apartment Listings Grid */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCasesForBrowse.map((unit) => {
                          const isVacant = unit.occupancyStatus !== 'approved_occupied';
                          const isApplying = openApplyUnitId === unit.id;

                          return (
                            <div
                              key={unit.id}
                              className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors shadow-2xs"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800">
                                    {unit.roomCode}
                                  </span>
                                  {isVacant ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      <span>Vacant · Ready</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                      Occupied ({unit.tenantName})
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                                    {unit.pgName}
                                  </h3>
                                  <p className="text-xs font-semibold text-emerald-700">
                                    {unit.roomNo} · {unit.sharingType}
                                  </p>
                                  {unit.propertyAddress && (
                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{unit.propertyAddress}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Landowner Tag */}
                                <div className="p-2 rounded-xl bg-white border border-slate-200 text-[11px] space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Landowner:</span>
                                    <span className="font-bold text-slate-900">
                                      {unit.landlordName || 'Verified Owner'}
                                    </span>
                                  </div>
                                  {unit.landlordPhone && (
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                                      <span>{unit.landlordPhone}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Pricing */}
                                <div className="flex items-center justify-between pt-1">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                      Monthly Rent
                                    </span>
                                    <span className="font-mono text-sm font-extrabold text-slate-900">
                                      ₹{unit.monthlyRent.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                      Deposit
                                    </span>
                                    <span className="font-mono text-sm font-extrabold text-emerald-700">
                                      ₹{unit.securityDeposit.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Apply Form or Trigger Buttons */}
                              {isApplying ? (
                                <form
                                  onSubmit={(e) => handleApplySubmit(e, unit)}
                                  className="pt-3 border-t border-slate-200 space-y-2"
                                >
                                  <input
                                    type="text"
                                    required
                                    value={applicantName}
                                    onChange={(e) => setApplicantName(e.target.value)}
                                    placeholder="Your Full Name *"
                                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                                  />
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                      type="email"
                                      required
                                      value={applicantEmail}
                                      onChange={(e) => setApplicantEmail(e.target.value)}
                                      placeholder="Your Email *"
                                      className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                                    />
                                    <input
                                      type="tel"
                                      required
                                      value={applicantPhone}
                                      onChange={(e) => setApplicantPhone(e.target.value)}
                                      placeholder="Mobile No. *"
                                      className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="submit"
                                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                                    >
                                      Send Application
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setOpenApplyUnitId(null)}
                                      className="px-2.5 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg cursor-pointer hover:bg-slate-100"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenApplyUnitId(unit.id);
                                      setApplicantName('');
                                      setApplicantEmail('');
                                      setApplicantPhone('');
                                    }}
                                    className="py-2 px-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Apply</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDirectOpenTenantUnit(unit)}
                                    className="py-2 px-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs"
                                  >
                                    <span>Open Portal</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Sub-view 2: Sign In to Assigned Rented Unit via Form or OTP */
                  <div className="max-w-xl mx-auto space-y-6">
                    {otpError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{otpError}</span>
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendOtp('resident');
                      }}
                      className="space-y-4"
                    >
                      {cases.length > 0 && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Select Synced Apartment Unit (Auto-Fills Form)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cases.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setSelectedUnitCode(u.roomCode);
                                  if (u.tenantName && u.tenantName !== 'Vacant Unit') {
                                    setTenantNameInput(u.tenantName);
                                  }
                                  if (u.tenantEmail) setTenantEmailInput(u.tenantEmail);
                                  if (u.tenantPhone) setTenantMobileInput(u.tenantPhone);
                                }}
                                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                  selectedUnitCode === u.roomCode
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs font-bold">
                                    {u.roomCode}
                                  </span>
                                  <span className="text-[10px] font-mono text-emerald-700">
                                    ₹{u.monthlyRent.toLocaleString('en-IN')}/mo
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-700 block truncate mt-0.5">
                                  {u.pgName} · {u.roomNo}
                                </span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                                  Tenant: {u.tenantName || 'Vacant'} · Owner: {u.landlordName}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Tenant Full Name *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            required
                            value={tenantNameInput}
                            onChange={(e) => setTenantNameInput(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Tenant Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="email"
                            required
                            value={tenantEmailInput}
                            onChange={(e) => setTenantEmailInput(e.target.value)}
                            placeholder="e.g. tenant@example.com"
                            className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Mobile Number *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="tel"
                            required
                            value={tenantMobileInput}
                            onChange={(e) => setTenantMobileInput(e.target.value)}
                            placeholder="e.g. +91 98765 43210"
                            className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDirectOpenTenantUnit()}
                          className="w-full py-3.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Open Tenant Portal</span>
                        </button>

                        <button
                          type="submit"
                          disabled={isSendingOtp}
                          className="w-full py-3.5 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        >
                          {isSendingOtp ? (
                            <span>Sending OTP...</span>
                          ) : (
                            <>
                              <KeyRound className="w-4 h-4 text-emerald-400" />
                              <span>Verify via OTP</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center pt-6 text-xs text-slate-400">
        Nestora · Multi-Landowner Tenancy & Rental Recovery Platform
      </footer>
    </div>
  );
};
