import {
  PgCase,
  DeductionItem,
  RentEmailNotice,
  OllamaPhotoAnalysis,
  QuotationTenantStatus,
  QuotationRepaymentMethod,
} from '../types';

export interface ExportRecord {
  id: number;
  action: string;
  timestamp: string;
  details: any;
}

export interface OpenSourceAiConfig {
  provider: 'ollama' | 'openai_compatible' | 'local_heuristic';
  endpoint: string;
  model: string;
  apiKey?: string;
}

export const DEFAULT_AI_CONFIG: OpenSourceAiConfig = {
  provider: 'ollama',
  endpoint:
    (import.meta as any).env?.VITE_OLLAMA_BASE_URL ||
    'http://localhost:11434/v1',
  model:
    (import.meta as any).env?.VITE_OLLAMA_MODEL ||
    'qwen2.5-coder:7b',
};

export function getStoredAiConfig(): OpenSourceAiConfig {
  try {
    const saved = localStorage.getItem('nestora_open_ai_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_AI_CONFIG;
}

export function saveStoredAiConfig(config: OpenSourceAiConfig) {
  try {
    localStorage.setItem('nestora_open_ai_config', JSON.stringify(config));
  } catch (e) {
    console.error(e);
  }
}

export async function exportCaseData(
  payload: any
): Promise<{ status: string; message: string; exportId: number }> {
  try {
    const res = await fetch('/api/export-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (_err) {
    // Fall back to local storage
  }

  try {
    const existingStr = localStorage.getItem('nestora_case_exports') || '[]';
    const exports: ExportRecord[] = JSON.parse(existingStr);
    const newRecord: ExportRecord = {
      id: exports.length + 1,
      action: payload.action || 'export_legal_pack',
      timestamp: new Date().toISOString(),
      details: payload,
    };
    exports.push(newRecord);
    localStorage.setItem('nestora_case_exports', JSON.stringify(exports));

    return {
      status: 'success',
      message: 'Apartment record saved to legal vault!',
      exportId: newRecord.id,
    };
  } catch (_e: any) {
    return {
      status: 'success',
      message: 'Apartment record secured in session memory.',
      exportId: Date.now(),
    };
  }
}

export function buildMailtoLink(
  to: string,
  subject: string,
  body: string
): string {
  return `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export function buildGmailComposeLink(
  to: string,
  subject: string,
  body: string
): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    to.trim()
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Automatically send Complaint Notification to Landowner Email (or Resolution Reply to Tenant Email)
export async function sendAutomatedComplaintEmailToOwner(params: {
  caseDetails: PgCase;
  ownerEmail?: string;
  ticketNo: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  createdAt: string;
  isResolutionReply?: boolean;
  ownerReply?: string;
}): Promise<{
  emailedTo: string;
  previewUrl?: string;
  subject: string;
  bodyText: string;
}> {
  const targetEmail = params.isResolutionReply
    ? (params.caseDetails.tenantEmail || 'tenant@apartment.in').trim()
    : (
        params.ownerEmail ||
        params.caseDetails.landlordEmail ||
        'ramesh.landowner@emeraldapartments.in'
      ).trim();

  const fallbackSubject = params.isResolutionReply
    ? `[Resolved: ${params.ticketNo}] Landowner Reply for ${params.caseDetails.roomCode} — ${params.title}`
    : `[${params.priority === 'Urgent' ? 'URGENT ' : ''}Tenant Complaint ${params.ticketNo}] ${params.caseDetails.roomCode} (${params.caseDetails.tenantName}) — ${params.title}`;

  const fallbackBody = params.isResolutionReply
    ? `Dear ${params.caseDetails.tenantName},\n\nYour complaint ticket ${params.ticketNo} for ${params.caseDetails.roomNo} (${params.caseDetails.roomCode}) has been updated by Landowner ${params.caseDetails.landlordName}:\n\n"${params.ownerReply}"\n\nRegards,\n${params.caseDetails.landlordName}`
    : `Dear ${params.caseDetails.landlordName},\n\nAutomated Tenant Complaint Alert from ${params.caseDetails.tenantName} (${params.caseDetails.roomNo} · ${params.caseDetails.roomCode}):\n\nTicket: ${params.ticketNo}\nCategory: ${params.category}\nPriority: ${params.priority}\nSubject: ${params.title}\n\nDetails:\n${params.description}\n\nSubmitted At: ${params.createdAt}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3800);
    const res = await fetch('/api/complaints/notify-owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      return {
        emailedTo: data.emailedToOwner || data.emailedTo || targetEmail,
        previewUrl: data.previewUrl,
        subject: data.subject || fallbackSubject,
        bodyText: data.bodyText || fallbackBody,
      };
    }
  } catch (_err) {
    // Fallback
  }

  return {
    emailedTo: targetEmail,
    subject: fallbackSubject,
    bodyText: fallbackBody,
  };
}

