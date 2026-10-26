import React, { useState } from 'react';
import { Download, Laptop, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.href : '/';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer shrink-0"
        title="Install Nestora as a standalone app on your laptop or device"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install on Laptop</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {isIOS
                      ? 'Install Nestora on iPhone / iPad'
                      : 'Install Nestora on Your Laptop'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Run Nestora as a standalone desktop app with offline access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p>
                  1. Tap the <strong>Share</strong> button in your Safari
                  toolbar.
                </p>
                <p>
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Step 1: Open in a Full Browser Tab</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Browsers only allow desktop app installation from a top-level
                    browser tab (not inside a preview frame).
                  </p>
                  <a
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs"
                  >
                    <span>Open App in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <p className="font-bold text-slate-900">
                    Step 2: Click &ldquo;Install&rdquo; in Your Browser
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                    <li>
                      <strong>Chrome / Edge / Brave:</strong> Click the{' '}
                      <strong>Install on Laptop</strong> button in the header or
                      the computer install icon on the right side of the address
                      bar.
                    </li>
                    <li>
                      <strong>macOS Safari:</strong> Click{' '}
                      <strong>File &rarr; Add to Dock</strong> from the top menu
                      bar.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-bold text-white cursor-pointer transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
