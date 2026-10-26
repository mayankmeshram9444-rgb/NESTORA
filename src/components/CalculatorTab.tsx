import React, { useState } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { PgCase, DeductionItem } from '../types';

interface CalculatorTabProps {
  activeCase: PgCase;
  onUpdateCase: (updatedCase: PgCase) => void;
}

export const CalculatorTab: React.FC<CalculatorTabProps> = ({
  activeCase,
  onUpdateCase,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  // Submeter calculation state
  const startMeter = activeCase.startMeterUnits;
  const endMeter = activeCase.endMeterUnits;
  const ratePerUnit = activeCase.meterRatePerUnit;
  const unitsConsumed = Math.max(0, endMeter - startMeter);
  const electricityBill = unitsConsumed * ratePerUnit;

  // Deduction form state
  const [itemTitle, setItemTitle] = useState('');
  const [itemCategory, setItemCategory] = useState<DeductionItem['category']>('painting');
  const [itemAmount, setItemAmount] = useState<number>(0);
  const [itemFairAmount, setItemFairAmount] = useState<number>(0);
  const [landlordClaim, setLandlordClaim] = useState('');
  const [tenantRebuttal, setTenantRebuttal] = useState('');

  // Math totals
  const totalLandlordClaims = activeCase.deductions.reduce((acc, d) => acc + d.amount, 0);
  const totalAgreedDeductions = activeCase.deductions.reduce((acc, d) => acc + (d.status === 'agreed' ? d.fairAmount : 0), 0);
  const totalDisputedAmount = activeCase.deductions
    .filter((d) => d.status === 'disputed')
    .reduce((acc, d) => acc + (d.amount - d.fairAmount), 0);
  const finalRefundDue = Math.max(0, activeCase.securityDeposit - totalAgreedDeductions);

  const handleMeterChange = (field: 'start' | 'end' | 'rate', val: number) => {
    const updated = { ...activeCase };
    if (field === 'start') updated.startMeterUnits = val;
    if (field === 'end') updated.endMeterUnits = val;
    if (field === 'rate') updated.meterRatePerUnit = val;

    // Check if electricity deduction already exists, auto-sync it
    const elecIndex = updated.deductions.findIndex((d) => d.category === 'electricity');
    const newBill = Math.max(0, updated.endMeterUnits - updated.startMeterUnits) * updated.meterRatePerUnit;
    if (elecIndex >= 0) {
      updated.deductions[elecIndex].amount = newBill;
      updated.deductions[elecIndex].fairAmount = newBill;
      updated.deductions[elecIndex].landlordClaim = `Sub-meter consumption: ${updated.endMeterUnits - updated.startMeterUnits} units @ ₹${updated.meterRatePerUnit}/unit`;
    }
    onUpdateCase(updated);
  };

  const handleToggleStatus = (id: string) => {
    const updated = {
      ...activeCase,
      deductions: activeCase.deductions.map((d) => {
        if (d.id === id) {
          const nextStatus: 'disputed' | 'agreed' | 'waived' =
            d.status === 'disputed' ? 'agreed' : d.status === 'agreed' ? 'waived' : 'disputed';
          return {
            ...d,
            status: nextStatus,
            fairAmount: nextStatus === 'agreed' ? d.amount : nextStatus === 'waived' ? 0 : d.fairAmount,
          };
        }
        return d;
      }),
    };
    onUpdateCase(updated);
  };

  const handleUpdateFairAmount = (id: string, amount: number) => {
    const updated = {
      ...activeCase,
      deductions: activeCase.deductions.map((d) =>
        d.id === id ? { ...d, fairAmount: Math.max(0, amount) } : d
      ),
    };
    onUpdateCase(updated);
  };

  const handleDeleteDeduction = (id: string) => {
    const updated = {
      ...activeCase,
      deductions: activeCase.deductions.filter((d) => d.id !== id),
    };
    onUpdateCase(updated);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || itemAmount <= 0) return;

    const newItem: DeductionItem = {
      id: `ded-${Date.now()}`,
      title: itemTitle.trim(),
      category: itemCategory,
      amount: itemAmount,
      fairAmount: itemFairAmount,
      status: itemFairAmount === itemAmount ? 'agreed' : 'disputed',
      landlordClaim: landlordClaim.trim() || 'Claimed by PG manager upon vacating.',
      tenantRebuttal: tenantRebuttal.trim() || 'Disputed under Section 15 Fair Wear and Tear.',
    };

    onUpdateCase({
      ...activeCase,
      deductions: [...activeCase.deductions, newItem],
    });

    setItemTitle('');
    setItemAmount(0);
    setItemFairAmount(0);
    setLandlordClaim('');
    setTenantRebuttal('');
    setShowAddModal(false);
  };

  const handleExportCSV = () => {
    let csv = `NESTORA ITEMIZED DEPOSIT SETTLEMENT LEDGER\n`;
    csv += `Case: ${activeCase.pgName} (${activeCase.roomNo})\n`;
    csv += `Tenant: ${activeCase.tenantName} | Date: ${new Date().toLocaleDateString('en-IN')}\n`;
    csv += `Original Security Deposit Paid: ₹${activeCase.securityDeposit}\n\n`;
    csv += `Item Title,Category,Status,Landlord Claimed (INR),Tenant Fair Allowance (INR),Variance / Dispute (INR)\n`;
    activeCase.deductions.forEach((d) => {
      csv += `"${d.title}","${d.category}","${d.status}",${d.amount},${d.fairAmount},${d.amount - d.fairAmount}\n`;
    });
    csv += `\nTotal Claimed,${totalLandlordClaims}\n`;
    csv += `Total Fair Agreed,${totalAgreedDeductions}\n`;
    csv += `Arbitrarily Withheld Sum,${totalDisputedAmount}\n`;
    csv += `Net Refund Legally Demanded,${finalRefundDue}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Deposit_Settlement_Ledger_${activeCase.tenancyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Financial Ledger</span>
            <span aria-hidden="true">·</span>
            <span>Transparent Deduction Breakdown</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Security Deposit & Deductions Calculator
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Transparently separate statutory utility bills from arbitrary repainting or cleaning penalties.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Ledger</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deduction Claim</span>
          </button>
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Original Security Deposit
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            ₹{activeCase.securityDeposit.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Paid on {activeCase.startDate}</p>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-xs">
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
            Landlord Deductions
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-1 font-mono tabular-nums">
            ₹{totalLandlordClaims.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{activeCase.deductions.length} claimed items</p>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-xl shadow-xs">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Agreed Legitimate Bills
          </p>
          <p className="text-2xl font-bold text-slate-700 mt-1 font-mono tabular-nums">
            ₹{totalAgreedDeductions.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Electricity & verified charges</p>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
            Refund Due to Tenant
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">
            ₹{finalRefundDue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-800 mt-1 font-medium">Legally enforceable refund</p>
        </div>
      </div>

      {/* Sub-Meter Electricity Interactive Module */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              Room Electricity Sub-Meter Split Calculator
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Net Units: {unitsConsumed} kWh @ ₹{ratePerUnit}/unit
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Move-In Meter Reading (kWh)
            </label>
            <input
              type="number"
              value={startMeter}
              onChange={(e) => handleMeterChange('start', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Move-Out Meter Reading (kWh)
            </label>
            <input
              type="number"
              value={endMeter}
              onChange={(e) => handleMeterChange('end', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Rate per Unit (₹/kWh)
            </label>
            <input
              type="number"
              value={ratePerUnit}
              onChange={(e) => handleMeterChange('rate', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
            />
          </div>

          <div className="flex flex-col justify-end">
            <span className="text-[11px] text-slate-500">Calculated Final Bill:</span>
            <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
              ₹{electricityBill.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Deductions Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Itemized Deduction Audit & Rebuttal Table
          </h3>
          <span className="text-xs text-slate-400">Click status to toggle disputed/agreed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-2.5 px-3">Item / Claim</th>
                <th className="py-2.5 px-3">Landlord Allegation</th>
                <th className="py-2.5 px-3">Tenant Rebuttal</th>
                <th className="py-2.5 px-3 text-right">Claimed (₹)</th>
                <th className="py-2.5 px-3 text-right">Fair Agreed (₹)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeCase.deductions.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {d.title}
                    <span className="block text-[10px] text-slate-400 capitalize">{d.category}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={d.landlordClaim}>
                    {d.landlordClaim}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={d.tenantRebuttal}>
                    {d.tenantRebuttal}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 tabular-nums">
                    ₹{d.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <input
                      type="number"
                      value={d.fairAmount}
                      onChange={(e) => handleUpdateFairAmount(d.id, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-right border border-slate-200 rounded font-mono tabular-nums text-emerald-700 font-semibold focus:outline-emerald-600"
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleToggleStatus(d.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer border transition-colors ${
                        d.status === 'disputed'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : d.status === 'agreed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {d.status === 'disputed' ? 'Disputed' : d.status === 'agreed' ? 'Agreed' : 'Waived'}
                    </button>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={() => handleDeleteDeduction(d.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Deduction Claim Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Add Deduction Claim
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Itemize landlord charges for painting, cleaning, damage, or utilities.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Claim Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Balcony Door Polish, or Mattress Sanitization"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                  >
                    <option value="painting">Painting / Wall</option>
                    <option value="cleaning">Deep Cleaning</option>
                    <option value="electricity">Electricity / Utility</option>
                    <option value="appliance">Appliance / Geyser</option>
                    <option value="notice">Notice Period Shortfall</option>
                    <option value="other">Other Charge</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Landlord Demanded (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 3500"
                    value={itemAmount || ''}
                    onChange={(e) => setItemAmount(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tenant Fair Admitted Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 if fully disputed, or fair share"
                  value={itemFairAmount}
                  onChange={(e) => setItemFairAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Landlord Claim Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Required repainting before new tenant moves in"
                  value={landlordClaim}
                  onChange={(e) => setLandlordClaim(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tenant Legal Rebuttal
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 18-month stay constitutes normal wear and tear; no structural damage"
                  value={tenantRebuttal}
                  onChange={(e) => setTenantRebuttal(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs"
                >
                  Add to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
