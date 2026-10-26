export type SharingType =
  | 'Studio / 1RK'
  | '1BHK Apartment'
  | '2BHK Apartment'
  | '3BHK Apartment'
  | 'Penthouse / Villa'
  | 'Single'
  | '2-Sharing'
  | '3-Sharing'
  | '4-Sharing'
  | 'Studio';

export type StayType = 'Short-Stay (Days)' | 'Monthly Lease (Months)';

export type UserRole = 'resident' | 'owner';

export interface UserSession {
  role: UserRole;
  identifier: string; // email or phone
  name: string;
  pgName: string; // Apartment Building / Property Name
  roomCode: string; // Apartment Flat Code e.g. APEX-402
  activeCaseId: string;
}

export interface LandownerProfile {
  fullName: string;
  email: string;
  mobile: string;
  residentialAddress: string;
  preferredLanguage: string;
  preferredLanguages?: string[];
  aboutYou: string;
  photoUrl?: string;
  vacantUnits: number;
}

export interface PaymentTransaction {
  id: string;
  receiptNo: string;
  utrNumber: string;
  amount: number;
  paymentType:
    | 'security_deposit'
    | 'monthly_rent'
    | 'electricity_bill'
    | 'deduction_settlement'
    | 'deposit_refund';
  paymentMethod:
    | 'UPI / GPay'
    | 'PhonePe'
    | 'Paytm'
    | 'Bank NEFT / IMPS'
    | 'Cash / Counter'
    | 'Deposit Adjustment';
  monthOrPeriod?: string;
  date: string; // Exact date of payment (YYYY-MM-DD)
  paymentTime?: string; // Exact time of payment (e.g. 02:10 PM)
  submittedAt?: string; // Exact submission timestamp
  senderAccountOrUpi?: string; // e.g. apurv@okicici / HDFC ••4821
  receiverAccountOrUpi?: string; // e.g. landowner@okhdfcbank
  paymentScreenshotUrl?: string; // Optional screenshot proof of payment
  status: 'pending_verification' | 'verified' | 'rejected';
  submittedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes: string;
}

export interface ComplaintItem {
  id: string;
  ticketNo: string;
  title: string;
  category:
    | 'Wi-Fi / Internet'
    | 'Electricity / Geyser / AC'
    | 'Plumbing / Water'
    | 'Room Cleaning'
    | 'Food / Mess'
    | 'Deposit / Billing Query'
    | 'Other';
  priority: 'Normal' | 'Urgent';
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
  ownerReply?: string;
  resolvedAt?: string;
  emailedToOwner?: string;
  emailedAt?: string;
  emailPreviewUrl?: string;
}

export interface DeductionItem {
  id: string;
  title: string;
  amount: number;
  category:
    | 'painting'
    | 'cleaning'
    | 'electricity'
    | 'appliance'
    | 'furniture'
    | 'structural'
    | 'notice'
    | 'other';
  status: 'disputed' | 'agreed' | 'waived';
  dateRecorded?: string; // Exact date & time damage/deduction was posted
  billRefNo?: string; // Repair Bill / Contractor Invoice Reference No.
  addedBy?: string; // Landowner name
  landlordClaim: string;
  tenantRebuttal: string;
  fairAmount: number;
}

export interface LegalDamageDocument {
  id: string;
  refNo: string;
  documentType:
    | 'damage_recovery_notice'
    | 'deposit_forfeiture_order'
    | 'civil_claim_draft';
  title: string;
  generatedAt: string;
  advocateName: string;
  demandDays: number;
  totalDamageAmount: number;
  depositAdjusted: number;
  netBalancePayable: number;
  status: 'Drafted' | 'Served to Tenant' | 'Settled';
  documentText: string;
  emailedTo?: string;
  emailPreviewUrl?: string;
}

export interface RentEmailNotice {
  id: string;
  noticeNo: string;
  recipientEmail: string;
  tenantName: string;
  roomCode: string;
  pgName: string;
  billingMonth: string;
  rentAmount: number;
  dueDate: string;
  electricityAmount: number;
  totalPayable: number;
  upiId: string;
  subject: string;
  bodyText: string;
  sentAt: string;
  status: 'Sent to Email' | 'Delivered';
  emailPreviewUrl?: string;
  messageId?: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  category:
    | 'agreement'
    | 'payment'
    | 'inspection_in'
    | 'inspection_out'
    | 'notice'
    | 'communication'
    | 'bill';
  fileType: 'PDF' | 'JPG' | 'PNG' | 'TXT' | 'DOC' | 'ZIP';
  fileSize: string;
  date: string;
  hash: string;
  status: 'verified' | 'flagged' | 'pending';
  notes: string;
  dataUrl?: string;
}

