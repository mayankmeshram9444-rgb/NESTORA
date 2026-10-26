import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  Copy,
  Check,
  Send,
  Database,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { PgCase } from '../types';
import { draftLegalNotice } from '../services/legalService';

interface LegalPackTabProps {
  activeCase: PgCase;
  onExportBackend: () => Promise<any>;
}

export const LegalPackTab: React.FC<LegalPackTabProps> = ({
  activeCase,
  onExportBackend,
}) => {
  const [noticeText, setNoticeText] = useState<string>('');
  const [loadingAiNotice, setLoadingAiNotice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const fairDeductions = activeCase.deductions.reduce((sum, d) => sum + (d.status === 'agreed' ? d.fairAmount : 0), 0);
  const unresolvedBalance = Math.max(0, activeCase.securityDeposit - fairDeductions);

  // Generate initial standard legal demand notice
  useEffect(() => {
    generateDefaultNotice();
  }, [activeCase]);

  const generateDefaultNotice = () => {
    const text = `FORMAL DEMAND NOTICE / DISPUTE MEMORANDUM
UNDER SECTION 73 OF THE INDIAN CONTRACT ACT, 1872
AND SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019

Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

TO:
${activeCase.landlordName}
Management / Authorized Signatory
${activeCase.pgName}
${activeCase.propertyAddress}
Phone: ${activeCase.landlordPhone} | Email: ${activeCase.landlordEmail}

FROM:
${activeCase.tenantName}
Former Resident, ${activeCase.roomNo}
Contact: ${activeCase.tenantPhone} | Email: ${activeCase.tenantEmail}

SUBJECT: DEMAND FOR IMMEDIATE REFUND OF UNLAWFULLY WITHHELD SECURITY DEPOSIT (₹${unresolvedBalance.toLocaleString('en-IN')})

Sir/Madam,

Under instructions and in exercise of my statutory rights under the Model Tenancy framework, the Indian Contract Act, 1872, and the Consumer Protection Act, 2019, I hereby serve upon you this Formal Legal Demand Notice:

1. FACTUAL MATRIX & BACKGROUND:
   a. I was a bona fide paying guest / resident of ${activeCase.roomNo} at ${activeCase.pgName} from ${activeCase.startDate} until ${activeCase.moveOutDate}.
   b. At the commencement of my tenancy, an interest-free Security Deposit of ₹${activeCase.securityDeposit.toLocaleString('en-IN')} was paid in full to your account and duly acknowledged.
   c. Prior to vacating, I duly served the stipulated written notice on ${activeCase.noticeDate}, fully satisfying the mandatory notice period.
   d. On ${activeCase.moveOutDate}, vacant, peaceful, and undamaged possession of the room was surrendered with all original keys, fixtures, and appliances intact.

2. UNJUSTIFIED & ARBITRARY DEDUCTIONS:
   You have sought to unlawfully withhold a total sum of ₹${activeCase.deductions.reduce((s, d) => s + d.amount, 0).toLocaleString('en-IN')} on account of:
${activeCase.deductions.map((d) => `   * ${d.title}: ₹${d.amount.toLocaleString('en-IN')}
     - Landlord Claim: ${d.landlordClaim}
     - Legal Rebuttal: ${d.tenantRebuttal}`).join('\n\n')}

3. STATUTORY POSITION & TENANCY JURISPRUDENCE:
   - As per Section 15 of the Model Tenancy Act, standard paint wear and tear resulting from routine domestic occupation is solely the maintenance liability of the lessor. In the absence of tenant vandalism or physical defacement, levying full room repainting charges on an outgoing resident is illegal.
   - Any deduction from a deposit held in trust must be substantiated by actual third-party GST invoices showing genuine out-of-pocket expenditure. Arbitrary flat charges constitute an Unfair Trade Practice and "Deficiency in Service" under Section 2(11) of the Consumer Protection Act, 2019.

4. FINAL DEMAND FOR COMPLIANCE:
   You are hereby called upon to refund the legally undisputed balance of ₹${unresolvedBalance.toLocaleString('en-IN')} into my designated bank account within SEVEN (7) DAYS of receipt of this notice:
   - Account Holder: ${activeCase.tenantName}
   - Bank Contact: ${activeCase.tenantPhone}

5. CONSEQUENCES OF NON-COMPLIANCE:
   Please take notice that should you fail to remit the refund within 7 days, I shall immediately:
   a. File a formal Consumer Complaint before the District Consumer Disputes Redressal Commission (DCDRC) claiming the principal amount together with interest @ 18% p.a., ₹25,000 towards litigation costs, and ₹50,000 for mental distress.
   b. Lodge a police grievance under Section 405/406 of the Indian Penal Code (Criminal Breach of Trust) for dishonest misappropriation of funds held in trust.

Yours faithfully,

${activeCase.tenantName}
(Complainant / Former Resident)`;

    setNoticeText(text);
  };

  const handleAiDraftNotice = async () => {
    setLoadingAiNotice(true);
    try {
      const generated = await draftLegalNotice(activeCase, unresolvedBalance);
      if (generated) {
        setNoticeText(generated);
      }
    } catch (e) {
      console.error('AI draft notice failed:', e);
    } finally {
      setLoadingAiNotice(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportToDb = async () => {
    setExportStatus('Saving to SQLite vault...');
    try {
      const res = await onExportBackend();
      setExportStatus(`Saved to legal database! (Export ID: #${res?.exportId || '101'})`);
      setTimeout(() => setExportStatus(null), 4000);
    } catch (e: any) {
      setExportStatus(`Export error: ${e.message}`);
    }
  };

  const handleDownloadPack = () => {
    const pack = {
      case: activeCase,
      legalNotice: noticeText,
      exportTimestamp: new Date().toISOString(),
      platform: 'Nestora PG Evidence Vault',
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Legal_Case_Pack_${activeCase.tenancyId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Dispute Memorandum</span>
            <span aria-hidden="true">·</span>
            <span>Lawyer & Consumer Court Ready</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Lawyer-Ready Case Pack & Formal Notice
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Statutory legal demand notice ready for registered post, email, or submission to Consumer Forum.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportToDb}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sync to SQLite DB</span>
          </button>
          <button
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Dossier</span>
          </button>
          <button
            onClick={handleDownloadPack}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON Pack</span>
          </button>
        </div>
      </div>

      {exportStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportStatus}</span>
        </div>
      )}

      {/* Notice Action Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section 73 & Consumer Protection Formal Demand Notice
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Notice contains 7-day peremptory deadline and citations under Indian Tenancy Laws.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAiDraftNotice}
              disabled={loadingAiNotice}
              className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{loadingAiNotice ? 'Synthesizing...' : 'Re-Draft with AI'}</span>
            </button>
            <button
              onClick={handleCopy}
              className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Notice</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notice Preview */}
        <div className="font-mono text-xs leading-relaxed text-slate-800 bg-slate-50/70 p-6 rounded-xl border border-slate-200 whitespace-pre-wrap select-all">
          {noticeText}
        </div>
      </div>

      {/* Case Dossier Summary for Print & Court */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">
          Evidence Pack Index & Annexures (Court Ready)
        </h3>
        <div className="space-y-2 text-xs divide-y divide-slate-100">
          <div className="pt-2 first:pt-0 flex justify-between items-center">
            <span className="font-medium text-slate-800">Annexure A: Tenancy & License Agreement</span>
            <span className="text-slate-500 font-mono">
              {activeCase.evidence.find((e) => e.category === 'agreement')?.title || 'Attached in Vault'}
            </span>
          </div>
          <div className="pt-2 flex justify-between items-center">
            <span className="font-medium text-slate-800">Annexure B: Proof of Security Deposit Consideration (₹{activeCase.securityDeposit})</span>
            <span className="text-slate-500 font-mono">
              {activeCase.evidence.find((e) => e.category === 'payment')?.title || 'Bank UTR Stamped'}
            </span>
          </div>
          <div className="pt-2 flex justify-between items-center">
            <span className="font-medium text-slate-800">Annexure C: Comparative Move-In / Move-Out Inspection Table</span>
            <span className="text-slate-500 font-mono">
              {activeCase.comparisons.length} Inspected Areas Verified
            </span>
          </div>
          <div className="pt-2 flex justify-between items-center">
            <span className="font-medium text-slate-800">Annexure D: 30-Day Notice Service Proof</span>
            <span className="text-slate-500 font-mono">
              Served {activeCase.noticeDate} via Registered Log
            </span>
          </div>
          <div className="pt-2 flex justify-between items-center">
            <span className="font-medium text-slate-800">Annexure E: Itemized Financial Rebuttal Ledger</span>
            <span className="text-emerald-700 font-semibold font-mono">
              ₹{unresolvedBalance.toLocaleString('en-IN')} Due
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
