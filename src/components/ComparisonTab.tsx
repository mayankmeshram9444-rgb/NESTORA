import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  Camera,
  Scale,
  Edit2,
  Upload,
  Trash2,
  X,
  Maximize2,
  RotateCw,
  Download,
  SlidersHorizontal,
  Columns,
  Sparkles,
  Gavel,
  Video,
  Mail,
  Send,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  AlertCircle,
  Wallet,
  Wrench,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import {
  PgCase,
  RoomComparison,
  QuotationRepaymentMethod,
  DeductionItem,
  PaymentTransaction,
  ComplaintItem,
} from '../types';
import { buildInspectionPhotoSvg } from '../data/mockData';
import {
  analyzePhotosWithOllamaAndEmailQuotation,
  submitTenantQuotationResponse,
  buildMailtoLink,
  buildGmailComposeLink,
} from '../services/legalService';

interface ComparisonTabProps {
  activeCase: PgCase;
  onAddComparison: (
    comp: RoomComparison,
    damageDeduction?: { title: string; amount: number; claim: string }
  ) => void;
  onUpdateComparison: (comp: RoomComparison) => void;
  onDeleteComparison?: (compId: string) => void;
  onLogDamageFromPhoto?: (title: string, amount: number, claim: string) => void;
  onUpdateCase?: (updatedCase: PgCase) => void;
  role?: 'owner' | 'resident';
}

