import React, { useState } from 'react';
import {
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Send,
  Building2,
  ShieldCheck,
  X,
  ArrowRightLeft,
  Wallet,
  Copy,
  Check,
  QrCode,
  Maximize2,
  Calendar,
  Landmark,
  Image as ImageIcon,
} from 'lucide-react';
import { PgCase, PaymentTransaction } from '../types';
import { buildDefaultQrSvg } from '../data/mockData';

interface ResidentReceiptTabProps {
  activeCase: PgCase;
  onSubmitPaymentUtr: (payment: Omit<PaymentTransaction, 'id' | 'receiptNo'>) => void;
  onUpdateCase: (updated: PgCase) => void;
}

export const ResidentReceiptTab: React.FC<ResidentReceiptTabProps> = ({
  activeCase,
  onSubmitPaymentUtr,
}) => {
  const totalDeductions = activeCase.deductions.reduce((s, d) => s + d.amount, 0);
  const depositRemaining = Math.max(0, activeCase.securityDeposit - totalDeductions);

  const todayIso = new Date().toISOString().split('T')[0];
  const defaultTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Payment Form State with Micro-Details
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(activeCase.monthlyRent);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentTransaction['paymentMethod']>('UPI / GPay');
  const [paymentType, setPaymentType] =
    useState<PaymentTransaction['paymentType']>('monthly_rent');
  const [monthOrPeriod, setMonthOrPeriod] = useState('November 2026 Monthly Rent');
  const [paymentDate, setPaymentDate] = useState(todayIso);
  const [paymentTime, setPaymentTime] = useState(defaultTime);
  const [senderAccountOrUpi, setSenderAccountOrUpi] = useState(
    `${activeCase.tenantName.toLowerCase().replace(/[^a-z0-9]/g, '')}@okaxis`
  );
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Selected Receipt for Printable Modal
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(
    null
  );
  // Enlarge QR Scanner Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const ownerUpi = activeCase.ownerUpiId || 'greenview.owner@okhdfcbank';
  const qrImageSrc =
    activeCase.ownerQrCodeUrl ||
    buildDefaultQrSvg(ownerUpi, activeCase.pgName);

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(ownerUpi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handlePaymentTypeChange = (type: PaymentTransaction['paymentType']) => {
    setPaymentType(type);
    if (type === 'monthly_rent') {
      setPaymentAmount(activeCase.monthlyRent);
      setMonthOrPeriod('November 2026 Monthly Rent');
    } else if (type === 'electricity_bill') {
      const meterBill =
        Math.max(0, activeCase.endMeterUnits - activeCase.startMeterUnits) *
        activeCase.meterRatePerUnit;
      setPaymentAmount(meterBill || 2500);
      setMonthOrPeriod('Sub-Meter Electricity Bill');
    } else if (type === 'deduction_settlement') {
      setPaymentAmount(totalDeductions || 1500);
      setMonthOrPeriod('Deposit Deduction Settlement');
    } else if (type === 'security_deposit') {
      setPaymentAmount(activeCase.securityDeposit);
      setMonthOrPeriod('Security Deposit Payment');
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPaymentScreenshotUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitUtr = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUtr = utrNumber.trim();
    if (cleanUtr.length < 6) {
      setFormError(
        'Please enter a valid 12-digit UPI / Bank UTR Transaction Number.'
      );
      return;
    }
    if (paymentAmount <= 0) {
      setFormError('Payment amount must be greater than ₹0.');
      return;
    }

    const submittedTimestamp = `${paymentDate} · ${
      paymentTime.trim() || defaultTime
    }`;

    onSubmitPaymentUtr({
      utrNumber: cleanUtr,
      amount: paymentAmount,
      paymentType,
      paymentMethod,
      monthOrPeriod: monthOrPeriod.trim() || 'PG Payment',
      date: paymentDate || todayIso,
      paymentTime: paymentTime.trim() || defaultTime,
      submittedAt: submittedTimestamp,
      senderAccountOrUpi:
        senderAccountOrUpi.trim() || `${activeCase.tenantName} UPI`,
      receiverAccountOrUpi: ownerUpi,
      paymentScreenshotUrl: paymentScreenshotUrl || undefined,
      status: 'pending_verification',
      submittedBy: activeCase.tenantName,
      notes:
        notes.trim() ||
        `${monthOrPeriod} paid via ${paymentMethod} on ${paymentDate} at ${
          paymentTime.trim() || defaultTime
        } (UTR: ${cleanUtr}).`,
    });

    setUtrNumber('');
    setNotes('');
    setPaymentScreenshotUrl('');
  };

  const handleDownloadReceiptText = (tx: PaymentTransaction) => {
    const receiptContent = `====================================================================
          OFFICIAL PG PAYMENT & DEPOSIT RECEIPT — NESTORA PG
====================================================================
Receipt Number       : ${tx.receiptNo}
Verification Status  : ${
      tx.status === 'verified'
        ? `VERIFIED BY PG OWNER (${tx.verifiedBy || activeCase.landlordName})`
        : 'PENDING PG OWNER VERIFICATION'
    }
Exact Payment Date   : ${tx.date}
Exact Payment Time   : ${tx.paymentTime || 'Recorded on Date'}
Submitted Timestamp  : ${tx.submittedAt || tx.date}
Verified Timestamp   : ${tx.verifiedAt || 'Pending Owner Approval'}

--------------------------------------------------------------------
1. PG PROPERTY & RESIDENT MICRO-DETAILS
--------------------------------------------------------------------
PG Name              : ${activeCase.pgName}
Room Code & No.      : ${activeCase.roomCode} — ${activeCase.roomNo} (${activeCase.sharingType})
Agreement ID         : ${activeCase.tenancyId}
Property Address     : ${activeCase.propertyAddress}
Resident Name        : ${activeCase.tenantName} (${activeCase.tenantPhone})
PG Owner / Manager   : ${activeCase.landlordName} (${activeCase.landlordPhone})

--------------------------------------------------------------------
2. PAYMENT & BANK / UPI TRANSACTION MICRO-DETAILS
--------------------------------------------------------------------
Payment For          : ${tx.monthOrPeriod || tx.paymentType.replace('_', ' ').toUpperCase()}
Payment Mode         : ${tx.paymentMethod}
12-Digit UTR / Ref   : ${tx.utrNumber}
Paid From (Sender)   : ${tx.senderAccountOrUpi || activeCase.tenantName}
Paid To (Receiver)   : ${tx.receiverAccountOrUpi || ownerUpi}
Owner Bank Account   : ${activeCase.ownerBankName || 'HDFC Bank'} | A/c: ${activeCase.ownerAccountNo || 'N/A'} | IFSC: ${activeCase.ownerIfsc || 'N/A'}
Amount Paid          : Rs. ${tx.amount.toLocaleString('en-IN')}
Remarks              : ${tx.notes}

--------------------------------------------------------------------
3. DEPOSIT & DEDUCTIONS SUMMARY
--------------------------------------------------------------------
Total Security Deposit Held  : Rs. ${activeCase.securityDeposit.toLocaleString('en-IN')}
Total Deductions Applied     : Rs. ${totalDeductions.toLocaleString('en-IN')}
Net Deposit Remaining        : Rs. ${depositRemaining.toLocaleString('en-IN')}
====================================================================`;

    const blob = new Blob([receiptContent], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tx.receiptNo}_${activeCase.roomCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatPaymentTypeBadge = (type: PaymentTransaction['paymentType']) => {
    switch (type) {
      case 'security_deposit':
        return 'Security Deposit';
      case 'monthly_rent':
        return 'Monthly Rent';
      case 'electricity_bill':
        return 'Electricity Bill';
      case 'deduction_settlement':
        return 'Deduction Settlement';
      case 'deposit_refund':
        return 'Deposit Refund';
      default:
        return 'PG Payment';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top PG Owner QR Scanner & Bank Micro-Details Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left 7 cols: Payment Instructions & Bank Micro-Details */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
                <Wallet className="w-4 h-4" />
                <span>OFFICIAL PG PAYMENT SCANNER & MICRO-DETAIL RECEIPT CENTER</span>
                {activeCase.rentDueDay && (
                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-mono text-[11px]">
                    Rent Due: {activeCase.rentDueDay}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Scan PG Owner QR Code or Transfer via UPI / Bank NEFT
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Scan the official QR code uploaded by <strong>{activeCase.landlordName}</strong> using GPay, PhonePe, or Paytm. Then enter your payment date, time, and 12-digit UTR below to get your verified receipt.
              </p>
            </div>

            {/* Official PG Owner UPI Copy Box */}
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-800">
                  Official PG Owner UPI ID ({activeCase.landlordName})
                </p>
                <p className="text-sm font-mono font-extrabold text-emerald-950 mt-0.5">
                  {ownerUpi}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors self-start sm:self-auto"
              >
                {copiedUpi ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied UPI ID</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy UPI ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Bank Account / NEFT / IMPS Micro-Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-slate-500" />
                  <span>PG Bank Name</span>
                </span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {activeCase.ownerBankName || 'HDFC Bank — PG Current A/c'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Account Number
                </span>
                <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                  {activeCase.ownerAccountNo || '50200084912340'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  IFSC Code
                </span>
                <p className="text-xs font-mono font-bold text-emerald-800 mt-0.5">
                  {activeCase.ownerIfsc || 'HDFC0001042'}
                </p>
              </div>
            </div>
          </div>

          {/* Right 5 cols: Interactive Uploaded QR Scanner Box */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 border border-slate-800">
            <div
              onClick={() => setIsQrModalOpen(true)}
              className="bg-white p-2.5 rounded-xl border-2 border-emerald-400 shrink-0 cursor-pointer group relative"
              title="Click to Enlarge QR Scanner"
            >
              <img
                src={qrImageSrc}
                alt="PG Owner Payment QR Scanner"
                className="w-36 h-36 object-contain rounded-lg"
              />
              <span className="absolute bottom-1.5 right-1.5 bg-slate-900/85 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 opacity-90 group-hover:opacity-100">
                <Maximize2 className="w-2.5 h-2.5" />
                <span>Zoom</span>
              </span>
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase">
                <QrCode className="w-3 h-3" />
                <span>Verified Owner QR Scanner</span>
              </div>
              <h3 className="text-sm font-bold text-white">
                {activeCase.pgName}
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Uploaded by <strong>{activeCase.landlordName}</strong>. Works with Google Pay, PhonePe, Paytm, and BHIM UPI.
              </p>
              {activeCase.ownerQrUpdatedAt && (
                <p className="text-[10px] text-slate-400 font-mono">
                  QR Updated: {activeCase.ownerQrUpdatedAt}
                </p>
              )}
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="mt-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Open Full-Screen Scanner</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid: Left = Submit Payment Micro-Details, Right = Every Payment Receipt Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Submit Payment Details (UTR + Date + Time + Screenshot) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs h-fit space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Submit Payment & Micro-Details (UTR)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              After scanning the QR or transferring via UPI/Bank, log the exact payment date, time, sender UPI, and 12-digit UTR below.
            </p>
          </div>

          <form onSubmit={handleSubmitUtr} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                What Are You Paying For?
              </label>
              <select
                value={paymentType}
                onChange={(e) =>
                  handlePaymentTypeChange(
                    e.target.value as PaymentTransaction['paymentType']
                  )
                }
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600 font-medium"
              >
                <option value="monthly_rent">
                  Monthly PG Rent (₹{activeCase.monthlyRent.toLocaleString('en-IN')})
                </option>
                <option value="electricity_bill">
                  Room Sub-Meter Electricity Bill
                </option>
                <option value="deduction_settlement">
                  Deposit Deduction / Checkout Settlement
                </option>
                <option value="security_deposit">
                  Security Deposit / Advance Payment
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Amount Paid (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount || ''}
                  onChange={(e) =>
                    setPaymentAmount(parseFloat(e.target.value) || 0)
                  }
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl font-mono font-bold focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment App / Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value as PaymentTransaction['paymentMethod']
                    )
                  }
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
                >
                  <option value="UPI / GPay">UPI / Google Pay (QR Scan)</option>
                  <option value="PhonePe">PhonePe (QR Scan)</option>
                  <option value="Paytm">Paytm UPI</option>
                  <option value="Bank NEFT / IMPS">Bank NEFT / IMPS</option>
                  <option value="Cash / Counter">Cash at PG Counter</option>
                </select>
              </div>
            </div>

            {/* Exact Payment Date & Exact Payment Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Exact Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl font-mono focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Exact Payment Time
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11:30 AM"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl font-mono focus:outline-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Payment Month / Description
              </label>
              <input
                type="text"
                required
                placeholder="e.g. November 2026 Monthly Rent"
                value={monthOrPeriod}
                onChange={(e) => setMonthOrPeriod(e.target.value)}
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  12-Digit UPI / Bank UTR No.
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 431098237461"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl font-mono tracking-wider focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Paid From (Your UPI / Bank A/c)
                </label>
                <input
                  type="text"
                  placeholder="e.g. aarav@okaxis or HDFC-4821"
                  value={senderAccountOrUpi}
                  onChange={(e) => setSenderAccountOrUpi(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl font-mono focus:outline-emerald-600"
                />
              </div>
            </div>

            {/* Optional Payment Screenshot Upload */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Attach Payment Screenshot Proof (Optional)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl bg-slate-50/70 text-xs text-slate-600 cursor-pointer transition-colors">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {paymentScreenshotUrl
                      ? 'Payment Screenshot Attached (Click to change)'
                      : 'Upload GPay / PhonePe Screenshot'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                </label>
                {paymentScreenshotUrl && (
                  <button
                    type="button"
                    onClick={() => setPaymentScreenshotUrl('')}
                    className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Additional Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Scanned Owner QR code at reception"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-600"
              />
            </div>

            {formError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Payment & Request Receipt</span>
            </button>
          </form>
        </div>

        {/* Right Column: Every Payment Receipt List with Full Micro-Details */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Complete Payment History & Micro-Detail Receipts ({activeCase.payments.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every payment shows the exact date, time, UTR number, sender/receiver UPI, and verification timestamp.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {activeCase.payments.filter((p) => p.status === 'verified').length} Verified Receipts
            </span>
          </div>

          <div className="space-y-3.5">
            {activeCase.payments.map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-xl border border-slate-200/90 hover:border-emerald-300 transition-all bg-slate-50/50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {tx.receiptNo}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                        {formatPaymentTypeBadge(tx.paymentType)}
                      </span>
                      {tx.status === 'verified' ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified Receipt</span>
                        </span>
                      ) : tx.status === 'pending_verification' ? (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Awaiting Owner Verification</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          Rejected
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-900 pt-0.5">
                      {tx.monthOrPeriod || tx.notes}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-lg font-extrabold font-mono text-slate-900 tabular-nums">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(tx)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View Full Receipt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadReceiptText(tx)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                        title="Download Receipt File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Micro-Details Metadata Grid inside each payment row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-200/70 text-[11px]">
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Payment Date & Time
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {tx.date} {tx.paymentTime ? `· ${tx.paymentTime}` : ''}
                    </span>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      UTR / Reference No.
                    </span>
                    <span className="font-mono font-bold text-emerald-800">
                      {tx.utrNumber}
                    </span>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Mode & Sender A/c
                    </span>
                    <span className="font-mono text-slate-700 truncate block">
                      {tx.paymentMethod} ({tx.senderAccountOrUpi || 'Resident UPI'})
                    </span>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Owner Verification
                    </span>
                    <span className="font-mono text-slate-700 truncate block">
                      {tx.verifiedAt
                        ? `${tx.verifiedAt}`
                        : `Submitted ${tx.submittedAt || tx.date}`}
                    </span>
                  </div>
                </div>

                {tx.paymentScreenshotUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <img
                      src={tx.paymentScreenshotUrl}
                      alt="Payment proof"
                      className="w-10 h-10 object-cover rounded border border-slate-300"
                    />
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Payment Screenshot Proof Attached
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full-Screen QR Scanner Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-left">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Official PG Payment QR Scanner
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeCase.pgName} ({activeCase.roomCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mx-auto">
              <img
                src={qrImageSrc}
                alt="Full Size PG Payment QR"
                className="w-64 h-64 object-contain mx-auto"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
              <p className="font-bold text-emerald-950">
                Payee: {activeCase.landlordName}
              </p>
              <p className="font-mono font-bold text-emerald-800">{ownerUpi}</p>
              <p className="text-[11px] text-slate-600">
                Bank: {activeCase.ownerBankName || 'HDFC Bank'} · A/c:{' '}
                {activeCase.ownerAccountNo || '50200084912340'} · IFSC:{' '}
                {activeCase.ownerIfsc || 'HDFC0001042'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              Done Scanning — Enter UTR Details
            </button>
          </div>
        </div>
      )}

      {/* Official Printable Receipt Modal with Complete Micro-Details */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                    Official PG Payment & Micro-Detail Receipt
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {activeCase.pgName}
                </h3>
                <p className="text-xs text-slate-500">{activeCase.propertyAddress}</p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Micro-Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Receipt No.
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedReceipt.receiptNo}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Exact Payment Date & Time
                </span>
                <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  <span>
                    {selectedReceipt.date}{' '}
                    {selectedReceipt.paymentTime
                      ? `at ${selectedReceipt.paymentTime}`
                      : ''}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  12-Digit UTR Reference
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  {selectedReceipt.utrNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Submitted Timestamp
                </span>
                <span className="font-mono text-slate-700">
                  {selectedReceipt.submittedAt || selectedReceipt.date}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Owner Verified Timestamp
                </span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {selectedReceipt.verifiedAt || 'Pending Owner Approval'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Payment Mode
                </span>
                <span className="font-bold text-slate-800">
                  {selectedReceipt.paymentMethod}
                </span>
              </div>
            </div>

            {/* Resident & PG Owner Micro-Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Paid By (PG Resident)
                </p>
                <p className="font-bold text-slate-900 text-sm">
                  {activeCase.tenantName}
                </p>
                <p className="text-slate-600">Phone: {activeCase.tenantPhone}</p>
                <p className="text-slate-600">
                  Room: <strong>{activeCase.roomNo}</strong> ({activeCase.roomCode}) ·{' '}
                  {activeCase.sharingType}
                </p>
                <p className="text-slate-600 font-mono text-[11px]">
                  Sender UPI/Bank:{' '}
                  <strong>
                    {selectedReceipt.senderAccountOrUpi || 'Resident Verified A/c'}
                  </strong>
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Received By (PG Owner)
                </p>
                <p className="font-bold text-slate-900 text-sm">
                  {activeCase.landlordName}
                </p>
                <p className="text-slate-600">Phone: {activeCase.landlordPhone}</p>
                <p className="text-slate-600 font-mono text-[11px]">
                  Receiver UPI:{' '}
                  <strong>{selectedReceipt.receiverAccountOrUpi || ownerUpi}</strong>
                </p>
                <p className="text-slate-600 font-mono text-[11px]">
                  Bank: {activeCase.ownerBankName || 'HDFC Bank'} (IFSC:{' '}
                  {activeCase.ownerIfsc || 'HDFC0001042'})
                </p>
              </div>
            </div>

            {/* Payment Breakdown Box */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-900 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between">
                <span>Payment Description & Remarks</span>
                <span>Amount Paid</span>
              </div>
              <div className="p-4 flex items-center justify-between text-sm border-b border-slate-100">
                <div>
                  <p className="font-bold text-slate-900">
                    {selectedReceipt.monthOrPeriod ||
                      formatPaymentTypeBadge(selectedReceipt.paymentType)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedReceipt.notes}
                  </p>
                </div>
                <span className="text-xl font-extrabold font-mono text-emerald-700 tabular-nums">
                  ₹{selectedReceipt.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-slate-50 px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-600">
                <span>
                  Security Deposit Held:{' '}
                  <strong className="font-mono text-slate-900">
                    ₹{activeCase.securityDeposit.toLocaleString('en-IN')}
                  </strong>
                </span>
                <span>
                  Owner Deductions:{' '}
                  <strong className="font-mono text-rose-600">
                    -₹{totalDeductions.toLocaleString('en-IN')}
                  </strong>
                </span>
                <span>
                  Deposit Remaining:{' '}
                  <strong className="font-mono text-emerald-700">
                    ₹{depositRemaining.toLocaleString('en-IN')}
                  </strong>
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Digitally Verified PG Receipt · {selectedReceipt.receiptNo}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptText(selectedReceipt)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .TXT</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