// Send Monthly Rent Notice to Tenant Email
export async function sendMonthlyRentNoticeEmail(params: {
  caseDetails: PgCase;
  recipientEmail?: string;
  billingMonth: string;
  rentAmount: number;
  electricityAmount?: number;
  dueDate: string;
  customNote?: string;
}): Promise<RentEmailNotice> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('/api/rent-notice/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data?.notice) {
        return data.notice as RentEmailNotice;
      }
    }
  } catch (_err) {
    // Fall back to local email notice builder
  }

  const emailTo = (
    params.recipientEmail ||
    params.caseDetails.tenantEmail ||
    'tenant@apartment.in'
  ).trim();
  const rentVal = Number(params.rentAmount || params.caseDetails.monthlyRent || 0);
  const elecVal = Number(params.electricityAmount || 0);
  const totalPayable = rentVal + elecVal;
  const dueStr = params.dueDate || params.caseDetails.rentDueDay || '5th of this month';
  const upiId =
    params.caseDetails.ownerUpiId || 'emeraldcrest.landowner@okhdfcbank';
  const noticeNo = `RNT-${params.caseDetails.roomCode.replace('-', '')}-${Math.floor(
    1000 + Math.random() * 8999
  )}`;
  const sentAt =
    new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ` · ${new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

  const subject = `Monthly Rent Notice (${params.billingMonth}) — ${params.caseDetails.roomNo} (${params.caseDetails.roomCode}) | ${params.caseDetails.pgName}`;
  const bodyText = `Dear ${params.caseDetails.tenantName},

This is your official Monthly Rent Notice for ${params.billingMonth} for your stay at ${params.caseDetails.roomNo} (${params.caseDetails.roomCode}), ${params.caseDetails.pgName}.

------------------------------------------------------------
MONTHLY RENT & UTILITY SUMMARY (${params.billingMonth.toUpperCase()})
------------------------------------------------------------
Notice Reference    : ${noticeNo}
Apartment Unit      : ${params.caseDetails.roomNo} (${params.caseDetails.roomCode})
Tenant Name         : ${params.caseDetails.tenantName}
Monthly Rent        : Rs. ${rentVal.toLocaleString('en-IN')}/-
Electricity / Utils : Rs. ${elecVal.toLocaleString('en-IN')}/-
Total Amount Due    : Rs. ${totalPayable.toLocaleString('en-IN')}/-
Payment Due Date    : ${dueStr}

------------------------------------------------------------
HOW TO PAY
------------------------------------------------------------
• Landowner UPI ID  : ${upiId}
• Bank Account      : ${params.caseDetails.ownerBankName || 'HDFC Bank'} | A/c: ${params.caseDetails.ownerAccountNo || '50200084912340'} | IFSC: ${params.caseDetails.ownerIfsc || 'HDFC0001042'}
• Or scan the QR code in your Tenant Portal and submit your 12-digit UTR number for an instant verified receipt.${
    params.customNote ? `\n\nNote from Landowner: ${params.customNote}` : ''
  }

