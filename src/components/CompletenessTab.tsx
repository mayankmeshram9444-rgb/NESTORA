import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Download,
  ShieldCheck,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PgCase } from '../types';
import { TabKey } from './Sidebar';

interface CompletenessTabProps {
  activeCase: PgCase;
  onSwitchTab: (tab: TabKey) => void;
}

export const CompletenessTab: React.FC<CompletenessTabProps> = ({
  activeCase,
  onSwitchTab,
}) => {
  const checklist = [
    {
      id: 'c1',
      title: 'Signed PG / Tenancy Agreement',
      description: 'Document outlining lock-in terms, 30-day notice clause, and refundable security deposit.',
      category: 'agreement',
      required: true,
      hasFile: activeCase.evidence.some((e) => e.category === 'agreement'),
      weight: 25,
    },
    {
      id: 'c2',
      title: 'Security Deposit Payment Confirmation (UPI/Bank)',
      description: 'Bank account debit confirmation or UPI UTR reference voucher proving funds transferred.',
      category: 'payment',
      required: true,
      hasFile: activeCase.evidence.some((e) => e.category === 'payment'),
      weight: 25,
    },
    {
      id: 'c3',
      title: 'Move-In Room Condition Inspection Photos',
      description: 'Photographic proof of original room state on day of occupancy (walls, fittings, meter).',
      category: 'inspection_in',
      required: true,
      hasFile: activeCase.evidence.some((e) => e.category === 'inspection_in'),
      weight: 20,
    },
    {
      id: 'c4',
      title: 'Proof of 30-Day Written Notice Served',
      description: 'Timestamped WhatsApp chat, email delivery receipt, or written notice acknowledgment.',
      category: 'notice',
      required: true,
      hasFile: activeCase.evidence.some((e) => e.category === 'communication' || e.category === 'notice'),
      weight: 15,
    },
    {
      id: 'c5',
      title: 'Move-Out Handover Inspection Report & Video',
      description: 'Evidence proving peaceful surrender of possession and clean room state on exit.',
      category: 'inspection_out',
      required: true,
      hasFile: activeCase.evidence.some((e) => e.category === 'inspection_out'),
      weight: 15,
    },
  ];

  const totalScore = checklist.reduce((sum, item) => sum + (item.hasFile ? item.weight : 0), 0);

  const handleDownloadCertificate = () => {
    const certText = `======================================================
NESTORA LEGAL EVIDENTIARY READINESS CERTIFICATE
======================================================
Case Reference: ${activeCase.tenancyId}
Property: ${activeCase.pgName} (${activeCase.roomNo})
Tenant: ${activeCase.tenantName} (${activeCase.tenantPhone})
Landlord / Operator: ${activeCase.landlordName}

OVERALL EVIDENTIARY SCORE: ${totalScore}% / 100%
LEGAL READINESS TIER: ${totalScore >= 80 ? 'HIGH PROBATIVE VALUE' : 'PARTIAL DOCUMENTATION'}
DATE AUDITED: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

AUDITED PILLARS:
${checklist.map((c) => `[${c.hasFile ? 'VERIFIED' : 'PENDING'}] ${c.title} (Weight: ${c.weight}%)`).join('\n')}

VERIFIED EVIDENCE ASSETS (${activeCase.evidence.length} files):
${activeCase.evidence.map((e) => `* ${e.title} [${e.fileType}] · Hash: ${e.hash}`).join('\n')}

DISPUTED DEDUCTION SUMMARY:
* Deposit Paid: ₹${activeCase.securityDeposit.toLocaleString('en-IN')}
* Arbitrary Deductions Rebutted: ₹${activeCase.deductions.reduce((s, d) => s + (d.status === 'disputed' ? d.amount : 0), 0).toLocaleString('en-IN')}
* Net Demanded Refund: ₹${Math.max(0, activeCase.securityDeposit - activeCase.deductions.reduce((s, d) => s + (d.status === 'agreed' ? d.fairAmount : 0), 0)).toLocaleString('en-IN')}

CERTIFICATION AUTHORITY:
Nestora Evidentiary Audit Subsystem
Compliance: Model Tenancy Act (MTA 2021) & Consumer Protection Act 2019
======================================================`;

    const blob = new Blob([certText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Evidentiary_Readiness_Certificate_${activeCase.tenancyId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Audit Subsystem</span>
            <span aria-hidden="true">·</span>
            <span>Litigation Readiness Index</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Evidence Completeness & Dispute Readiness
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Systematic verification of evidentiary assets required by Consumer Commissions and Rent Authorities.
          </p>
        </div>

        <button
          onClick={handleDownloadCertificate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Readiness Certificate</span>
        </button>
      </div>

      {/* Score overview card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Case Readiness Index
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalScore}%
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {totalScore >= 80 ? 'High Probative Strength' : 'Action Required'}
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-md">
            {totalScore >= 80
              ? 'Your case meets the evidentiary threshold required for filing a formal Consumer Grievance (DCDRC) or issuing a Section 73 demand notice.'
              : 'Add missing move-in photos or notice records in the vault to eliminate landlord denial defenses.'}
          </p>
        </div>

        <div className="w-full md:w-64 space-y-2">
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${totalScore}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Minimum Viable: 60%</span>
            <span>Target: 100%</span>
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">
          Core Evidentiary Verification Pillars
        </h3>

        <div className="space-y-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                item.hasFile
                  ? 'bg-slate-50/70 border-slate-200'
                  : 'bg-amber-50/40 border-amber-200/80'
              }`}
            >
              <div className="flex items-start gap-3">
                {item.hasFile ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      +{item.weight}% Weight
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {item.hasFile ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    Verified
                  </span>
                ) : (
                  <button
                    onClick={() => onSwitchTab('vault')}
                    className="text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span>Upload Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
