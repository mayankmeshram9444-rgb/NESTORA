import React, { useState } from 'react';
import {
  Building2,
  Plus,
  CheckCircle2,
  XCircle,
  Calculator,
  Zap,
  Trash2,
  ShieldCheck,
  MessageSquareWarning,
  Send,
  Sparkles,
  QrCode,
  Upload,
  RefreshCw,
  Calendar,
  Scale,
  Gavel,
  Printer,
  Download,
  Copy,
  Check,
  Camera,
  Mail,
  UserCog,
  Home,
  IndianRupee,
  CheckCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  PgCase,
  DeductionItem,
  RoomComparison,
  PaymentTransaction,
  ComplaintItem,
  LegalDamageDocument,
  RentEmailNotice,
  LandownerProfile,
} from '../types';
import {
  buildDefaultQrSvg,
  COMMON_APARTMENT_DAMAGE_PRESETS,
} from '../data/mockData';
import {
  generateLandownerLegalDocument,
  sendMonthlyRentNoticeEmail,
  sendAutomatedComplaintEmailToOwner,
  buildMailtoLink,
} from '../services/legalService';
import { ComparisonTab } from './ComparisonTab';
import { AgreementDetailsTab } from './AgreementDetailsTab';
import { AiAssistantTab } from './AiAssistantTab';

interface OwnerPortalProps {
  cases: PgCase[];
  activeCase: PgCase;
  onSelectCase: (caseId: string) => void;
  onUpdateCase: (updated: PgCase) => void;
  onDeleteCase?: (caseId: string) => void;
  onOpenNewCase: () => void;
  onVerifyUtr: (caseId: string, paymentId: string, approve: boolean) => void;
  landownerProfile: LandownerProfile;
  onSaveProfile: (profile: LandownerProfile) => void;
  externalOpenProfile?: boolean;
  onClearExternalOpenProfile?: () => void;
}