export const ComparisonTab: React.FC<ComparisonTabProps> = ({
  activeCase,
  onAddComparison,
  onUpdateComparison,
  onDeleteComparison,
  onLogDamageFromPhoto,
  onUpdateCase,
  role = 'resident',
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingComp, setEditingComp] = useState<RoomComparison | null>(null);
  const [viewModeByCard, setViewModeByCard] = useState<
    Record<string, 'sideBySide' | 'slider'>
  >({});
  const [sliderPosByCard, setSliderPosByCard] = useState<
    Record<string, number>
  >({});
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const [viewingPhoto, setViewingPhoto] = useState<{
    url: string;
    title: string;
    date: string;
    notes: string;
  } | null>(null);

  // Camera capture modal state
  const [cameraTarget, setCameraTarget] = useState<{
    mode: 'card' | 'modal';
    item?: RoomComparison;
    stage: 'moveIn' | 'moveOut';
  } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // New comparison form state
  const [areaName, setAreaName] = useState('');
  const [category, setCategory] =
    useState<RoomComparison['category']>('Tenant Damage');
  const [scenePreset, setScenePreset] = useState<
    'tv_sofa' | 'balcony_glass' | 'ac_bedroom' | 'kitchen_bath'
  >('tv_sofa');
  const [moveInDateInput, setMoveInDateInput] = useState(activeCase.startDate);
  const [moveOutDateInput, setMoveOutDateInput] = useState(
    activeCase.moveOutDate
  );
  const [moveInNotes, setMoveInNotes] = useState('');
  const [moveOutNotes, setMoveOutNotes] = useState('');
  const [moveInImage, setMoveInImage] = useState<string>('');
  const [moveOutImage, setMoveOutImage] = useState<string>('');
  const [moveInImagesModal, setMoveInImagesModal] = useState<string[]>([]);
  const [moveOutImagesModal, setMoveOutImagesModal] = useState<string[]>([]);
  const [selectedMoveInIdxByCard, setSelectedMoveInIdxByCard] = useState<
    Record<string, number>
  >({});
  const [selectedMoveOutIdxByCard, setSelectedMoveOutIdxByCard] = useState<
    Record<string, number>
  >({});
  const [verdict, setVerdict] = useState('');
  const [isDisputed, setIsDisputed] = useState(true);
  const [damageCostInput, setDamageCostInput] = useState<number>(8500);
  const [alsoLogDeduction, setAlsoLogDeduction] = useState<boolean>(
    role === 'owner'
  );
  const [analyzingCardId, setAnalyzingCardId] = useState<string | null>(null);
  const [submittingNewArea, setSubmittingNewArea] = useState<boolean>(false);
  const [previewQuotationComp, setPreviewQuotationComp] =
    useState<RoomComparison | null>(null);
  const [copiedQuotation, setCopiedQuotation] = useState<boolean>(false);

  // Tenant Quotation Accept / Reject & Repayment Method State
  const [decisionByCard, setDecisionByCard] = useState<
    Record<string, 'accepted' | 'rejected'>
  >({});
  const [repaymentMethodByCard, setRepaymentMethodByCard] = useState<
    Record<string, QuotationRepaymentMethod>
  >({});
  const [repaymentNotesByCard, setRepaymentNotesByCard] = useState<
    Record<string, string>
  >({});
  const [repaymentUtrByCard, setRepaymentUtrByCard] = useState<
    Record<string, string>
  >({});
  const [restoredPhotoByCard, setRestoredPhotoByCard] = useState<
    Record<string, string>
  >({});
  const [submittingResponseCardId, setSubmittingResponseCardId] = useState<
    string | null
  >(null);

  const notify = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 5000);
  };

  const handleTenantSubmitQuotationResponse = async (item: RoomComparison) => {
    if (!item.ollamaAnalysis || submittingResponseCardId === item.id) return;

    const decision =
      decisionByCard[item.id] ||
      (item.ollamaAnalysis.tenantStatus === 'rejected'
        ? 'rejected'
        : 'accepted');
    const chosenMethod: QuotationRepaymentMethod =
      repaymentMethodByCard[item.id] ||
      item.ollamaAnalysis.repaymentMethod ||
      'restore_to_move_in_photo';
    const rawNotes = (
      repaymentNotesByCard[item.id] ??
      item.ollamaAnalysis.repaymentNotes ??
      ''
    ).trim();
    const rawUtr = (
      repaymentUtrByCard[item.id] ??
      item.ollamaAnalysis.repaymentUtr ??
      ''
    ).trim();
    const restoredImg =
      restoredPhotoByCard[item.id] ||
      item.ollamaAnalysis.restoredPhotoUrl ||
      (decision === 'accepted' && chosenMethod === 'restore_to_move_in_photo'
        ? buildInspectionPhotoSvg({
            stage: 'moveIn',
            areaTitle: `${item.area} (Restored)`,
            roomCode: activeCase.roomCode,
            date: new Date().toISOString().split('T')[0],
            isDamaged: false,
            caption:
              rawNotes ||
              'Restored by tenant to match original Move-In photo condition',
            scene: inferScene(item.area),
          })
        : undefined);

    if (
      decision === 'accepted' &&
      chosenMethod === 'compensation_upi_payment' &&
      !rawUtr
    ) {
      notify(
        'Please enter your 12-digit UPI UTR reference (or click Auto-Fill Demo UTR) to submit UPI compensation.'
      );
      return;
    }

    const defaultNotes =
      decision === 'rejected'
        ? rawNotes ||
          'Tenant disputed the quotation and requested joint re-inspection / vendor invoice review.'
        : chosenMethod === 'restore_to_move_in_photo'
        ? rawNotes ||
          `Tenant repaired/restored "${item.area}" back to its original Move-In photo condition.`
        : chosenMethod === 'compensation_upi_payment'
        ? rawNotes ||
          `Paid compensation of ₹${item.ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')} via UPI (UTR: ${rawUtr}).`
        : rawNotes ||
          `Approved deducting compensation of ₹${item.ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')} from ₹${activeCase.securityDeposit.toLocaleString('en-IN')} Security Deposit.`;

    setSubmittingResponseCardId(item.id);
    try {
      const res = await submitTenantQuotationResponse({
        caseDetails: activeCase,
        ownerEmail: activeCase.landlordEmail,
        quotationNo: item.ollamaAnalysis.quotationNo,
        area: item.area,
        totalQuotationAmount: item.ollamaAnalysis.totalQuotationAmount,
        tenantStatus: decision,
        repaymentMethod: decision === 'accepted' ? chosenMethod : undefined,
        repaymentNotes: defaultNotes,
        repaymentUtr:
          decision === 'accepted' && chosenMethod === 'compensation_upi_payment'
            ? rawUtr
            : undefined,
      });

      const updatedAnalysis = {
        ...item.ollamaAnalysis,
        tenantStatus: decision,
        repaymentMethod: decision === 'accepted' ? chosenMethod : undefined,
        repaymentNotes: defaultNotes,
        repaymentUtr:
          decision === 'accepted' && chosenMethod === 'compensation_upi_payment'
            ? rawUtr
            : undefined,
        restoredPhotoUrl:
          decision === 'accepted' && chosenMethod === 'restore_to_move_in_photo'
            ? restoredImg
            : undefined,
        tenantRespondedAt: res.respondedAt,
        responseEmailPreviewUrl: res.emailPreviewUrl,
        responseSubject: res.subject,
        responseText: res.bodyText,
      };

      const updatedComp: RoomComparison = {
        ...item,
        disputed: decision === 'rejected',
        verdict:
          decision === 'rejected'
            ? `Quotation ${item.ollamaAnalysis.quotationNo} Rejected by Tenant: "${defaultNotes}"`
            : chosenMethod === 'restore_to_move_in_photo'
            ? `Quotation ${item.ollamaAnalysis.quotationNo} Accepted: Tenant restored "${item.area}" back to Move-In photo condition (₹0 deduction).`
            : chosenMethod === 'compensation_upi_payment'
            ? `Quotation ${item.ollamaAnalysis.quotationNo} Accepted: Tenant paid ₹${item.ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')} compensation via UPI (UTR: ${rawUtr}).`
            : `Quotation ${item.ollamaAnalysis.quotationNo} Accepted: Tenant approved ₹${item.ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')} compensation via Security Deposit deduction.`,
        ollamaAnalysis: updatedAnalysis,
      };

      if (onUpdateCase) {
        const areaKeywords = item.area
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3);
        let matchedDeduction = false;

        const updatedDeductions: DeductionItem[] = (
          activeCase.deductions || []
        ).map((ded) => {
          const titleLower = ded.title.toLowerCase();
          const isMatch =
            ded.billRefNo === item.ollamaAnalysis?.quotationNo ||
            titleLower.includes(
              item.ollamaAnalysis?.quotationNo.toLowerCase() || '__none__'
            ) ||
            areaKeywords.some((kw) => titleLower.includes(kw));

          if (!isMatch) return ded;
          matchedDeduction = true;

          if (decision === 'rejected') {
            return {
              ...ded,
              status: 'disputed' as const,
              tenantRebuttal: defaultNotes,
            };
          }

          if (chosenMethod === 'restore_to_move_in_photo') {
            return {
              ...ded,
              amount: 0,
              fairAmount: 0,
              status: 'waived' as const,
              tenantRebuttal: `Restored to Move-In Photo condition (${defaultNotes}). Charge waived (₹0).`,
            };
          }

          return {
            ...ded,
            amount: item.ollamaAnalysis!.totalQuotationAmount,
            fairAmount: item.ollamaAnalysis!.totalQuotationAmount,
            status: 'agreed' as const,
            tenantRebuttal: defaultNotes,
          };
        });

        if (
          !matchedDeduction &&
          item.ollamaAnalysis.totalQuotationAmount > 0
        ) {
          updatedDeductions.unshift({
            id: `ded-qtn-${Date.now()}`,
            title: `${item.area} — Ollama Quotation (${item.ollamaAnalysis.quotationNo})`,
            amount:
              decision === 'accepted' &&
              chosenMethod === 'restore_to_move_in_photo'
                ? 0
                : item.ollamaAnalysis.totalQuotationAmount,
            category: 'appliance',
            status:
              decision === 'rejected'
                ? 'disputed'
                : chosenMethod === 'restore_to_move_in_photo'
                ? 'waived'
                : 'agreed',
            dateRecorded: res.respondedAt,
            billRefNo: item.ollamaAnalysis.quotationNo,
            addedBy: activeCase.landlordName,
            landlordClaim: item.ollamaAnalysis.conditionSummary,
            tenantRebuttal: defaultNotes,
            fairAmount:
              decision === 'accepted' &&
              chosenMethod === 'restore_to_move_in_photo'
                ? 0
                : item.ollamaAnalysis.totalQuotationAmount,
          });
        }

        const updatedPayments: PaymentTransaction[] = [
          ...(activeCase.payments || []),
        ];
        if (
          decision === 'accepted' &&
          chosenMethod === 'compensation_upi_payment' &&
          rawUtr
        ) {
          updatedPayments.unshift({
            id: `pay-qtn-${Date.now()}`,
            receiptNo: `RCP-${activeCase.roomCode.replace('-', '')}-QTN-${Math.floor(100 + Math.random() * 899)}`,
            utrNumber: rawUtr,
            amount: item.ollamaAnalysis.totalQuotationAmount,
            paymentType: 'deduction_settlement',
            paymentMethod: 'UPI / GPay',
            monthOrPeriod: `Move-Out Quotation Compensation (${item.ollamaAnalysis.quotationNo} · ${item.area})`,
            date: new Date().toISOString().split('T')[0],
            paymentTime: new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            submittedAt: res.respondedAt,
            senderAccountOrUpi: `${activeCase.tenantName} (Tenant UPI)`,
            receiverAccountOrUpi:
              activeCase.ownerUpiId || 'emeraldcrest.landowner@okhdfcbank',
            status: 'pending_verification',
            submittedBy: activeCase.tenantName,
            notes: defaultNotes,
          });
        }

        const updatedComplaints: ComplaintItem[] = [
          ...(activeCase.complaints || []),
        ];
        if (decision === 'rejected') {
          updatedComplaints.unshift({
            id: `cmp-qtn-${Date.now()}`,
            ticketNo: `TKT-QTN-${Math.floor(100 + Math.random() * 899)}`,
            title: `Rejected Ollama Quotation ${item.ollamaAnalysis.quotationNo} (${item.area} — ₹${item.ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')})`,
            category: 'Deposit / Billing Query',
            priority: 'Urgent',
            description: defaultNotes,
            status: 'Open',
            createdAt: res.respondedAt,
            emailedToOwner: res.emailedToOwner,
            emailedAt: res.respondedAt,
            emailPreviewUrl: res.emailPreviewUrl,
          });
        }

        onUpdateCase({
          ...activeCase,
          comparisons: activeCase.comparisons.map((c) =>
            c.id === item.id ? updatedComp : c
          ),
          deductions: updatedDeductions,
          payments: updatedPayments,
          complaints: updatedComplaints,
        });
      } else {
        onUpdateComparison(updatedComp);
      }

      notify(
        decision === 'accepted'
          ? chosenMethod === 'restore_to_move_in_photo'
            ? `Accepted Quotation ${item.ollamaAnalysis.quotationNo}: Restoring "${item.area}" as in Move-In Photo (₹0 deduction). Emailed Landowner at ${res.emailedToOwner}!`
            : chosenMethod === 'compensation_upi_payment'
            ? `Accepted Quotation ${item.ollamaAnalysis.quotationNo}: UPI Compensation (₹${item.ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')} · UTR #${rawUtr}) logged & emailed to ${res.emailedToOwner}!`
            : `Accepted Quotation ${item.ollamaAnalysis.quotationNo}: ₹${item.ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')} Deposit Compensation approved & emailed to ${res.emailedToOwner}!`
          : `Rejected Quotation ${item.ollamaAnalysis.quotationNo}: Dispute logged and emailed to Landowner (${res.emailedToOwner})!`
      );
    } finally {
      setSubmittingResponseCardId(null);
    }
  };

  const handleOwnerVerifyQuotationSettlement = (item: RoomComparison) => {
    if (!item.ollamaAnalysis) return;
    const verifiedAt =
      new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) +
      ` · ${new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    const updatedComp: RoomComparison = {
      ...item,
      disputed: false,
      ollamaAnalysis: {
        ...item.ollamaAnalysis,
        ownerVerifiedSettlement: true,
        ownerSettlementVerifiedAt: verifiedAt,
      },
    };

    if (onUpdateCase) {
      onUpdateCase({
        ...activeCase,
        comparisons: activeCase.comparisons.map((c) =>
          c.id === item.id ? updatedComp : c
        ),
      });
    } else {
      onUpdateComparison(updatedComp);
    }
    notify(
      `Verified & closed settlement for Quotation ${item.ollamaAnalysis.quotationNo} (${item.area})!`
    );
  };

  const triggerOllamaAnalysisForComparison = async (
    comp: RoomComparison,
    estimatedCostHint?: number
  ) => {
    setAnalyzingCardId(comp.id);
    const inGallery =
      Array.isArray(comp.moveInImages) && comp.moveInImages.length > 0
        ? comp.moveInImages
        : comp.moveInImage
        ? [comp.moveInImage]
        : [];
    const outGallery =
      Array.isArray(comp.moveOutImages) && comp.moveOutImages.length > 0
        ? comp.moveOutImages
        : comp.moveOutImage
        ? [comp.moveOutImage]
        : [];
    notify(
      `Ollama analyzing ${inGallery.length || 1} Move-In & ${outGallery.length || 1} Move-Out photo(s) for "${comp.area}" and sending exact quotation to ${activeCase.tenantEmail}...`
    );
    try {
      const analysis = await analyzePhotosWithOllamaAndEmailQuotation({
        caseDetails: activeCase,
        area: comp.area,
        category: comp.category,
        moveInDate: comp.moveInDate,
        moveOutDate: comp.moveOutDate,
        moveInNotes: comp.moveInNotes,
        moveOutNotes: comp.moveOutNotes,
        moveInImage: comp.moveInImage,
        moveOutImage: comp.moveOutImage,
        moveInImages: inGallery,
        moveOutImages: outGallery,
        estimatedCost: estimatedCostHint,
        recipientEmail: activeCase.tenantEmail,
      });

      const updatedWithAnalysis: RoomComparison = {
        ...comp,
        ollamaAnalysis: analysis,
      };
      onUpdateComparison(updatedWithAnalysis);
      notify(
        `Ollama analyzed "${comp.area}" & emailed Repair Quotation (${analysis.quotationNo} · ₹${analysis.totalQuotationAmount.toLocaleString('en-IN')}) to ${analysis.emailedToTenant}!`
      );
    } finally {
      setAnalyzingCardId(null);
    }
  };

  // Compress uploaded image via HTML5 Canvas so large phone/camera photos save reliably in localStorage
  const compressAndReadImage = (
    file: File,
    callback: (dataUrl: string) => void
  ) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          callback(e.target.result);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 960;
          let width = img.width || 800;
          let height = img.height || 600;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            callback(rawDataUrl);
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Add subtle bottom inspection timestamp bar
          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.fillRect(0, height - 32, width, 32);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 12px monospace';
          const stamp = `NESTORA VERIFIED PHOTO · ${activeCase.roomCode} · ${new Date().toLocaleDateString('en-IN')}`;
          ctx.fillText(stamp, 12, height - 11);

          const compressedUrl = canvas.toDataURL('image/jpeg', 0.82);
          callback(compressedUrl);
        } catch {
          callback(rawDataUrl);
        }
      };
      img.onerror = () => {
        callback(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Start/Stop webcam when cameraTarget changes
  useEffect(() => {
    if (!cameraTarget) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }

    setCameraError(null);
    let active = true;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          if (active) {
            setCameraError(
              'Camera access is unavailable in this browser window. Use "Generate Instant Inspection Snapshot" below or upload an image file.'
            );
          }
        });
    } else {
      setCameraError(
        'Camera stream not detected on this device. Use "Generate Instant Inspection Snapshot" below.'
      );
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [cameraTarget]);

  const handleCaptureFromVideo = () => {
    if (role === 'resident' || !cameraTarget) return;

    if (videoRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(
          `${
            cameraTarget.stage === 'moveIn' ? 'MOVE-IN' : 'MOVE-OUT'
          } CAMERA SNAPSHOT · ${activeCase.roomCode} · ${new Date().toLocaleDateString('en-IN')}`,
          14,
          canvas.height - 13
        );
        const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
        applyCapturedImage(dataUrl);
        return;
      }
    }

    // Fallback instant stamped inspection snapshot
    handleUseInstantStampedPhoto(cameraTarget.stage, cameraTarget.item);
    setCameraTarget(null);
  };

  const applyCapturedImage = (dataUrl: string) => {
    if (role === 'resident' || !cameraTarget) return;
    if (cameraTarget.mode === 'card' && cameraTarget.item) {
      const item = cameraTarget.item;
      const isMoveIn = cameraTarget.stage === 'moveIn';
      const existingArr = isMoveIn
        ? Array.isArray(item.moveInImages) && item.moveInImages.length > 0
          ? item.moveInImages
          : item.moveInImage
          ? [item.moveInImage]
          : []
        : Array.isArray(item.moveOutImages) && item.moveOutImages.length > 0
        ? item.moveOutImages
        : item.moveOutImage
        ? [item.moveOutImage]
        : [];
      const nextArr = [...existingArr, dataUrl];
      const updated: RoomComparison = {
        ...item,
        ...(isMoveIn
          ? { moveInImage: dataUrl, moveInImages: nextArr }
          : { moveOutImage: dataUrl, moveOutImages: nextArr }),
      };
      if (isMoveIn) {
        setSelectedMoveInIdxByCard((prev) => ({
          ...prev,
          [item.id]: nextArr.length - 1,
        }));
      } else {
        setSelectedMoveOutIdxByCard((prev) => ({
          ...prev,
          [item.id]: nextArr.length - 1,
        }));
      }
      onUpdateComparison(updated);
      triggerOllamaAnalysisForComparison(updated);
    } else {
      if (cameraTarget.stage === 'moveIn') {
        setMoveInImage(dataUrl);
        setMoveInImagesModal((prev) => [...prev, dataUrl]);
      } else {
        setMoveOutImage(dataUrl);
        setMoveOutImagesModal((prev) => [...prev, dataUrl]);
      }
      notify(
        `${
          cameraTarget.stage === 'moveIn' ? 'Move-In' : 'Move-Out'
        } photo added!`
      );
    }
    setCameraTarget(null);
  };

  // Detect scene from area title
  const inferScene = (
    title: string
  ): 'tv_sofa' | 'balcony_glass' | 'ac_bedroom' | 'kitchen_bath' => {
    const lower = title.toLowerCase();
    if (lower.includes('balcony') || lower.includes('glass') || lower.includes('hob')) {
      return 'balcony_glass';
    }
    if (lower.includes('ac') || lower.includes('bedroom') || lower.includes('daikin')) {
      return 'ac_bedroom';
    }
    if (lower.includes('kitchen') || lower.includes('bath') || lower.includes('ro')) {
      return 'kitchen_bath';
    }
    return 'tv_sofa';
  };

  const handleUseInstantStampedPhoto = (
    stage: 'moveIn' | 'moveOut',
    item?: RoomComparison
  ) => {
    if (role === 'resident') return;
    if (item) {
      const isDamaged =
        stage === 'moveOut' &&
        (item.category === 'Tenant Damage' || item.disputed);
      const svgUrl = buildInspectionPhotoSvg({
        stage,
        areaTitle: item.area,
        roomCode: activeCase.roomCode,
        date: stage === 'moveIn' ? item.moveInDate : item.moveOutDate,
        isDamaged,
        caption:
          stage === 'moveIn' ? item.moveInNotes : item.moveOutNotes,
        scene: inferScene(item.area),
      });
      const isMoveIn = stage === 'moveIn';
      const existingArr = isMoveIn
        ? Array.isArray(item.moveInImages) && item.moveInImages.length > 0
          ? item.moveInImages
          : item.moveInImage
          ? [item.moveInImage]
          : []
        : Array.isArray(item.moveOutImages) && item.moveOutImages.length > 0
        ? item.moveOutImages
        : item.moveOutImage
        ? [item.moveOutImage]
        : [];
      const nextArr = [...existingArr, svgUrl];
      const updated: RoomComparison = {
        ...item,
        ...(isMoveIn
          ? { moveInImage: svgUrl, moveInImages: nextArr }
          : { moveOutImage: svgUrl, moveOutImages: nextArr }),
      };
      if (isMoveIn) {
        setSelectedMoveInIdxByCard((prev) => ({
          ...prev,
          [item.id]: nextArr.length - 1,
        }));
      } else {
        setSelectedMoveOutIdxByCard((prev) => ({
          ...prev,
          [item.id]: nextArr.length - 1,
        }));
      }
      onUpdateComparison(updated);
      triggerOllamaAnalysisForComparison(updated);
    } else {
      const isDamaged =
        stage === 'moveOut' && category === 'Tenant Damage';
      const svgUrl = buildInspectionPhotoSvg({
        stage,
        areaTitle: areaName || 'Apartment Inspection Area',
        roomCode: activeCase.roomCode,
        date: stage === 'moveIn' ? moveInDateInput : moveOutDateInput,
        isDamaged,
        caption:
          stage === 'moveIn'
            ? moveInNotes || 'Verified intact condition at check-in'
            : moveOutNotes ||
              (isDamaged
                ? 'Physical damage recorded at move-out inspection'
                : 'Verified clean at move-out'),
        scene: scenePreset,
      });
      if (stage === 'moveIn') {
        setMoveInImage(svgUrl);
        setMoveInImagesModal((prev) => [...prev, svgUrl]);
      } else {
        setMoveOutImage(svgUrl);
        setMoveOutImagesModal((prev) => [...prev, svgUrl]);
      }
      notify(
        `Attached verified ${
          stage === 'moveIn' ? 'Move-In' : 'Move-Out'
        } inspection photo!`
      );
    }
  };

  // Direct card upload handlers (supports multiple files) - Owner only
  const handleCardMultipleImagesUpload = (
    item: RoomComparison,
    type: 'moveIn' | 'moveOut',
    files: FileList | File[]
  ) => {
    if (role === 'resident') return;
    const fileArray = Array.from(files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (fileArray.length === 0) return;

    const results: string[] = [];
    let processed = 0;

    fileArray.forEach((file) => {
      compressAndReadImage(file, (dataUrl) => {
        results.push(dataUrl);
        processed += 1;
        if (processed === fileArray.length) {
          const isMoveIn = type === 'moveIn';
          const existingArr = isMoveIn
            ? Array.isArray(item.moveInImages) && item.moveInImages.length > 0
              ? item.moveInImages
              : item.moveInImage
              ? [item.moveInImage]
              : []
            : Array.isArray(item.moveOutImages) && item.moveOutImages.length > 0
            ? item.moveOutImages
            : item.moveOutImage
            ? [item.moveOutImage]
            : [];
          const nextArr = [...existingArr, ...results];
          const latestUrl = results[results.length - 1] || nextArr[0] || '';
          const updated: RoomComparison = {
            ...item,
            ...(isMoveIn
              ? { moveInImage: latestUrl, moveInImages: nextArr }
              : { moveOutImage: latestUrl, moveOutImages: nextArr }),
          };
          if (isMoveIn) {
            setSelectedMoveInIdxByCard((prev) => ({
              ...prev,
              [item.id]: nextArr.length - 1,
            }));
          } else {
            setSelectedMoveOutIdxByCard((prev) => ({
              ...prev,
              [item.id]: nextArr.length - 1,
            }));
          }
          onUpdateComparison(updated);
          triggerOllamaAnalysisForComparison(updated);
        }
      });
    });
  };

  const handleCardImageUpload = (
    item: RoomComparison,
    type: 'moveIn' | 'moveOut',
    file: File
  ) => {
    if (role === 'resident') return;
    handleCardMultipleImagesUpload(item, type, [file]);
  };

  const handleRemoveCardImage = (
    item: RoomComparison,
    type: 'moveIn' | 'moveOut',
    removeIndex?: number
  ) => {
    if (role === 'resident') return;
    const isMoveIn = type === 'moveIn';
    const existingArr = isMoveIn
      ? Array.isArray(item.moveInImages) && item.moveInImages.length > 0
        ? item.moveInImages
        : item.moveInImage
        ? [item.moveInImage]
        : []
      : Array.isArray(item.moveOutImages) && item.moveOutImages.length > 0
      ? item.moveOutImages
      : item.moveOutImage
      ? [item.moveOutImage]
      : [];

    if (removeIndex !== undefined && existingArr.length > 1) {
      const nextArr = existingArr.filter((_, idx) => idx !== removeIndex);
      const nextPrimary = nextArr[nextArr.length - 1] || '';
      const updated: RoomComparison = {
        ...item,
        ...(isMoveIn
          ? { moveInImage: nextPrimary, moveInImages: nextArr }
          : { moveOutImage: nextPrimary, moveOutImages: nextArr }),
      };
      if (isMoveIn) {
        setSelectedMoveInIdxByCard((prev) => ({
          ...prev,
          [item.id]: Math.max(0, nextArr.length - 1),
        }));
      } else {
        setSelectedMoveOutIdxByCard((prev) => ({
          ...prev,
          [item.id]: Math.max(0, nextArr.length - 1),
        }));
      }
      onUpdateComparison(updated);
      notify(
        `Removed photo #${removeIndex + 1} from ${
          isMoveIn ? 'Move-In' : 'Move-Out'
        } gallery (${nextArr.length} remaining).`
      );
      return;
    }

    const updated: RoomComparison = {
      ...item,
      ...(isMoveIn
        ? { moveInImage: '', moveInImages: [] }
        : { moveOutImage: '', moveOutImages: [] }),
    };
    onUpdateComparison(updated);
    notify(
      `Cleared ${
        type === 'moveIn' ? 'Move-In' : 'Move-Out'
      } photos from ${item.area}. Upload or capture new photos anytime.`
    );
  };

  const handleDownloadPhoto = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'resident' || !areaName.trim() || submittingNewArea) return;

    setSubmittingNewArea(true);
    const trimmedArea = areaName.trim();
    const isDamage = category === 'Tenant Damage';
    const finalMoveInGallery =
      moveInImagesModal.length > 0
        ? moveInImagesModal
        : moveInImage
        ? [moveInImage]
        : [
            buildInspectionPhotoSvg({
              stage: 'moveIn',
              areaTitle: trimmedArea,
              roomCode: activeCase.roomCode,
              date: moveInDateInput || activeCase.startDate,
              isDamaged: false,
              caption:
                moveInNotes.trim() ||
                'Documented clean and undamaged condition at check-in.',
              scene: scenePreset,
            }),
          ];

    const finalMoveOutGallery =
      moveOutImagesModal.length > 0
        ? moveOutImagesModal
        : moveOutImage
        ? [moveOutImage]
        : [
            buildInspectionPhotoSvg({
              stage: 'moveOut',
              areaTitle: trimmedArea,
              roomCode: activeCase.roomCode,
              date: moveOutDateInput || activeCase.moveOutDate,
              isDamaged: isDamage,
              caption:
                moveOutNotes.trim() ||
                (isDamage
                  ? 'Physical apartment damage recorded during move-out inspection.'
                  : 'Documented move-out inspection condition.'),
              scene: scenePreset,
            }),
          ];

    const finalMoveInImg =
      finalMoveInGallery[finalMoveInGallery.length - 1] || '';
    const finalMoveOutImg =
      finalMoveOutGallery[finalMoveOutGallery.length - 1] || '';

    const cleanMoveInNotes =
      moveInNotes.trim() ||
      'Documented clean & undamaged condition at check-in.';
    const cleanMoveOutNotes =
      moveOutNotes.trim() ||
      (isDamage
        ? 'Physical damage recorded at apartment move-out inspection.'
        : 'Documented move-out inspection condition.');

    try {
      const ollamaAnalysis = await analyzePhotosWithOllamaAndEmailQuotation({
        caseDetails: activeCase,
        area: trimmedArea,
        category,
        moveInDate: moveInDateInput || activeCase.startDate,
        moveOutDate: moveOutDateInput || activeCase.moveOutDate,
        moveInNotes: cleanMoveInNotes,
        moveOutNotes: cleanMoveOutNotes,
        moveInImage: finalMoveInImg,
        moveOutImage: finalMoveOutImg,
        moveInImages: finalMoveInGallery,
        moveOutImages: finalMoveOutGallery,
        estimatedCost: isDamage ? damageCostInput : 0,
        recipientEmail: activeCase.tenantEmail,
      });

      const finalCost =
        ollamaAnalysis.totalQuotationAmount > 0
          ? ollamaAnalysis.totalQuotationAmount
          : damageCostInput;

      const newComp: RoomComparison = {
        id: `comp-${Date.now()}`,
        area: trimmedArea,
        moveInDate: moveInDateInput || activeCase.startDate,
        moveOutDate: moveOutDateInput || activeCase.moveOutDate,
        moveInNotes: cleanMoveInNotes,
        moveOutNotes: cleanMoveOutNotes,
        moveInImage: finalMoveInImg,
        moveOutImage: finalMoveOutImg,
        moveInImages: finalMoveInGallery,
        moveOutImages: finalMoveOutGallery,
        category,
        verdict:
          verdict.trim() ||
          ollamaAnalysis.conditionSummary ||
          (isDamage
            ? `Ollama Photo Analysis (${ollamaAnalysis.quotationNo}): ${cleanMoveOutNotes} (Quotation: ₹${ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')}).`
            : 'Jointly inspected and verified via Ollama photo comparison.'),
        disputed: isDisputed,
        ollamaAnalysis,
      };

      const deductionPayload =
        alsoLogDeduction && isDamage && finalCost > 0
          ? {
              title: `${trimmedArea} — ${cleanMoveOutNotes}`,
              amount: finalCost,
              claim: ollamaAnalysis.conditionSummary || cleanMoveOutNotes,
            }
          : undefined;

      onAddComparison(newComp, deductionPayload);

      if (deductionPayload && onLogDamageFromPhoto && role !== 'owner') {
        onLogDamageFromPhoto(
          deductionPayload.title,
          deductionPayload.amount,
          deductionPayload.claim
        );
      }

      setAreaName('');
      setMoveInNotes('');
      setMoveOutNotes('');
      setMoveInImage('');
      setMoveOutImage('');
      setMoveInImagesModal([]);
      setMoveOutImagesModal([]);
      setVerdict('');
      setShowAddModal(false);
      notify(
        `Ollama analyzed ${finalMoveInGallery.length} Move-In & ${finalMoveOutGallery.length} Move-Out photo(s) for "${trimmedArea}" & emailed exact Quotation (${ollamaAnalysis.quotationNo} · ₹${ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')}) to ${ollamaAnalysis.emailedToTenant}!`
      );
    } finally {
      setSubmittingNewArea(false);
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'resident' || !editingComp) return;
    onUpdateComparison(editingComp);
    const updatedItem = editingComp;
    setEditingComp(null);
    triggerOllamaAnalysisForComparison(updatedItem);
  };

  const comparisonsList = activeCase.comparisons || [];

  return (
    <div className="space-y-6">
      {/* Status Toast */}
      {statusToast && (
        <div className="bg-emerald-950 text-white border border-emerald-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-emerald-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {activeCase.roomCode}
            </span>
            <span className="font-semibold text-slate-700">
              {activeCase.pgName} ({activeCase.roomNo})
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Check-In: <strong>{activeCase.startDate}</strong> → Move-Out:{' '}
              <strong>{activeCase.moveOutDate}</strong>
            </span>
            {role === 'resident' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded border border-emerald-300">
                <Eye className="w-3 h-3 text-emerald-700" />
                <span>Tenant Read-Only Photo Inspection</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Move-In vs. Move-Out Apartment Photo Evidence ({comparisonsList.length} Area{comparisonsList.length === 1 ? '' : 's'})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {role === 'owner'
              ? 'Upload or capture Move-In (check-in) and Move-Out (checkout) photos for appliances, furniture, and glass doors to prove physical damages for your Legal Notice.'
              : 'Certified Move-In and Move-Out apartment photos recorded by your property owner. You can inspect photos side-by-side or drag the comparison slider, open full screen, and download high-resolution photos.'}
          </p>
        </div>

        {role === 'owner' && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMoveInDateInput(activeCase.startDate);
                setMoveOutDateInput(activeCase.moveOutDate);
                setShowAddModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Move-In / Move-Out Photo Area</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State if no comparisons */}
      {comparisonsList.length === 0 && (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
          <Camera className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            {role === 'owner'
              ? `No Move-In or Move-Out Photos Added Yet for ${activeCase.roomCode}`
              : `No Move-In or Move-Out Photos Recorded for ${activeCase.roomCode}`}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {role === 'owner'
              ? 'Add an apartment area (such as Living Room Smart TV, Balcony Glass Door, Kitchen Hob, or Master Bedroom AC) to upload or generate Move-In and Move-Out inspection photos.'
              : `Your property owner (${activeCase.landlordName || 'Landlord'}) has not uploaded move-in or move-out inspection photos for this apartment unit yet. Once uploaded, you will be able to inspect them here.`}
          </p>
          {role === 'owner' ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Move-In & Move-Out Photo Pair</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Tenant View: Only property owner can upload move-in/out inspection photos</span>
            </div>
          )}
        </div>
      )}

      {/* Comparisons List */}
      <div className="space-y-6">
        {comparisonsList.map((item) => {
          const mode = viewModeByCard[item.id] || 'sideBySide';
          const sliderPercent = sliderPosByCard[item.id] ?? 50;

          const fallbackMoveIn = buildInspectionPhotoSvg({
            stage: 'moveIn',
            areaTitle: item.area,
            roomCode: activeCase.roomCode,
            date: item.moveInDate,
            isDamaged: false,
            caption: item.moveInNotes,
            scene: inferScene(item.area),
          });

          const fallbackMoveOut = buildInspectionPhotoSvg({
            stage: 'moveOut',
            areaTitle: item.area,
            roomCode: activeCase.roomCode,
            date: item.moveOutDate,
            isDamaged: item.category === 'Tenant Damage' || item.disputed,
            caption: item.moveOutNotes,
            scene: inferScene(item.area),
          });

          const moveInGallery =
            Array.isArray(item.moveInImages) && item.moveInImages.length > 0
              ? item.moveInImages.filter(Boolean)
              : item.moveInImage && item.moveInImage.trim() !== ''
              ? [item.moveInImage]
              : [];

          const moveOutGallery =
            Array.isArray(item.moveOutImages) && item.moveOutImages.length > 0
              ? item.moveOutImages.filter(Boolean)
              : item.moveOutImage && item.moveOutImage.trim() !== ''
              ? [item.moveOutImage]
              : [];

          const hasMoveInPhoto = moveInGallery.length > 0;
          const hasMoveOutPhoto = moveOutGallery.length > 0;

          const activeMoveInIdx = Math.min(
            selectedMoveInIdxByCard[item.id] ?? 0,
            Math.max(0, moveInGallery.length - 1)
          );
          const activeMoveOutIdx = Math.min(
            selectedMoveOutIdxByCard[item.id] ?? 0,
            Math.max(0, moveOutGallery.length - 1)
          );

          const activeMoveInSrc = hasMoveInPhoto
            ? moveInGallery[activeMoveInIdx] || moveInGallery[0]
            : fallbackMoveIn;
          const activeMoveOutSrc = hasMoveOutPhoto
            ? moveOutGallery[activeMoveOutIdx] || moveOutGallery[0]
            : fallbackMoveOut;

          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5"
            >
              {/* Header info for this area */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">
                    {item.area}
                  </h3>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                      item.category === 'Tenant Damage'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : item.category === 'Normal Wear & Tear'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : item.category === 'Undamaged / Clean'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {item.category}
                  </span>
                  {item.disputed ? (
                    <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      Damage Claimed / Disputed
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Verified / Agreed
                    </span>
                  )}
                </div>

                {/* View Mode Switcher & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        setViewModeByCard((prev) => ({
                          ...prev,
                          [item.id]: 'sideBySide',
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        mode === 'sideBySide'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>Side-by-Side</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setViewModeByCard((prev) => ({
                          ...prev,
                          [item.id]: 'slider',
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        mode === 'slider'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Before / After Slider</span>
                    </button>
                  </div>

                  {role === 'owner' ? (
                    <button
                      type="button"
                      disabled={analyzingCardId === item.id}
                      onClick={() => triggerOllamaAnalysisForComparison(item)}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {analyzingCardId === item.id ? (
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Cpu className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {analyzingCardId === item.id
                          ? 'Ollama Analyzing & Emailing...'
                          : item.ollamaAnalysis
                          ? 'Re-Analyze with Ollama & Email Quotation'
                          : 'Analyze with Ollama & Email Quotation'}
                      </span>
                    </button>
                  ) : item.ollamaAnalysis ? (
                    <button
                      type="button"
                      onClick={() => setPreviewQuotationComp(item)}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Ollama Quotation ({item.ollamaAnalysis.quotationNo})</span>
                    </button>
                  ) : null}

                  {role === 'owner' && onLogDamageFromPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        const costToLog =
                          item.ollamaAnalysis?.totalQuotationAmount &&
                          item.ollamaAnalysis.totalQuotationAmount > 0
                            ? item.ollamaAnalysis.totalQuotationAmount
                            : 8500;
                        onLogDamageFromPhoto(
                          `${item.area} (${item.ollamaAnalysis?.quotationNo || 'Move-Out Damage'})`,
                          costToLog,
                          item.ollamaAnalysis?.conditionSummary ||
                            item.moveOutNotes
                        );
                        notify(
                          `Logged "${item.area}" (₹${costToLog.toLocaleString('en-IN')}) to Move-Out Damages & Legal Notice!`
                        );
                      }}
                      className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      <span>Add to Legal Damage Claim</span>
                    </button>
                  )}

                  {role === 'owner' && (
                    <button
                      type="button"
                      onClick={() => setEditingComp(item)}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Notes</span>
                    </button>
                  )}

                  {role === 'owner' && onDeleteComparison && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteComparison(item.id);
                        notify(`Deleted inspection area "${item.area}".`);
                      }}
                      className="text-xs font-medium text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Delete Inspection Area"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* MODE A: Interactive Before / After Comparison Slider */}
              {mode === 'slider' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs bg-slate-900 text-white px-4 py-2.5 rounded-xl">
                    <span className="font-bold text-emerald-400">
                      ◀ Left: Move-In ({item.moveInDate})
                    </span>
                    <span className="font-mono text-[11px] text-slate-300">
                      Drag slider to compare Move-In vs. Move-Out ({sliderPercent}%)
                    </span>
                    <span className="font-bold text-rose-400">
                      Right: Move-Out ({item.moveOutDate}) ▶
                    </span>
                  </div>

                  <div className="relative w-full h-72 sm:h-88 rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 select-none">
                    {/* Underlying Image: Move-Out (After) */}
                    <img
                      src={activeMoveOutSrc}
                      alt={`${item.area} Move Out`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          fallbackMoveOut;
                      }}
                      className="absolute inset-0 w-full h-full object-contain bg-slate-900"
                    />

                    {/* Clipped Foreground Image: Move-In (Before) */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        clipPath: `inset(0 ${100 - sliderPercent}% 0 0)`,
                      }}
                    >
                      <img
                        src={activeMoveInSrc}
                        alt={`${item.area} Move In`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            fallbackMoveIn;
                        }}
                        className="absolute inset-0 w-full h-full object-contain bg-slate-900"
                      />
                    </div>

                    {/* Vertical Divider Line */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
                      style={{ left: `${sliderPercent}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-emerald-600 border-2 border-white text-white flex items-center justify-center shadow-md text-[10px] font-bold">
                        ↔
                      </div>
                    </div>

                    {/* Range Input Overlay for smooth touch & mouse dragging */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sliderPercent}
                      onChange={(e) =>
                        setSliderPosByCard((prev) => ({
                          ...prev,
                          [item.id]: Number(e.target.value),
                        }))
                      }
                      aria-label="Move-In vs Move-Out Comparison Slider"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                    />
                  </div>
                </div>
              ) : (
                /* MODE B: Side-by-Side Photo Cards with Multi-Photo Upload, Camera & Gallery */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 1. Move-In Photo Slot */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (
                        role === 'owner' &&
                        e.dataTransfer.files &&
                        e.dataTransfer.files.length > 0
                      ) {
                        handleCardMultipleImagesUpload(
                          item,
                          'moveIn',
                          e.dataTransfer.files
                        );
                      }
                    }}
                    className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Move-In Condition ({item.moveInDate})
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {moveInGallery.length > 0
                          ? `${moveInGallery.length} Move-In Photo${
                              moveInGallery.length > 1 ? 's' : ''
                            }`
                          : 'Check-In Handover'}
                      </span>
                    </div>

                    {/* Move-In Image Container */}
                    <div className="relative h-60 rounded-xl bg-slate-900 border border-slate-300 overflow-hidden flex flex-col items-center justify-center">
                      {hasMoveInPhoto ? (
                        <>
                          <img
                            src={activeMoveInSrc}
                            alt={`${item.area} Move In`}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                fallbackMoveIn;
                            }}
                            className="w-full h-full object-contain bg-slate-900"
                          />

                          {moveInGallery.length > 1 && (
                            <div className="absolute top-2.5 left-2.5 bg-slate-950/80 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-500/40">
                              Photo {activeMoveInIdx + 1} of {moveInGallery.length}
                            </div>
                          )}

                          {/* Action Bar */}
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/85 backdrop-blur-xs px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingPhoto({
                                    url: activeMoveInSrc,
                                    title: `${item.area} — Move-In Photo #${
                                      activeMoveInIdx + 1
                                    } (${activeCase.roomCode})`,
                                    date: item.moveInDate,
                                    notes: item.moveInNotes,
                                  })
                                }
                                className="hover:text-emerald-400 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Full Screen</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadPhoto(
                                    activeMoveInSrc,
                                    `${activeCase.roomCode}_${item.area.replace(
                                      /\s+/g,
                                      '_'
                                    )}_MoveIn_${activeMoveInIdx + 1}.jpg`
                                  )
                                }
                                className="hover:text-emerald-400 flex items-center gap-1 cursor-pointer text-slate-300"
                                title="Download Move-In Photo"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Download</span>
                              </button>
                            </div>

                            {role === 'owner' ? (
                              <div className="flex items-center gap-2">
                                <label className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold cursor-pointer flex items-center gap-1">
                                  <Upload className="w-3 h-3" />
                                  <span>+ Add Photos</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      if (
                                        e.target.files &&
                                        e.target.files.length > 0
                                      ) {
                                        handleCardMultipleImagesUpload(
                                          item,
                                          'moveIn',
                                          e.target.files
                                        );
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCameraTarget({
                                      mode: 'card',
                                      item,
                                      stage: 'moveIn',
                                    })
                                  }
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded-lg font-semibold cursor-pointer flex items-center gap-1"
                                  title="Capture with Camera"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Camera</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveCardImage(
                                      item,
                                      'moveIn',
                                      activeMoveInIdx
                                    )
                                  }
                                  className="text-slate-400 hover:text-rose-400 cursor-pointer p-1"
                                  title="Remove This Photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Inspection View</span>
                              </span>
                            )}
                          </div>
                        </>
                      ) : role === 'owner' ? (
                        /* Upload / Camera / Generate Dropzone when cleared - OWNER ONLY */
                        <div className="w-full h-full bg-white flex flex-col items-center justify-center p-4 text-center space-y-2.5 border-2 border-dashed border-slate-300 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                            <Camera className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-800">
                            Add Move-In Photos ({item.area})
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Multiple Photos</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (
                                    e.target.files &&
                                    e.target.files.length > 0
                                  ) {
                                    handleCardMultipleImagesUpload(
                                      item,
                                      'moveIn',
                                      e.target.files
                                    );
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setCameraTarget({
                                  mode: 'card',
                                  item,
                                  stage: 'moveIn',
                                })
                              }
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Use Camera</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUseInstantStampedPhoto('moveIn', item)
                              }
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Restore Default Stamp</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Read-only placeholder for TENANT */
                        <div className="w-full h-full bg-white flex flex-col items-center justify-center p-6 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <Eye className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">
                            No Move-In Photo Uploaded Yet
                          </p>
                          <p className="text-[11px] text-slate-500 max-w-xs">
                            Your property owner ({activeCase.landlordName || 'Owner'}) has not uploaded a Move-In photo for {item.area}.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Multi-Photo Thumbnail Strip for Move-In */}
                    {moveInGallery.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {moveInGallery.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() =>
                              setSelectedMoveInIdxByCard((prev) => ({
                                ...prev,
                                [item.id]: idx,
                              }))
                            }
                            className={`relative w-14 h-12 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition-all ${
                              activeMoveInIdx === idx
                                ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                                : 'border-slate-200 opacity-75 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`Move-In #${idx + 1}`}
                              className="w-full h-full object-cover bg-slate-900"
                            />
                            <span className="absolute bottom-0 right-0 bg-slate-950/80 text-white text-[9px] font-mono px-1">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                        {role === 'owner' && (
                          <label
                            className="w-14 h-12 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-700 flex flex-col items-center justify-center cursor-pointer shrink-0 text-[10px] font-bold"
                            title="Add more Move-In photos"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (
                                  e.target.files &&
                                  e.target.files.length > 0
                                ) {
                                  handleCardMultipleImagesUpload(
                                    item,
                                    'moveIn',
                                    e.target.files
                                  );
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    <div className="text-xs">
                      <span className="text-slate-500 block text-[11px] font-semibold mb-1">
                        Move-In Condition Notes:
                      </span>
                      <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                        {item.moveInNotes}
                      </p>
                    </div>
                  </div>

                  {/* 2. Move-Out Photo Slot */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (
                        role === 'owner' &&
                        e.dataTransfer.files &&
                        e.dataTransfer.files.length > 0
                      ) {
                        handleCardMultipleImagesUpload(
                          item,
                          'moveOut',
                          e.dataTransfer.files
                        );
                      }
                    }}
                    className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-rose-600" />
                        Move-Out Condition ({item.moveOutDate})
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          item.category === 'Tenant Damage'
                            ? 'text-rose-700 bg-rose-50 border-rose-200'
                            : 'text-slate-700 bg-slate-100 border-slate-200'
                        }`}
                      >
                        {moveOutGallery.length > 0
                          ? `${moveOutGallery.length} Move-Out Photo${
                              moveOutGallery.length > 1 ? 's' : ''
                            }`
                          : item.category === 'Tenant Damage'
                          ? 'Damage Recorded'
                          : 'Checkout Inspection'}
                      </span>
                    </div>

                    {/* Move-Out Image Container */}
                    <div className="relative h-60 rounded-xl bg-slate-900 border border-slate-300 overflow-hidden flex flex-col items-center justify-center">
                      {hasMoveOutPhoto ? (
                        <>
                          <img
                            src={activeMoveOutSrc}
                            alt={`${item.area} Move Out`}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                fallbackMoveOut;
                            }}
                            className="w-full h-full object-contain bg-slate-900"
                          />

                          {moveOutGallery.length > 1 && (
                            <div className="absolute top-2.5 left-2.5 bg-slate-950/80 text-rose-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-rose-500/40">
                              Photo {activeMoveOutIdx + 1} of {moveOutGallery.length}
                            </div>
                          )}

                          {/* Action Bar */}
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/85 backdrop-blur-xs px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingPhoto({
                                    url: activeMoveOutSrc,
                                    title: `${item.area} — Move-Out Photo #${
                                      activeMoveOutIdx + 1
                                    } (${activeCase.roomCode})`,
                                    date: item.moveOutDate,
                                    notes: item.moveOutNotes,
                                  })
                                }
                                className="hover:text-emerald-400 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Full Screen</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadPhoto(
                                    activeMoveOutSrc,
                                    `${activeCase.roomCode}_${item.area.replace(
                                      /\s+/g,
                                      '_'
                                    )}_MoveOut_${activeMoveOutIdx + 1}.jpg`
                                  )
                                }
                                className="hover:text-emerald-400 flex items-center gap-1 cursor-pointer text-slate-300"
                                title="Download Move-Out Photo"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Download</span>
                              </button>
                            </div>

                            {role === 'owner' ? (
                              <div className="flex items-center gap-2">
                                <label className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold cursor-pointer flex items-center gap-1">
                                  <Upload className="w-3 h-3" />
                                  <span>+ Add Photos</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      if (
                                        e.target.files &&
                                        e.target.files.length > 0
                                      ) {
                                        handleCardMultipleImagesUpload(
                                          item,
                                          'moveOut',
                                          e.target.files
                                        );
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCameraTarget({
                                      mode: 'card',
                                      item,
                                      stage: 'moveOut',
                                    })
                                  }
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded-lg font-semibold cursor-pointer flex items-center gap-1"
                                  title="Capture with Camera"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Camera</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveCardImage(
                                      item,
                                      'moveOut',
                                      activeMoveOutIdx
                                    )
                                  }
                                  className="text-slate-400 hover:text-rose-400 cursor-pointer p-1"
                                  title="Remove This Photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5 text-rose-400" />
                                <span>Inspection View</span>
                              </span>
                            )}
                          </div>
                        </>
                      ) : role === 'owner' ? (
                        /* Upload / Camera / Generate Dropzone when cleared - OWNER ONLY */
                        <div className="w-full h-full bg-white flex flex-col items-center justify-center p-4 text-center space-y-2.5 border-2 border-dashed border-slate-300 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                            <Camera className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-800">
                            Add Move-Out Photos ({item.area})
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Multiple Photos</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (
                                    e.target.files &&
                                    e.target.files.length > 0
                                  ) {
                                    handleCardMultipleImagesUpload(
                                      item,
                                      'moveOut',
                                      e.target.files
                                    );
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setCameraTarget({
                                  mode: 'card',
                                  item,
                                  stage: 'moveOut',
                                })
                              }
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Use Camera</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUseInstantStampedPhoto('moveOut', item)
                              }
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Restore Default Stamp</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Read-only placeholder for TENANT */
                        <div className="w-full h-full bg-white flex flex-col items-center justify-center p-6 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <Eye className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">
                            No Move-Out Photo Uploaded Yet
                          </p>
                          <p className="text-[11px] text-slate-500 max-w-xs">
                            Your property owner ({activeCase.landlordName || 'Owner'}) has not uploaded a Move-Out photo for {item.area}.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Multi-Photo Thumbnail Strip for Move-Out */}
                    {moveOutGallery.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {moveOutGallery.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() =>
                              setSelectedMoveOutIdxByCard((prev) => ({
                                ...prev,
                                [item.id]: idx,
                              }))
                            }
                            className={`relative w-14 h-12 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition-all ${
                              activeMoveOutIdx === idx
                                ? 'border-rose-600 ring-2 ring-rose-500/30'
                                : 'border-slate-200 opacity-75 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`Move-Out #${idx + 1}`}
                              className="w-full h-full object-cover bg-slate-900"
                            />
                            <span className="absolute bottom-0 right-0 bg-slate-950/80 text-white text-[9px] font-mono px-1">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                        {role === 'owner' && (
                          <label
                            className="w-14 h-12 rounded-lg border-2 border-dashed border-rose-300 bg-rose-50/60 hover:bg-rose-100/70 text-rose-700 flex flex-col items-center justify-center cursor-pointer shrink-0 text-[10px] font-bold"
                            title="Add more Move-Out photos"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (
                                  e.target.files &&
                                  e.target.files.length > 0
                                ) {
                                  handleCardMultipleImagesUpload(
                                    item,
                                    'moveOut',
                                    e.target.files
                                  );
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    <div className="text-xs">
                      <span className="text-slate-500 block text-[11px] font-semibold mb-1">
                        Move-Out Condition Notes:
                      </span>
                      <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                        {item.moveOutNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ollama Move-In vs. Move-Out Photo Analysis & Repair Quotation Sent to Tenant Email */}
              {item.ollamaAnalysis && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-indigo-200/70">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-950 bg-indigo-100/90 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                          <Cpu className="w-3.5 h-3.5 text-indigo-700" />
                          <span>
                            Ollama Vision Analysis ({item.ollamaAnalysis.modelUsed})
                          </span>
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {item.ollamaAnalysis.quotationNo}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                          <Mail className="w-3 h-3 text-emerald-700" />
                          <span>
                            Quotation Sent to Tenant Email:{' '}
                            {item.ollamaAnalysis.emailedToTenant}
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Analyzed & Emailed on {item.ollamaAnalysis.analyzedAt} ·{' '}
                        {activeCase.roomNo} ({activeCase.roomCode})
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Total Ollama Repair Quotation
                      </span>
                      <span
                        className={`text-lg font-extrabold font-mono ${
                          item.ollamaAnalysis.totalQuotationAmount > 0
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        ₹
                        {item.ollamaAnalysis.totalQuotationAmount.toLocaleString(
                          'en-IN'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Exact Photo Description */}
                  <div className="text-xs bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1.5">
                    <span className="font-bold text-slate-900 block">
                      Ollama Exact Photo Description ({moveInGallery.length || 1}{' '}
                      Move-In vs. {moveOutGallery.length || 1} Move-Out Photo
                      {moveOutGallery.length > 1 ? 's' : ''}):
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {item.ollamaAnalysis.conditionSummary}
                    </p>
                  </div>

                  {/* Single Exact Item Repair Quotation Table (No extra items) */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
                      <span>
                        Exact Photo Quotation ({item.ollamaAnalysis.quotationNo})
                      </span>
                      <span>Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs">
                      {item.ollamaAnalysis.quotationItems
                        .slice(0, 1)
                        .map((qItem, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                          >
                            <div>
                              <span className="font-semibold text-slate-900">
                                {qItem.item}
                              </span>
                              {qItem.notes && (
                                <span className="text-[11px] text-slate-500 block">
                                  {qItem.notes}
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-slate-900 shrink-0">
                              ₹{Number(qItem.cost || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between font-bold text-slate-900">
                        <span>
                          Total Quotation Amount (Emailed to{' '}
                          {item.ollamaAnalysis.emailedToTenant})
                        </span>
                        <span className="font-mono text-sm text-rose-700">
                          ₹
                          {item.ollamaAnalysis.totalQuotationAmount.toLocaleString(
                            'en-IN'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Quotation Acceptance / Rejection & Repayment Section */}
                  {item.ollamaAnalysis.totalQuotationAmount > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                      {/* Header & Current Status Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>
                              Tenant Quotation Decision & How Tenant Repays (
                              {item.ollamaAnalysis.quotationNo})
                            </span>
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Tenant can Accept or Reject this quotation, and choose
                            either to{' '}
                            <strong>
                              Give Back as in Move-In Photo (Restore/Repair)
                            </strong>{' '}
                            or <strong>Give Financial Compensation</strong>.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {item.ollamaAnalysis.tenantStatus === 'accepted' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>
                                Accepted by Tenant ·{' '}
                                {item.ollamaAnalysis.repaymentMethod ===
                                'restore_to_move_in_photo'
                                  ? 'Restoring as in Move-In Photo'
                                  : item.ollamaAnalysis.repaymentMethod ===
                                    'compensation_upi_payment'
                                  ? 'Paying UPI Compensation'
                                  : 'Deposit Compensation'}
                              </span>
                            </span>
                          ) : item.ollamaAnalysis.tenantStatus ===
                            'rejected' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                              <span>Rejected / Disputed by Tenant</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                              <span>Awaiting Tenant Decision</span>
                            </span>
                          )}

                          {item.ollamaAnalysis.ownerVerifiedSettlement && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Owner Verified</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Recorded Tenant Decision Summary Box (if Tenant has responded) */}
                      {(item.ollamaAnalysis.tenantStatus === 'accepted' ||
                        item.ollamaAnalysis.tenantStatus === 'rejected') &&
                        item.ollamaAnalysis.tenantRespondedAt && (
                          <div
                            className={`rounded-xl p-3.5 border text-xs space-y-2.5 ${
                              item.ollamaAnalysis.tenantStatus === 'accepted'
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : 'bg-rose-50/70 border-rose-200 text-rose-950'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="space-y-0.5">
                                <span className="font-extrabold uppercase text-[11px] tracking-wide block">
                                  {item.ollamaAnalysis.tenantStatus ===
                                  'accepted'
                                    ? item.ollamaAnalysis.repaymentMethod ===
                                      'restore_to_move_in_photo'
                                      ? '✓ ACCEPTED — TENANT GIVING BACK AS IN MOVE-IN PHOTO (SELF-REPAIR / RESTORATION)'
                                      : item.ollamaAnalysis.repaymentMethod ===
                                        'compensation_upi_payment'
                                      ? `✓ ACCEPTED — TENANT GIVING FINANCIAL COMPENSATION VIA UPI (₹${item.ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')})`
                                      : `✓ ACCEPTED — TENANT GIVING FINANCIAL COMPENSATION VIA SECURITY DEPOSIT (₹${item.ollamaAnalysis.totalQuotationAmount.toLocaleString('en-IN')})`
                                    : '✕ REJECTED / DISPUTED BY TENANT'}
                                </span>
                                <p className="text-[11px] opacity-80">
                                  Responded by {activeCase.tenantName} on{' '}
                                  {item.ollamaAnalysis.tenantRespondedAt} ·
                                  Emailed to Landowner (
                                  {activeCase.landlordEmail})
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {item.ollamaAnalysis.responseEmailPreviewUrl && (
                                  <a
                                    href={
                                      item.ollamaAnalysis
                                        .responseEmailPreviewUrl
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-[11px] font-bold inline-flex items-center gap-1"
                                  >
                                    <span>View Response Email</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}

                                {role === 'owner' &&
                                  !item.ollamaAnalysis
                                    .ownerVerifiedSettlement && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOwnerVerifyQuotationSettlement(
                                          item
                                        )
                                      }
                                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>
                                        Verify & Approve Tenant Settlement
                                      </span>
                                    </button>
                                  )}
                              </div>
                            </div>

                            {item.ollamaAnalysis.repaymentNotes && (
                              <p className="bg-white/90 p-2.5 rounded-lg border border-slate-200/80 text-slate-800">
                                <strong>Tenant Statement:</strong>{' '}
                                {item.ollamaAnalysis.repaymentNotes}
                              </p>
                            )}

                            {item.ollamaAnalysis.repaymentUtr && (
                              <p className="font-mono text-[11px] bg-white/90 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-900 inline-block">
                                Compensation UPI UTR Reference:{' '}
                                <strong>
                                  {item.ollamaAnalysis.repaymentUtr}
                                </strong>
                              </p>
                            )}

                            {item.ollamaAnalysis.restoredPhotoUrl && (
                              <div className="pt-1 space-y-1.5">
                                <span className="font-bold text-[11px] text-emerald-900 block">
                                  Restored Condition Photo (Handed Back Matching
                                  Move-In Photo):
                                </span>
                                <div className="flex flex-wrap items-center gap-3">
                                  <img
                                    src={item.ollamaAnalysis.restoredPhotoUrl}
                                    alt="Restored to Move-In Condition"
                                    className="h-28 w-44 object-contain rounded-lg border border-emerald-300 bg-slate-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingPhoto({
                                        url: item.ollamaAnalysis!
                                          .restoredPhotoUrl!,
                                        title: `${item.area} — Restored to Move-In Photo Condition`,
                                        date:
                                          item.ollamaAnalysis!
                                            .tenantRespondedAt ||
                                          item.moveOutDate,
                                        notes:
                                          item.ollamaAnalysis!.repaymentNotes ||
                                          'Restored by tenant to match Move-In photo condition',
                                      })
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    <span>View Restored Photo</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Interactive Form for Tenant to Accept / Reject & Choose Repayment Method */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 space-y-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {role === 'resident'
                              ? 'Step 1: Accept or Reject This Quotation'
                              : 'Tenant Response & Repayment Simulator (Accept / Reject & How Tenant Repays)'}
                          </span>

                          <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                setDecisionByCard((prev) => ({
                                  ...prev,
                                  [item.id]: 'accepted',
                                }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors ${
                                (decisionByCard[item.id] ||
                                  (item.ollamaAnalysis.tenantStatus ===
                                  'rejected'
                                    ? 'rejected'
                                    : 'accepted')) === 'accepted'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accept Quotation</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDecisionByCard((prev) => ({
                                  ...prev,
                                  [item.id]: 'rejected',
                                }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors ${
                                (decisionByCard[item.id] ||
                                  (item.ollamaAnalysis.tenantStatus ===
                                  'rejected'
                                    ? 'rejected'
                                    : 'accepted')) === 'rejected'
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject Quotation</span>
                            </button>
                          </div>
                        </div>

                        {(decisionByCard[item.id] ||
                          (item.ollamaAnalysis.tenantStatus === 'rejected'
                            ? 'rejected'
                            : 'accepted')) === 'accepted' ? (
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-800 block">
                              Step 2: How Will Tenant Repay / Settle This Damage?
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                              {/* Option 1: Give Back as in Move-In Photo */}
                              <button
                                type="button"
                                onClick={() =>
                                  setRepaymentMethodByCard((prev) => ({
                                    ...prev,
                                    [item.id]: 'restore_to_move_in_photo',
                                  }))
                                }
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                  (repaymentMethodByCard[item.id] ||
                                    item.ollamaAnalysis.repaymentMethod ||
                                    'restore_to_move_in_photo') ===
                                  'restore_to_move_in_photo'
                                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                                      <Wrench className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>
                                        1. Give Back as in Move-In Photo
                                      </span>
                                    </span>
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                      ₹0 Deducted
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 leading-snug">
                                    Repair/replace the item yourself to restore
                                    it to the Move-In photo condition and upload
                                    proof.
                                  </p>
                                </div>
                              </button>

                              {/* Option 2: Give Compensation from Deposit */}
                              <button
                                type="button"
                                onClick={() =>
                                  setRepaymentMethodByCard((prev) => ({
                                    ...prev,
                                    [item.id]: 'compensation_deposit_deduction',
                                  }))
                                }
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                  (repaymentMethodByCard[item.id] ||
                                    item.ollamaAnalysis.repaymentMethod ||
                                    'restore_to_move_in_photo') ===
                                  'compensation_deposit_deduction'
                                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                                      <Wallet className="w-3.5 h-3.5 text-indigo-700" />
                                      <span>
                                        2. Compensation via Security Deposit
                                      </span>
                                    </span>
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                      -₹
                                      {item.ollamaAnalysis.totalQuotationAmount.toLocaleString(
                                        'en-IN'
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 leading-snug">
                                    Give compensation by deducting ₹
                                    {item.ollamaAnalysis.totalQuotationAmount.toLocaleString(
                                      'en-IN'
                                    )}{' '}
                                    from ₹
                                    {activeCase.securityDeposit.toLocaleString(
                                      'en-IN'
                                    )}{' '}
                                    Security Deposit.
                                  </p>
                                </div>
                              </button>

                              {/* Option 3: Give Direct Compensation via UPI */}
                              <button
                                type="button"
                                onClick={() =>
                                  setRepaymentMethodByCard((prev) => ({
                                    ...prev,
                                    [item.id]: 'compensation_upi_payment',
                                  }))
                                }
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                  (repaymentMethodByCard[item.id] ||
                                    item.ollamaAnalysis.repaymentMethod ||
                                    'restore_to_move_in_photo') ===
                                  'compensation_upi_payment'
                                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                                      <Send className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>
                                        3. Direct Compensation (UPI / Bank)
                                      </span>
                                    </span>
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                      Pay ₹
                                      {item.ollamaAnalysis.totalQuotationAmount.toLocaleString(
                                        'en-IN'
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 leading-snug">
                                    Pay ₹
                                    {item.ollamaAnalysis.totalQuotationAmount.toLocaleString(
                                      'en-IN'
                                    )}{' '}
                                    compensation to Landowner UPI (
                                    {activeCase.ownerUpiId ||
                                      'emeraldcrest.landowner@okhdfcbank'}
                                    ) & log UTR.
                                  </p>
                                </div>
                              </button>
                            </div>

                            {/* Sub-options depending on selected Repayment Method */}
                            {(repaymentMethodByCard[item.id] ||
                              item.ollamaAnalysis.repaymentMethod ||
                              'restore_to_move_in_photo') ===
                              'restore_to_move_in_photo' && (
                              <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2.5 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-bold text-emerald-950">
                                    Attach Restored Photo Proof (Matching Move-In
                                    Photo Condition):
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer inline-flex items-center gap-1">
                                      <Upload className="w-3 h-3" />
                                      <span>Upload Restored Photo</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            compressAndReadImage(
                                              file,
                                              (url) => {
                                                setRestoredPhotoByCard(
                                                  (prev) => ({
                                                    ...prev,
                                                    [item.id]: url,
                                                  })
                                                );
                                              }
                                            );
                                            e.target.value = '';
                                          }
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const restoredSvg =
                                          buildInspectionPhotoSvg({
                                            stage: 'moveIn',
                                            areaTitle: `${item.area} (Restored)`,
                                            roomCode: activeCase.roomCode,
                                            date: new Date()
                                              .toISOString()
                                              .split('T')[0],
                                            isDamaged: false,
                                            caption:
                                              'Restored by tenant to match original Move-In photo condition',
                                            scene: inferScene(item.area),
                                          });
                                        setRestoredPhotoByCard((prev) => ({
                                          ...prev,
                                          [item.id]: restoredSvg,
                                        }));
                                        notify(
                                          'Generated Restored Condition Photo matching Move-In baseline!'
                                        );
                                      }}
                                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold rounded-lg cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      <span>
                                        Generate Restored Photo (Match Move-In)
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                {(restoredPhotoByCard[item.id] ||
                                  item.ollamaAnalysis.restoredPhotoUrl) && (
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={
                                        restoredPhotoByCard[item.id] ||
                                        item.ollamaAnalysis.restoredPhotoUrl
                                      }
                                      alt="Restored Preview"
                                      className="h-20 w-32 object-contain rounded-lg border border-slate-300 bg-slate-900"
                                    />
                                    <span className="text-[11px] text-emerald-800 font-semibold">
                                      ✓ Restored photo attached — matches Move-In
                                      condition (₹0 deduction).
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {(repaymentMethodByCard[item.id] ||
                              item.ollamaAnalysis.repaymentMethod ||
                              'restore_to_move_in_photo') ===
                              'compensation_upi_payment' && (
                              <div className="bg-white p-3 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs">
                                <div className="sm:col-span-5">
                                  <span className="font-bold text-slate-800 block">
                                    12-Digit UPI UTR Reference No. *
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    Pay ₹
                                    {item.ollamaAnalysis.totalQuotationAmount.toLocaleString(
                                      'en-IN'
                                    )}{' '}
                                    to{' '}
                                    <strong className="font-mono">
                                      {activeCase.ownerUpiId ||
                                        'emeraldcrest.landowner@okhdfcbank'}
                                    </strong>
                                  </span>
                                </div>
                                <div className="sm:col-span-5">
                                  <input
                                    type="text"
                                    placeholder="Enter 12-digit UTR (e.g. 628194028174)"
                                    value={
                                      repaymentUtrByCard[item.id] ??
                                      item.ollamaAnalysis.repaymentUtr ??
                                      ''
                                    }
                                    onChange={(e) =>
                                      setRepaymentUtrByCard((prev) => ({
                                        ...prev,
                                        [item.id]: e.target.value,
                                      }))
                                    }
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRepaymentUtrByCard((prev) => ({
                                        ...prev,
                                        [item.id]: `${Math.floor(
                                          100000000000 +
                                            Math.random() * 899999999999
                                        )}`,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                                  >
                                    Auto UTR
                                  </button>
                                </div>
                              </div>
                            )}

                            <div>
                              <input
                                type="text"
                                placeholder="Optional repayment note (e.g., Repaired by Sony technician / Approved deduction from deposit)..."
                                value={
                                  repaymentNotesByCard[item.id] ??
                                  item.ollamaAnalysis.repaymentNotes ??
                                  ''
                                }
                                onChange={(e) =>
                                  setRepaymentNotesByCard((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg"
                              />
                            </div>
                          </div>
                        ) : (
                          /* Reject / Dispute Quotation Form */
                          <div className="space-y-2.5">
                            <span className="text-xs font-bold text-rose-900 block">
                              Step 2: Reason for Rejecting Quotation (Sends
                              Dispute Alert to Landowner Email)
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                'Pre-existing defect / normal wear and tear — not tenant damage',
                                'Quoted repair cost is higher than authorized service center rate',
                                'Requesting joint re-inspection before deposit deduction',
                              ].map((reasonPreset) => (
                                <button
                                  key={reasonPreset}
                                  type="button"
                                  onClick={() =>
                                    setRepaymentNotesByCard((prev) => ({
                                      ...prev,
                                      [item.id]: reasonPreset,
                                    }))
                                  }
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 cursor-pointer"
                                >
                                  {reasonPreset}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Enter your reason for rejecting this quotation..."
                              value={
                                repaymentNotesByCard[item.id] ??
                                item.ollamaAnalysis.repaymentNotes ??
                                ''
                              }
                              onChange={(e) =>
                                setRepaymentNotesByCard((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              className="w-full text-xs px-3 py-2 bg-white border border-rose-200 rounded-lg"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] text-slate-500">
                            Submitting automatically emails Landowner{' '}
                            <strong>{activeCase.landlordEmail}</strong> &
                            updates your settlement ledger.
                          </span>

                          <button
                            type="button"
                            disabled={submittingResponseCardId === item.id}
                            onClick={() =>
                              handleTenantSubmitQuotationResponse(item)
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-60 ${
                              (decisionByCard[item.id] ||
                                (item.ollamaAnalysis.tenantStatus === 'rejected'
                                  ? 'rejected'
                                  : 'accepted')) === 'accepted'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-rose-600 hover:bg-rose-700'
                            }`}
                          >
                            {submittingResponseCardId === item.id ? (
                              <>
                                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Submitting & Emailing Landowner...</span>
                              </>
                            ) : (decisionByCard[item.id] ||
                                (item.ollamaAnalysis.tenantStatus === 'rejected'
                                  ? 'rejected'
                                  : 'accepted')) === 'accepted' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  Confirm Acceptance & Repayment Choice
                                </span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5" />
                                <span>
                                  Submit Quotation Rejection & Notify Landowner
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between text-xs text-emerald-950">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Zero Damage Clearance (₹0 Quotation):</strong>{' '}
                          Move-Out photo matches Move-In photo condition. No
                          repayment or compensation required from tenant.
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded border border-emerald-200">
                        Cleared (₹0)
                      </span>
                    </div>
                  )}

                  {/* Quotation Email Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewQuotationComp(item)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Full Quotation Email</span>
                      </button>

                      {item.ollamaAnalysis.emailPreviewUrl && (
                        <a
                          href={item.ollamaAnalysis.emailPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1"
                        >
                          <span>SMTP Receipt</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <a
                        href={buildMailtoLink(
                          item.ollamaAnalysis.emailedToTenant,
                          item.ollamaAnalysis.quotationSubject,
                          item.ollamaAnalysis.quotationText
                        )}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send via Mail App</span>
                      </a>

                      <a
                        href={buildGmailComposeLink(
                          item.ollamaAnalysis.emailedToTenant,
                          item.ollamaAnalysis.quotationSubject,
                          item.ollamaAnalysis.quotationText
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <span>Open in Gmail</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {role === 'owner' && (
                      <button
                        type="button"
                        disabled={analyzingCardId === item.id}
                        onClick={() => triggerOllamaAnalysisForComparison(item)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <RotateCw
                          className={`w-3.5 h-3.5 ${
                            analyzingCardId === item.id ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Re-Analyze & Email Tenant</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Legal Evidentiary Assessment Banner */}
              <div
                className={`rounded-xl p-3.5 flex items-start gap-3 border ${
                  item.category === 'Tenant Damage'
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-emerald-50 border-emerald-200/90'
                }`}
              >
                <Scale
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    item.category === 'Tenant Damage'
                      ? 'text-rose-700'
                      : 'text-emerald-700'
                  }`}
                />
                <div className="text-xs">
                  <span
                    className={`font-bold block ${
                      item.category === 'Tenant Damage'
                        ? 'text-rose-950'
                        : 'text-emerald-900'
                    }`}
                  >
                    Legal Inspection Finding & Evidentiary Value:
                  </span>
                  <p
                    className={`mt-0.5 leading-relaxed ${
                      item.category === 'Tenant Damage'
                        ? 'text-rose-900'
                        : 'text-emerald-800'
                    }`}
                  >
                    {item.verdict}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Camera Capture Modal - Owner only */}
      {role === 'owner' && cameraTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Capture{' '}
                  {cameraTarget.stage === 'moveIn' ? 'Move-In' : 'Move-Out'}{' '}
                  Inspection Photo
                </h3>
                <p className="text-xs text-slate-500">
                  Apartment {activeCase.roomCode} · Automatic timestamp & unit watermark
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCameraTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-3">
                <p className="font-semibold">{cameraError}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleUseInstantStampedPhoto(
                        cameraTarget.stage,
                        cameraTarget.item
                      );
                      setCameraTarget(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Instant Inspection Snapshot</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 h-64 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCameraTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCaptureFromVideo}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Snap & Save Inspection Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {viewingPhoto.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspection Date: {viewingPhoto.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPhoto(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 p-2">
              <img
                src={viewingPhoto.url}
                alt={viewingPhoto.title}
                className="max-h-[62vh] w-auto object-contain"
              />
            </div>

            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-0.5">
                Recorded Inspection Notes:
              </span>
              <p className="text-slate-600 leading-relaxed">
                {viewingPhoto.notes}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() =>
                  handleDownloadPhoto(
                    viewingPhoto.url,
                    `${activeCase.roomCode}_Inspection_Photo.jpg`
                  )
                }
                className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingPhoto(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Close Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Apartment Inspection Area Modal - Owner only */}
      {role === 'owner' && showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Add Move-In & Move-Out Apartment Photos ({activeCase.roomCode})
                </h3>
                <p className="text-xs text-slate-500">
                  Upload photos from your device, capture with camera, or generate stamped inspection visuals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-3">
              {/* Quick Room Area Presets */}
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
                  Quick Fill Apartment Room / Appliance Preset:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: '55" Smart TV & Sofa',
                      area: 'Living Room 55" Smart TV & 3-Seater Sofa',
                      scene: 'tv_sofa' as const,
                      inNote: '55" 4K Smart TV and fabric sofa intact at check-in.',
                      outNote: 'TV display panel cracked & sofa cushion burn mark found on move-out.',
                      cost: 14500,
                    },
                    {
                      label: 'Balcony Glass Door & Hob',
                      area: 'Balcony Toughened Glass Sliding Door & Kitchen Hob',
                      scene: 'balcony_glass' as const,
                      inNote: '10mm Saint-Gobain balcony glass door & induction cooktop intact.',
                      outNote: 'Balcony sliding glass shattered & induction top cracked at move-out.',
                      cost: 18500,
                    },
                    {
                      label: 'Master Bedroom Split AC',
                      area: 'Master Bedroom Daikin Split AC & Stabilizer',
                      scene: 'ac_bedroom' as const,
                      inNote: 'Split AC cooling properly & stabilizer intact at check-in.',
                      outNote: 'Indoor AC swing louver broken & stabilizer burnt on checkout.',
                      cost: 6800,
                    },
                    {
                      label: 'Modular Kitchen & Bath (Clean)',
                      area: 'Modular Kitchen, RO Purifier & Bathroom Fittings',
                      scene: 'kitchen_bath' as const,
                      inNote: 'All kitchen & bathroom fittings clean and working.',
                      outNote: 'Handed over clean with zero damage on move-out.',
                      cost: 0,
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setAreaName(preset.area);
                        setScenePreset(preset.scene);
                        setMoveInNotes(preset.inNote);
                        setMoveOutNotes(preset.outNote);
                        const isDmg = preset.cost > 0;
                        setCategory(
                          isDmg ? 'Tenant Damage' : 'Undamaged / Clean'
                        );
                        setIsDisputed(isDmg);
                        if (preset.cost > 0) setDamageCostInput(preset.cost);
                        setMoveInImage(
                          buildInspectionPhotoSvg({
                            stage: 'moveIn',
                            areaTitle: preset.area,
                            roomCode: activeCase.roomCode,
                            date: moveInDateInput || activeCase.startDate,
                            isDamaged: false,
                            caption: preset.inNote,
                            scene: preset.scene,
                          })
                        );
                        setMoveOutImage(
                          buildInspectionPhotoSvg({
                            stage: 'moveOut',
                            areaTitle: preset.area,
                            roomCode: activeCase.roomCode,
                            date: moveOutDateInput || activeCase.moveOutDate,
                            isDamaged: isDmg,
                            caption: preset.outNote,
                            scene: preset.scene,
                          })
                        );
                      }}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Apartment Room or Appliance Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Living Room 55-inch TV, Balcony Glass Door"
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Move-Out Inspection Status
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const val = e.target.value as RoomComparison['category'];
                      setCategory(val);
                      setIsDisputed(val === 'Tenant Damage');
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                  >
                    <option value="Tenant Damage">
                      Tenant Damage (Deductible / Legal Notice)
                    </option>
                    <option value="Undamaged / Clean">Undamaged / Clean</option>
                    <option value="Normal Wear & Tear">
                      Normal Wear & Tear
                    </option>
                    <option value="Pre-existing Defect">
                      Pre-existing Defect
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Move-In Photo Date
                  </label>
                  <input
                    type="date"
                    value={moveInDateInput}
                    onChange={(e) => setMoveInDateInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Move-Out Photo Date
                  </label>
                  <input
                    type="date"
                    value={moveOutDateInput}
                    onChange={(e) => setMoveOutDateInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Upload Multiple Photos for Move-In and Move-Out */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Move In Upload Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-800">
                      1. Move-In Photos ({moveInImagesModal.length || (moveInImage ? 1 : 0)})
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUseInstantStampedPhoto('moveIn')}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      + Auto-Generate Stamp
                    </button>
                  </div>
                  <div className="min-h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-3 text-center bg-slate-50 space-y-2">
                    {moveInImagesModal.length > 0 ? (
                      <div className="w-full space-y-2">
                        <div className="grid grid-cols-3 gap-1.5 max-h-28 overflow-y-auto p-1">
                          {moveInImagesModal.map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="relative h-16 rounded-lg overflow-hidden border border-slate-300 bg-slate-900"
                            >
                              <img
                                src={imgUrl}
                                alt={`Move In #${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = moveInImagesModal.filter(
                                    (_, i) => i !== idx
                                  );
                                  setMoveInImagesModal(next);
                                  setMoveInImage(next[next.length - 1] || '');
                                }}
                                className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Camera className="w-5 h-5 text-emerald-600" />
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <label className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer">
                        <span>+ Upload Multiple Photos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              Array.from(files).forEach((file) => {
                                compressAndReadImage(file, (dataUrl) => {
                                  setMoveInImage(dataUrl);
                                  setMoveInImagesModal((prev) => [
                                    ...prev,
                                    dataUrl,
                                  ]);
                                });
                              });
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setCameraTarget({
                            mode: 'modal',
                            stage: 'moveIn',
                          })
                        }
                        className="px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Camera
                      </button>
                    </div>
                  </div>
                </div>

                {/* Move Out Upload Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-800">
                      2. Move-Out Photos ({moveOutImagesModal.length || (moveOutImage ? 1 : 0)})
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUseInstantStampedPhoto('moveOut')}
                      className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer"
                    >
                      + Auto-Generate Stamp
                    </button>
                  </div>
                  <div className="min-h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-3 text-center bg-slate-50 space-y-2">
                    {moveOutImagesModal.length > 0 ? (
                      <div className="w-full space-y-2">
                        <div className="grid grid-cols-3 gap-1.5 max-h-28 overflow-y-auto p-1">
                          {moveOutImagesModal.map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="relative h-16 rounded-lg overflow-hidden border border-slate-300 bg-slate-900"
                            >
                              <img
                                src={imgUrl}
                                alt={`Move Out #${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = moveOutImagesModal.filter(
                                    (_, i) => i !== idx
                                  );
                                  setMoveOutImagesModal(next);
                                  setMoveOutImage(next[next.length - 1] || '');
                                }}
                                className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Camera className="w-5 h-5 text-rose-600" />
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <label className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer">
                        <span>+ Upload Multiple Photos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              Array.from(files).forEach((file) => {
                                compressAndReadImage(file, (dataUrl) => {
                                  setMoveOutImage(dataUrl);
                                  setMoveOutImagesModal((prev) => [
                                    ...prev,
                                    dataUrl,
                                  ]);
                                });
                              });
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setCameraTarget({
                            mode: 'modal',
                            stage: 'moveOut',
                          })
                        }
                        className="px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Camera
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Move-In Condition Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Handed over clean & working at check-in"
                    value={moveInNotes}
                    onChange={(e) => setMoveInNotes(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Move-Out Inspection Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Found cracked screen / broken glass at checkout"
                    value={moveOutNotes}
                    onChange={(e) => setMoveOutNotes(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                  />
                </div>
              </div>

              {role === 'owner' &&
                category === 'Tenant Damage' &&
                onLogDamageFromPhoto && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="alsoLogDamageCheck"
                        checked={alsoLogDeduction}
                        onChange={(e) => setAlsoLogDeduction(e.target.checked)}
                        className="rounded text-rose-600 cursor-pointer"
                      />
                      <label
                        htmlFor="alsoLogDamageCheck"
                        className="text-xs font-bold text-rose-950 cursor-pointer"
                      >
                        Also add this Move-Out Damage to Deposit Deductions & Legal Document
                      </label>
                    </div>
                    {alsoLogDeduction && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-rose-800">
                          Cost (₹):
                        </span>
                        <input
                          type="number"
                          min={100}
                          value={damageCostInput}
                          onChange={(e) =>
                            setDamageCostInput(parseFloat(e.target.value) || 0)
                          }
                          className="w-28 text-xs px-2.5 py-1 bg-white border border-rose-300 rounded-lg font-mono font-bold text-rose-900"
                        />
                      </div>
                    )}
                  </div>
                )}

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span>
                    <strong>Ollama Photo Analysis & Auto-Email:</strong> Saving
                    Move-In & Move-Out photos will automatically analyze damages
                    with Ollama and email the itemized Repair Quotation to{' '}
                    <strong>{activeCase.tenantEmail}</strong>.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNewArea}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submittingNewArea ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>
                        Analyzing with Ollama & Emailing Quotation...
                      </span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4" />
                      <span>
                        Save Photos, Analyze with Ollama & Email Quotation
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Notes Modal - Owner only */}
      {role === 'owner' && editingComp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Edit Inspection Area: {editingComp.area}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update condition descriptions, dates, or damage status.
            </p>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Condition Category
                </label>
                <select
                  value={editingComp.category}
                  onChange={(e) =>
                    setEditingComp({
                      ...editingComp,
                      category: e.target.value as RoomComparison['category'],
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                >
                  <option value="Tenant Damage">Tenant Damage</option>
                  <option value="Undamaged / Clean">Undamaged / Clean</option>
                  <option value="Normal Wear & Tear">Normal Wear & Tear</option>
                  <option value="Pre-existing Defect">
                    Pre-existing Defect
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Move-In Notes
                </label>
                <input
                  type="text"
                  value={editingComp.moveInNotes}
                  onChange={(e) =>
                    setEditingComp({
                      ...editingComp,
                      moveInNotes: e.target.value,
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Move-Out Notes
                </label>
                <input
                  type="text"
                  value={editingComp.moveOutNotes}
                  onChange={(e) =>
                    setEditingComp({
                      ...editingComp,
                      moveOutNotes: e.target.value,
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Legal Assessment / Verdict
                </label>
                <input
                  type="text"
                  value={editingComp.verdict}
                  onChange={(e) =>
                    setEditingComp({ ...editingComp, verdict: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editDisputed"
                  checked={editingComp.disputed}
                  onChange={(e) =>
                    setEditingComp({
                      ...editingComp,
                      disputed: e.target.checked,
                    })
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label
                  htmlFor="editDisputed"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Flagged as Damage Claim / Disputed
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingComp(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs"
                >
                  Save & Re-Analyze with Ollama
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Full Ollama Repair Quotation Email Modal */}
      {previewQuotationComp && previewQuotationComp.ollamaAnalysis && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {previewQuotationComp.ollamaAnalysis.modelUsed}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {previewQuotationComp.ollamaAnalysis.quotationNo}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {previewQuotationComp.ollamaAnalysis.quotationSubject}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sent to Tenant Email:{' '}
                  <strong>
                    {previewQuotationComp.ollamaAnalysis.emailedToTenant}
                  </strong>{' '}
                  on {previewQuotationComp.ollamaAnalysis.emailedAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuotationComp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl overflow-x-auto max-h-88 whitespace-pre-wrap leading-relaxed">
              {previewQuotationComp.ollamaAnalysis.quotationText}
            </pre>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      previewQuotationComp.ollamaAnalysis!.quotationText
                    );
                    setCopiedQuotation(true);
                    setTimeout(() => setCopiedQuotation(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  {copiedQuotation ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Quotation Text</span>
                    </>
                  )}
                </button>

                {previewQuotationComp.ollamaAnalysis.emailPreviewUrl && (
                  <a
                    href={previewQuotationComp.ollamaAnalysis.emailPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <span>Open Live SMTP Receipt</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <a
                  href={buildMailtoLink(
                    previewQuotationComp.ollamaAnalysis.emailedToTenant,
                    previewQuotationComp.ollamaAnalysis.quotationSubject,
                    previewQuotationComp.ollamaAnalysis.quotationText
                  )}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open in Mail App</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setPreviewQuotationComp(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
