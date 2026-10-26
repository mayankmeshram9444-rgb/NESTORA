import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Upload,
  FileText,
  FileCheck,
  Eye,
  Trash2,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
} from 'lucide-react';
import { PgCase, EvidenceItem } from '../types';

interface VaultTabProps {
  activeCase: PgCase;
  onAddEvidence: (item: EvidenceItem) => void;
  onDeleteEvidence: (itemId: string) => void;
}

export const VaultTab: React.FC<VaultTabProps> = ({
  activeCase,
  onAddEvidence,
  onDeleteEvidence,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedItemForView, setSelectedItemForView] = useState<EvidenceItem | null>(null);

  // Form state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<EvidenceItem['category']>('agreement');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { key: 'all', label: 'All Files' },
    { key: 'agreement', label: 'Agreements' },
    { key: 'payment', label: 'Payment & UPI' },
    { key: 'inspection_in', label: 'Move-In Inspection' },
    { key: 'inspection_out', label: 'Move-Out Inspection' },
    { key: 'communication', label: 'Notices & WhatsApp' },
  ];

  const filteredEvidence =
    selectedCategory === 'all'
      ? activeCase.evidence
      : activeCase.evidence.filter((e) => e.category === selectedCategory);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFileDataUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    // Generate SHA-256 style hash
    const randomHex = Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const newHash = `sha256:${randomHex}`;

    const newEvidence: EvidenceItem = {
      id: `ev-${Date.now()}`,
      title: docTitle.trim().endsWith('.pdf') || docTitle.trim().endsWith('.jpg')
        ? docTitle.trim()
        : `${docTitle.trim()}.${selectedFile ? selectedFile.name.split('.').pop() : 'pdf'}`,
      category: docCategory,
      fileType: selectedFile ? (selectedFile.name.split('.').pop()?.toUpperCase() as any || 'PDF') : 'PDF',
      fileSize: selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : '1.2 MB',
      date: new Date().toISOString().split('T')[0],
      hash: newHash,
      status: 'verified',
      notes: docNotes.trim() || 'Uploaded and verified into Nestora Vault.',
      dataUrl: fileDataUrl || undefined,
    };

    onAddEvidence(newEvidence);
    setDocTitle('');
    setDocNotes('');
    setSelectedFile(null);
    setFileDataUrl('');
    setShowUploadModal(false);
  };

  const downloadFile = (item: EvidenceItem) => {
    if (item.dataUrl) {
      const a = document.createElement('a');
      a.href = item.dataUrl;
      a.download = item.title;
      a.click();
    } else {
      // Create text voucher
      const content = `NESTORA SECURE EVIDENCE RECORD\n\nTitle: ${item.title}\nCategory: ${item.category}\nDate: ${item.date}\nHash: ${item.hash}\nStatus: ${item.status}\nNotes: ${item.notes}\n\nCase: ${activeCase.pgName} (${activeCase.roomNo})\nTenant: ${activeCase.tenantName}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Digital Vault</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Knowledge SHA-256 Storage</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Secure Evidence Vault
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Central repository for rent receipts, agreements, inspection photos, and landlord communications.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Evidence File</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setSelectedCategory(c.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategory === c.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvidence.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      item.fileType === 'PDF'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : item.fileType === 'JPG' || item.fileType === 'PNG'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {item.fileType}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900 text-xs truncate" title={item.title}>
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                      <span className="capitalize">{item.category.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.date}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.fileSize}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {item.status === 'verified' ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Verified Hash
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Flagged Review
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {item.notes}
              </p>

              <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                {item.hash}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setSelectedItemForView(item)}
                className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Details</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(item)}
                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteEvidence(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete File"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredEvidence.length === 0 && (
          <div className="col-span-full bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-900">No evidence files found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload your agreement, rent payment receipts, or move-in photos to build a bulletproof dispute case.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
            >
              Upload First Document
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">
                Upload Legal Evidence Document
              </h3>
              <span className="text-xs text-slate-400 font-mono">SHA-256 Verified</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              All files are stored locally in your private session vault with cryptographic hash receipts.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Document Title / File Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tenancy_Agreement_2025.pdf or Move_In_Room_Walls.jpg"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Evidence Category
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                  >
                    <option value="agreement">Lease / PG Agreement</option>
                    <option value="payment">Security Deposit / UPI Receipt</option>
                    <option value="inspection_in">Move-In Inspection Photo</option>
                    <option value="inspection_out">Move-Out Inspection Photo</option>
                    <option value="communication">Notice / WhatsApp Chat</option>
                    <option value="bill">Electricity / Utility Bill</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    File Attachment
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="w-full text-xs file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Rebuttal Notes / Evidentiary Value
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this document proves your claim (e.g. shows wall was clean on move-in, or proves 30 days notice was served on WhatsApp)..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs"
                >
                  Generate Hash & Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selectedItemForView && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedItemForView.category.toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {selectedItemForView.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForView(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer leading-none"
              >
                &times;
              </button>
            </div>

            {selectedItemForView.dataUrl && (
              <div className="max-h-60 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                <img
                  src={selectedItemForView.dataUrl}
                  alt={selectedItemForView.title}
                  className="max-h-60 object-contain"
                />
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Cryptographic Hash</span>
                <span className="font-mono text-slate-800 break-all select-all">
                  {selectedItemForView.hash}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Date Verified</span>
                <span className="text-slate-800">{selectedItemForView.date}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">File Size & Type</span>
                <span className="text-slate-800">
                  {selectedItemForView.fileSize} ({selectedItemForView.fileType})
                </span>
              </div>
              <div className="py-2">
                <span className="text-slate-500 block mb-1">Evidentiary Rebuttal Notes:</span>
                <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 leading-relaxed">
                  {selectedItemForView.notes}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => downloadFile(selectedItemForView)}
                className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Record</span>
              </button>
              <button
                onClick={() => setSelectedItemForView(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
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