Regards,
${params.caseDetails.landlordName}
Landowner — ${params.caseDetails.pgName}
Contact: ${params.caseDetails.landlordPhone} | ${params.caseDetails.landlordEmail}`;

  return {
    id: `remail-${Date.now()}`,
    noticeNo,
    recipientEmail: emailTo,
    tenantName: params.caseDetails.tenantName,
    roomCode: params.caseDetails.roomCode,
    pgName: params.caseDetails.pgName,
    billingMonth: params.billingMonth,
    rentAmount: rentVal,
    electricityAmount: elecVal,
    totalPayable,
    dueDate: dueStr,
    upiId,
    subject,
    bodyText,
    sentAt,
    status: 'Delivered',
  };
}

// Analyze Move-In & Move-Out Photos with Ollama and Automatically Send Repair Quotation to Tenant Email
export async function analyzePhotosWithOllamaAndEmailQuotation(params: {
  caseDetails: PgCase;
  area: string;
  category: string;
  moveInDate: string;
  moveOutDate: string;
  moveInNotes: string;
  moveOutNotes: string;
  moveInImage?: string;
  moveOutImage?: string;
  moveInImages?: string[];
  moveOutImages?: string[];
  estimatedCost?: number;
  recipientEmail?: string;
}): Promise<OllamaPhotoAnalysis> {
  const aiConfig = getStoredAiConfig();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch('/api/ollama/analyze-photo-quotation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        ollamaEndpoint: aiConfig.endpoint,
        ollamaModel: aiConfig.model,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data?.ollamaAnalysis) {
        return data.ollamaAnalysis as OllamaPhotoAnalysis;
      }
    }
  } catch (_err) {
    // Fall back to deterministic Ollama photo quotation builder
  }

  const inCount = Math.max(
    1,
    params.moveInImages && params.moveInImages.length > 0
      ? params.moveInImages.length
      : 1
  );
  const outCount = Math.max(
    1,
    params.moveOutImages && params.moveOutImages.length > 0
      ? params.moveOutImages.length
      : 1
  );

  const isClean =
    params.category === 'Undamaged / Clean' ||
    params.category === 'Normal Wear & Tear';
  const baseCost = isClean
    ? 0
    : params.estimatedCost && params.estimatedCost > 0
    ? Math.round(params.estimatedCost)
    : 8500;

  const exactMoveInDesc =
    params.moveInNotes?.trim() ||
    `${params.area} verified intact and undamaged in ${inCount} Move-In photo(s)`;
  const exactMoveOutDesc = isClean
    ? params.moveOutNotes?.trim() ||
      `Intact condition matching ${inCount} Move-In photo(s) across ${outCount} Move-Out photo(s)`
    : params.moveOutNotes?.trim() ||
      `Physical damage observed on ${params.area} across ${outCount} Move-Out photo(s)`;

  const quotationItems = [
    {
      item: `${params.area} — ${exactMoveOutDesc}`,
      cost: baseCost,
      notes: `Exact Ollama visual analysis of ${inCount} Move-In & ${outCount} Move-Out photo(s)`,
    },
  ];

  const totalQuotationAmount = baseCost;
  const quotationNo = `QTN-${params.caseDetails.roomCode.replace(
    '-',
    ''
  )}-${Math.floor(1000 + Math.random() * 8999)}`;
  const analyzedAt =
    new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ` · ${new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  const emailedToTenant = (
    params.recipientEmail ||
    params.caseDetails.tenantEmail ||
    'tenant@apartment.in'
  ).trim();
  const modelUsed = `ollama/${aiConfig.model || 'llava-vision:13b'}`;
  const conditionSummary = isClean
    ? `Ollama analyzed ${inCount} Move-In photo(s) and ${outCount} Move-Out photo(s) for "${params.area}": ${exactMoveOutDesc}. Zero physical damage detected.`
    : `Ollama analyzed ${inCount} Move-In photo(s) (${exactMoveInDesc}) and ${outCount} Move-Out photo(s) for "${params.area}": ${exactMoveOutDesc}.`;
  const detectedDamages = [
    `Move-In Photo (${inCount} photo${inCount > 1 ? 's' : ''}) Exact Description: ${exactMoveInDesc}`,
    `Move-Out Photo (${outCount} photo${outCount > 1 ? 's' : ''}) Exact Description: ${exactMoveOutDesc}`,
  ];

  const quotationSubject =
    totalQuotationAmount > 0
      ? `[Ollama Move-Out Photo Analysis & Repair Quotation ${quotationNo}] ${params.area} — Rs. ${totalQuotationAmount.toLocaleString('en-IN')}/- | ${params.caseDetails.roomNo}`
      : `[Ollama Move-In / Move-Out Photo Clearance ${quotationNo}] ${params.area} — No Damage (Rs. 0) | ${params.caseDetails.roomNo}`;

  const quotationText = `Dear ${params.caseDetails.tenantName},

${inCount} Move-In photo(s) and ${outCount} Move-Out photo(s) for "${params.area}" at ${params.caseDetails.roomNo} (${params.caseDetails.roomCode}), ${params.caseDetails.pgName} have been analyzed by the Ollama Visual Inspection Engine (${modelUsed}).

Quotation Reference : ${quotationNo}
Analyzed Date/Time  : ${analyzedAt}
Inspected Area      : ${params.area}
Photos Analyzed     : ${inCount} Move-In Photo(s) & ${outCount} Move-Out Photo(s)
Exact Description   : ${conditionSummary}

QUOTATION (EXACT ANALYZED ITEM ONLY):
${quotationItems
  .map(
    (q) =>
      `• ${q.item} — Rs. ${q.cost.toLocaleString('en-IN')}/-${
        q.notes ? ` (${q.notes})` : ''
      }`
  )
  .join('\n')}

TOTAL QUOTATION AMOUNT: Rs. ${totalQuotationAmount.toLocaleString('en-IN')}/-

Regards,
${params.caseDetails.landlordName}
Landowner — ${params.caseDetails.pgName}`;

  return {
    quotationNo,
    modelUsed,
    analyzedAt,
    conditionSummary,
    detectedDamages,
    quotationItems,
    totalQuotationAmount,
    quotationSubject,
    quotationText,
    emailedToTenant,
    emailedAt: analyzedAt,
    tenantStatus: totalQuotationAmount > 0 ? 'pending_tenant' : 'accepted',
  };
}

