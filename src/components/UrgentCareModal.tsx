import React from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface UrgentCareModalProps {
  open: boolean;
  onClose: () => void;
}

export const UrgentCareModal: React.FC<UrgentCareModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-modal-title"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white border border-[#EAE3D8] p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="sm:hidden w-10 h-1.5 bg-[#EAE3D8] rounded-full mx-auto -mt-1 mb-2" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="safety-modal-title" className="text-lg font-semibold text-[#1E1B24]">
              Safety Boundaries & Urgent Care Guide
            </h2>
            <p className="text-xs text-[#665F73]">
              Important educational limits for using Nomi
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close safety guide"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-[#F5F1EA] text-[#3E394A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl border border-[#F3C6CF] bg-[#FDECEF] p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#8E1B30]">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#B4233C]" />
            <span>When to seek prompt or emergency medical care</span>
          </div>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-[#6E1727] space-y-1">
            <li>Chest pain, pressure, or shortness of breath at rest</li>
            <li>Fainting, blacking out, or feeling like you might pass out</li>
            <li>Severe dizziness or rapid, pounding heartbeat at rest</li>
            <li>Soaking through 1 or more pads/tampons every hour for 2+ consecutive hours</li>
            <li>Heavy bleeding during pregnancy or suspected pregnancy</li>
          </ul>
        </div>

        <div className="rounded-xl border border-[#EAE3D8] bg-[#FBF9F5] p-4 space-y-2 text-xs sm:text-sm text-[#3E394A]">
          <div className="flex items-center gap-2 font-semibold text-[#1E1B24]">
            <ShieldCheck className="w-4 h-4 text-[#5B4696]" />
            <span>Educational Investigation Principles</span>
          </div>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Educational information only — no medical diagnosis, cancer prediction, or prescriptions.</li>
            <li>Uses synthetic patient data by default; no database or account storage in this MVP.</li>
            <li>Does not claim HIPAA compliance; avoid entering real personally identifiable records.</li>
            <li>Always verifies lab trends with deterministic TypeScript math before Gemini explains them.</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl bg-[#5B4696] text-white text-sm font-semibold hover:bg-[#48357B] transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
