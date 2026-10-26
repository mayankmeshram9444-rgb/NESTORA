import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Building2,
  UserCheck,
  ShieldCheck,
  Calendar,
  Zap,
  CheckCircle2,
  Lock,
  Gavel,
  Download,
  Mail,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { PgCase, LegalDamageDocument, RentEmailNotice } from '../types';
import { buildMailtoLink } from '../services/legalService';

interface AgreementDetailsTabProps {
  activeCase: PgCase;
  role?: 'resident' | 'owner';
  onAddClause?: (clauseText: string) => void;
  onRemoveClause?: (index: number) => void;
}

export const AgreementDetailsTab: React.FC<AgreementDetailsTabProps> = ({
  activeCase,
  role = 'resident',
  onAddClause,
  onRemoveClause,
}) => {
  const [newClauseInput, setNewClauseInput] = useState('');

  const totalDeductions = activeCase.deductions.reduce(
    (sum, d) => sum + d.amount,
    0
  );
  const depositRemaining = Math.max(
    0,
    activeCase.securityDeposit - totalDeductions
  );

  const defaultTerms = [
    `Apartment stay charge / monthly rent of ₹${activeCase.monthlyRent.toLocaleString('en-IN')} is payable as agreed at check-in or by the 5th of the month.`,
    `Refundable Security Deposit of ₹${activeCase.securityDeposit.toLocaleString('en-IN')} is held by the Landowner and refunded upon vacating after subtracting verified physical damages and electricity dues.`,
    `If the tenant causes physical damage to apartment appliances, furniture, glass doors, or fixtures during their stay of days or months, the Landowner is legally entitled to deduct repair costs and serve a Legal Recovery Notice.`,
    `Apartment electricity is billed per sub-meter reading at ₹${activeCase.meterRatePerUnit} per unit.`,
    `Minimum ${activeCase.noticePeriodDays || 15}-day notice period applies prior to vacating.`,
  ];

  const termsList =
    activeCase.agreementTerms && activeCase.agreementTerms.length > 0
      ? activeCase.agreementTerms
      : defaultTerms;

  const legalDocs = activeCase.legalDocuments || [];
  const rentNotices = activeCase.rentEmailNotices || [];

  const handlePrintAgreement = () => {
    window.print();
  };

  const handleDownloadLegalDoc = (doc: LegalDamageDocument) => {
    const blob = new Blob([doc.documentText], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.refNo}_${activeCase.roomCode}_Legal_Document.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadRentNotice = (notice: RentEmailNotice) => {
    const blob = new Blob([notice.bodyText], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notice.noticeNo}_${activeCase.roomCode}_Rent_Notice.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClauseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClauseInput.trim() || !onAddClause) return;
    onAddClause(newClauseInput.trim());
    setNewClauseInput('');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
            <FileText className="w-4 h-4" />
            <span>DOCUMENTS & AGREEMENT SECTION</span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Apartment Agreement & Official Documents ({activeCase.roomCode})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lease Agreement ({activeCase.tenancyId}), Legal Damage Notices ({legalDocs.length}), and Emailed Rent Notices ({rentNotices.length}).
          </p>
        </div>

        <button
          onClick={handlePrintAgreement}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Agreement PDF</span>
        </button>
      </div>

      {/* 1. Official Move-Out Damage Legal Documents Served */}
      {legalDocs.length > 0 && (
        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-rose-100">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-rose-700">
              <Gavel className="w-4 h-4" />
              <span>
                Legal Damage Notices Served ({legalDocs.length})
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {legalDocs.map((doc) => {
              const targetEmail = doc.emailedTo || activeCase.tenantEmail;
              const mailtoHref = buildMailtoLink(
                targetEmail,
                `OFFICIAL LEGAL NOTICE (${doc.refNo}) — ${activeCase.roomNo} (${activeCase.roomCode})`,
                doc.documentText
              );

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-rose-800 bg-white border border-rose-200 px-2 py-0.5 rounded">
                          Ref: {doc.refNo}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                          <Mail className="w-3 h-3 text-emerald-600" />
                          <span>Emailed to {targetEmail}</span>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        {doc.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Issued: {doc.generatedAt} · Counsel: {doc.advocateName}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {doc.emailPreviewUrl && (
                        <a
                          href={doc.emailPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center gap-1"
                        >
                          <span>SMTP Receipt</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <a
                        href={mailtoHref}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email App</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDownloadLegalDoc(doc)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.TXT</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintAgreement}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>

                  <div className="font-mono text-xs leading-relaxed text-slate-900 bg-white p-4 rounded-xl border border-slate-200 whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {doc.documentText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Monthly Rent Notices Emailed */}
      {rentNotices.length > 0 && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-indigo-700">
              <Mail className="w-4 h-4" />
              <span>
                Monthly Rent Notices Sent to Email ({rentNotices.length})
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {rentNotices.map((notice) => {
              const mailtoHref = buildMailtoLink(
                notice.recipientEmail,
                notice.subject,
                notice.bodyText
              );
              return (
                <div
                  key={notice.id}
                  className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded">
                          {notice.noticeNo}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {notice.billingMonth} — ₹{notice.totalPayable.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          To: {notice.recipientEmail}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Sent: {notice.sentAt} · Due: {notice.dueDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {notice.emailPreviewUrl && (
                        <a
                          href={notice.emailPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <span>SMTP Receipt</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <a
                        href={mailtoHref}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Mail App</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDownloadRentNotice(notice)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>.TXT</span>
                      </button>
                    </div>
                  </div>

                  <div className="font-mono text-[11px] leading-relaxed text-slate-800 bg-white p-3 rounded-xl border border-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {notice.bodyText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Main Printable Apartment Lease & Stay Agreement Document */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Agreement ID: {activeCase.tenancyId}
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-2">
              {activeCase.pgName} — Apartment Stay & Damage Liability Agreement
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeCase.propertyAddress}
            </p>
          </div>
          <div className="text-left sm:text-right text-xs">
            <p className="text-slate-500">Apartment Unit Code</p>
            <p className="text-base font-mono font-extrabold text-emerald-700">
              {activeCase.roomCode}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeCase.roomNo} ({activeCase.stayDurationLabel || 'Short/Monthly Stay'})
            </p>
          </div>
        </div>

        {/* Parties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Landowner / Apartment Owner (First Party)</span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              {activeCase.landlordName}
            </p>
            <p className="text-xs text-slate-600">
              Phone: {activeCase.landlordPhone}
            </p>
            <p className="text-xs text-slate-600">
              Email: {activeCase.landlordEmail}
            </p>
            <p className="text-xs text-emerald-800 font-mono font-semibold pt-1">
              Official Payment UPI:{' '}
              {activeCase.ownerUpiId || 'emeraldcrest.landowner@okhdfcbank'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Apartment Tenant / Occupant (Second Party)</span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              {activeCase.tenantName}
            </p>
            <p className="text-xs text-slate-600">
              Phone: {activeCase.tenantPhone}
            </p>
            <p className="text-xs text-slate-600">
              Email: {activeCase.tenantEmail}
            </p>
            <p className="text-xs text-slate-700 font-semibold pt-1">
              Apartment Unit: {activeCase.sharingType} ({activeCase.roomNo}) · KYC:{' '}
              {activeCase.tenantKycId || 'Verified'}
            </p>
          </div>
        </div>

        {/* Financial & Deposit Terms Grid */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Financial, Deposit & Move-Out Damage Schedule
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <p className="text-[11px] text-slate-500">Stay Rent / Tariff</p>
              <p className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
                ₹{activeCase.monthlyRent.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {activeCase.stayDurationLabel || 'Agreed Stay'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <p className="text-[11px] text-slate-500">Security Deposit Paid</p>
              <p className="text-lg font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
                ₹{activeCase.securityDeposit.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                Held by Landowner
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40">
              <p className="text-[11px] text-rose-700">Move-Out Damages & Dues</p>
              <p className="text-lg font-extrabold text-rose-600 font-mono tabular-nums mt-0.5">
                -₹{totalDeductions.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-rose-600 mt-0.5">
                {activeCase.deductions.length} item(s) applied
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <p className="text-[11px] text-emerald-800 font-semibold">
                Deposit Remaining
              </p>
              <p className="text-lg font-extrabold text-emerald-700 font-mono tabular-nums mt-0.5">
                ₹{depositRemaining.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Net balance after damages
              </p>
            </div>
          </div>
        </div>

        {/* Key Tenancy Dates & Policies */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500">Check-In Date</p>
              <p className="text-xs font-bold text-slate-900 font-mono">
                {activeCase.startDate}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500">Move-Out Date</p>
              <p className="text-xs font-bold text-slate-900 font-mono">
                {activeCase.moveOutDate}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500">Stay Duration</p>
              <p className="text-xs font-bold text-slate-900">
                {activeCase.stayDurationLabel || '45 Days Stay'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
            <Zap className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500">Sub-Meter Tariff</p>
              <p className="text-xs font-bold text-slate-900 font-mono">
                ₹{activeCase.meterRatePerUnit} / kWh Unit
              </p>
            </div>
          </div>
        </div>

        {/* Terms & Clauses List */}
        <div className="pt-2 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Apartment Stay Terms & Move-Out Damage Liability Clauses
          </h4>
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            {termsList.map((clause, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2.5 text-xs text-slate-700"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Clause {index + 1}:</strong> {clause}
                  </span>
                </div>
                {role === 'owner' && onRemoveClause && (
                  <button
                    type="button"
                    onClick={() => onRemoveClause(index)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                    title="Remove Clause"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {role === 'owner' && onAddClause && (
            <form
              onSubmit={handleClauseSubmit}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                placeholder="Add new apartment agreement clause..."
                value={newClauseInput}
                onChange={(e) => setNewClauseInput(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2 border border-slate-200 rounded-xl"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Clause</span>
              </button>
            </form>
          )}
        </div>

        {/* Digital Verification Footer */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Digitally Verified Apartment Stay Agreement · Managed by Landowner{' '}
              <strong className="text-slate-800">{activeCase.landlordName}</strong>
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Tenant: {activeCase.tenantName} ({activeCase.roomCode})
          </span>
        </div>
      </div>
    </div>
  );
};