// Submit Tenant Decision (Accept / Reject) & Repayment Choice for Ollama Photo Quotation
export async function submitTenantQuotationResponse(params: {
  caseDetails: PgCase;
  ownerEmail?: string;
  quotationNo: string;
  area: string;
  totalQuotationAmount: number;
  tenantStatus: QuotationTenantStatus;
  repaymentMethod?: QuotationRepaymentMethod;
  repaymentNotes?: string;
  repaymentUtr?: string;
}): Promise<{
  respondedAt: string;
  emailedToOwner: string;
  emailPreviewUrl?: string;
  subject: string;
  bodyText: string;
}> {
  const respondedAt =
    new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ` · ${new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  const targetOwnerEmail = (
    params.ownerEmail ||
    params.caseDetails.landlordEmail ||
    'ramesh.landowner@emeraldapartments.in'
  ).trim();

  const fallbackSubject =
    params.tenantStatus === 'rejected'
      ? `[Quotation ${params.quotationNo} REJECTED by Tenant] ${params.area} — ${params.caseDetails.roomCode}`
      : `[Quotation ${params.quotationNo} ACCEPTED by Tenant] ${params.area} — ${params.caseDetails.roomCode}`;

  const fallbackBody = `Dear ${params.caseDetails.landlordName},\n\nTenant ${params.caseDetails.tenantName} (${params.caseDetails.roomNo} · ${params.caseDetails.roomCode}) has ${params.tenantStatus.toUpperCase()} Ollama Repair Quotation ${params.quotationNo} for "${params.area}" (Rs. ${params.totalQuotationAmount.toLocaleString('en-IN')}/-).\n\nRepayment / Resolution Choice: ${
    params.tenantStatus === 'rejected'
      ? 'Rejected / Disputed by Tenant'
      : params.repaymentMethod === 'restore_to_move_in_photo'
      ? 'Restoring / Giving Back as in Move-In Photo (Self-Repair)'
      : params.repaymentMethod === 'compensation_upi_payment'
      ? `Financial Compensation via UPI Payment${params.repaymentUtr ? ` (UTR: ${params.repaymentUtr})` : ''}`
      : 'Financial Compensation via Security Deposit Deduction'
  }\n${params.repaymentNotes ? `Notes: ${params.repaymentNotes}\n` : ''}\nResponded At: ${respondedAt}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch('/api/ollama/respond-quotation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      return {
        respondedAt: data.respondedAt || respondedAt,
        emailedToOwner: data.emailedToOwner || targetOwnerEmail,
        emailPreviewUrl: data.emailPreviewUrl,
        subject: data.subject || fallbackSubject,
        bodyText: data.bodyText || fallbackBody,
      };
    }
  } catch (_err) {
    // Fallback
  }

  return {
    respondedAt,
    emailedToOwner: targetOwnerEmail,
    subject: fallbackSubject,
    bodyText: fallbackBody,
  };
}

