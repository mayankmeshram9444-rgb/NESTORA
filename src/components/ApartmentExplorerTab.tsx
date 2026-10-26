import React, { useState } from 'react';
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  IndianRupee,
  MapPin,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Send,
  Home,
  Check,
  X,
  FileText,
  Sparkles,
} from 'lucide-react';
import { PgCase, TenantApplication } from '../types';

interface ApartmentExplorerTabProps {
  cases: PgCase[];
  onSubmitApplication: (
    caseId: string,
    application: Omit<TenantApplication, 'id' | 'appliedAt' | 'status'>
  ) => void;
  currentRoomCode?: string;
}

export const ApartmentExplorerTab: React.FC<ApartmentExplorerTabProps> = ({
  cases,
  onSubmitApplication,
  currentRoomCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  
  // Application modal state
  const [applyingUnit, setApplyingUnit] = useState<PgCase | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [moveInDate, setMoveInDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [stayDuration, setStayDuration] = useState('11 Months Lease');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Extract distinct landowners
  const landowners = Array.from(
    new Set(cases.map((c) => c.landlordName).filter(Boolean))
  );

  const sharingTypes = Array.from(
    new Set(cases.map((c) => c.sharingType).filter(Boolean))
  );

  const filteredCases = cases.filter((c) => {
    // Search query
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      c.pgName.toLowerCase().includes(query) ||
      c.roomNo.toLowerCase().includes(query) ||
      c.roomCode.toLowerCase().includes(query) ||
      c.propertyAddress.toLowerCase().includes(query) ||
      c.landlordName.toLowerCase().includes(query);

    // Owner filter
    const matchesOwner =
      selectedOwnerFilter === 'all' || c.landlordName === selectedOwnerFilter;

    // Type filter
    const matchesType =
      selectedTypeFilter === 'all' || c.sharingType === selectedTypeFilter;

    // Status filter
    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'vacant' &&
        c.occupancyStatus !== 'approved_occupied') ||
      (selectedStatusFilter === 'occupied' &&
        c.occupancyStatus === 'approved_occupied');

    return matchesSearch && matchesOwner && matchesType && matchesStatus;
  });

  const handleOpenApplyModal = (unit: PgCase) => {
    setApplyingUnit(unit);
    setApplicantName('');
    setApplicantEmail('');
    setApplicantPhone('');
    setNotes(`Applying for ${unit.roomNo} (${unit.roomCode}) at ${unit.pgName}`);
  };

  const handleSubmitApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingUnit || !applicantName.trim() || !applicantEmail.trim()) return;

    onSubmitApplication(applyingUnit.id, {
      applicantName: applicantName.trim(),
      applicantEmail: applicantEmail.trim(),
      applicantPhone: applicantPhone.trim(),
      applicantKycId: 'Aadhaar / ID Submitted for Verification',
      moveInDate,
      stayDurationLabel: stayDuration,
      notes: notes.trim(),
    });

    setSuccessMsg(
      `Application successfully sent to ${applyingUnit.landlordName} for unit ${applyingUnit.roomCode}!`
    );
    setApplyingUnit(null);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Landowner Apartment Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Browse All Apartments Across All Landowners
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Explore apartments from various verified property managers. View pricing, security deposit terms, location, and apply directly to any unit.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shrink-0 text-center sm:text-right">
            <p className="text-xs font-medium text-slate-300">Total Listings</p>
            <p className="text-3xl font-black font-mono text-emerald-400">
              {cases.length}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              across {landowners.length} distinct landowners
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-900 border border-emerald-700 text-white px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-md animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by apartment name, area, landowner name, or room code..."
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-emerald-600 focus:bg-white transition-all"
            />
          </div>

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-bold">Filters:</span>
          </div>

          {/* Landowner Filter */}
          <select
            value={selectedOwnerFilter}
            onChange={(e) => setSelectedOwnerFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-emerald-600 cursor-pointer"
          >
            <option value="all">All Landowners ({landowners.length})</option>
            {landowners.map((owner) => (
              <option key={owner} value={owner}>
                Owner: {owner}
              </option>
            ))}
          </select>

          {/* Configuration Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-emerald-600 cursor-pointer"
          >
            <option value="all">All Apartment Types</option>
            {sharingTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-emerald-600 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="vacant">Vacant & Accepting Applications</option>
            <option value="occupied">Currently Occupied</option>
          </select>
        </div>
      </div>

      {/* Apartment Cards Grid */}
      {filteredCases.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No apartment units match your filters
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, selecting "All Landowners", or clearing status filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedOwnerFilter('all');
              setSelectedTypeFilter('all');
              setSelectedStatusFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-slate-800"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((unit) => {
            const isCurrentUnit = unit.roomCode === currentRoomCode;
            const isVacant = unit.occupancyStatus !== 'approved_occupied';
            const pendingAppsCount = (unit.tenantApplications || []).filter(
              (a) => a.status === 'pending'
            ).length;

            return (
              <div
                key={unit.id}
                className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isCurrentUnit
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Top */}
                <div className="p-5 space-y-3.5">
                  {/* Status & Code Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                      {unit.roomCode}
                    </span>

                    {isCurrentUnit ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Your Current Unit</span>
                      </span>
                    ) : isVacant ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Vacant · Ready</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                        Occupied
                      </span>
                    )}
                  </div>

                  {/* Apartment Details */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                      {unit.pgName}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                      {unit.roomNo} · {unit.sharingType}
                    </p>
                    {unit.propertyAddress && (
                      <p className="text-[11px] text-slate-500 flex items-start gap-1 mt-1.5 line-clamp-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{unit.propertyAddress}</span>
                      </p>
                    )}
                  </div>

                  {/* Landowner Tag */}
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Landowner:</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {unit.landlordName || 'Verified Property Manager'}
                      </span>
                    </div>
                    {unit.landlordEmail && (
                      <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5 text-slate-400" />
                        <span>{unit.landlordEmail}</span>
                      </p>
                    )}
                  </div>

                  {/* Price & Deposit Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Monthly Rent
                      </span>
                      <span className="text-base font-extrabold font-mono text-slate-900">
                        ₹{unit.monthlyRent.toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-slate-500">/mo</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Security Deposit
                      </span>
                      <span className="text-base font-extrabold font-mono text-emerald-700">
                        ₹{unit.securityDeposit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Terms Highlights */}
                  {unit.agreementTerms && unit.agreementTerms.length > 0 && (
                    <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                      <p className="font-semibold text-slate-700 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Key Lease Terms:</span>
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5 line-clamp-2">
                        {unit.agreementTerms.slice(0, 2).map((term, i) => (
                          <li key={i} className="truncate">
                            {term}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Card Action */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 rounded-b-3xl">
                  {isCurrentUnit ? (
                    <div className="text-center py-1 text-xs font-bold text-emerald-800">
                      Currently Assigned to You
                    </div>
                  ) : isVacant ? (
                    <button
                      type="button"
                      onClick={() => handleOpenApplyModal(unit)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-emerald-600 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Apply to Rent ({unit.roomCode})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenApplyModal(unit)}
                      className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Join Waiting List / Apply Next</span>
                    </button>
                  )}

                  {pendingAppsCount > 0 && isVacant && (
                    <p className="text-[10px] text-center text-amber-700 font-semibold mt-2">
                      {pendingAppsCount} applicant{pendingAppsCount > 1 ? 's' : ''} currently under landowner review
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Application Drawer / Modal */}
      {applyingUnit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-scale-up space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  <Send className="w-3.5 h-3.5" />
                  <span>Tenant Rental Application</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">
                  Apply for {applyingUnit.roomNo}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {applyingUnit.pgName} · Landowner: {applyingUnit.landlordName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setApplyingUnit(null)}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price Preview */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Monthly Rent</span>
                <span className="font-extrabold font-mono text-emerald-900 text-sm">
                  ₹{applyingUnit.monthlyRent.toLocaleString('en-IN')}/month
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Security Deposit</span>
                <span className="font-extrabold font-mono text-emerald-900 text-sm">
                  ₹{applyingUnit.securityDeposit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Application Form */}
            <form onSubmit={handleSubmitApply} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Your Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mobile Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Desired Move-in Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      value={moveInDate}
                      onChange={(e) => setMoveInDate(e.target.value)}
                      className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Stay Duration / Lease
                  </label>
                  <select
                    value={stayDuration}
                    onChange={(e) => setStayDuration(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-emerald-600 cursor-pointer"
                  >
                    <option value="6 Months Lease">6 Months Lease</option>
                    <option value="11 Months Lease">11 Months Lease</option>
                    <option value="12+ Months Long-term">12+ Months Long-term</option>
                    <option value="Short Stay (1-3 Months)">Short Stay (1-3 Months)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Introduction / Notes for {applyingUnit.landlordName}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share a brief message about your profession, company, or any questions for the owner..."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-emerald-600 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Application to {applyingUnit.landlordName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setApplyingUnit(null)}
                  className="px-4 py-3 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
