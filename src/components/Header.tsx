import React, { useState } from 'react';
import {
  LogOut,
  UserCheck,
  UserCog,
  ArrowRightLeft,
  RotateCcw,
  Cloud,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { UserSession, PgCase } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  session: UserSession;
  activeCase?: PgCase;
  cases?: PgCase[];
  onLogout: () => void;
  onExport: () => void;
  onOpenNoticeGen: () => void;
  onOpenOwnerProfile?: () => void;
  onSwitchRole?: (newRole: 'owner' | 'resident', caseId?: string) => void;
  onResetData?: () => void;
  isExporting?: boolean;
  firebaseUser?: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
  onGoogleSignIn?: () => Promise<void>;
  onForceSyncNow?: () => Promise<void> | void;
  cloudSyncedAt?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  activeCase,
  cases = [],
  onLogout,
  onExport,
  onOpenNoticeGen,
  onOpenOwnerProfile,
  onSwitchRole,
  onResetData,
  isExporting = false,
  firebaseUser,
  onGoogleSignIn,
  onForceSyncNow,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [copiedDeviceLink, setCopiedDeviceLink] = useState(false);
  const isOwner = session.role === 'owner';

  const sharedDeviceUrl =
    typeof window !== 'undefined'
      ? window.location.origin.replace('ais-dev-', 'ais-pre-')
      : 'https://ais-pre-hvctcsvaponw4yn4f5ivhi-884251030291.asia-southeast1.run.app';

  const pendingUtrsCount = cases.reduce(
    (acc, c) =>
      acc +
      (c.payments || []).filter((p) => p.status === 'pending_verification')
        .length,
    0
  );
  const openComplaintsCount = cases.reduce(
    (acc, c) =>
      acc +
      (c.complaints || []).filter((cmp) => cmp.status !== 'Resolved').length,
    0
  );
  const pendingAppsCount = cases.reduce(
    (acc, c) =>
      acc +
      (c.tenantApplications || []).filter((a) => a.status === 'pending').length,
    0
  );
  const totalOwnerPendingCount =
    pendingUtrsCount + openComplaintsCount + pendingAppsCount;

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
        {/* Left: Brand & Current Active Room */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-white text-sm shadow-xs shrink-0 ${
              isOwner
                ? 'bg-gradient-to-br from-slate-900 to-slate-800'
                : 'bg-gradient-to-br from-emerald-600 to-teal-700'
            }`}
          >
            N
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              Nestora
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                isOwner
                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {isOwner ? 'Landowner Portal' : 'Tenant Portal'}
            </span>
          </div>

          {activeCase?.id && (
            <>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="hidden sm:inline text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg truncate">
                {activeCase.roomCode}
              </span>
            </>
          )}
        </div>

        {/* Center / Right: Switch Role, Cloud Sync, Install PWA & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Live Multi-Device Sync Button */}
          {onForceSyncNow && (
            <button
              type="button"
              onClick={() => onForceSyncNow()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-800 cursor-pointer"
              title="Sync data across all connected devices right now"
            >
              <RefreshCw className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline">Sync Devices</span>
            </button>
          )}

          {/* Copy Shared Link for Other Device */}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(sharedDeviceUrl);
              setCopiedDeviceLink(true);
              setTimeout(() => setCopiedDeviceLink(false), 3000);
            }}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] font-bold text-indigo-800 cursor-pointer"
            title={`Copy shared link to open on another device: ${sharedDeviceUrl}`}
          >
            <Share2 className="w-3 h-3 text-indigo-600" />
            <span>{copiedDeviceLink ? 'Link Copied!' : 'Other Device Link'}</span>
          </button>

          {/* Cloud Sync Badge or Connect Button */}
          {firebaseUser ? (
            <span
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800"
              title={`Cloud synced with ${firebaseUser.email}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Cloud Saved</span>
            </span>
          ) : (
            onGoogleSignIn && (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                title="Connect Google Account to sync data to cloud database"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Cloud</span>
              </button>
            )
          )}

          {/* Install on Laptop PWA Button */}
          <PWAInstallButton />

          {/* Quick Switch to the other portal */}
          {onSwitchRole && (
            <button
              type="button"
              onClick={() =>
                onSwitchRole(isOwner ? 'resident' : 'owner', activeCase?.id)
              }
              title={
                isOwner
                  ? 'Switch to Tenant View to submit rent payments or tickets'
                  : 'Switch to Landowner View to verify UTR, respond to tickets, or manage units'
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                isOwner
                  ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border-emerald-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isOwner ? 'Tenant View' : 'Landowner View'}
              </span>
              <span className="md:hidden">
                {isOwner ? 'Tenant' : 'Landowner'}
              </span>

              {!isOwner && totalOwnerPendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] leading-none">
                  {totalOwnerPendingCount}
                </span>
              )}
            </button>
          )}

          {isOwner ? (
            <button
              type="button"
              onClick={onOpenOwnerProfile}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              <UserCog className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden xl:inline">
                {session.name || 'Profile'}
              </span>
            </button>
          ) : (
            <div className="hidden xl:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{session.name}</span>
            </div>
          )}

          {activeCase?.id && (
            <>
              <button
                type="button"
                onClick={onOpenNoticeGen}
                className="hidden md:inline-flex text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Notice
              </button>

              <button
                type="button"
                onClick={onExport}
                disabled={isExporting}
                className="hidden md:inline-flex text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {isExporting ? 'Saving...' : 'Export'}
              </button>
            </>
          )}

          {/* Reset All Data to Clean State */}
          {onResetData && cases.length > 0 && (
            confirmReset ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onResetData();
                    setConfirmReset(false);
                  }}
                  className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                title="Clear all units and data"
                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )
          )}

          <button
            type="button"
            onClick={onLogout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
