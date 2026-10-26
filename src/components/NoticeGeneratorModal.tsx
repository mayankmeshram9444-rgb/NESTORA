import React, { useState } from 'react';
import { X, Copy, Check, Calendar, MessageSquare } from 'lucide-react';
import { PgCase } from '../types';

interface NoticeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: PgCase;
}

export const NoticeGeneratorModal: React.FC<NoticeGeneratorModalProps> = ({
  isOpen,
  onClose,
  activeCase,
}) => {
  const [vacatingDate, setVacatingDate] = useState(
    activeCase.moveOutDate || new Date().toISOString().split('T')[0]
  );
  const [refundBankDetails, setRefundBankDetails] = useState(
    activeCase.tenantName
      ? `UPI ID: ${activeCase.tenantName.toLowerCase().replace(/[^a-z0-9]/g, '')}@okaxis / Bank A/C`
      : 'UPI ID / Bank Transfer'
  );
  const [inspectionSlot, setInspectionSlot] = useState(
    '11:00 AM on move-out day'
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const noticeDraft = `OFFICIAL APARTMENT MOVE-OUT & JOINT INSPECTION INTIMATION

Date: ${new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}

To:
${activeCase.landlordName}
Landowner, ${activeCase.pgName}

Dear Sir/Madam,

Please accept this message as formal intimation regarding my move-out and key handover for ${activeCase.roomNo} (${activeCase.roomCode}) at ${activeCase.pgName}.

1. APARTMENT STAY & HANDOVER SCHEDULE:
   - Stay Period: ${activeCase.startDate} to ${vacatingDate} (${activeCase.stayDurationLabel || 'Short/Monthly Stay'})
   - Final Move-Out & Key Handover Date: ${vacatingDate}
   - Joint Appliance, Furniture & Meter Inspection Slot: ${inspectionSlot}

2. SECURITY DEPOSIT SETTLEMENT DETAILS:
   As per our apartment agreement, a Security Deposit of ₹${activeCase.securityDeposit.toLocaleString('en-IN')} is held by you.
   Upon completion of the joint move-out inspection and electricity sub-meter reading, kindly process the settlement to:
   ${refundBankDetails}

Warm regards,
${activeCase.tenantName}
Occupant, ${activeCase.roomNo}
Mobile: ${activeCase.tenantPhone}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanPhone = activeCase.landlordPhone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(noticeDraft);
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              Apartment Move-Out & Joint Inspection Notice
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Generate a formal apartment move-out & joint inspection notice for your Landowner ({activeCase.landlordName}).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Move-Out & Key Handover Date
            </label>
            <input
              type="date"
              value={vacatingDate}
              onChange={(e) => setVacatingDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Joint Inspection Slot
            </label>
            <input
              type="text"
              value={inspectionSlot}
              onChange={(e) => setInspectionSlot(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Bank Details / UPI ID for Deposit Settlement
          </label>
          <input
            type="text"
            value={refundBankDetails}
            onChange={(e) => setRefundBankDetails(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-900">
              Generated Notice Preview
            </label>
            <span className="text-[11px] text-slate-400">Ready to send</span>
          </div>
          <div className="font-mono text-xs leading-relaxed text-slate-800 bg-slate-50/70 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap select-all max-h-56 overflow-y-auto">
            {noticeDraft}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Share via WhatsApp</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Notice Text</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
