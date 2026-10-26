import React, { useState } from 'react';
import {
  ArrowRight,
  Layers,
  Receipt,
  FileText,
  MessageSquareWarning,
  Zap,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Gavel,
  Printer,
  Download,
  X,
  Mail,
} from 'lucide-react';
import { PgCase, LegalDamageDocument, RentEmailNotice } from '../types';
import { TabKey } from './Sidebar';

interface DashboardTabProps {
  activeCase: PgCase;
  onSwitchTab: (tab: TabKey) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  activeCase,
  onSwitchTab,
}) => {
  const [viewingLegalDoc, setViewingLegalDoc] =
    useState<LegalDamageDocument | null>(null);
  const [viewingRentEmail, setViewingRentEmail] =
    useState<RentEmailNotice | null>(null);

  const totalDeductions = activeCase.deductions.reduce(
    (sum, d) => sum + d.amount,
    0
  );
  const depositRemaining = Math.max(
    0,
    activeCase.securityDeposit - totalDeductions
  );
  const excessRecoveryDue = Math.max(
    0,
    totalDeductions - activeCase.securityDeposit
  );

  const meterUnitsUsed = Math.max(
    0,
    activeCase.endMeterUnits - activeCase.startMeterUnits
  );
  const meterCost = meterUnitsUsed * activeCase.meterRatePerUnit;

  const verifiedReceiptsCount = (activeCase.payments || []).filter(
    (p) => p.status === 'verified'
  ).length;
  const pendingUtrCount = (activeCase.payments || []).filter(
    (p) => p.status === 'pending_verification'
  ).length;
  const openComplaintsCount = (activeCase.complaints || []).filter(
    (c) => c.status !== 'Resolved'
  ).length;

  const legalDocs = activeCase.legalDocuments || [];

  const handleDownloadLegalDoc = (doc: LegalDamageDocument) => {
    const blob = new Blob([doc.documentText], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.refNo}_${activeCase.roomCode}_Legal_Notice.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Apartment Tenant Stay & Landowner Header Card */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                Apartment Code: {activeCase.roomCode}
              </span>
              <span className="font-bold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                {activeCase.stayDurationLabel || 'Short/Monthly Stay'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeCase.sharingType}</span>
              <span aria-hidden="true">·</span>
              <span>
                Stay Rent / Tariff:{' '}
                <strong className="font-mono text-slate-900">
                  ₹{activeCase.monthlyRent.toLocaleString('en-IN')}
                </strong>{' '}
                (
                <strong
                  className={
                    activeCase.rentStatus === 'Paid'
                      ? 'text-emerald-700'
                      : activeCase.rentStatus === 'Overdue'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                  }
                >
                  {activeCase.rentStatus}
                </strong>
                )
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {activeCase.pgName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5">
              <span className="font-semibold text-slate-800">
                {activeCase.roomNo}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Stay Period: <strong>{activeCase.startDate}</strong> to{' '}
                <strong>{activeCase.moveOutDate}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeCase.propertyAddress}</span>
            </div>
            <div className="text-xs text-slate-600 mt-2">
              <span>
                Apartment Tenant: <strong>{activeCase.tenantName}</strong> (
                {activeCase.tenantPhone})
              </span>
              <span className="mx-2 text-slate-300">|</span>
              <span>
                Landowner (Apartment Owner):{' '}
                <strong>{activeCase.landlordName}</strong> (
                {activeCase.landlordPhone})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onSwitchTab('receipt')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Receipt className="w-4 h-4" />
              <span>Scan QR & Make Payment</span>
            </button>
            <button
              onClick={() => onSwitchTab('complaints')}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquareWarning className="w-3.5 h-3.5" />
              <span>Dispute / Query Box</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Rent Notice Sent to Tenant Email Banner */}
      {(activeCase.rentEmailNotices || []).length > 0 && (
        <div className="bg-indigo-950 text-white border border-indigo-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-indigo-300">
              <Mail className="w-4 h-4" />
              <span>
                MONTHLY RENT NOTICE SENT TO EMAIL ({activeCase.rentEmailNotices![0].recipientEmail})
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">
              {activeCase.rentEmailNotices![0].billingMonth} Rent Notice — ₹
              {activeCase.rentEmailNotices![0].totalPayable.toLocaleString('en-IN')} Due by{' '}
              {activeCase.rentEmailNotices![0].dueDate}
            </h3>
            <p className="text-xs text-indigo-200">
              Ref: {activeCase.rentEmailNotices![0].noticeNo} · Sent on{' '}
              {activeCase.rentEmailNotices![0].sentAt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setViewingRentEmail(activeCase.rentEmailNotices![0])}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-950 text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Read Email Notice</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchTab('receipt')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Pay Rent via QR</span>
            </button>
          </div>
        </div>
      )}

      {/* Official Legal Document Alert Banner (If Landowner Issued a Move-Out Damage Legal Notice) */}
      {legalDocs.length > 0 && (
        <div className="bg-rose-950 text-white border border-rose-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-rose-300">
              <Gavel className="w-4 h-4" />
              <span>
                LEGAL NOTICE SERVED BY LANDOWNER ({legalDocs[0].refNo})
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">
              {legalDocs[0].title}
            </h3>
            <p className="text-xs text-rose-200">
              Issued on {legalDocs[0].generatedAt} · Damages: ₹{legalDocs[0].totalDamageAmount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setViewingLegalDoc(legalDocs[0])}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-950 text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Legal Document</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchTab('receipt')}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Settle via QR Payment</span>
            </button>
          </div>
        </div>
      )}

      {/* Ollama Move-In / Move-Out Photo Quotations Sent to Tenant (Accept / Reject & How to Repay) */}
      {activeCase.comparisons.some(
        (c) => c.ollamaAnalysis && c.ollamaAnalysis.totalQuotationAmount > 0
      ) && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-indigo-800">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>
                  OLLAMA MOVE-IN & MOVE-OUT PHOTO QUOTATIONS SENT TO YOUR EMAIL (
                  {activeCase.tenantEmail})
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Accept or Reject each photo quotation and choose how you repay:{' '}
                <strong>Give Back as in Move-In Photo (Restore)</strong> or{' '}
                <strong>Give Financial Compensation (Deposit / UPI)</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSwitchTab('comparison')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Accept / Reject & Choose Repayment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeCase.comparisons
              .filter(
                (c) =>
                  c.ollamaAnalysis && c.ollamaAnalysis.totalQuotationAmount > 0
              )
              .map((comp) => {
                const q = comp.ollamaAnalysis!;
                const st = q.tenantStatus || 'pending_tenant';
                return (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          {q.quotationNo}
                        </span>
                        <p className="font-bold text-slate-900 mt-1">
                          {comp.area}
                        </p>
                      </div>
                      <span className="font-mono font-extrabold text-sm text-rose-700">
                        ₹{q.totalQuotationAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
                      {st === 'accepted' ? (
                        <span className="font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-[11px]">
                          Accepted ·{' '}
                          {q.repaymentMethod === 'restore_to_move_in_photo'
                            ? 'Restoring as in Move-In Photo (₹0)'
                            : q.repaymentMethod === 'compensation_upi_payment'
                            ? 'Paying Compensation via UPI'
                            : 'Compensation from Deposit'}
                        </span>
                      ) : st === 'rejected' ? (
                        <span className="font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded text-[11px]">
                          Rejected / Disputed by Tenant
                        </span>
                      ) : (
                        <span className="font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[11px]">
                          Pending Your Acceptance / Rejection
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onSwitchTab('comparison')}
                        className="text-indigo-700 hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Respond Now</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 3 Big Deposit & Move-Out Damage Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Security Deposit Paid */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Security Deposit Paid at Check-In</span>
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Held by Landowner
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums font-mono">
                ₹{activeCase.securityDeposit.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-400">Apartment Deposit</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Paid on {activeCase.startDate} · Verified receipt available in Payments tab.
          </p>
        </div>

        {/* Card 2: Total Move-Out Damages & Deductions by Landowner */}
        <div className="bg-white border border-rose-200/90 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
              <span>Move-Out Damages & Utility Dues</span>
              <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {activeCase.deductions.length} Item(s)
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-3xl font-extrabold text-rose-600 tabular-nums font-mono">
                -₹{totalDeductions.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-400">Assessed by Landowner</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Includes move-out appliance/furniture damages & sub-meter electricity.
          </p>
        </div>

        {/* Card 3: Net Deposit Remaining or Excess Legal Recovery Due */}
        <div
          className={`${
            excessRecoveryDue > 0 ? 'bg-rose-950' : 'bg-emerald-950'
          } text-white p-5 rounded-2xl shadow-xs flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
              <span>
                {excessRecoveryDue > 0
                  ? 'Additional Damage Recovery Payable'
                  : 'Deposit Remaining (Net Balance)'}
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded ${
                  excessRecoveryDue > 0
                    ? 'bg-rose-400 text-rose-950'
                    : 'bg-emerald-400 text-emerald-950'
                }`}
              >
                {excessRecoveryDue > 0 ? 'Balance Due to Owner' : 'Refundable Balance'}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <span
                className={`text-3xl font-extrabold tabular-nums font-mono ${
                  excessRecoveryDue > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                ₹
                {(excessRecoveryDue > 0
                  ? excessRecoveryDue
                  : depositRemaining
                ).toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Deposit: ₹{activeCase.securityDeposit.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-4">
            {excessRecoveryDue > 0
              ? `Move-out damages (₹${totalDeductions.toLocaleString('en-IN')}) exceed deposit by ₹${excessRecoveryDue.toLocaleString('en-IN')}.`
              : `Deposit (₹${activeCase.securityDeposit.toLocaleString('en-IN')}) minus Move-Out Damages (₹${totalDeductions.toLocaleString('en-IN')}).`}
          </p>
        </div>
      </div>

      {/* Itemized Move-Out Damages & Deductions Table (Controlled by Landowner) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Itemized Move-Out Apartment Damages & Deductions (Recorded by Landowner)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Below is every apartment damage or utility charge recorded at move-out by {activeCase.landlordName}.
            </p>
          </div>
          <button
            onClick={() => onSwitchTab('complaints')}
            className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span>Query Damage Bill in Dispute Box</span>
          </button>
        </div>

        {activeCase.deductions.length === 0 ? (
          <div className="p-6 text-center bg-emerald-50/50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-emerald-950">
              Zero Apartment Damages Recorded! Full ₹{activeCase.securityDeposit.toLocaleString('en-IN')} Deposit Remaining.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-400">
                  <th className="py-2.5 pr-4">Damaged Item & Invoice Ref</th>
                  <th className="py-2.5 px-4">Inspection Date & By</th>
                  <th className="py-2.5 px-4">Landowner Inspection Finding</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 pl-4 text-right">Assessed Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activeCase.deductions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 pr-4">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                        {item.billRefNo && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Ref: {item.billRefNo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-mono font-bold text-slate-800">
                        {item.dateRecorded || activeCase.moveOutDate}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.addedBy || activeCase.landlordName}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-md">
                      {item.landlordClaim}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                          item.status === 'agreed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'waived'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.status === 'agreed' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono font-bold text-rose-600 tabular-nums text-sm">
                      -₹{item.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs">
                  <td colSpan={4} className="py-3 px-4 text-slate-700">
                    Total Move-Out Damages & Dues Assessed Against ₹{activeCase.securityDeposit.toLocaleString('en-IN')} Security Deposit
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-rose-600 tabular-nums">
                    -₹{totalDeductions.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr className="bg-emerald-50/80 font-extrabold text-xs">
                  <td colSpan={4} className="py-3 px-4 text-emerald-950">
                    {excessRecoveryDue > 0
                      ? 'Excess Damage Balance Payable by Tenant to Landowner'
                      : 'Net Security Deposit Remaining (Refundable to Tenant)'}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono text-base tabular-nums ${
                      excessRecoveryDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    ₹
                    {(excessRecoveryDue > 0
                      ? excessRecoveryDue
                      : depositRemaining
                    ).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Sub-Meter Electricity Reading Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-900">
                Apartment Electricity Sub-Meter Reading (Recorded by Landowner)
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Check-In Reading: <strong className="font-mono">{activeCase.startMeterUnits}</strong> kWh · Move-Out Reading:{' '}
                <strong className="font-mono">{activeCase.endMeterUnits}</strong> kWh · Consumed:{' '}
                <strong className="font-mono">{meterUnitsUsed} units</strong> @ ₹{activeCase.meterRatePerUnit}/unit
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Calculated Meter Bill
            </span>
            <span className="text-sm font-mono font-extrabold text-slate-900 tabular-nums">
              ₹{meterCost.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Tenant Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onSwitchTab('receipt')}
          className="p-4 bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl transition-all text-left flex items-start justify-between cursor-pointer group shadow-xs"
        >
          <div>
            <Wallet className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="text-xs font-bold text-slate-900">Make Payment & Receipts</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {verifiedReceiptsCount} verified receipts · {pendingUtrCount} pending
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
        </button>

        <button
          onClick={() => onSwitchTab('complaints')}
          className="p-4 bg-white border border-slate-200/80 hover:border-emerald-300 rounded-xl transition-all text-left flex items-start justify-between cursor-pointer group shadow-xs"
        >
          <div>
            <MessageSquareWarning className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="text-xs font-bold text-slate-900">Dispute / Query Box</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {openComplaintsCount} active ticket(s) · Landowner replies
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
        </button>

        <button
          onClick={() => onSwitchTab('agreement')}
          className="p-4 bg-white border border-slate-200/80 hover:border-emerald-300 rounded-xl transition-all text-left flex items-start justify-between cursor-pointer group shadow-xs"
        >
          <div>
            <FileText className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="text-xs font-bold text-slate-900">Lease & Legal Documents</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Apartment agreement & damage notices
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
        </button>

        <button
          onClick={() => onSwitchTab('comparison')}
          className="p-4 bg-white border border-slate-200/80 hover:border-emerald-300 rounded-xl transition-all text-left flex items-start justify-between cursor-pointer group shadow-xs"
        >
          <div>
            <Layers className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="text-xs font-bold text-slate-900">Move-In / Out Photos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {activeCase.comparisons.length} apartment inspection areas
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
        </button>
      </div>

      {/* Modal to View Full Legal Document Served by Landowner */}
      {viewingLegalDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                  Legal Ref: {viewingLegalDoc.refNo}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {viewingLegalDoc.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Served on {viewingLegalDoc.generatedAt} · {viewingLegalDoc.advocateName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingLegalDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="font-mono text-xs leading-relaxed text-slate-900 bg-slate-50 p-5 rounded-xl border border-slate-200 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
              {viewingLegalDoc.documentText}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadLegalDoc(viewingLegalDoc)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Legal Notice (.TXT)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingLegalDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal to View Monthly Rent Email Notice */}
      {viewingRentEmail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {viewingRentEmail.noticeNo} · Sent to {viewingRentEmail.recipientEmail}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {viewingRentEmail.subject}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sent on {viewingRentEmail.sentAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingRentEmail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="font-mono text-xs leading-relaxed text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {viewingRentEmail.bodyText}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setViewingRentEmail(null);
                  onSwitchTab('receipt');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Pay Rent via QR</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingRentEmail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
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
