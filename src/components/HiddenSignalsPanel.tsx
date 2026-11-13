import React, { useState } from 'react';
import {
  Activity,
  BellRing,
  ChevronRight,
  FileText,
  FlaskConical,
  HeartPulse,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type {
  PatientProfile,
  SignalExplanationResponse,
  TrendAnalysis,
} from '../shared/types';
import { FerritinTimelineChart } from './FerritinTimelineChart';

interface HiddenSignalsPanelProps {
  patient: PatientProfile | null;
  trend: TrendAnalysis | null;
  explanationData: SignalExplanationResponse | null;
  isExplaining: boolean;
  explainError: string | null;
  dueRemindersCount?: number;
  onOpenReminders?: () => void;
  onRequestExplanation: () => void;
  onAddLabPoint: (year: number, value: number) => void;
  onLoadDemoPatient: () => void;
  onAskInChat: (question: string) => void;
  onOpenDoctorSummary: () => void;
}

type TimelineFilter = 'all' | 'labs' | 'symptoms';

export const HiddenSignalsPanel: React.FC<HiddenSignalsPanelProps> = ({
  patient,
  trend,
  explanationData,
  isExplaining,
  explainError,
  dueRemindersCount = 0,
  onOpenReminders,
  onRequestExplanation,
  onAddLabPoint,
  onLoadDemoPatient,
  onAskInChat,
  onOpenDoctorSummary,
}) => {
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showChartAndInsight, setShowChartAndInsight] = useState(true);
  const [showChallengeInsight, setShowChallengeInsight] = useState(false);
  const [newYear, setNewYear] = useState('2027');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!patient || !trend) {
    return (
      <div className="flex-1 flex flex-col px-6 pb-4 overflow-y-auto">
        <div>
          <h1 className="font-display text-3xl font-medium text-[#2E1E26] tracking-tight">
            Timeline
          </h1>
          <p className="text-xs text-[#73636A] mt-1">Your health story over time.</p>
        </div>

        <div className="mt-6 bg-white/80 rounded-2xl p-6 border border-[#ECE0D7] shadow-xs text-center space-y-3">
          <Activity className="w-8 h-8 text-[#4A2D3C] mx-auto" />
          <h2 className="font-display text-xl font-medium text-[#2E1E26]">
            Load the Demo Patient
          </h2>
          <p className="text-xs text-[#73636A] leading-relaxed">
            Explore the 27-year-old synthetic record, longitudinal ferritin timeline (52 → 12 ng/mL),
            TypeScript slope calculation, and Gemini insight.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onLoadDemoPatient}
              className="min-h-[44px] px-5 py-2 rounded-full bg-[#4A2D3C] text-white text-xs font-medium hover:bg-[#3D2331] cursor-pointer"
            >
              Try Demo Patient
            </button>
            {onOpenReminders && (
              <button
                type="button"
                onClick={onOpenReminders}
                className="min-h-[44px] px-4 py-2 rounded-full bg-[#FAF5EF] border border-[#EAE2D8] text-[#2B1810] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-[#B3534B]" />
                <span>Checkups &amp; Meds ({dueRemindersCount} due)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const sortedLabs = [...patient.labs].sort((a, b) => b.year - a.year);

  const timelineItems = [
    ...(filter === 'all' || filter === 'symptoms'
      ? patient.symptoms.map((sym) => ({
          id: sym.id,
          kind: 'symptom' as const,
          dateLabel: 'ONGOING · 2024–2026',
          badge: sym.duration,
          title: sym.name,
          subtitle: sym.frequency,
          detail: sym.notes,
        }))
      : []),
    ...(filter === 'all' || filter === 'labs'
      ? sortedLabs.map((lab) => {
          const isLow = lab.value < trend.thresholds.whoDeficiencyThreshold;
          const isWatch = !isLow && lab.value < trend.thresholds.suboptimalStoreThreshold;
          return {
            id: lab.id,
            kind: 'lab' as const,
            dateLabel: lab.dateLabel.toUpperCase(),
            badge: isLow
              ? 'Below 15 WHO cutoff'
              : isWatch
              ? 'Borderline low'
              : 'Within lab range',
            title: `Lab result · Ferritin ${lab.value} ${lab.unit}`,
            subtitle: lab.clinicalContext || `Reference: ${lab.labReferenceRange}`,
            detail: `Lab reference range: ${lab.labReferenceRange}`,
          };
        })
      : []),
  ];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const yr = Number(newYear);
    const val = Number(newValue);
    if (!Number.isFinite(yr) || yr < 1990 || yr > 2035) return;
    if (!Number.isFinite(val) || val < 0 || val > 2000) return;
    onAddLabPoint(yr, val);
    setNewValue('');
    setShowAddForm(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header + Filter Chips matching timeline.html */}
      <div className="px-6 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-3xl font-medium text-[#2E1E26] tracking-tight">
              Timeline
            </h1>
            <p className="text-xs text-[#73636A] mt-1">Your health story over time.</p>
          </div>
          <button
            type="button"
            onClick={onOpenDoctorSummary}
            className="min-h-[38px] px-3 py-1.5 rounded-full bg-[#EFE4EB] text-[#4A2D3C] border border-[#E3D1DD] text-[11px] font-medium inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Doctor Summary</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'labs', label: 'Labs' },
              { id: 'symptoms', label: 'Symptoms' },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  active
                    ? 'bg-[#4A2D3C] text-white'
                    : 'bg-white/75 text-[#6C5B63] border border-[#E5D7CE]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowChartAndInsight((prev) => !prev)}
            className="min-h-[36px] px-3.5 py-1 rounded-full text-xs font-medium bg-white/75 text-[#4A2D3C] border border-[#E5D7CE] cursor-pointer"
          >
            {showChartAndInsight ? 'Hide Trend Chart' : 'Show Trend Chart'}
          </button>
          {onOpenReminders && (
            <button
              type="button"
              onClick={onOpenReminders}
              className="min-h-[36px] px-3.5 py-1 rounded-full text-xs font-medium bg-[#F7EBE8] text-[#2B1810] border border-[#F0DCD7] inline-flex items-center gap-1 cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-[#B3534B]" />
              <span>Checkups &amp; Rx ({dueRemindersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Timeline & Chart */}
      <div className="flex-1 px-6 py-2 space-y-5 overflow-y-auto min-h-0">
        {showChartAndInsight && (
          <div className="space-y-3">
            {/* Compact 2-column TypeScript trend summary */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="min-w-0 bg-white/80 rounded-2xl p-3 border border-[#ECE0D7] shadow-xs">
                <p className="text-[11px] text-[#73636A]">Ferritin ({trend.startYear}–{trend.endYear})</p>
                <p className="text-base sm:text-lg font-mono tabular-nums font-semibold text-[#A63838] mt-0.5 break-words">
                  {trend.startValue} → {trend.latestValue} <span className="text-[11px] font-normal text-[#73636A]">ng/mL</span>
                </p>
              </div>
              <div className="min-w-0 bg-white/80 rounded-2xl p-3 border border-[#ECE0D7] shadow-xs">
                <p className="text-[11px] text-[#73636A]">TypeScript Trend</p>
                <p className="text-base sm:text-lg font-mono tabular-nums font-semibold text-[#4A2D3C] mt-0.5 break-words">
                  {trend.totalPercentChange}% <span className="text-[11px] font-normal text-[#73636A]">({trend.annualSlope}/yr)</span>
                </p>
              </div>
            </div>

            <FerritinTimelineChart labs={patient.labs} trend={trend} />
          </div>
        )}

        {/* Vertical Timeline Rail matching timeline.html */}
        <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[7px] before:top-3 before:bottom-3 before:w-[1.5px] before:bg-[#DBCDC4]">
          {timelineItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="relative">
                <div className="absolute -left-[23.5px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#5D384D] border-2 border-[#FBF7F2]" />
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold tracking-wider text-[#735D67] uppercase">
                    {item.dateLabel}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EFE3EB] text-[#553245]">
                    {item.badge}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full text-left bg-white/85 rounded-2xl p-3.5 border border-[#ECE0D7] shadow-xs hover:border-[#D6BFCF] transition cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.kind === 'lab'
                          ? 'bg-[#F4E8EE] text-[#682E47]'
                          : 'bg-[#F6ECE4] text-[#7E4633]'
                      }`}
                    >
                      {item.kind === 'lab' ? (
                        <FlaskConical className="w-4 h-4" />
                      ) : (
                        <HeartPulse className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-medium text-[#2E1E26]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#77666F] mt-0.5 leading-relaxed">
                        {item.subtitle}
                      </p>
                      {isExpanded && (
                        <p className="text-xs text-[#4A3B42] mt-2 pt-2 border-t border-[#ECE0D7]">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-[#A898A1] shrink-0 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Test Lab Value & Gemini Explanation */}
        <div className="space-y-3 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-full border border-[#E5D7CE] bg-white/80 text-xs font-medium text-[#4A2D3C] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Test another ferritin value</span>
            </button>

            <button
              type="button"
              onClick={() => setShowChallengeInsight((prev) => !prev)}
              aria-expanded={showChallengeInsight}
              className="min-h-[40px] px-3.5 py-1.5 rounded-full border border-[#E3D1DD] bg-[#F5EDF2] text-xs font-medium text-[#4A2D3C] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Challenge This Insight</span>
            </button>

            <button
              type="button"
              onClick={onRequestExplanation}
              disabled={isExplaining}
              className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#4A2D3C] text-white text-xs font-medium hover:bg-[#3D2331] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isExplaining ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{explanationData ? 'Refresh Gemini Insight' : 'Explain with Gemini'}</span>
            </button>
          </div>

          {showChallengeInsight && (
            <div className="rounded-2xl border border-[#E3D1DD] bg-white/90 p-4 space-y-2.5 text-xs shadow-xs">
              <p className="font-semibold text-[#4A2D3C]">
                Challenge This Insight · Uncertainties &amp; Missing Information
              </p>
              <p className="text-[#4A3B42] leading-relaxed">
                A downward ferritin slope ({trend.annualSlope} ng/mL/yr) is a mathematical trend, not a
                diagnosis. Ferritin is an acute-phase protein and can fluctuate with inflammation,
                lab assay differences, or cycle timing.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[#4A3B42]">
                {patient.missingContext.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {showAddForm && (
            <form
              onSubmit={handleAddSubmit}
              className="rounded-2xl bg-white/85 border border-[#ECE0D7] p-3.5 flex flex-wrap items-end gap-2.5"
            >
              <div>
                <label htmlFor="lab-year" className="block text-[11px] text-[#4A3B42] mb-1">
                  Year
                </label>
                <input
                  id="lab-year"
                  type="number"
                  min={1990}
                  max={2035}
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  className="w-20 min-h-[40px] rounded-xl border border-[#E5D7CE] bg-[#FBF7F2] px-2.5 text-xs font-mono"
                />
              </div>
              <div>
                <label htmlFor="lab-ferritin" className="block text-[11px] text-[#4A3B42] mb-1">
                  Ferritin (ng/mL)
                </label>
                <input
                  id="lab-ferritin"
                  type="number"
                  step="0.1"
                  min={0}
                  max={2000}
                  placeholder="9"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-24 min-h-[40px] rounded-xl border border-[#E5D7CE] bg-[#FBF7F2] px-2.5 text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-full bg-[#4A2D3C] text-white text-xs font-medium cursor-pointer"
              >
                Recalculate
              </button>
            </form>
          )}

          {explainError && (
            <div role="alert" className="rounded-2xl border border-[#F2DCDC] bg-[#FBF1F1] p-3 text-xs text-[#441B1B]">
              {explainError}
            </div>
          )}

          {explanationData && (
            <div className="bg-white/85 border border-[#ECE0D8] rounded-2xl p-4 space-y-3 shadow-xs">
              <p className="text-xs font-semibold text-[#4A2D3C]">
                Gemini Plain-Language Interpretation (Non-Diagnostic)
              </p>
              <p className="text-[13px] text-[#2E1E26] leading-relaxed whitespace-pre-wrap">
                {explanationData.explanation}
              </p>
              {explanationData.questionsToExplore.length > 0 && (
                <div className="pt-2 border-t border-[#ECE0D7] space-y-1.5">
                  <p className="text-[11px] font-medium text-[#73636A]">
                    Ask Nomi:
                  </p>
                  {explanationData.questionsToExplore.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onAskInChat(q)}
                      className="w-full min-h-[40px] text-left px-3 py-2 rounded-xl bg-[#FBF7F2] border border-[#ECE0D7] text-xs text-[#2E1E26] hover:border-[#D6BFCF] cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