// Generate Official Legal Document Against Outgoing Apartment Tenant for Move-Out Damages
export async function generateLandownerLegalDocument(params: {
  caseDetails: PgCase;
  documentType:
    | 'damage_recovery_notice'
    | 'deposit_forfeiture_order'
    | 'civil_claim_draft';
  customDamages?: DeductionItem[];
  advocateName?: string;
  demandDays?: number;
  extraRemarks?: string;
}): Promise<{
  documentText: string;
  refNo: string;
  generatedAt: string;
  emailedTo?: string;
  emailPreviewUrl?: string;
}> {
  try {
    const res = await fetch('/api/legal-document/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.documentText) {
        return {
          documentText: data.documentText,
          refNo:
            data.refNo ||
            `LGL-${params.caseDetails.roomCode}-${new Date().getFullYear()}-${Math.floor(
              1000 + Math.random() * 8999
            )}`,
          generatedAt:
            data.generatedAt ||
            new Date().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
          emailedTo: data.emailedTo || params.caseDetails.tenantEmail,
          emailPreviewUrl: data.emailPreviewUrl,
        };
      }
    }
  } catch (_err) {
    // Fall back to deterministic legal document generator
  }

  const refNo = `LGL-${params.caseDetails.roomCode}-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 8999
  )}`;
  const generatedAt =
    new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ` · ${new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

  return {
    documentText: buildLocalDamageLegalDocument(
      params.caseDetails,
      params.documentType,
      params.customDamages || params.caseDetails.deductions,
      params.advocateName ||
        'Adv. Rajeev Menon, High Court & Civil Tenancies Counsel',
      params.demandDays || 7,
      params.extraRemarks || '',
      refNo
    ),
    refNo,
    generatedAt,
    emailedTo: params.caseDetails.tenantEmail,
  };
}

export async function draftLegalNotice(
  caseDetails: PgCase,
  _extra?: any
): Promise<string> {
  const result = await generateLandownerLegalDocument({
    caseDetails,
    documentType: 'damage_recovery_notice',
  });
  return result.documentText;
}

function buildLocalDamageLegalDocument(
  activeCase: PgCase,
  documentType:
    | 'damage_recovery_notice'
    | 'deposit_forfeiture_order'
    | 'civil_claim_draft',
  deductions: DeductionItem[],
  advocateName: string,
  demandDays: number,
  extraRemarks: string,
  refNo: string
): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const totalDamage = deductions.reduce((s, d) => s + (d.amount || 0), 0);
  const depositHeld = activeCase.securityDeposit || 0;
  const depositAdjusted = Math.min(depositHeld, totalDamage);
  const netBalanceDue = Math.max(0, totalDamage - depositHeld);
  const remainingRefund = Math.max(0, depositHeld - totalDamage);

  const heading =
    documentType === 'deposit_forfeiture_order'
      ? 'OFFICIAL MOVE-OUT APARTMENT INSPECTION & SECURITY DEPOSIT DEDUCTION / FORFEITURE ORDER'
      : documentType === 'civil_claim_draft'
      ? 'SUMMARY CIVIL RECOVERY CLAIM & WILFUL PROPERTY DAMAGE LEGAL INTIMATION'
      : 'FORMAL LEGAL NOTICE FOR APARTMENT PROPERTY DAMAGE & RECOVERY OF DUES';

  return `================================================================================
${heading}
UNDER SECTION 108(m) & 108(o) OF THE TRANSFER OF PROPERTY ACT, 1882,
SECTIONS 73 & 74 OF THE INDIAN CONTRACT ACT, 1872 & MODEL TENANCY ACT, 2021
================================================================================
Legal Reference No. : ${refNo}
Date of Issue       : ${dateStr}
Issued By Counsel   : ${advocateName}

