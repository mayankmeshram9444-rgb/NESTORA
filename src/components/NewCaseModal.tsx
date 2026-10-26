import React, { useState, useEffect } from 'react';
import { X, Building2, Upload, Trash2, UserCheck } from 'lucide-react';
import { PgCase, SharingType, StayType, LandownerProfile } from '../types';
import { buildDefaultQrSvg } from '../data/mockData';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCase: (newCase: PgCase) => void;
  landownerProfile?: LandownerProfile;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  isOpen,
  onClose,
  onCreateCase,
  landownerProfile,
}) => {
  const [pgName, setPgName] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [sharingType, setSharingType] =
    useState<SharingType>('2BHK Apartment');
  const [stayType, setStayType] = useState<StayType>('Monthly Lease (Months)');
  const [stayDurationLabel, setStayDurationLabel] = useState('11 Months Lease');
  const [address, setAddress] = useState(
    landownerProfile?.residentialAddress || ''
  );
  const [landlordName, setLandlordName] = useState(
    landownerProfile?.fullName || ''
  );
  const [landlordPhone, setLandlordPhone] = useState(
    landownerProfile?.mobile || ''
  );
  const [landlordEmail, setLandlordEmail] = useState(
    landownerProfile?.email || ''
  );
  const [ownerUpiId, setOwnerUpiId] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [meterRate, setMeterRate] = useState<number>(10);
  const [noticePeriodDays, setNoticePeriodDays] = useState<number>(30);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Allow creating either a Vacant unit OR an already Occupied unit with tenant details
  const [initialStatus, setInitialStatus] = useState<
    'available' | 'approved_occupied'
  >('approved_occupied');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');

  const [moveInNotes, setMoveInNotes] = useState('');
  const [moveInImages, setMoveInImages] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && landownerProfile) {
      if (landownerProfile.fullName) setLandlordName(landownerProfile.fullName);
      if (landownerProfile.email) setLandlordEmail(landownerProfile.email);
      if (landownerProfile.mobile) setLandlordPhone(landownerProfile.mobile);
      if (landownerProfile.residentialAddress) {
        setAddress(landownerProfile.residentialAddress);
      }
    }
  }, [isOpen, landownerProfile]);

  if (!isOpen) return null;

  const handleUploadMoveInPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMoveInImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pgName.trim() || !roomNo.trim()) return;

    const caseId = `case-${Date.now()}`;
    const tenancyId = `APT-${new Date().getFullYear()}-${Math.floor(
      100 + Math.random() * 900
    )}`;
    const cleanCode =
      roomCode.trim().toUpperCase() ||
      `APT-${Math.floor(100 + Math.random() * 899)}`;

    const isOccupied =
      initialStatus === 'approved_occupied' && tenantName.trim().length > 0;
    const cleanOwnerName =
      landlordName.trim() || landownerProfile?.fullName || 'Property Owner';
    const cleanUpi = ownerUpiId.trim();

    const newCase: PgCase = {
      id: caseId,
      tenancyId,
      roomCode: cleanCode,
      pgName: pgName.trim(),
      roomNo: roomNo.trim(),
      sharingType,
      stayType,
      stayDurationLabel:
        stayDurationLabel.trim() ||
        (stayType === 'Short-Stay (Days)'
          ? 'Short-Stay'
          : '11 Months Lease'),
      occupancyStatus: isOccupied ? 'approved_occupied' : 'available',
      tenantApplications: [],
      tenantKycId: isOccupied ? 'KYC Verified' : 'Pending Application',
      propertyAddress: address.trim(),
      tenantName: isOccupied ? tenantName.trim() : 'Vacant — Open for Application',
      tenantPhone: isOccupied ? tenantPhone.trim() : '',
      tenantEmail: isOccupied ? tenantEmail.trim() : '',
      landlordName: cleanOwnerName,
      landlordPhone: landlordPhone.trim() || landownerProfile?.mobile || '',
      landlordEmail: landlordEmail.trim() || landownerProfile?.email || '',
      ownerUpiId: cleanUpi,
      ownerQrCodeUrl: cleanUpi
        ? buildDefaultQrSvg(cleanUpi, `${cleanOwnerName} (${pgName.trim()})`)
        : '',
      lockInMonths: 1,
      noticePeriodDays: noticePeriodDays || 30,
      agreementTerms: [
        `Monthly rent of ₹${monthlyRent || 0} is payable on or before the 5th of every month.`,
        `Refundable Security Deposit of ₹${deposit || 0} is held by the Landowner against verified physical damages or unpaid utility bills.`,
        `Electricity is billed per sub-meter reading at ₹${meterRate || 10}/unit.`,
        `A ${noticePeriodDays || 30}-day notice period applies prior to vacating.`,
      ],
      startDate: startDate || new Date().toISOString().split('T')[0],
      noticeDate: startDate || new Date().toISOString().split('T')[0],
      moveOutDate: 'Ongoing',
      monthlyRent: monthlyRent || 0,
      securityDeposit: deposit || 0,
      rentStatus: 'Pending',
      status: 'Active',
      startMeterUnits: 0,
      endMeterUnits: 0,
      meterRatePerUnit: meterRate || 10,
      noticeShortfallDays: 0,
      deductions: [],
      legalDocuments: [],
      rentEmailNotices: [],
      payments: [],
      complaints: [],
      evidence: [],
      comparisons:
        moveInImages.length > 0
          ? [
              {
                id: `comp-${Date.now()}-1`,
                area: 'Move-In Baseline Inspection',
                moveInDate: startDate || new Date().toISOString().split('T')[0],
                moveOutDate: 'Ongoing',
                moveInNotes:
                  moveInNotes.trim() || 'Move-in condition documented.',
                moveOutNotes: 'Awaiting move-out inspection.',
                category: 'Undamaged / Clean',
                verdict: 'Move-in baseline condition documented.',
                disputed: false,
                moveInImage: moveInImages[0],
                moveInImages,
                moveOutImages: [],
              },
            ]
          : [],
      auditLogs: [],
    };

    onCreateCase(newCase);
    // Reset form
    setRoomNo('');
    setRoomCode('');
    setTenantName('');
    setTenantEmail('');
    setTenantPhone('');
    setMoveInNotes('');
    setMoveInImages([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Add New Apartment Unit
              </h3>
              <p className="text-[11px] text-slate-500">
                Stored permanently in your cloud database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Apartment Building / Property Name *
              </label>
              <input
                type="text"
                required
                placeholder="Enter building or property name"
                value={pgName}
                onChange={(e) => setPgName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Unit Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. APT-101"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Flat / Unit Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Flat #101"
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Property Address *
              </label>
              <input
                type="text"
                required
                placeholder="Enter full property address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Occupancy Mode Selector */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Unit Occupancy Status</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInitialStatus('approved_occupied')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                    initialStatus === 'approved_occupied'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Assign Tenant Now
                </button>
                <button
                  type="button"
                  onClick={() => setInitialStatus('available')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                    initialStatus === 'available'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Vacant (Open for Application)
                </button>
              </div>
            </div>

            {initialStatus === 'approved_occupied' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Tenant Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter tenant name"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Tenant Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tenant@email.com"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Tenant Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 ..."
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-emerald-600"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Apartment Type
              </label>
              <select
                value={sharingType}
                onChange={(e) => setSharingType(e.target.value as SharingType)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              >
                <option value="Studio / 1RK">Studio / 1RK</option>
                <option value="1BHK Apartment">1BHK Apartment</option>
                <option value="2BHK Apartment">2BHK Apartment</option>
                <option value="3BHK Apartment">3BHK Apartment</option>
                <option value="Penthouse / Villa">Penthouse / Villa</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Stay Type
              </label>
              <select
                value={stayType}
                onChange={(e) => setStayType(e.target.value as StayType)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              >
                <option value="Monthly Lease (Months)">
                  Monthly Lease (Months)
                </option>
                <option value="Short-Stay (Days)">Short-Stay (Days)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Stay Duration Term
              </label>
              <input
                type="text"
                placeholder="e.g. 11 Months Lease"
                value={stayDurationLabel}
                onChange={(e) => setStayDurationLabel(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Monthly Rent (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={monthlyRent || ''}
                onChange={(e) =>
                  setMonthlyRent(parseFloat(e.target.value) || 0)
                }
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Deposit (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={deposit || ''}
                onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Electricity (₹/Unit)
              </label>
              <input
                type="number"
                min="0"
                value={meterRate || ''}
                onChange={(e) => setMeterRate(parseFloat(e.target.value) || 10)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Notice (Days)
              </label>
              <input
                type="number"
                min="0"
                value={noticePeriodDays || ''}
                onChange={(e) =>
                  setNoticePeriodDays(parseInt(e.target.value, 10) || 30)
                }
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Landowner Name
              </label>
              <input
                type="text"
                placeholder="Your Name"
                value={landlordName}
                onChange={(e) => setLandlordName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Landowner UPI ID
              </label>
              <input
                type="text"
                placeholder="yourname@upi"
                value={ownerUpiId}
                onChange={(e) => setOwnerUpiId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Start / Available Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Optional Move-In Photos */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Optional Move-In Photos & Condition Notes
              </label>
              <label className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>+ Upload Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadMoveInPhotos}
                  className="hidden"
                />
              </label>
            </div>

            <input
              type="text"
              value={moveInNotes}
              onChange={(e) => setMoveInNotes(e.target.value)}
              placeholder="Optional move-in condition notes..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
            />

            {moveInImages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {moveInImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-900"
                  >
                    <img
                      src={imgUrl}
                      alt={`Move-In ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMoveInImages((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs"
            >
              Save Apartment Unit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
