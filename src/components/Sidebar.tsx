import React from 'react';
import {
  LayoutDashboard,
  Layers,
  FileText,
  ChevronDown,
  Receipt,
  MessageSquareWarning,
  Sparkles,
  Compass,
} from 'lucide-react';
import { PgCase } from '../types';

export type TabKey =
  | 'dashboard'
  | 'receipt'
  | 'complaints'
  | 'agreement'
  | 'comparison'
  | 'calculator'
  | 'vault'
  | 'completeness'
  | 'ai'
  | 'legal'
  | 'explore';

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  activeCase: PgCase;
  cases: PgCase[];
  onSelectCase: (caseId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeCase,
  cases,
  onSelectCase,
}) => {
  const [showCaseDropdown, setShowCaseDropdown] = React.useState(false);

  const totalDeductions = activeCase.deductions.reduce(
    (s, d) => s + d.amount,
    0
  );
  const depositRemaining = Math.max(
    0,
    activeCase.securityDeposit - totalDeductions
  );
  const openComplaints = (activeCase.complaints || []).filter(
    (c) => c.status !== 'Resolved'
  ).length;
  const legalDocsCount = (activeCase.legalDocuments || []).length;

  const navItems: {
    key: TabKey;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[] = [
    {
      key: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      key: 'receipt',
      label: 'Payments',
      icon: Receipt,
      badge: `${activeCase.payments.length}`,
    },
    {
      key: 'complaints',
      label: 'Disputes',
      icon: MessageSquareWarning,
      badge: openComplaints > 0 ? `${openComplaints}` : undefined,
    },
    {
      key: 'agreement',
      label: 'Documents & Agreement',
      icon: FileText,
      badge: legalDocsCount > 0 ? `${legalDocsCount}` : undefined,
    },
    {
      key: 'comparison',
      label: 'Move-In / Out Photos',
      icon: Layers,
    },
    {
      key: 'ai',
      label: 'Assistant',
      icon: Sparkles,
    },
    {
      key: 'explore',
      label: 'All Apartments',
      icon: Compass,
      badge: `${cases.length} Units`,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white hidden md:flex flex-col p-4 space-y-1.5 shrink-0 justify-between">
      <div className="space-y-4">
        {/* Active Apartment Unit Selector */}
        <div className="relative">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 px-1">
            Unit
          </label>
          <button
            onClick={() => setShowCaseDropdown(!showCaseDropdown)}
            className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {activeCase.pgName}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                <span className="font-mono font-semibold text-emerald-700">
                  {activeCase.roomCode}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">
                  {activeCase.stayDurationLabel || activeCase.tenantName}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                showCaseDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showCaseDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1">
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCase(c.id);
                      setShowCaseDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      c.id === activeCase.id
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate">
                      <p className="truncate">{c.pgName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {c.roomCode} · {c.tenantName}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                      ₹{c.securityDeposit.toLocaleString('en-IN')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Core Apartment Tenant Navigation Items */}
        <div>
          <p className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Apartment Tenant Menu
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelectTab(item.key)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Summary Card: Deposit & Move-Out Damages */}
      <div className="pt-3 border-t border-slate-100">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Security Deposit</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              ₹{activeCase.securityDeposit.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between text-rose-600 text-[11px]">
            <span>Move-Out Damages</span>
            <span className="font-mono font-bold tabular-nums">
              -₹{totalDeductions.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200">
            <span className="font-bold text-slate-700">Deposit Remaining</span>
            <span className="font-mono font-extrabold text-emerald-700 tabular-nums text-xs">
              ₹{depositRemaining.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