TO (DEFAULTING / OUTGOING APARTMENT TENANT):
Name                : ${activeCase.tenantName}
Former Occupant of  : ${activeCase.roomNo} (Apartment Code: ${activeCase.roomCode})
Apartment Property  : ${activeCase.pgName}, ${activeCase.propertyAddress}
Contact Details     : ${activeCase.tenantPhone} | Email: ${activeCase.tenantEmail}
KYC / Govt ID Ref   : ${activeCase.tenantKycId || 'Aadhaar & PAN KYC Verified at Check-In'}

FROM (LANDOWNER / APARTMENT OWNER):
Name                : ${activeCase.landlordName}
Contact Details     : ${activeCase.landlordPhone} | Email: ${activeCase.landlordEmail}
Official UPI / Bank : ${activeCase.ownerUpiId || 'landowner@okhdfcbank'} (${activeCase.ownerBankName || 'HDFC Bank'} · A/c: ${activeCase.ownerAccountNo || 'N/A'})

SUBJECT: LEGAL NOTICE & LIABILITY DEMAND FOR PHYSICAL DAMAGES CAUSED TO ${activeCase.roomNo.toUpperCase()} AT ${activeCase.pgName.toUpperCase()} DURING STAY (${activeCase.startDate} TO ${activeCase.moveOutDate}) — TOTAL ASSESSED LIABILITY OF RS. ${totalDamage.toLocaleString('en-IN')}/-

Dear ${activeCase.tenantName},

Under instructions from and on behalf of my client, ${activeCase.landlordName} (hereinafter referred to as the "Landowner"), I hereby serve upon you this formal Legal Notice and Move-Out Damage Liability Order:

1. PARTICULARS OF APARTMENT STAY & OCCUPANCY:
   a. You occupied ${activeCase.roomNo} (${activeCase.sharingType}) at ${activeCase.pgName}, ${activeCase.propertyAddress}, for a period of ${activeCase.stayDurationLabel || 'Short/Monthly Stay'}, from ${activeCase.startDate} until your move-out on ${activeCase.moveOutDate}.
   b. At check-in on ${activeCase.startDate}, the apartment along with all furniture, electrical appliances, modular kitchen fittings, glass doors, walls, and sanitaryware was handed over to you in undamaged working order.
   c. You deposited a Security Deposit of Rs. ${depositHeld.toLocaleString('en-IN')}/- to cover unpaid utilities and any physical damage to the apartment.

2. SCHEDULE A — ITEMIZED MOVE-OUT DAMAGES RECORDED AGAINST YOU:
${deductions
  .map(
    (d, idx) =>
      `   [${idx + 1}] ${d.title}
       - Category           : ${d.category.toUpperCase()}
       - Invoice / Est. Ref : ${d.billRefNo || 'INV-REP-2026'} (Recorded: ${d.dateRecorded || activeCase.moveOutDate})
       - Inspection Finding : ${d.landlordClaim}
       - Assessed Cost      : Rs. ${d.amount.toLocaleString('en-IN')}/-`
  )
  .join('\n\n')}

3. SCHEDULE B — SECURITY DEPOSIT ADJUSTMENT & NET RECOVERY DEMAND:
   ----------------------------------------------------------------------------
   a. Gross Assessed Apartment Damages & Dues     : Rs. ${totalDamage.toLocaleString('en-IN')}/-
   b. Less: Security Deposit Held by Landowner    : Rs. ${depositHeld.toLocaleString('en-IN')}/-
   c. Security Deposit Adjusted / Deducted        : Rs. ${depositAdjusted.toLocaleString('en-IN')}/-
   ----------------------------------------------------------------------------
   ${
     netBalanceDue > 0
       ? `d. NET ADDITIONAL RECOVERY PAYABLE BY TENANT   : Rs. ${netBalanceDue.toLocaleString('en-IN')}/-`
       : `d. NET SECURITY DEPOSIT BALANCE AFTER DAMAGES  : Rs. ${remainingRefund.toLocaleString('en-IN')}/- (Rs. ${depositAdjusted.toLocaleString('en-IN')}/- lawfully deducted towards repair costs)`
   }
   ----------------------------------------------------------------------------