export interface PhotoQuotationItem {
  item: string;
  cost: number;
  notes?: string;
}

export type QuotationTenantStatus =
  | 'pending_tenant'
  | 'accepted'
  | 'rejected';

export type QuotationRepaymentMethod =
  | 'restore_to_move_in_photo'
  | 'compensation_deposit_deduction'
  | 'compensation_upi_payment';

export interface OllamaPhotoAnalysis {
  quotationNo: string;
  modelUsed: string;
  analyzedAt: string;
  conditionSummary: string;
  detectedDamages: string[];
  quotationItems: PhotoQuotationItem[];
  totalQuotationAmount: number;
  quotationSubject: string;
  quotationText: string;
  emailedToTenant: string;
  emailedAt: string;
  emailPreviewUrl?: string;
  messageId?: string;
  // Tenant Acceptance / Rejection & Repayment Choice
  tenantStatus?: QuotationTenantStatus;
  repaymentMethod?: QuotationRepaymentMethod;
  repaymentNotes?: string;
  repaymentUtr?: string;
  restoredPhotoUrl?: string;
  tenantRespondedAt?: string;
  ownerVerifiedSettlement?: boolean;
  ownerSettlementVerifiedAt?: string;
  responseEmailPreviewUrl?: string;
  responseSubject?: string;
  responseText?: string;
}

export interface RoomComparison {
  id: string;
  area: string;
  moveInDate: string;
  moveOutDate: string;
  moveInNotes: string;
  moveOutNotes: string;
  category:
    | 'Normal Wear & Tear'
    | 'Pre-existing Defect'
    | 'Undamaged / Clean'
    | 'Tenant Damage'
    | 'Utility Calculation';
  verdict: string;
  disputed: boolean;
  moveInImage?: string;
  moveOutImage?: string;
  moveInImages?: string[];
  moveOutImages?: string[];
  ollamaAnalysis?: OllamaPhotoAnalysis;
}

export type ApartmentOccupancyStatus =
  | 'available'
  | 'pending_application'
  | 'approved_occupied';

export interface TenantApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  applicantKycId: string;
  moveInDate: string;
  stayDurationLabel: string;
  notes: string;
  appliedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  approvedAt?: string;
  emailPreviewUrl?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  date: string;
  title: string;
  description: string;
  type: 'upload' | 'claim' | 'rebuttal' | 'analysis' | 'notice';
  hash: string;
}

export interface PgCase {
  id: string;
  ownerId?: string; // Landowner ID (e.g. UID or unique landowner key)
  tenancyId: string;
  roomCode: string; // e.g., APEX-402 (Apartment Unit Code)
  pgName: string; // Apartment Building / Complex Name
  roomNo: string; // Flat / Apartment Unit e.g. Flat #402 (2BHK Furnished)
  sharingType: SharingType; // Apartment Configuration (1BHK, 2BHK, Studio, etc.)
  stayType?: StayType; // 'Short-Stay (Days)' | 'Monthly Lease (Months)'
  stayDurationLabel?: string; // e.g. '45 Days Stay' or '6 Months Lease' or '14 Days Short-Stay'
  occupancyStatus?: ApartmentOccupancyStatus;
  tenantApplications?: TenantApplication[];
  tenantKycId?: string; // e.g. 'Aadhaar •••• 7482 & PAN Verified'
  propertyAddress: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  landlordName: string;
  landlordPhone: string;
  landlordEmail: string;
  // Landowner Payment Scanner & Bank Micro-Details
  ownerUpiId?: string;
  ownerQrCodeUrl?: string; // Uploaded or generated QR Scanner image
  ownerQrUpdatedAt?: string;
  ownerBankName?: string;
  ownerAccountNo?: string;
  ownerIfsc?: string;
  rentDueDay?: string; // e.g. "5th of every month" or "Full Stay Advance"
  lockInMonths?: number;
  noticePeriodDays?: number;
  agreementTerms?: string[];
  startDate: string;
  noticeDate: string;
  moveOutDate: string;
  monthlyRent: number;
  rentStatus: 'Paid' | 'Pending' | 'Overdue';
  securityDeposit: number;
  status:
    | 'Active'
    | 'Disputed Deductions'
    | 'Notice Served'
    | 'Resolved'
    | 'Legal Notice Issued';
  deductions: DeductionItem[];
  legalDocuments?: LegalDamageDocument[];
  rentEmailNotices?: RentEmailNotice[];
  payments: PaymentTransaction[];
  complaints: ComplaintItem[];
  evidence: EvidenceItem[];
  comparisons: RoomComparison[];
  auditLogs: AuditLogItem[];
  // Electricity Sub-meter calculations
  startMeterUnits: number;
  endMeterUnits: number;
  meterRatePerUnit: number;
  noticeShortfallDays: number;
}
