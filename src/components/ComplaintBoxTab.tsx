import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { PgCase, ComplaintItem } from '../types';
import { buildMailtoLink } from '../services/legalService';

interface ComplaintBoxTabProps {
  activeCase: PgCase;
  onSubmitComplaint: (
    complaint: Omit<ComplaintItem, 'id' | 'ticketNo' | 'status' | 'createdAt'>
  ) => void;
  ownerEmail?: string;
}

export const ComplaintBoxTab: React.FC<ComplaintBoxTabProps> = ({
  activeCase,
  onSubmitComplaint,
  ownerEmail,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ComplaintItem['category']>(
    'Deposit / Billing Query'
  );
  const [priority, setPriority] = useState<ComplaintItem['priority']>('Normal');
  const [description, setDescription] = useState('');
  const [submittedBanner, setSubmittedBanner] = useState<string | null>(null);

  const targetOwnerEmail =
    ownerEmail ||
    activeCase.landlordEmail ||
    'vikram.owner@residences.in';

  const complaints = activeCase.complaints || [];
  const openCount = complaints.filter((c) => c.status !== 'Resolved').length;
  const resolvedCount = complaints.filter(
    (c) => c.status === 'Resolved'
  ).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    onSubmitComplaint({
      title: title.trim(),
      category,
      priority,
      description: description.trim(),
      emailedToOwner: targetOwnerEmail,
    });

    setTitle('');
    setDescription('');
    setSubmittedBanner(
      `Complaint submitted & automatically emailed to Landowner (${targetOwnerEmail}).`
    );
    setTimeout(() => setSubmittedBanner(null), 5000);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
            <MessageSquareWarning className="w-4 h-4" />
            <span>AUTOMATED COMPLAINT & DISPUTE DESK</span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Raise Complaint ({activeCase.roomCode})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Auto-sends email notification to Landowner{' '}
              <strong className="text-slate-800">
                {activeCase.landlordName}
              </strong>{' '}
              ({targetOwnerEmail})
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase text-amber-700">
              Open
            </p>
            <p className="text-base font-extrabold text-amber-900 font-mono">
              {openCount}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase text-emerald-700">
              Resolved
            </p>
            <p className="text-base font-extrabold text-emerald-900 font-mono">
              {resolvedCount}
            </p>
          </div>
        </div>
      </div>

      {submittedBanner && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{submittedBanner}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Submit New Complaint Form */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs h-fit space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              New Complaint to Landowner
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Recipient Email: {targetOwnerEmail}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ComplaintItem['category'])
                }
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600"
              >
                <option value="Deposit / Billing Query">
                  Deposit Deduction / Rent Billing Query
                </option>
                <option value="Electricity / Geyser / AC">
                  Electricity / Sub-Meter / Geyser / AC
                </option>
                <option value="Wi-Fi / Internet">Wi-Fi / Internet</option>
                <option value="Plumbing / Water">Plumbing / Water</option>
                <option value="Room Cleaning">Apartment Cleaning</option>
                <option value="Other">Other Apartment Issue</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('Normal')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    priority === 'Normal'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('Urgent')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    priority === 'Urgent'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Review damage deduction / AC repair"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Details *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe your complaint..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit & Auto-Email Landowner</span>
            </button>
          </form>
        </div>

        {/* Right: Complaint History & Automated Email Status */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Submitted Complaints & Email Log
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {complaints.length} Total
            </span>
          </div>

          {complaints.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <MessageSquareWarning className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">
                No complaints raised yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((item) => {
                const mailtoHref = buildMailtoLink(
                  item.emailedToOwner || targetOwnerEmail,
                  `[Complaint ${item.ticketNo}] ${activeCase.roomCode} (${activeCase.tenantName}) — ${item.title}`,
                  `Ticket: ${item.ticketNo}\nUnit: ${activeCase.roomNo} (${activeCase.roomCode})\nCategory: ${item.category}\nPriority: ${item.priority}\n\nDetails:\n${item.description}`
                );

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {item.ticketNo}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                        {item.priority === 'Urgent' && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            URGENT
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                          item.status === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'In Progress'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {item.status === 'Resolved' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : item.status === 'In Progress' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>{item.status}</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {item.description}
                      </p>
                    </div>

                    {/* Automated Email Delivery Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                        <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Auto-emailed to{' '}
                          <strong className="font-mono">
                            {item.emailedToOwner || targetOwnerEmail}
                          </strong>{' '}
                          · {item.createdAt}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.emailPreviewUrl && (
                          <a
                            href={item.emailPreviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-indigo-700 hover:underline inline-flex items-center gap-1"
                          >
                            <span>View SMTP Receipt</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <a
                          href={mailtoHref}
                          className="text-[11px] font-bold text-slate-700 hover:text-emerald-700 bg-white border border-slate-200 px-2 py-0.5 rounded inline-flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Send via Mail App</span>
                        </a>
                      </div>
                    </div>

                    {/* Landowner Response Box */}
                    {item.ownerReply ? (
                      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 mb-1">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>
                              Landowner Reply ({activeCase.landlordName})
                            </span>
                          </span>
                          {item.resolvedAt && (
                            <span className="font-mono text-[10px] text-emerald-700">
                              {item.resolvedAt}
                            </span>
                          )}
                        </div>
                        <p className="text-emerald-950">{item.ownerReply}</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 text-[11px] text-slate-500 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Awaiting reply from {activeCase.landlordName}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