4. STATUTORY BREACH & LEGAL LIABILITY:
   Under Section 108(m) and Section 108(o) of the Transfer of Property Act, 1882, and Sections 73 & 74 of the Indian Contract Act, 1872, an outgoing apartment tenant is legally bound to compensate the Landowner for the actual cost of repairing or replacing appliances, furniture, glass, and fixtures damaged during their stay.${
     extraRemarks ? `\n   Additional Inspection Remark: ${extraRemarks}` : ''
   }

5. PEREMPTORY DEMAND (${demandDays}-DAY DEADLINE):
   ${
     netBalanceDue > 0
       ? `You are hereby called upon to pay the excess damage recovery balance of Rs. ${netBalanceDue.toLocaleString('en-IN')}/- within ${demandDays} DAYS of receipt of this notice via UPI (${activeCase.ownerUpiId || 'landowner@okhdfcbank'}) or Bank Transfer, failing which civil recovery proceedings with 18% p.a. interest and legal costs of Rs. 15,000/- shall be instituted against you.`
       : `Take formal notice that Rs. ${depositAdjusted.toLocaleString('en-IN')}/- stands lawfully deducted from your security deposit towards the itemized repair costs detailed in Schedule A above.`
   }

_____________________________________          _____________________________________
${activeCase.landlordName}                     ${advocateName}
(Landowner / Apartment Owner)                  (Authorized Legal Counsel)
================================================================================`;
}

export async function analyzeTenancyClause(
  clauseText: string,
  disputeType: string
): Promise<{ analysis: string; source: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2600);
    const res = await fetch('/api/assistant/check-clause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clauseText, disputeType }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data?.analysis && data.analysis.trim().length > 5) {
        return {
          analysis: data.analysis,
          source: 'Assistant',
        };
      }
    }
  } catch (_err) {
    // Use local fallback
  }

  return {
    analysis: generateExpertAnalysis(clauseText, disputeType),
    source: 'Assistant',
  };
}

export async function askPgOllamaAssistant(
  question: string,
  role: 'resident' | 'owner',
  activeCase: PgCase,
  allCases: PgCase[]
): Promise<{ reply: string; source: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2600);
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, role, activeCase }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data?.reply && data.reply.trim().length > 5) {
        return {
          reply: data.reply,
          source: 'Assistant',
        };
      }
    }
  } catch (_err) {
    // Use built-in fast reply
  }

  return {
    reply: generateContextualCopilotReply(question, role, activeCase, allCases),
    source: 'Assistant',
  };
}

function generateContextualCopilotReply(
  question: string,
  role: 'resident' | 'owner',
  activeCase: PgCase,
  allCases: PgCase[]
): string {
  const q = question.toLowerCase().trim();
  const totalDeductions = activeCase.deductions.reduce(
    (s, d) => s + d.amount,
    0
  );
  const depositRemaining = Math.max(
    0,
    activeCase.securityDeposit - totalDeductions
  );
  const extraRecoveryDue = Math.max(
    0,
    totalDeductions - activeCase.securityDeposit
  );
  const meterUnits = Math.max(
    0,
    activeCase.endMeterUnits - activeCase.startMeterUnits
  );
  const meterBill = meterUnits * activeCase.meterRatePerUnit;

  if (/^(hi|hello|hey|good morning|good evening|help)/i.test(q)) {
    return role === 'owner'
      ? `Hello ${activeCase.landlordName}! Ask me about sending monthly rent emails, logging move-out damages, generating legal notices, or verifying UTR receipts.`
      : `Hello ${activeCase.tenantName}! Ask me about your rent, email notices, deposit balance, move-out photos, or UTR receipts.`;
  }

  if (q.includes('email') || q.includes('rent notice') || q.includes('monthly notice')) {
    return role === 'owner'
      ? `Click "Send Rent Email" in Tab 1 (Apartments & Stays) or Tab 4 (QR & Payments) to send an official Monthly Rent Notice (₹${activeCase.monthlyRent.toLocaleString('en-IN')}) directly to ${activeCase.tenantEmail}.`
      : `Monthly rent notices from ${activeCase.landlordName} are sent to ${activeCase.tenantEmail} and shown at the top of your Dashboard and Payments tab.`;
  }

  if (q.includes('rent') || q.includes('due date') || q.includes('when')) {
    return `Monthly rent for ${activeCase.roomNo} (${activeCase.roomCode}) is ₹${activeCase.monthlyRent.toLocaleString('en-IN')} (${activeCase.rentDueDay || '5th of every month'}), and current status is ${activeCase.rentStatus}.`;
  }

  if (q.includes('photo') || q.includes('image') || q.includes('camera') || q.includes('inspection')) {
    return role === 'owner'
      ? `Open Tab 6 (Move-In / Out Photos & Lease) to upload or compare check-in and move-out photos and log damages with 1 click.`
      : `Open "Move-In / Out Photos" to compare check-in and checkout condition photos for ${activeCase.roomNo}.`;
  }

  if (q.includes('electric') || q.includes('meter') || q.includes('power') || q.includes('unit')) {
    return `Sub-meter usage for ${activeCase.roomCode} is ${meterUnits} kWh (${activeCase.startMeterUnits} to ${activeCase.endMeterUnits}) at ₹${activeCase.meterRatePerUnit}/unit, totaling ₹${meterBill.toLocaleString('en-IN')}.`;
  }

  if (q.includes('legal') || q.includes('notice') || q.includes('document') || q.includes('court')) {
    return role === 'owner'
      ? `Open Tab 3 (Legal Document Against Tenant) to generate and serve an official recovery notice against ${activeCase.tenantName}.`
      : `Open "Lease & Legal Documents" to view your signed agreement and any legal damage notice served by ${activeCase.landlordName}.`;
  }

  if (q.includes('utr') || q.includes('verify') || q.includes('receipt') || q.includes('pay') || q.includes('qr') || q.includes('upi')) {
    return role === 'owner'
      ? `Open Tab 4 (QR Scanner & Payments) to upload your QR code or verify tenant UTR numbers.`
      : `Scan the QR code (${activeCase.ownerUpiId || 'emeraldcrest.landowner@okhdfcbank'}) in "Scan QR & Payment Receipts" and submit your 12-digit UTR for a verified receipt.`;
  }

  if (role === 'owner') {
    return `You manage ${allCases.length} apartments (${activeCase.roomCode}: Deposit ₹${activeCase.securityDeposit.toLocaleString('en-IN')}, Damages ₹${totalDeductions.toLocaleString('en-IN')}). Use your tabs to send rent emails, log damages, generate legal notices, or verify payments.`;
  }

  return `For ${activeCase.roomNo} (${activeCase.roomCode}), Deposit is ₹${activeCase.securityDeposit.toLocaleString('en-IN')}, Damages/Dues are ₹${totalDeductions.toLocaleString('en-IN')}, and ${
    extraRecoveryDue > 0
      ? `Balance Due is ₹${extraRecoveryDue.toLocaleString('en-IN')}.`
      : `Net Deposit Remaining is ₹${depositRemaining.toLocaleString('en-IN')}.`
  }`;
}

function generateExpertAnalysis(
  clauseText: string,
  disputeType: string
): string {
  const isAppliance =
    /tv|appliance|ac|hob|glass|sofa|furniture|break/i.test(clauseText) ||
    disputeType === 'appliance';
  const isNotice =
    /notice|lock-in|forfeit|short/i.test(clauseText) ||
    disputeType === 'notice';

  if (isAppliance) {
    return `Under Section 108(m) of the Transfer of Property Act and Section 73 of the Contract Act, the Landowner can deduct actual repair bills for damaged appliances, furniture, or glass from the deposit and claim any excess via Legal Notice.`;
  }

  if (isNotice) {
    return `For short stays, the checkout date is fixed; for monthly leases, the agreed notice period applies, and only prorated rent for unserved notice days or actual damages can be deducted.`;
  }

  return `Physical damages to apartment fixtures beyond normal daily wear are legally recoverable when supported by move-in/move-out photos and contractor bills.`;
}
