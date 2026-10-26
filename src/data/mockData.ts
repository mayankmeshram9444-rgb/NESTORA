import { PgCase } from '../types';

export function buildDefaultQrSvg(upiId: string, payeeName: string): string {
  const cleanUpi = encodeURIComponent(upiId || 'Not Configured');
  const cleanName = encodeURIComponent(payeeName || 'Landowner');
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="360" viewBox="0 0 320 360"><rect width="320" height="360" rx="20" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="2"/><rect x="16" y="16" width="288" height="42" rx="10" fill="%23064e3b"/><text x="160" y="36" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23ffffff">SCAN &amp; PAY LANDOWNER VIA UPI</text><text x="160" y="50" text-anchor="middle" font-family="monospace" font-size="10" fill="%236ee7b7">GPay · PhonePe · Paytm · BHIM</text><rect x="50" y="72" width="220" height="220" rx="12" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="1.5"/><rect x="66" y="88" width="54" height="54" fill="none" stroke="%230f172a" stroke-width="6"/><rect x="78" y="100" width="30" height="30" fill="%230f172a"/><rect x="200" y="88" width="54" height="54" fill="none" stroke="%230f172a" stroke-width="6"/><rect x="212" y="100" width="30" height="30" fill="%230f172a"/><rect x="66" y="222" width="54" height="54" fill="none" stroke="%230f172a" stroke-width="6"/><rect x="78" y="234" width="30" height="30" fill="%230f172a"/><rect x="134" y="88" width="12" height="12" fill="%230f172a"/><rect x="158" y="88" width="24" height="12" fill="%230f172a"/><rect x="134" y="112" width="24" height="12" fill="%230f172a"/><rect x="170" y="112" width="12" height="24" fill="%230f172a"/><rect x="134" y="136" width="12" height="24" fill="%230f172a"/><rect x="158" y="148" width="24" height="12" fill="%230f172a"/><rect x="66" y="158" width="24" height="12" fill="%230f172a"/><rect x="102" y="158" width="18" height="24" fill="%230f172a"/><rect x="66" y="182" width="12" height="24" fill="%230f172a"/><rect x="90" y="194" width="24" height="12" fill="%230f172a"/><rect x="134" y="170" width="52" height="24" rx="4" fill="%23047857"/><text x="160" y="186" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23ffffff">UPI QR</text><rect x="200" y="158" width="24" height="12" fill="%230f172a"/><rect x="236" y="158" width="18" height="24" fill="%230f172a"/><rect x="200" y="182" width="12" height="24" fill="%230f172a"/><rect x="224" y="194" width="30" height="12" fill="%230f172a"/><rect x="134" y="210" width="24" height="12" fill="%230f172a"/><rect x="170" y="210" width="12" height="30" fill="%230f172a"/><rect x="194" y="222" width="24" height="18" fill="%230f172a"/><rect x="230" y="222" width="24" height="12" fill="%230f172a"/><rect x="134" y="246" width="30" height="12" fill="%230f172a"/><rect x="182" y="252" width="24" height="24" fill="%230f172a"/><rect x="218" y="246" width="36" height="12" fill="%230f172a"/><rect x="134" y="264" width="18" height="12" fill="%230f172a"/><rect x="230" y="264" width="24" height="12" fill="%230f172a"/><text x="160" y="314" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="%230f172a">${cleanName}</text><text x="160" y="332" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="%23047857">UPI: ${cleanUpi}</text><text x="160" y="348" text-anchor="middle" font-family="sans-serif" font-size="9" fill="%2364748b">Verified Landowner Apartment QR Scanner</text></svg>`;
}

export function buildInspectionPhotoSvg(options: {
  stage: 'moveIn' | 'moveOut';
  areaTitle: string;
  roomCode: string;
  date: string;
  isDamaged?: boolean;
  caption?: string;
  scene?: 'tv_sofa' | 'kitchen_bath' | 'balcony_glass' | 'ac_bedroom';
}): string {
  const { stage, areaTitle, roomCode, date, isDamaged = false, caption = '' } = options;
  const badgeBg = stage === 'moveIn' ? '%23047857' : isDamaged ? '%23e11d48' : '%230284c7';
  const badgeLabel = stage === 'moveIn' ? 'MOVE-IN PHOTO' : isDamaged ? 'DAMAGE PHOTO' : 'INSPECTION PHOTO';
  const safeArea = encodeURIComponent(areaTitle.slice(0, 42));
  const safeCaption = encodeURIComponent(
    (caption || (stage === 'moveIn' ? 'Condition recorded at check-in' : 'Condition recorded at handover')).slice(0, 68)
  );
  const safeMeta = encodeURIComponent(`Unit: ${roomCode} | Date: ${date} | Nestora`);

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23f8fafc"/><rect y="260" width="600" height="140" fill="%23f1f5f9"/><rect x="16" y="14" width="200" height="26" rx="6" fill="${badgeBg}"/><text x="24" y="31" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23ffffff">${badgeLabel}</text><text x="580" y="30" text-anchor="end" font-family="monospace" font-size="11" font-weight="bold" fill="%23334155">${safeArea}</text><circle cx="300" cy="150" r="44" fill="%23e2e8f0"/><text x="300" y="155" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="600" fill="%2364748b">Inspection Image</text><rect x="0" y="328" width="600" height="72" fill="%230f172a"/><text x="20" y="352" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23ffffff">${safeCaption}</text><text x="20" y="376" font-family="monospace" font-size="11" fill="%236ee7b7">${safeMeta}</text></svg>`;
}

