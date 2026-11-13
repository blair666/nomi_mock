import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="min-h-[36px] px-2.5 py-1 rounded-full border border-[#E3D1DD] bg-white/80 hover:bg-white text-[#4A2D3C] text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[36px] px-2.5 py-1 rounded-full border border-[#E3D1DD] bg-white/80 hover:bg-white text-[#4A2D3C] text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <Share className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#FBF7F4] border border-[#EAE1E8] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 id="ios-install-title" className="text-base font-semibold text-[#2B2331]">
                  Install on iPhone or iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#6C5E74] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-[#4B3F54] leading-relaxed">
                1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="min-h-[44px] w-full rounded-xl bg-[#4A375D] text-white text-sm font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