export const OwnerPortal: React.FC<OwnerPortalProps> = ({
  cases,
  activeCase,
  onSelectCase,
  onUpdateCase,
  onDeleteCase,
  onOpenNewCase,
  onVerifyUtr,
  landownerProfile,
  onSaveProfile,
  externalOpenProfile,
  onClearExternalOpenProfile,
}) => {
  const [ownerTab, setOwnerTab] = useState<
    | 'rooms'
    | 'profile'
    | 'deductions'
    | 'legal_doc'
    | 'utr'
    | 'complaints'
    | 'photos'
    | 'agreement'
    | 'ai'
  >('rooms');

  React.useEffect(() => {
    if (externalOpenProfile) {
      setOwnerTab('profile');
      onClearExternalOpenProfile?.();
    }
  }, [externalOpenProfile, onClearExternalOpenProfile]);

  // Edit Landowner Profile Form State
  const [profileDraft, setProfileDraft] =
    useState<LandownerProfile>(landownerProfile);
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setProfileDraft(landownerProfile);
  }, [landownerProfile]);

  // Editable Unit & Tenant Details Form State (Synced Across Laptops)
  const [unitFormDraft, setUnitFormDraft] = useState({
    pgName: activeCase.pgName || '',
    roomNo: activeCase.roomNo || '',
    roomCode: activeCase.roomCode || '',
    occupancyStatus: activeCase.occupancyStatus || 'occupied',
    tenantName: activeCase.tenantName || '',
    tenantEmail: activeCase.tenantEmail || '',
    tenantPhone: activeCase.tenantPhone || '',
    monthlyRent: activeCase.monthlyRent || 0,
    securityDeposit: activeCase.securityDeposit || 0,
    ownerUpiId: activeCase.ownerUpiId || '',
    stayDurationLabel: activeCase.stayDurationLabel || '11 Months',
  });
  const [unitFormSavedMsg, setUnitFormSavedMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setUnitFormDraft({
      pgName: activeCase.pgName || '',
      roomNo: activeCase.roomNo || '',
      roomCode: activeCase.roomCode || '',
      occupancyStatus: activeCase.occupancyStatus || 'occupied',
      tenantName: activeCase.tenantName || '',
      tenantEmail: activeCase.tenantEmail || '',
      tenantPhone: activeCase.tenantPhone || '',
      monthlyRent: activeCase.monthlyRent || 0,
      securityDeposit: activeCase.securityDeposit || 0,
      ownerUpiId: activeCase.ownerUpiId || '',
      stayDurationLabel: activeCase.stayDurationLabel || '11 Months',
    });
  }, [
    activeCase.id,
    activeCase.pgName,
    activeCase.roomNo,
    activeCase.roomCode,
    activeCase.occupancyStatus,
    activeCase.tenantName,
    activeCase.tenantEmail,
    activeCase.tenantPhone,
    activeCase.monthlyRent,
    activeCase.securityDeposit,
    activeCase.ownerUpiId,
    activeCase.stayDurationLabel,
  ]);

  const handleSaveUnitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCode = unitFormDraft.roomCode.trim().toUpperCase() || activeCase.roomCode;
    const isVacant = unitFormDraft.occupancyStatus === 'available';
    const updatedCase: PgCase = {
      ...activeCase,
      pgName: unitFormDraft.pgName.trim() || activeCase.pgName,
      roomNo: unitFormDraft.roomNo.trim() || activeCase.roomNo,
      roomCode: cleanedCode,
      occupancyStatus: unitFormDraft.occupancyStatus,
      tenantName: isVacant && !unitFormDraft.tenantName.trim()
        ? 'Vacant — Open for Tenant Applications'
        : unitFormDraft.tenantName.trim() || activeCase.tenantName,
      tenantEmail: unitFormDraft.tenantEmail.trim(),
      tenantPhone: unitFormDraft.tenantPhone.trim(),
      monthlyRent: Number(unitFormDraft.monthlyRent) || 0,
      securityDeposit: Number(unitFormDraft.securityDeposit) || 0,
      ownerUpiId: unitFormDraft.ownerUpiId.trim() || activeCase.ownerUpiId,
      stayDurationLabel: unitFormDraft.stayDurationLabel.trim() || '11 Months',
    };
    onUpdateCase(updatedCase);
    setUnitFormSavedMsg(
      `Saved & synced ${cleanedCode} (${updatedCase.pgName} - ${updatedCase.roomNo}) across all connected laptops.`
    );
    setTimeout(() => setUnitFormSavedMsg(null), 4000);
  };

  const todayIso = new Date().toISOString().split('T')[0];
  const defaultTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // New damage/deduction form
  const [dedTitle, setDedTitle] = useState('');
  const [dedCategory, setDedCategory] =
    useState<DeductionItem['category']>('appliance');
  const [dedAmount, setDedAmount] = useState<number>(6500);
  const [dedDate, setDedDate] = useState<string>(todayIso);
  const [dedBillRef, setDedBillRef] = useState<string>('');
  const [dedReason, setDedReason] = useState('');

  // Legal Document Generator State
  const [docType, setDocType] = useState<
    'damage_recovery_notice' | 'deposit_forfeiture_order' | 'civil_claim_draft'
  >('damage_recovery_notice');
  const [advocateName, setAdvocateName] = useState('');
  const [demandDays, setDemandDays] = useState<number>(7);
  const [extraRemarks, setExtraRemarks] = useState('');
  const [generatingLegalDoc, setGeneratingLegalDoc] = useState(false);
  const [generatedDocPreview, setGeneratedDocPreview] = useState<string>(() => {
    return activeCase.legalDocuments?.[0]?.documentText || '';
  });
  const [generatedRefNo, setGeneratedRefNo] = useState<string>(() => {
    return (
      activeCase.legalDocuments?.[0]?.refNo ||
      `LGL-${activeCase.roomCode}-2026-8419`
    );
  });
  const [copiedLegalDoc, setCopiedLegalDoc] = useState(false);
  const [servedBanner, setServedBanner] = useState<string | null>(null);

  // Direct Landowner Receipt Generator State
  const [directAmount, setDirectAmount] = useState<number>(
    activeCase.monthlyRent
  );
  const [directType, setDirectType] =
    useState<PaymentTransaction['paymentType']>('monthly_rent');
  const [directMethod, setDirectMethod] =
    useState<PaymentTransaction['paymentMethod']>('UPI / GPay');
  const [directPeriod, setDirectPeriod] = useState('Monthly Rent');
  const [directDate, setDirectDate] = useState<string>(todayIso);
  const [directTime, setDirectTime] = useState<string>(defaultTime);
  const [directSender, setDirectSender] = useState<string>('');
  const [directUtr, setDirectUtr] = useState('');

  // Complaint reply drafts
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // New agreement clause input
  const [newClauseText, setNewClauseText] = useState('');

  // Monthly Rent Notice Email State
  const [rentEmailTo, setRentEmailTo] = useState(
    activeCase.tenantEmail || ''
  );
  const [rentBillingMonth, setRentBillingMonth] = useState('November 2026');
  const [rentDueDate, setRentDueDate] = useState(
    activeCase.rentDueDay || '5th of every month'
  );
  const [rentCustomNote, setRentCustomNote] = useState('');
  const [sendingRentEmail, setSendingRentEmail] = useState(false);
  const [rentEmailSuccess, setRentEmailSuccess] = useState<string | null>(null);
  const [previewRentNotice, setPreviewRentNotice] =
    useState<RentEmailNotice | null>(null);

  // Overview Card Metrics (Requested at top of dashboard)
  const occupiedUnitsCount = cases.filter(
    (c) =>
      c.occupancyStatus !== 'available' &&
      c.occupancyStatus !== 'pending_application'
  ).length;
  const vacantUnitsCount = cases.filter(
    (c) =>
      c.occupancyStatus === 'available' ||
      c.occupancyStatus === 'pending_application'
  ).length;
  const totalPropertiesCount = cases.length;
  const expectedMonthlyRent = cases.reduce((s, c) => s + c.monthlyRent, 0);

  const totalPendingApplications = cases.reduce(
    (s, c) =>
      s +
      (c.tenantApplications || []).filter((a) => a.status === 'pending').length,
    0
  );

  const handleAcceptTenantApplication = (
    targetRoom: PgCase,
    appId: string
  ) => {
    const app = (targetRoom.tenantApplications || []).find(
      (a) => a.id === appId
    );
    if (!app) return;

    const approvedTimestamp = `${todayIso} · ${defaultTime}`;
    const cleanRoomNo = targetRoom.roomNo.replace(
      /\s*—\s*Vacant\s*&\s*Available/i,
      ''
    );

    const updatedApplications = (targetRoom.tenantApplications || []).map((a) =>
      a.id === appId
        ? { ...a, status: 'accepted' as const, approvedAt: approvedTimestamp }
        : a
    );

    const updatedRoom: PgCase = {
      ...targetRoom,
      roomNo: cleanRoomNo,
      occupancyStatus: 'approved_occupied',
      tenantName: app.applicantName,
      tenantEmail: app.applicantEmail,
      tenantPhone: app.applicantPhone,
      tenantKycId: app.applicantKycId || 'Aadhaar & PAN Verified',
      startDate: app.moveInDate || targetRoom.startDate,
      stayDurationLabel:
        app.stayDurationLabel || targetRoom.stayDurationLabel || '11 Months Lease',
      rentStatus: 'Pending',
      status: 'Active',
      tenantApplications: updatedApplications,
      payments: targetRoom.payments || [],
    };

    onUpdateCase(updatedRoom);
    onSelectCase(updatedRoom.id);
    setRentEmailTo(app.applicantEmail);
    setRentEmailSuccess(
      `Accepted ${app.applicantName}'s application & assigned Apartment ${targetRoom.roomCode} (${cleanRoomNo})! ${app.applicantName} can now log in on the Tenant Login page.`
    );
  };

  const handleRejectTenantApplication = (
    targetRoom: PgCase,
    appId: string
  ) => {
    const updatedApplications = (targetRoom.tenantApplications || []).map((a) =>
      a.id === appId ? { ...a, status: 'rejected' as const } : a
    );
    const hasOtherPending = updatedApplications.some(
      (a) => a.status === 'pending'
    );

    onUpdateCase({
      ...targetRoom,
      occupancyStatus: hasOtherPending ? 'pending_application' : 'available',
      tenantApplications: updatedApplications,
    });
  };

  const totalPendingUtrCount = cases.reduce(
    (s, c) =>
      s +
      c.payments.filter((p) => p.status === 'pending_verification').length,
    0
  );
  const totalOpenComplaints = cases.reduce(
    (s, c) =>
      s + (c.complaints || []).filter((cmp) => cmp.status !== 'Resolved').length,
    0
  );

  const activeTotalDeductions = activeCase.deductions.reduce(
    (s, d) => s + d.amount,
    0
  );
  const activeDepositRemaining = Math.max(
    0,
    activeCase.securityDeposit - activeTotalDeductions
  );
  const activeExcessRecoveryDue = Math.max(
    0,
    activeTotalDeductions - activeCase.securityDeposit
  );

  const currentQrPreview =
    activeCase.ownerQrCodeUrl ||
    buildDefaultQrSvg(
      activeCase.ownerUpiId || 'greenview.owner@okhdfcbank',
      activeCase.pgName
    );

  const [customProfileLang, setCustomProfileLang] = useState('');

  const selectedProfileLanguages: string[] =
    profileDraft.preferredLanguages && profileDraft.preferredLanguages.length > 0
      ? profileDraft.preferredLanguages
      : profileDraft.preferredLanguage
        ? profileDraft.preferredLanguage
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['English'];

  const toggleProfileLanguage = (lang: string) => {
    const exists = selectedProfileLanguages.includes(lang);
    const nextLangs = exists
      ? selectedProfileLanguages.length > 1
        ? selectedProfileLanguages.filter((l) => l !== lang)
        : [lang]
      : [...selectedProfileLanguages, lang];

    setProfileDraft((prev) => ({
      ...prev,
      preferredLanguages: nextLangs,
      preferredLanguage: nextLangs.join(', '),
    }));
  };

  const handleAddCustomProfileLanguage = () => {
    const clean = customProfileLang.trim();
    if (!clean) return;
    if (!selectedProfileLanguages.includes(clean)) {
      const nextLangs = [...selectedProfileLanguages, clean];
      setProfileDraft((prev) => ({
        ...prev,
        preferredLanguages: nextLangs,
        preferredLanguage: nextLangs.join(', '),
      }));
    }
    setCustomProfileLang('');
  };

  // Profile Photo Upload Handler
  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileDraft((prev) => ({ ...prev, photoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfileForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileDraft.fullName.trim() || !profileDraft.email.trim()) {
      return;
    }
    onSaveProfile({
      ...profileDraft,
      fullName: profileDraft.fullName.trim(),
      email: profileDraft.email.trim(),
      mobile: profileDraft.mobile.trim(),
      preferredLanguages: selectedProfileLanguages,
      preferredLanguage: selectedProfileLanguages.join(', '),
    });
    setProfileSavedMsg('Profile saved.');
    setTimeout(() => setProfileSavedMsg(null), 3000);
  };

  const handleCancelProfileForm = () => {
    setProfileDraft(landownerProfile);
    setOwnerTab('rooms');
  };

  // Handle Landowner uploading a custom QR Scanner image
  const handleOwnerQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const updatedStamp =
          new Date().toLocaleDateString('en-IN', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          }) +
          ` · ${new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}`;

        onUpdateCase({
          ...activeCase,
          ownerQrCodeUrl: reader.result,
          ownerQrUpdatedAt: updatedStamp,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegenerateQrFromUpi = () => {
    const upi = activeCase.ownerUpiId || 'greenview.owner@okhdfcbank';
    const updatedStamp =
      new Date().toLocaleDateString('en-IN', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }) +
      ` · ${new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    onUpdateCase({
      ...activeCase,
      ownerQrCodeUrl: buildDefaultQrSvg(upi, activeCase.pgName),
      ownerQrUpdatedAt: updatedStamp,
    });
  };

  const handleToggleRentStatus = (room: PgCase) => {
    const nextOrder: Record<PgCase['rentStatus'], PgCase['rentStatus']> = {
      Paid: 'Pending',
      Pending: 'Overdue',
      Overdue: 'Paid',
    };
    onUpdateCase({
      ...room,
      rentStatus: nextOrder[room.rentStatus],
    });
  };

  const handleAddOwnerDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dedTitle.trim() || dedAmount <= 0) return;

    const newItem: DeductionItem = {
      id: `ded-${Date.now()}`,
      title: dedTitle.trim(),
      amount: dedAmount,
      category: dedCategory,
      status: 'disputed',
      dateRecorded: dedDate || todayIso,
      billRefNo:
        dedBillRef.trim() ||
        `INV-${activeCase.roomCode.split('-')[1] || '101'}-${Math.floor(
          100 + Math.random() * 899
        )}`,
      addedBy: `${activeCase.landlordName}`,
      landlordClaim: dedReason.trim() || 'Move-out damage.',
      tenantRebuttal: 'Logged at move-out.',
      fairAmount: dedAmount,
    };

    onUpdateCase({
      ...activeCase,
      deductions: [...activeCase.deductions, newItem],
    });

    setDedTitle('');
    setDedReason('');
    setDedBillRef('');
    setDedAmount(5000);
  };

  const handleQuickAddDamagePreset = (
    preset: (typeof COMMON_APARTMENT_DAMAGE_PRESETS)[0]
  ) => {
    const newItem: DeductionItem = {
      id: `ded-${Date.now()}`,
      title: preset.title,
      amount: preset.amount,
      category: preset.category,
      status: 'disputed',
      dateRecorded: `${todayIso} · ${defaultTime}`,
      billRefNo: preset.billRefNo,
      addedBy: activeCase.landlordName,
      landlordClaim: preset.claim,
      tenantRebuttal: 'Move-out damage claim.',
      fairAmount: preset.amount,
    };

    onUpdateCase({
      ...activeCase,
      deductions: [...activeCase.deductions, newItem],
    });
  };

  const handleUpdateDeductionAmount = (id: string, newAmount: number) => {
    onUpdateCase({
      ...activeCase,
      deductions: activeCase.deductions.map((d) =>
        d.id === id ? { ...d, amount: newAmount, fairAmount: newAmount } : d
      ),
    });
  };

  const handleDeleteDeduction = (id: string) => {
    onUpdateCase({
      ...activeCase,
      deductions: activeCase.deductions.filter((d) => d.id !== id),
    });
  };

  const handleGenerateLegalDocument = async () => {
    setGeneratingLegalDoc(true);
    setServedBanner(null);
    try {
      const result = await generateLandownerLegalDocument({
        caseDetails: activeCase,
        documentType: docType,
        customDamages: activeCase.deductions,
        advocateName,
        demandDays,
        extraRemarks,
      });

      setGeneratedDocPreview(result.documentText);
      setGeneratedRefNo(result.refNo);

      const newLegalDoc: LegalDamageDocument = {
        id: `lgl-${Date.now()}`,
        refNo: result.refNo,
        documentType: docType,
        title: `${
          docType === 'deposit_forfeiture_order'
            ? 'Deposit Deduction Order'
            : docType === 'civil_claim_draft'
            ? 'Civil Recovery Claim'
            : 'Legal Notice for Damages'
        } — ${activeCase.roomNo} (₹${activeTotalDeductions.toLocaleString('en-IN')})`,
        generatedAt: result.generatedAt,
        advocateName,
        demandDays,
        totalDamageAmount: activeTotalDeductions,
        depositAdjusted: Math.min(
          activeCase.securityDeposit,
          activeTotalDeductions
        ),
        netBalancePayable: activeExcessRecoveryDue,
        status: 'Served to Tenant',
        documentText: result.documentText,
        emailedTo: result.emailedTo || activeCase.tenantEmail,
        emailPreviewUrl: result.emailPreviewUrl,
      };

      onUpdateCase({
        ...activeCase,
        status: 'Legal Notice Issued',
        legalDocuments: [
          newLegalDoc,
          ...(activeCase.legalDocuments || []),
        ],
      });

      setServedBanner(
        `Legal Notice #${result.refNo} served & emailed to ${activeCase.tenantName} (${activeCase.tenantEmail}).`
      );
    } finally {
      setGeneratingLegalDoc(false);
    }
  };

  const handleDownloadLegalDocumentTxt = (text: string, refNo: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${refNo}_${activeCase.roomCode}_Legal_Document.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyLegalDocument = () => {
    if (!generatedDocPreview) return;
    navigator.clipboard.writeText(generatedDocPreview);
    setCopiedLegalDoc(true);
    setTimeout(() => setCopiedLegalDoc(false), 2000);
  };

  const handleIssueDirectReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (directAmount <= 0) return;

    const nowStr =
      new Date().toLocaleDateString('en-IN', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }) +
      ` · ${new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    const newTx: PaymentTransaction = {
      id: `pay-${Date.now()}`,
      receiptNo: `RCP-${activeCase.roomCode.replace('-', '')}-${new Date().getFullYear()}-${Math.floor(
        100 + Math.random() * 899
      )}`,
      utrNumber:
        directUtr.trim() ||
        `OWN-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      amount: directAmount,
      paymentType: directType,
      paymentMethod: directMethod,
      monthOrPeriod: directPeriod.trim() || 'Rent Payment',
      date: directDate || todayIso,
      paymentTime: directTime.trim() || defaultTime,
      submittedAt: `${directDate || todayIso} · ${directTime.trim() || defaultTime}`,
      senderAccountOrUpi:
        directSender.trim() || `${activeCase.tenantName}`,
      receiverAccountOrUpi:
        activeCase.ownerUpiId || 'emeraldcrest.landowner@okhdfcbank',
      status: 'verified',
      submittedBy: activeCase.tenantName,
      verifiedBy: activeCase.landlordName,
      verifiedAt: nowStr,
      notes: `${directPeriod.trim()} verified on ${directDate} at ${directTime}.`,
    };

    onUpdateCase({
      ...activeCase,
      rentStatus:
        directType === 'monthly_rent' ? 'Paid' : activeCase.rentStatus,
      payments: [newTx, ...activeCase.payments],
    });

    setDirectUtr('');
    setDirectSender('');
  };

  const handleUpdateComplaint = (
    room: PgCase,
    complaintId: string,
    newStatus: ComplaintItem['status'],
    replyText?: string
  ) => {
    const nowStr =
      new Date().toLocaleDateString('en-IN', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }) +
      ` · ${new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    const targetCmp = (room.complaints || []).find((c) => c.id === complaintId);

    const updatedComplaints = (room.complaints || []).map((cmp) => {
      if (cmp.id !== complaintId) return cmp;
      return {
        ...cmp,
        status: newStatus,
        ownerReply:
          replyText !== undefined && replyText.trim() !== ''
            ? replyText.trim()
            : cmp.ownerReply,
        resolvedAt: newStatus === 'Resolved' ? nowStr : cmp.resolvedAt,
      };
    });

    onUpdateCase({
      ...room,
      complaints: updatedComplaints,
    });

    if (targetCmp && (replyText || newStatus === 'Resolved')) {
      sendAutomatedComplaintEmailToOwner({
        caseDetails: room,
        ownerEmail: landownerProfile.email || room.landlordEmail,
        ticketNo: targetCmp.ticketNo,
        title: targetCmp.title,
        category: targetCmp.category,
        priority: targetCmp.priority,
        description: targetCmp.description,
        createdAt: nowStr,
        isResolutionReply: true,
        ownerReply: replyText || `Marked as ${newStatus}`,
      }).catch(() => {});
    }
  };

  const handleAddAgreementClause = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClauseText.trim()) return;
    const existing = activeCase.agreementTerms || [];
    onUpdateCase({
      ...activeCase,
      agreementTerms: [...existing, newClauseText.trim()],
    });
    setNewClauseText('');
  };

  const handleRemoveAgreementClause = (index: number) => {
    const existing = activeCase.agreementTerms || [];
    onUpdateCase({
      ...activeCase,
      agreementTerms: existing.filter((_, i) => i !== index),
    });
  };

  const handleAddComparison = (
    comp: RoomComparison,
    damageDeduction?: { title: string; amount: number; claim: string }
  ) => {
    const newDeductions = [...activeCase.deductions];
    if (damageDeduction && damageDeduction.amount > 0) {
      newDeductions.push({
        id: `ded-${Date.now()}`,
        title: damageDeduction.title,
        amount: damageDeduction.amount,
        category: 'appliance',
        status: 'disputed',
        dateRecorded: `${todayIso} · ${defaultTime}`,
        billRefNo:
          comp.ollamaAnalysis?.quotationNo ||
          `INV-PHOTO-${activeCase.roomCode.split('-')[1] || '402'}-${Math.floor(
            100 + Math.random() * 899
          )}`,
        addedBy: activeCase.landlordName,
        landlordClaim: damageDeduction.claim,
        tenantRebuttal: 'Logged from Ollama Move-In / Move-Out photo quotation.',
        fairAmount: damageDeduction.amount,
      });
    }
    onUpdateCase({
      ...activeCase,
      comparisons: [...activeCase.comparisons, comp],
      deductions: newDeductions,
    });
  };

  const handleUpdateComparison = (comp: RoomComparison) => {
    onUpdateCase({
      ...activeCase,
      comparisons: activeCase.comparisons.some((c) => c.id === comp.id)
        ? activeCase.comparisons.map((c) => (c.id === comp.id ? comp : c))
        : [...activeCase.comparisons, comp],
    });
  };

  const handleDeleteComparison = (compId: string) => {
    onUpdateCase({
      ...activeCase,
      comparisons: activeCase.comparisons.filter((c) => c.id !== compId),
    });
  };

  const handleLogDamageFromPhoto = (
    title: string,
    amount: number,
    claim: string
  ) => {
    const newItem: DeductionItem = {
      id: `ded-${Date.now()}`,
      title,
      amount,
      category: 'appliance',
      status: 'disputed',
      dateRecorded: `${todayIso} · ${defaultTime}`,
      billRefNo: `INV-PHOTO-${activeCase.roomCode.split('-')[1] || '402'}-${Math.floor(
        100 + Math.random() * 899
      )}`,
      addedBy: activeCase.landlordName,
      landlordClaim: claim,
      tenantRebuttal: 'Logged from photo inspection.',
      fairAmount: amount,
    };

    onUpdateCase({
      ...activeCase,
      deductions: [...activeCase.deductions, newItem],
    });
  };

  const handleSendRentEmail = async (targetRoom: PgCase, customTo?: string) => {
    setSendingRentEmail(true);
    setRentEmailSuccess(null);
    try {
      const meterUnits = Math.max(
        0,
        targetRoom.endMeterUnits - targetRoom.startMeterUnits
      );
      const elecBill = meterUnits * targetRoom.meterRatePerUnit;
      const recipient = (customTo || targetRoom.tenantEmail || rentEmailTo).trim();

      const notice = await sendMonthlyRentNoticeEmail({
        caseDetails: targetRoom,
        recipientEmail: recipient,
        billingMonth: rentBillingMonth,
        rentAmount: targetRoom.monthlyRent,
        electricityAmount: elecBill,
        dueDate: rentDueDate || targetRoom.rentDueDay || '5th of every month',
        customNote: rentCustomNote,
      });

      onUpdateCase({
        ...targetRoom,
        tenantEmail: recipient,
        rentEmailNotices: [notice, ...(targetRoom.rentEmailNotices || [])],
      });

      setRentEmailSuccess(
        `Rent notice sent to ${recipient}`
      );
    } finally {
      setSendingRentEmail(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* OVERVIEW CARDS — Displayed at the top of the dashboard */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {landownerProfile.photoUrl ? (
              <img
                src={landownerProfile.photoUrl}
                alt={landownerProfile.fullName}
                className="w-9 h-9 rounded-full object-cover border border-slate-300"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                {landownerProfile.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {landownerProfile.fullName}
              </h2>
              <p className="text-[11px] text-slate-500">
                {landownerProfile.email} · {landownerProfile.preferredLanguage}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOwnerTab('profile')}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <UserCog className="w-3.5 h-3.5 text-slate-600" />
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendRentEmail(activeCase, activeCase.tenantEmail)}
              disabled={sendingRentEmail}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{sendingRentEmail ? 'Sending...' : 'Rent Email'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenNewCase}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Unit</span>
            </button>
          </div>
        </div>

        {/* 4 Requested Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold text-slate-500">
                Total properties
              </span>
              <Building2 className="w-4 h-4 text-slate-700" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalPropertiesCount}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold text-slate-500">
                Occupied units
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums">
              {occupiedUnitsCount}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold text-slate-500">
                Vacant units
              </span>
              <Home className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
              {vacantUnitsCount}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold text-slate-500">
                Expected monthly rent
              </span>
              <IndianRupee className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              ₹{expectedMonthlyRent.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs + Unit Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setOwnerTab('rooms')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              ownerTab === 'rooms'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Units</span>
            {totalPendingApplications > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 rounded-full">
                {totalPendingApplications}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setOwnerTab('profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              ownerTab === 'profile'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setOwnerTab('deductions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              ownerTab === 'deductions'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Damages</span>
          </button>

          <button
            type="button"
            onClick={() => setOwnerTab('legal_doc')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              ownerTab === 'legal_doc'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>Legal Notice</span>
          </button>

          <button
            type="button"
            onClick={() => setOwnerTab('utr')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              ownerTab === 'utr'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Payments</span>
            {totalPendingUtrCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 rounded-full">
                {totalPendingUtrCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setOwnerTab('complaints')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              ownerTab === 'complaints'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span>Disputes</span>
            {totalOpenComplaints > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 rounded-full">
                {totalOpenComplaints}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setOwnerTab('photos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              ownerTab === 'photos'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Move-In / Out Photos</span>
          </button>

          <button
            type="button"
            onClick={() => setOwnerTab('agreement')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              ownerTab === 'agreement'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents & Agreement</span>
          </button>

          <button
            type="button"
            onClick={() => setOwnerTab('ai')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              ownerTab === 'ai'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistant</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Unit:</span>
          <select
            value={activeCase.id}
            onChange={(e) => {
              const newId = e.target.value;
              onSelectCase(newId);
              const found = cases.find((c) => c.id === newId);
              if (found) {
                setRentEmailTo(found.tenantEmail);
                setRentDueDate(found.rentDueDay || '5th of every month');
                setGeneratedDocPreview(
                  found.legalDocuments?.[0]?.documentText || ''
                );
                setGeneratedRefNo(
                  found.legalDocuments?.[0]?.refNo ||
                    `LGL-${found.roomCode}-2026-8419`
                );
              }
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs cursor-pointer"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.roomCode} — {c.tenantName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rentEmailSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-2.5 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{rentEmailSuccess}</span>
          </div>
          {activeCase.rentEmailNotices?.[0] && (
            <div className="flex items-center gap-2">
              {activeCase.rentEmailNotices[0].emailPreviewUrl && (
                <a
                  href={activeCase.rentEmailNotices[0].emailPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold inline-flex items-center gap-1"
                >
                  <span>SMTP Receipt</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <a
                href={buildMailtoLink(
                  activeCase.rentEmailNotices[0].recipientEmail,
                  activeCase.rentEmailNotices[0].subject,
                  activeCase.rentEmailNotices[0].bodyText
                )}
                className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-[11px] font-bold inline-flex items-center gap-1"
              >
                <Mail className="w-3 h-3" />
                <span>Send via Mail App</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewRentNotice(activeCase.rentEmailNotices![0])}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-bold cursor-pointer shrink-0"
              >
                View Email
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: EDIT LANDOWNER PROFILE (RentProof · Account settings) */}
      {ownerTab === 'profile' && (
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Edit Landowner Profile
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                RentProof · Account settings
              </p>
            </div>
            {profileSavedMsg && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{profileSavedMsg}</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfileForm} className="space-y-6">
            {/* Profile Photo */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Profile Photo
              </h4>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                {profileDraft.photoUrl ? (
                  <img
                    src={profileDraft.photoUrl}
                    alt="Profile preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-900 text-white font-extrabold text-xl flex items-center justify-center shrink-0">
                    {profileDraft.fullName
                      ? profileDraft.fullName.charAt(0).toUpperCase()
                      : 'L'}
                  </div>
                )}

                <div className="space-y-1.5 flex-1">
                  <p className="text-xs font-semibold text-slate-800">
                    Add a photo to personalize your account.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Photo upload can be connected in the website implementation.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {profileDraft.photoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setProfileDraft((prev) => ({
                            ...prev,
                            photoUrl: undefined,
                          }))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 text-xs font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Personal Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileDraft.fullName}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={profileDraft.email}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={profileDraft.mobile}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        mobile: e.target.value,
                      }))
                    }
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono focus:outline-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Vacant units
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profileDraft.vacantUnits}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        vacantUnits: Math.max(
                          0,
                          parseInt(e.target.value, 10) || 0
                        ),
                      }))
                    }
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono focus:outline-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={profileDraft.residentialAddress}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({
                      ...prev,
                      residentialAddress: e.target.value,
                    }))
                  }
                  placeholder="Enter residential address"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-slate-900"
                />
              </div>
            </div>

            {/* Preferred Language (Multi-select from many languages) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Preferred Language
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  Selected: {selectedProfileLanguages.join(', ')}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(
                  new Set([
                    'English',
                    'Hindi',
                    'Marathi',
                    'Kannada',
                    'Tamil',
                    'Telugu',
                    'Gujarati',
                    'Bengali',
                    'Malayalam',
                    'Punjabi',
                    'Urdu',
                    'Odia',
                    'Assamese',
                    'Konkani',
                    'Sanskrit',
                    'Spanish',
                    'French',
                    'German',
                    'Arabic',
                    'Japanese',
                    ...selectedProfileLanguages,
                  ])
                ).map((lang) => {
                  const isSelected = selectedProfileLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleProfileLanguage(lang)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>{lang}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1 max-w-xs">
                <input
                  type="text"
                  value={customProfileLang}
                  onChange={(e) => setCustomProfileLang(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomProfileLanguage();
                    }
                  }}
                  placeholder="Add another language..."
                  className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddCustomProfileLanguage}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* About You (Optional) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                About You (Optional)
              </label>
              <textarea
                rows={3}
                value={profileDraft.aboutYou}
                onChange={(e) =>
                  setProfileDraft((prev) => ({
                    ...prev,
                    aboutYou: e.target.value,
                  }))
                }
                placeholder="Short bio or property management notes..."
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-slate-900"
              />
            </div>

            {/* Cancel / Save Changes */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelProfileForm}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty State when 0 Units exist */}
      {cases.length === 0 && ownerTab !== 'profile' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">
              No Apartment Units Added Yet
            </h3>
            <p className="text-xs text-slate-500">
              Your database is completely clean with zero fake records. Add your first apartment unit to start tracking rent payments, move-in/out inspections, and tenant agreements.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onOpenNewCase}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Apartment Unit</span>
            </button>
            <button
              type="button"
              onClick={() => setOwnerTab('profile')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              <UserCog className="w-4 h-4" />
              <span>Edit Landowner Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: UNITS & MONTHLY RENT EMAIL */}
      {cases.length > 0 && ownerTab === 'rooms' && (
        <div className="space-y-5">
          {/* Selected Unit & Tenant Editable Form (Synced Across Laptops) */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Selected Apartment Unit & Tenant Form ({activeCase.roomCode})
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    Live Multi-Laptop Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Any unit or tenant info saved on one laptop automatically populates this form on your other laptops and can be edited & saved immediately.
                </p>
              </div>
              {cases.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cases.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectCase(c.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold cursor-pointer border transition-all ${
                        c.id === activeCase.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {c.roomCode}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {unitFormSavedMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{unitFormSavedMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleSaveUnitForm}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
            >
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Apartment / Building Name
                </label>
                <input
                  type="text"
                  required
                  value={unitFormDraft.pgName}
                  onChange={(e) =>
                    setUnitFormDraft({ ...unitFormDraft, pgName: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Flat / Unit Number
                </label>
                <input
                  type="text"
                  required
                  value={unitFormDraft.roomNo}
                  onChange={(e) =>
                    setUnitFormDraft({ ...unitFormDraft, roomNo: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Unit Access Code
                </label>
                <input
                  type="text"
                  required
                  value={unitFormDraft.roomCode}
                  onChange={(e) =>
                    setUnitFormDraft({
                      ...unitFormDraft,
                      roomCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Occupancy Status
                </label>
                <select
                  value={unitFormDraft.occupancyStatus}
                  onChange={(e) =>
                    setUnitFormDraft({
                      ...unitFormDraft,
                      occupancyStatus: e.target.value as PgCase['occupancyStatus'],
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
                >
                  <option value="occupied">Occupied by Tenant</option>
                  <option value="available">Available Listing (Vacant)</option>
                  <option value="pending_application">Application Pending</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Tenant Full Name
                </label>
                <input
                  type="text"
                  value={unitFormDraft.tenantName}
                  onChange={(e) =>
                    setUnitFormDraft({
                      ...unitFormDraft,
                      tenantName: e.target.value,
                    })
                  }
                  placeholder="Tenant Name"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Tenant Email
                </label>
                <input
                  type="email"
                  value={unitFormDraft.tenantEmail}
                  onChange={(e) =>
                    setUnitFormDraft({
                      ...unitFormDraft,
                      tenantEmail: e.target.value,
                    })
                  }
                  placeholder="tenant@example.com"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Tenant Mobile Number
                </label>
                <input
                  type="text"
                  value={unitFormDraft.tenantPhone}
                  onChange={(e) =>
                    setUnitFormDraft({
                      ...unitFormDraft,
                      tenantPhone: e.target.value,
                    })
                  }
                  placeholder="+91 98765 43210"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Monthly Rent (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={unitFormDraft.monthlyRent}
                  onChange={(e) =>
                    setUnitFormDraft({
                      ...unitFormDraft,
                      monthlyRent: Number(e.target.value),
                    })
                  }
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Security Deposit (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={unitFormDraft.securityDeposit}
                  onChange={(e) =>
                    setUnitFormDraft({
                      ...unitFormDraft,
                      securityDeposit: Number(e.target.value),
                    })
                  }
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save & Sync Unit</span>
              </button>
            </form>
          </div>

          {/* Monthly Rent Notice Email */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Monthly Rent Notice ({activeCase.roomCode})
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">
                ₹{activeCase.monthlyRent.toLocaleString('en-IN')}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendRentEmail(activeCase, rentEmailTo);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end"
            >
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Tenant Email
                </label>
                <input
                  type="email"
                  required
                  value={rentEmailTo}
                  onChange={(e) => setRentEmailTo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Month
                </label>
                <input
                  type="text"
                  required
                  value={rentBillingMonth}
                  onChange={(e) => setRentBillingMonth(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Due Date
                </label>
                <input
                  type="text"
                  required
                  value={rentDueDate}
                  onChange={(e) => setRentDueDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={rentCustomNote}
                  onChange={(e) => setRentCustomNote(e.target.value)}
                  placeholder="Optional"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={sendingRentEmail}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingRentEmail ? 'Sending...' : 'Send Email'}</span>
              </button>
            </form>

            {(activeCase.rentEmailNotices || []).length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                {activeCase.rentEmailNotices!.map((rn) => (
                  <div
                    key={rn.id}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs"
                  >
                    <span className="font-bold text-slate-800">
                      {rn.billingMonth}: ₹{rn.totalPayable.toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewRentNotice(rn)}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tenant Apartment Applications — Accept & Give Apartment */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Tenant Apartment Applications — Accept & Give Apartment
                  </span>
                  {totalPendingApplications > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                      {totalPendingApplications} Pending Approval
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prospective tenants apply on the Tenant Login Page after reviewing apartment details. Accept an application to assign the apartment and unlock Tenant Login.
                </p>
              </div>
            </div>

            {cases.every(
              (c) => (c.tenantApplications || []).length === 0
            ) ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>
                  No tenant applications submitted yet. Available apartments (
                  {cases
                    .filter(
                      (c) =>
                        c.occupancyStatus === 'available' ||
                        c.occupancyStatus === 'pending_application'
                    )
                    .map((c) => c.roomCode)
                    .join(', ') || 'None'}
                  ) are live on the Tenant Login Page for prospective tenants to apply.
                </span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cases.map((room) =>
                  (room.tenantApplications || []).map((app) => (
                    <div
                      key={app.id}
                      className={`p-4 rounded-xl border text-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                        app.status === 'pending'
                          ? 'bg-amber-50/70 border-amber-200'
                          : app.status === 'accepted'
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white text-[11px]">
                            {room.roomCode}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {app.applicantName}
                          </span>
                          <span className="text-slate-600">
                            ({app.applicantEmail} · {app.applicantPhone})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              app.status === 'pending'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : app.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            {app.status === 'pending'
                              ? 'Pending Landowner Approval'
                              : app.status === 'accepted'
                              ? 'Accepted & Apartment Given'
                              : 'Rejected'}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          <strong>Apartment:</strong> {room.pgName} —{' '}
                          {room.roomNo} (Rent: ₹
                          {room.monthlyRent.toLocaleString('en-IN')}/mo ·
                          Deposit: ₹
                          {room.securityDeposit.toLocaleString('en-IN')})
                        </p>
                        <p className="text-slate-600">
                          <strong>Move-In:</strong> {app.moveInDate} ·{' '}
                          <strong>Duration:</strong> {app.stayDurationLabel} ·{' '}
                          <strong>KYC:</strong> {app.applicantKycId}
                        </p>
                        {app.notes && (
                          <p className="text-slate-700 bg-white/90 p-2 rounded border border-slate-200/80">
                            "{app.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {app.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleAcceptTenantApplication(room, app.id)
                              }
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accept & Give Apartment</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleRejectTenantApplication(room, app.id)
                              }
                              className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500">
                            {app.approvedAt
                              ? `Approved on ${app.approvedAt}`
                              : `Status: ${app.status}`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Units Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Tenant / Status</th>
                    <th className="py-3 px-4">Rent</th>
                    <th className="py-3 px-4">Deposit</th>
                    <th className="py-3 px-4">Damages</th>
                    <th className="py-3 px-4">Balance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 text-xs">
                  {cases.map((room) => {
                    const deductTotal = room.deductions.reduce(
                      (s, d) => s + d.amount,
                      0
                    );
                    const depRem = Math.max(
                      0,
                      room.securityDeposit - deductTotal
                    );
                    const excessDue = Math.max(
                      0,
                      deductTotal - room.securityDeposit
                    );
                    const isSelected = room.id === activeCase.id;
                    const isVacant =
                      room.occupancyStatus === 'available' ||
                      room.occupancyStatus === 'pending_application';
                    const pendingApp = (room.tenantApplications || []).find(
                      (a) => a.status === 'pending'
                    );

                    return (
                      <tr
                        key={room.id}
                        className={
                          isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                              {room.roomCode}
                            </span>
                            {isVacant ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                {room.occupancyStatus === 'pending_application'
                                  ? 'Application Pending'
                                  : 'Available Listing'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                Occupied
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 mt-1">
                            {room.pgName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {room.roomNo}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">
                            {room.tenantName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {room.stayDurationLabel || 'Monthly'}
                          </p>
                          {pendingApp && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAcceptTenantApplication(
                                  room,
                                  pendingApp.id
                                )
                              }
                              className="mt-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>
                                Accept {pendingApp.applicantName} & Give
                                Apartment
                              </span>
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-mono font-bold text-slate-900 tabular-nums">
                            ₹{room.monthlyRent.toLocaleString('en-IN')}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleToggleRentStatus(room)}
                            className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                              room.rentStatus === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : room.rentStatus === 'Pending'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {room.rentStatus}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums">
                          ₹{room.securityDeposit.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-rose-600 tabular-nums">
                          -₹{deductTotal.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4">
                          {excessDue > 0 ? (
                            <span className="font-mono font-extrabold text-rose-700 tabular-nums">
                              +₹{excessDue.toLocaleString('en-IN')} Due
                            </span>
                          ) : (
                            <span className="font-mono font-extrabold text-emerald-700 tabular-nums">
                              ₹{depRem.toLocaleString('en-IN')}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {!isVacant && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectCase(room.id);
                                  setRentEmailTo(room.tenantEmail);
                                  handleSendRentEmail(room, room.tenantEmail);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 cursor-pointer"
                              >
                                Email
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCase(room.id);
                                setOwnerTab('photos');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer"
                            >
                              Photos
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCase(room.id);
                                setOwnerTab('deductions');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 text-white cursor-pointer"
                            >
                              Damages
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCase(room.id);
                                setGeneratedDocPreview(
                                  room.legalDocuments?.[0]?.documentText || ''
                                );
                                setOwnerTab('legal_doc');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white cursor-pointer"
                            >
                              Legal
                            </button>
                            {onDeleteCase && (
                              <button
                                type="button"
                                onClick={() => onDeleteCase(room.id)}
                                title="Delete Unit"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAMAGES & DEPOSIT */}
      {ownerTab === 'deductions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Unit Settings ({activeCase.roomCode})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Deposit (₹)
                  </label>
                  <input
                    type="number"
                    value={activeCase.securityDeposit || ''}
                    onChange={(e) =>
                      onUpdateCase({
                        ...activeCase,
                        securityDeposit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Monthly Rent (₹)
                  </label>
                  <input
                    type="number"
                    value={activeCase.monthlyRent || ''}
                    onChange={(e) =>
                      onUpdateCase({
                        ...activeCase,
                        monthlyRent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Electricity Meter</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">
                      Start
                    </label>
                    <input
                      type="number"
                      value={activeCase.startMeterUnits}
                      onChange={(e) =>
                        onUpdateCase({
                          ...activeCase,
                          startMeterUnits: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">
                      End
                    </label>
                    <input
                      type="number"
                      value={activeCase.endMeterUnits}
                      onChange={(e) =>
                        onUpdateCase({
                          ...activeCase,
                          endMeterUnits: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">
                      ₹/Unit
                    </label>
                    <input
                      type="number"
                      value={activeCase.meterRatePerUnit}
                      onChange={(e) =>
                        onUpdateCase({
                          ...activeCase,
                          meterRatePerUnit: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Add Damage
              </h3>
              <form onSubmit={handleAddOwnerDeduction} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Item
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cracked Smart TV"
                    value={dedTitle}
                    onChange={(e) => setDedTitle(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Category
                    </label>
                    <select
                      value={dedCategory}
                      onChange={(e) =>
                        setDedCategory(
                          e.target.value as DeductionItem['category']
                        )
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                    >
                      <option value="appliance">Appliance</option>
                      <option value="furniture">Furniture</option>
                      <option value="structural">Structural</option>
                      <option value="painting">Painting</option>
                      <option value="electricity">Electricity</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Cost (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={dedAmount || ''}
                      onChange={(e) =>
                        setDedAmount(parseFloat(e.target.value) || 0)
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={dedDate}
                      onChange={(e) => setDedDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Bill Ref
                    </label>
                    <input
                      type="text"
                      placeholder="INV-402"
                      value={dedBillRef}
                      onChange={(e) => setDedBillRef(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Inspection details..."
                    value={dedReason}
                    onChange={(e) => setDedReason(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Damage</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Logged Damages ({activeCase.roomCode})
              </h3>
              {activeExcessRecoveryDue > 0 ? (
                <span className="text-sm font-extrabold font-mono text-rose-700">
                  +₹{activeExcessRecoveryDue.toLocaleString('en-IN')} Due
                </span>
              ) : (
                <span className="text-sm font-extrabold font-mono text-emerald-700">
                  ₹{activeDepositRemaining.toLocaleString('en-IN')} Left
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {COMMON_APARTMENT_DAMAGE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickAddDamagePreset(preset)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-200 cursor-pointer"
                >
                  + {preset.title} (₹{preset.amount.toLocaleString('en-IN')})
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {activeCase.deductions.map((ded) => (
                <div
                  key={ded.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {ded.title}
                      </span>
                      {ded.billRefNo && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {ded.billRefNo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {ded.landlordClaim}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-slate-200 bg-white rounded-lg px-2 py-1">
                      <span className="text-xs font-mono text-slate-400 mr-1">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={ded.amount}
                        onChange={(e) =>
                          handleUpdateDeductionAmount(
                            ded.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-20 text-xs font-mono font-bold text-rose-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDeduction(ded.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Total:{' '}
                <strong className="font-mono text-rose-600">
                  ₹{activeTotalDeductions.toLocaleString('en-IN')}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setOwnerTab('legal_doc')}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>Generate Legal Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEGAL NOTICE GENERATOR */}
      {ownerTab === 'legal_doc' && (
        <div className="space-y-5">
          {servedBanner && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{servedBanner}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3.5 h-fit">
              <h4 className="text-sm font-bold text-slate-900">
                Legal Notice ({activeCase.roomCode})
              </h4>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                >
                  <option value="damage_recovery_notice">
                    Damage Recovery Notice
                  </option>
                  <option value="deposit_forfeiture_order">
                    Deposit Deduction Order
                  </option>
                  <option value="civil_claim_draft">
                    Civil Claim Draft
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tenant KYC
                  </label>
                  <input
                    type="text"
                    value={activeCase.tenantKycId || 'Verified'}
                    onChange={(e) =>
                      onUpdateCase({
                        ...activeCase,
                        tenantKycId: e.target.value,
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Deadline (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={demandDays}
                    onChange={(e) =>
                      setDemandDays(parseInt(e.target.value, 10) || 7)
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Legal Counsel
                </label>
                <input
                  type="text"
                  value={advocateName}
                  onChange={(e) => setAdvocateName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  value={extraRemarks}
                  onChange={(e) => setExtraRemarks(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateLegalDocument}
                disabled={generatingLegalDoc}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-extrabold py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <Gavel className="w-4 h-4" />
                <span>
                  {generatingLegalDoc ? 'Generating...' : 'Generate & Serve'}
                </span>
              </button>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <span className="text-xs font-mono font-bold text-rose-800">
                  {generatedRefNo}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLegalDocument}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLegalDoc ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedLegalDoc ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadLegalDocumentTxt(
                        generatedDocPreview,
                        generatedRefNo
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {generatedDocPreview ? (
                <div className="font-mono text-xs leading-relaxed text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap select-all max-h-[500px] overflow-y-auto">
                  {generatedDocPreview}
                </div>
              ) : (
                <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <Scale className="w-7 h-7 text-rose-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    No document generated yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: QR SCANNER & PAYMENTS */}
      {ownerTab === 'utr' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Payment QR & Bank ({activeCase.roomCode})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      value={activeCase.ownerUpiId || ''}
                      onChange={(e) =>
                        onUpdateCase({
                          ...activeCase,
                          ownerUpiId: e.target.value,
                        })
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={activeCase.ownerBankName || ''}
                      onChange={(e) =>
                        onUpdateCase({
                          ...activeCase,
                          ownerBankName: e.target.value,
                        })
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Account No.
                    </label>
                    <input
                      type="text"
                      value={activeCase.ownerAccountNo || ''}
                      onChange={(e) =>
                        onUpdateCase({
                          ...activeCase,
                          ownerAccountNo: e.target.value,
                        })
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      IFSC
                    </label>
                    <input
                      type="text"
                      value={activeCase.ownerIfsc || ''}
                      onChange={(e) =>
                        onUpdateCase({
                          ...activeCase,
                          ownerIfsc: e.target.value,
                        })
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
                <img
                  src={currentQrPreview}
                  alt="QR Preview"
                  className="w-24 h-24 object-contain bg-white p-2 rounded-xl border border-slate-200 shrink-0"
                />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-900">QR Scanner</p>
                  <div className="flex flex-wrap gap-2">
                    <label className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload QR</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleOwnerQrImageUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateQrFromUpi}
                      className="px-2.5 py-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs h-fit space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Issue Receipt ({activeCase.roomCode})
              </h3>
              <form onSubmit={handleIssueDirectReceipt} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Type
                    </label>
                    <select
                      value={directType}
                      onChange={(e) =>
                        setDirectType(
                          e.target.value as PaymentTransaction['paymentType']
                        )
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                    >
                      <option value="monthly_rent">Monthly Rent</option>
                      <option value="security_deposit">Security Deposit</option>
                      <option value="electricity_bill">Electricity</option>
                      <option value="deduction_settlement">Damage Settlement</option>
                      <option value="deposit_refund">Deposit Refund</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={directAmount || ''}
                      onChange={(e) =>
                        setDirectAmount(parseFloat(e.target.value) || 0)
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={directDate}
                      onChange={(e) => setDirectDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      value={directTime}
                      onChange={(e) => setDirectTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Period / Note
                    </label>
                    <input
                      type="text"
                      required
                      value={directPeriod}
                      onChange={(e) => setDirectPeriod(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      UTR
                    </label>
                    <input
                      type="text"
                      placeholder="Auto"
                      value={directUtr}
                      onChange={(e) => setDirectUtr(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Issue Receipt</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Payment Ledger & UTR Verification
              </h3>

              <div className="space-y-2.5">
                {cases
                  .flatMap((room) =>
                    room.payments.map((tx) => ({ room, tx }))
                  )
                  .map(({ room, tx }) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {room.roomCode}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {tx.receiptNo}
                            </span>
                            <span className="text-xs text-slate-600">
                              {room.tenantName}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">
                            {tx.monthOrPeriod || tx.notes}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-extrabold font-mono text-slate-900 block">
                            ₹{tx.amount.toLocaleString('en-IN')}
                          </span>
                          {tx.status === 'pending_verification' ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onVerifyUtr(room.id, tx.id, true)
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onVerifyUtr(room.id, tx.id, false)
                                }
                                className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : tx.status === 'verified' ? (
                            <span className="text-[11px] font-bold text-emerald-700">
                              Verified
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-rose-700">
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-200/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-600" />
                          {tx.date} {tx.paymentTime ? `· ${tx.paymentTime}` : ''}
                        </span>
                        <span>UTR: {tx.utrNumber}</span>
                        <span>{tx.paymentMethod}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DISPUTES & AUTOMATED COMPLAINT EMAILS */}
      {ownerTab === 'complaints' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tenant Complaints & Automated Email Inbox
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Complaints are automatically sent to your email:{' '}
                  <strong className="font-mono text-slate-800">
                    {landownerProfile.email || activeCase.landlordEmail}
                  </strong>
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {cases
              .flatMap((room) =>
                (room.complaints || []).map((cmp) => ({ room, cmp }))
              )
              .map(({ room, cmp }) => (
                <div
                  key={cmp.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {room.roomCode}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {cmp.ticketNo}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {cmp.title}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-emerald-600" />
                        <span>
                          Auto-Emailed to{' '}
                          {cmp.emailedToOwner ||
                            landownerProfile.email ||
                            room.landlordEmail}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {(['Open', 'In Progress', 'Resolved'] as const).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              handleUpdateComplaint(room, cmp.id, st)
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              cmp.status === st
                                ? st === 'Resolved'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'In Progress'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-900 text-white'
                                : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {st}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">{cmp.description}</p>

                  {cmp.emailPreviewUrl && (
                    <div className="text-[11px]">
                      <a
                        href={cmp.emailPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-indigo-700 hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Automated Complaint Email Receipt</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {cmp.ownerReply && (
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-950">
                      <strong>Reply (Auto-emailed to {room.tenantEmail}):</strong>{' '}
                      {cmp.ownerReply}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Reply & email ${room.tenantName} (${room.tenantEmail})...`}
                      value={replyDrafts[cmp.id] ?? ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [cmp.id]: e.target.value,
                        }))
                      }
                      className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const draft = replyDrafts[cmp.id];
                        if (!draft || !draft.trim()) return;
                        handleUpdateComplaint(
                          room,
                          cmp.id,
                          'Resolved',
                          draft.trim()
                        );
                        setReplyDrafts((prev) => ({ ...prev, [cmp.id]: '' }));
                      }}
                      className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply & Email</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 6: MOVE-IN & MOVE-OUT PHOTOS */}
      {ownerTab === 'photos' && (
        <ComparisonTab
          activeCase={activeCase}
          onAddComparison={handleAddComparison}
          onUpdateComparison={handleUpdateComparison}
          onDeleteComparison={handleDeleteComparison}
          onLogDamageFromPhoto={handleLogDamageFromPhoto}
          onUpdateCase={onUpdateCase}
          role="owner"
        />
      )}

      {/* TAB 7: DOCUMENTS & AGREEMENT */}
      {ownerTab === 'agreement' && (
        <AgreementDetailsTab
          activeCase={activeCase}
          role="owner"
          onAddClause={(clauseText) => {
            const existing = activeCase.agreementTerms || [];
            onUpdateCase({
              ...activeCase,
              agreementTerms: [...existing, clauseText],
            });
          }}
          onRemoveClause={handleRemoveAgreementClause}
        />
      )}

      {/* TAB 8: SMART ASSISTANT */}
      {ownerTab === 'ai' && (
        <AiAssistantTab
          activeCase={activeCase}
          role="owner"
          allCases={cases}
        />
      )}

      {/* Modal: Preview Sent Monthly Rent Notice Email */}
      {previewRentNotice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-start justify-between pb-2.5 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {previewRentNotice.subject}
                </h3>
                <p className="text-xs text-slate-500">
                  To: {previewRentNotice.recipientEmail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {previewRentNotice.emailPreviewUrl && (
                  <a
                    href={previewRentNotice.emailPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <span>SMTP Receipt</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <a
                  href={buildMailtoLink(
                    previewRentNotice.recipientEmail,
                    previewRentNotice.subject,
                    previewRentNotice.bodyText
                  )}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>Open in Mail App</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewRentNotice(null)}
                  className="text-xs font-bold text-slate-500 px-2.5 py-1 rounded-lg bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="font-mono text-xs leading-relaxed text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap max-h-80 overflow-y-auto">
              {previewRentNotice.bodyText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