// Clean slate: no fake dummy landowners hardcoded
export const DEMO_LANDOWNERS: Array<{
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  residentialAddress: string;
  preferredLanguage: string;
  aboutYou: string;
  pgName: string;
}> = [];

// Clean slate: no fake dummy initial cases hardcoded
export const INITIAL_CASES: PgCase[] = [];

export const EMPTY_CASE_PLACEHOLDER: PgCase = {
  id: '',
  tenancyId: '',
  roomCode: 'NO-UNITS',
  pgName: 'No Property Added Yet',
  roomNo: 'Add your first apartment unit',
  sharingType: '2BHK Apartment',
  stayType: 'Monthly Lease (Months)',
  stayDurationLabel: '',
  occupancyStatus: 'available',
  tenantApplications: [],
  tenantKycId: '',
  propertyAddress: '',
  tenantName: '',
  tenantPhone: '',
  tenantEmail: '',
  landlordName: '',
  landlordPhone: '',
  landlordEmail: '',
  ownerUpiId: '',
  ownerQrCodeUrl: '',
  ownerBankName: '',
  ownerAccountNo: '',
  ownerIfsc: '',
  rentDueDay: '5th of every month',
  lockInMonths: 0,
  noticePeriodDays: 30,
  agreementTerms: [],
  startDate: '',
  noticeDate: '',
  moveOutDate: '',
  monthlyRent: 0,
  rentStatus: 'Pending',
  securityDeposit: 0,
  status: 'Active',
  startMeterUnits: 0,
  endMeterUnits: 0,
  meterRatePerUnit: 10,
  noticeShortfallDays: 0,
  deductions: [],
  legalDocuments: [],
  rentEmailNotices: [],
  payments: [],
  complaints: [],
  evidence: [],
  comparisons: [],
  auditLogs: [],
};

export const COMMON_APARTMENT_DAMAGE_PRESETS: {
  title: string;
  category:
    | 'appliance'
    | 'furniture'
    | 'structural'
    | 'painting'
    | 'cleaning'
    | 'other';
  amount: number;
  billRefNo: string;
  claim: string;
}[] = [
  {
    title: 'AC Servicing / Gas Leak Repair',
    category: 'appliance',
    amount: 2500,
    billRefNo: 'INV-AC-01',
    claim: 'Technician invoice for AC gas recharge and filter replacement.',
  },
  {
    title: 'Deep Cleaning & Wall Paint Touchup',
    category: 'painting',
    amount: 3500,
    billRefNo: 'INV-CLN-02',
    claim: 'Deep cleaning and wall touch-up required at move-out.',
  },
  {
    title: 'Plumbing / Bathroom Fixture Repair',
    category: 'structural',
    amount: 1800,
    billRefNo: 'INV-PLUMB-03',
    claim: 'Tap mixer replacement due to physical breakage.',
  },
  {
    title: 'Furniture Upholstery Repair',
    category: 'furniture',
    amount: 3000,
    billRefNo: 'INV-FURN-04',
    claim: 'Sofa cushion stain removal and fabric repair.',
  },
];

export const PRESET_CLAUSES: {
  title: string;
  category: string;
  clause: string;
}[] = [
  {
    title: 'Security Deposit Deduction Rule',
    category: 'Deposit',
    clause:
      'Any verifiable physical damage beyond normal wear and tear or unpaid electricity dues will be deducted from the security deposit upon checkout inspection.',
  },
  {
    title: 'Rent Due Date & Mode',
    category: 'Rent',
    clause:
      'Rent is due on or before the 5th of each calendar month and can be paid via UPI QR or Bank NEFT transfer.',
  },
  {
    title: 'Notice Period Requirement',
    category: 'Notice',
    clause:
      'A minimum 30-day written notice is required prior to vacating the apartment unit.',
  },
];
