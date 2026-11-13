import React, { useState } from 'react';
import { Check, Copy, FileText, Loader2, Printer, RefreshCw } from 'lucide-react';
import type {
  DoctorSummaryData,
  EvidenceSource,
  PatientProfile,
  TrendAnalysis,
} from '../shared/types';

interface DoctorSummaryPanelProps {
  patient: PatientProfile | null;
  trend: TrendAnalysis | null;
  evidence: EvidenceSource[];
  summaryData: DoctorSummaryData | null;
  isLoading: boolean;
  error: string | null;
  onGenerateSummary: () => void;
  onLoadDemoPatient: () => void;
}

export const DoctorSummaryPanel: React.FC<DoctorSummaryPanelProps> = ({
  patient,
  trend,
  evidence,
  summaryData,
  isLoading,
  error,
  onGenerateSummary,
  onLoadDemoPatient,
}) => {
  const [copied, setCopied] = useState(false);

  if (!patient || !trend) {
    return (
      <div className="rounded-2xl border border-[#ECE0D7] bg-white/85 p-6 text-center space-y-3 shadow-xs">
        <FileText className="w-8 h-8 text-[#4A2D3C] mx-auto" />
        <h2 className="font-display text-xl font-medium text-[#2E1E26]">
          Doctor Visit Summary
        </h2>
        <p className="text-sm text-[#73636A] max-w-md mx-auto">
          Load the demo patient to generate a printable clinician summary with symptoms,
          longitudinal lab trends, evidence limitations, uncertainties, and doctor questions.
        </p>
        <button
          type="button"
          onClick={onLoadDemoPatient}
          className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#4A2D3C] text-white text-sm font-medium hover:bg-[#3D2331] transition-colors cursor-pointer"
        >
          Try Demo Patient
        </button>
      </div>
    );
  }

  const uncertainties = summaryData?.uncertainties ?? patient.missingContext;
  const questions = summaryData?.questionsForDoctor ?? [
    'Looking at my ferritin drop from 52 to 12 ng/mL across 2023–2026 alongside fatigue and heavy bleeding, what follow-up labs (like CBC, CRP, TSAT, or thyroid) would you recommend?',
    'How should we evaluate potential causes of my heavy menstrual bleeding?',
    'What iron store target and follow-up timeline make sense for my health?',
  ];

  const handleCopyText = async () => {
    const lines = [
      'NOMI — PATIENT VISIT PREPARATION SUMMARY (EDUCATIONAL ONLY)',
      `Generated: ${new Date().toLocaleDateString()}`,
      `Patient Context: ${patient.id} · ${patient.age}-year-old ${patient.sexAssignedAtBirth} · Wearables: ${patient.wearables} (${patient.label})`,
      '',
      '1. OVERVIEW',
      summaryData?.visitOverview || trend.deterministicSummary,
      '',
      '2. REPORTED SYMPTOMS',
      ...patient.symptoms.map(
        (s) => `- ${s.name} (${s.severity}, ${s.duration}): ${s.frequency}. ${s.notes}`
      ),
      '',
      '3. LONGITUDINAL FERRITIN TREND',
      ...patient.labs
        .slice()
        .sort((a, b) => a.year - b.year)
        .map((l) => `- ${l.dateLabel}: ${l.value} ${l.unit} (Ref: ${l.labReferenceRange})`),
      `Calculated Slope: ${trend.annualSlope} ng/mL/year | Total Change: ${trend.totalDelta} ng/mL (${trend.totalPercentChange}%)`,
      '',
      '4. UNCERTAINTIES & MISSING CONTEXT',
      ...uncertainties.map((u) => `- ${u}`),
      '',
      '5. QUESTIONS FOR MY DOCTOR',
      ...questions.map((q, idx) => `${idx + 1}. ${q}`),
      '',
      '6. MEDICAL EVIDENCE REVIEWED',
      ...evidence.map((e) => `- ${e.title} (${e.organizationOrJournal}, ${e.year}) — ${e.url}`),
      '',
      'Note: Educational summary only. Not a medical diagnosis or prescription.',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked silently ignored
    }
  };

  return (
    <section aria-label="Doctor Visit Summary" className="space-y-4">
      <div className="no-print rounded-2xl border border-[#ECE0D7] bg-white/85 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="font-display text-xl font-medium text-[#2E1E26]">
            Printable Doctor Summary
          </h2>
          <p className="text-xs text-[#73636A]">
            Organizes symptoms, lab trends, evidence, unknowns, and visit questions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGenerateSummary}
            disabled={isLoading}
            className="min-h-[44px] px-4 py-2 rounded-full border border-[#E5D7CE] bg-white hover:border-[#D6BFCF] text-xs font-medium text-[#4A2D3C] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{summaryData ? 'Refresh with Gemini' : 'Synthesize with Gemini'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="min-h-[44px] px-4 py-2 rounded-full border border-[#E5D7CE] bg-white hover:border-[#D6BFCF] text-xs font-medium text-[#4A2D3C] inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#2E6F5E]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-4 py-2 rounded-full bg-[#4A2D3C] text-white hover:bg-[#3D2331] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="no-print rounded-xl border border-[#F2DCDC] bg-[#FBF1F1] p-3.5 text-xs sm:text-sm text-[#441B1B]"
        >
          {error}
        </div>
      )}

      <article className="print-only-container rounded-2xl border border-[#ECE0D7] bg-white p-5 sm:p-8 space-y-6 shadow-xs">
        <header className="pb-4 border-b border-[#ECE0D7] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-[#4A2D3C]">
              Nomi · Visit Preparation Brief
            </p>
            <h3 className="mt-1 text-2xl font-display font-medium text-[#2E1E26]">
              Personal Health Investigation Summary
            </h3>
          </div>
          <div className="text-xs text-[#73636A] font-mono tabular-nums">
            <span>{patient.id}</span>
            <span aria-hidden="true"> · </span>
            <span>{patient.age}y {patient.sexAssignedAtBirth}</span>
            <span aria-hidden="true"> · </span>
            <span>Wearables: {patient.wearables}</span>
          </div>
        </header>

        <div className="space-y-1.5 print-break-inside-avoid">
          <h4 className="text-xs font-semibold tracking-wide text-[#4A2D3C]">
            01. Visit Overview
          </h4>
          {isLoading && !summaryData ? (
            <p className="text-sm text-[#73636A] inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing tailored summary with Gemini...
            </p>
          ) : (
            <p className="text-sm text-[#2E1E26] leading-relaxed">
              {summaryData?.visitOverview || trend.deterministicSummary}
            </p>
          )}
        </div>

        <div className="space-y-2 print-break-inside-avoid">
          <h4 className="text-xs font-semibold tracking-wide text-[#4A2D3C]">
            02. Reported Symptoms
          </h4>
          <div className="divide-y divide-[#ECE0D7] border border-[#ECE0D7] rounded-xl">
            {patient.symptoms.map((sym) => (
              <div key={sym.id} className="p-3.5 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#2E1E26]">{sym.name}</span>
                  <span className="text-xs text-[#73636A]">
                    {sym.severity} · {sym.duration}
                  </span>
                </div>
                <p className="text-xs text-[#4A3B42]">{sym.frequency}</p>
                <p className="text-xs text-[#73636A]">{sym.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 print-break-inside-avoid">
          <h4 className="text-xs font-semibold tracking-wide text-[#4A2D3C]">
            03. Longitudinal Lab Trend (Ferritin)
          </h4>
          <div className="overflow-x-auto border border-[#ECE0D7] rounded-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#FBF7F2] text-[#4A3B42]">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">Date</th>
                  <th className="py-2.5 px-3.5 font-semibold">Ferritin</th>
                  <th className="py-2.5 px-3.5 font-semibold">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE0D7]">
                {patient.labs
                  .slice()
                  .sort((a, b) => a.year - b.year)
                  .map((lab) => (
                    <tr key={lab.id}>
                      <td className="py-2.5 px-3.5 font-mono tabular-nums text-[#2E1E26]">
                        {lab.dateLabel}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono tabular-nums font-semibold text-[#2E1E26]">
                        {lab.value} {lab.unit}
                      </td>
                      <td className="py-2.5 px-3.5 text-[#4A3B42]">
                        {lab.clinicalContext || lab.labReferenceRange}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-mono tabular-nums text-[#4A3B42]">
            Calculated Trend: {trend.totalDelta} ng/mL ({trend.totalPercentChange}%) · Slope:{' '}
            {trend.annualSlope} ng/mL/year · Classification: {trend.signalClassification}
          </p>
        </div>

        <div className="space-y-2 print-break-inside-avoid">
          <h4 className="text-xs font-semibold tracking-wide text-[#4A2D3C]">
            04. Key Uncertainties & Missing Context
          </h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[#4A3B42]">
            {uncertainties.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 print-break-inside-avoid">
          <h4 className="text-xs font-semibold tracking-wide text-[#4A2D3C]">
            05. Questions to Discuss With My Doctor
          </h4>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-[#2E1E26]">
            {questions.map((q) => (
              <li key={q} className="leading-relaxed">
                {q}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-2 print-break-inside-avoid">
          <h4 className="text-xs font-semibold tracking-wide text-[#4A2D3C]">
            06. Verifiable Evidence Reviewed
          </h4>
          <ul className="space-y-1.5 text-xs text-[#4A3B42]">
            {evidence.map((ev) => (
              <li key={ev.id}>
                <span className="font-semibold text-[#2E1E26]">
                  {ev.organizationOrJournal} ({ev.year}):
                </span>{' '}
                {ev.title} — <span className="underline break-all">{ev.url}</span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="pt-4 border-t border-[#ECE0D7] text-xs text-[#73636A] space-y-1">
          <p>
            Educational information only. This document is not a medical diagnosis, cancer prediction,
            or prescription. Please review all lab values and symptoms with a licensed healthcare
            clinician.
          </p>
          <p>
            Urgent care note: Seek immediate medical attention for chest pain, shortness of breath at
            rest, fainting, severe dizziness, or soaking through a pad or tampon every hour for 2+
            consecutive hours.
          </p>
        </footer>
      </article>
    </section>
  );
};
