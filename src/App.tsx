import React, { useEffect, useState } from 'react';
import {
  Calendar,
  FileText,
  Layers,
  MessageCircle,
  ShieldAlert,
  X,
} from 'lucide-react';
import type {
  ChatMessage,
  DoctorSummaryData,
  EvidenceSource,
  PatientProfile,
  SignalExplanationResponse,
  TrendAnalysis,
} from './shared/types';
import {
  analyzeSignals,
  fetchCuratedEvidence,
  fetchDemoPatient,
  fetchDoctorSummary,
  sendHealthChat,
} from './services/apiClient';
import { HealthChatPanel } from './components/HealthChatPanel';
import { HiddenSignalsPanel } from './components/HiddenSignalsPanel';
import { EvidencePanel } from './components/EvidencePanel';
import { DoctorSummaryPanel } from './components/DoctorSummaryPanel';
import { UrgentCareModal } from './components/UrgentCareModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

type ActiveTab = 'ask' | 'signals' | 'science';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ask');
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [trend, setTrend] = useState<TrendAnalysis | null>(null);
  const [evidence, setEvidence] = useState<EvidenceSource[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [signalExplanation, setSignalExplanation] =
    useState<SignalExplanationResponse | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const [doctorSummary, setDoctorSummary] = useState<DoctorSummaryData | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showDoctorSummary, setShowDoctorSummary] = useState(false);

  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);

  useEffect(() => {
    fetchCuratedEvidence()
      .then((res) => setEvidence(res.evidence))
      .catch(() => {
        // Non-fatal; loaded again with demo patient
      });
  }, []);

  const handleLoadDemoPatient = async () => {
    setIsLoadingDemo(true);
    setExplainError(null);
    setSummaryError(null);
    try {
      const data = await fetchDemoPatient();
      setPatient(data.patient);
      setTrend(data.trend);
      setEvidence(data.evidence);
      setSignalExplanation(null);
      setDoctorSummary(null);

      setMessages((prev) => {
        if (prev.length > 0) return prev;
        return [
          {
            id: 'welcome-user',
            role: 'user',
            timestamp: new Date().toISOString(),
            content:
              'I have had recurring fatigue and heavy periods, and my ferritin went from 52 in 2023 to 34, 21, and now 12 ng/mL in 2026. What does this pattern mean?',
          },
          {
            id: 'welcome-demo',
            role: 'assistant',
            timestamp: new Date().toISOString(),
            content:
              'Even though your 2023–2025 ferritin labs looked normal on single-year reports, dropping from 52 down to 12 ng/mL crosses below the WHO 15 ng/mL threshold for depleted iron stores.\n\nHeavy menstrual bleeding is one of the most common reasons iron stores slowly decline over years. Discussing a CBC, inflammatory markers (CRP), and bleeding evaluation with your clinician can clarify what is driving your fatigue.',
            referencedEvidenceIds: ['who-ferritin-2020', 'acog-hmb-guidance'],
          },
        ];
      });
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleRequestSignalExplanation = async (overridePatient?: PatientProfile) => {
    const targetPatient = overridePatient ?? patient;
    if (!targetPatient) return;

    setIsExplaining(true);
    setExplainError(null);
    try {
      const res = await analyzeSignals(targetPatient);
      setTrend(res.trend);
      setSignalExplanation(res);
    } catch (err) {
      setExplainError(
        err instanceof Error ? err.message : 'Unable to analyze signals right now.'
      );
    } finally {
      setIsExplaining(false);
    }
  };

  const handleAddLabPoint = (year: number, value: number) => {
    if (!patient) return;
    const updatedLabs = [
      ...patient.labs.filter((l) => l.year !== year),
      {
        id: `ferritin-${year}`,
        marker: 'Ferritin' as const,
        year,
        dateLabel: `Mar ${year}`,
        value,
        unit: 'ng/mL' as const,
        labReferenceRange: '15–150 ng/mL (varies by lab)',
        clinicalContext: 'Added in interactive session test',
      },
    ].sort((a, b) => a.year - b.year);

    const updatedPatient: PatientProfile = {
      ...patient,
      labs: updatedLabs,
    };
    setPatient(updatedPatient);
    setDoctorSummary(null);
    handleRequestSignalExplanation(updatedPatient);
  };

  const handleGenerateDoctorSummary = async () => {
    if (!patient) return;
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetchDoctorSummary(patient);
      setDoctorSummary(res);
      setTrend(res.trend);
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : 'Unable to synthesize doctor summary right now.'
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleOpenDoctorSummary = () => {
    setShowDoctorSummary(true);
    if (patient && !doctorSummary && !isGeneratingSummary) {
      handleGenerateDoctorSummary();
    }
  };

  const handleTabChange = (tab: ActiveTab) => {
    setShowDoctorSummary(false);
    setActiveTab(tab);
    if (tab === 'signals' && patient && !signalExplanation && !isExplaining) {
      handleRequestSignalExplanation(patient);
    }
  };

  const handleAskQuestionInChat = (question: string) => {
    setShowDoctorSummary(false);
    setActiveTab('ask');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);

    sendHealthChat({
      messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
      patient,
    })
      .then((res) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: res.reply,
            timestamp: new Date().toISOString(),
            urgentAlert: res.urgentAlert,
            referencedEvidenceIds: res.referencedEvidenceIds,
          },
        ]);
      })
      .catch((err) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-err-${Date.now()}`,
            role: 'assistant',
            content:
              err instanceof Error
                ? err.message
                : 'Could not reach Gemini right now. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
      });
  };

  const navTabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'ask', label: 'Ask Nomi', icon: <MessageCircle className="w-5 h-5" /> },
    { id: 'signals', label: 'Hidden Signals', icon: <Calendar className="w-5 h-5" /> },
    { id: 'science', label: 'Show Me the Science', icon: <Layers className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-dvh flex justify-center bg-[#eae1d8] sm:py-6 overflow-x-hidden">
      {/* Mobile-First App Shell matching nomiUI.png & HTML prototypes */}
      <div className="relative w-full max-w-[440px] min-h-dvh sm:min-h-[860px] sm:max-h-[920px] bg-[#FBF7F2] text-[#2D2126] flex flex-col justify-between shadow-2xl overflow-hidden sm:rounded-[40px] border border-[#ebe0d5]">
        {/* Top Decorative Watercolor Wash Background matching HTMLs */}
        <div
          aria-hidden="true"
          className="no-print absolute top-0 right-0 w-80 h-64 pointer-events-none opacity-40 mix-blend-multiply bg-gradient-to-bl from-[#dfc8c4] via-[#e8d5db] to-transparent rounded-full blur-2xl -mr-20 -mt-16"
        />

        {/* Brand Header Section matching nomiUI.png */}
        <header className="no-print relative z-10 px-6 pt-5 pb-3 shrink-0">
          {/* Quiet utility row: Safety Guide + Demo/Doctor Summary pill */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={() => setSafetyModalOpen(true)}
              className="min-h-[36px] inline-flex items-center gap-1 text-[11px] font-medium text-[#7C6A72] hover:text-[#4A2D3C] cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Educational only</span>
            </button>

            <div className="flex items-center gap-1.5">
              <PWAInstallButton />
              {patient ? (
                <button
                  type="button"
                  onClick={handleOpenDoctorSummary}
                  className="min-h-[36px] px-3 py-1 rounded-full bg-[#EFE4EB] text-[#4A2D3C] border border-[#E3D1DD] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Doctor Summary</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLoadDemoPatient}
                  disabled={isLoadingDemo}
                  className="min-h-[36px] px-3 py-1 rounded-full bg-[#4A2D3C] text-white text-[11px] font-medium cursor-pointer disabled:opacity-60"
                >
                  {isLoadingDemo ? 'Loading...' : 'Try Demo Patient'}
                </button>
              )}
            </div>
          </div>

          {/* Centered Brand Mark matching nomiUI.png */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => handleTabChange('ask')}
              className="font-display text-3xl font-medium text-[#2E1E26] tracking-tight cursor-pointer"
            >
              Nomi
            </button>
            <p className="text-[10px] tracking-[0.2em] font-medium text-[#7C6A72] uppercase mt-1">
              Your Women&apos;s Health AI Companion
            </p>
          </div>
        </header>

        <div className="relative z-10 px-5">
          <OfflineIndicator />
        </div>

        {/* Active Screen Content */}
        {showDoctorSummary ? (
          <div className="relative z-10 flex-1 px-5 py-2 overflow-y-auto min-h-0 space-y-3">
            <button
              type="button"
              onClick={() => setShowDoctorSummary(false)}
              className="no-print min-h-[40px] px-3.5 py-1.5 rounded-full border border-[#ECE0D7] bg-white/85 text-xs font-medium text-[#4A2D3C] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <DoctorSummaryPanel
              patient={patient}
              trend={trend}
              evidence={evidence}
              summaryData={doctorSummary}
              isLoading={isGeneratingSummary}
              error={summaryError}
              onGenerateSummary={handleGenerateDoctorSummary}
              onLoadDemoPatient={handleLoadDemoPatient}
            />
          </div>
        ) : (
          <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'ask' && (
              <HealthChatPanel
                patient={patient}
                evidence={evidence}
                messages={messages}
                onUpdateMessages={setMessages}
                onLoadDemoPatient={handleLoadDemoPatient}
                onViewSignals={() => handleTabChange('signals')}
                onViewScience={() => handleTabChange('science')}
                onOpenDoctorSummary={handleOpenDoctorSummary}
              />
            )}

            {activeTab === 'signals' && (
              <HiddenSignalsPanel
                patient={patient}
                trend={trend}
                explanationData={signalExplanation}
                isExplaining={isExplaining}
                explainError={explainError}
                onRequestExplanation={() => handleRequestSignalExplanation()}
                onAddLabPoint={handleAddLabPoint}
                onLoadDemoPatient={handleLoadDemoPatient}
                onAskInChat={handleAskQuestionInChat}
                onOpenDoctorSummary={handleOpenDoctorSummary}
              />
            )}

            {activeTab === 'science' && (
              <EvidencePanel
                evidence={evidence}
                onAskAboutSource={(source) =>
                  handleAskQuestionInChat(
                    `How does ${source.organizationOrJournal} (${source.year}) on "${source.relevanceTag}" relate here, and what are its limitations?`
                  )
                }
              />
            )}
          </main>
        )}

        {/* Fixed 3-Tab Bottom Navigation Bar matching nomiUI.png & HTMLs */}
        <nav
          aria-label="Bottom navigation"
          className="no-print relative z-10 border-t border-[#EBDDD4] bg-[#FBF7F2]/95 backdrop-blur-md px-3 py-2.5 pb-safe flex justify-around items-center shrink-0"
        >
          {navTabs.map((tab) => {
            const isActive = !showDoctorSummary && activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`min-h-[48px] flex-1 flex flex-col items-center justify-center cursor-pointer transition ${
                  isActive ? '' : 'text-[#7E6F76] hover:text-[#4A2D3C]'
                }`}
              >
                <div
                  className={`px-5 py-1 rounded-full flex items-center justify-center transition ${
                    isActive ? 'bg-[#EDE1E8] text-[#4A2D3C]' : ''
                  }`}
                >
                  {tab.icon}
                </div>
                <span
                  className={`text-[11px] mt-1 leading-tight text-center ${
                    isActive
                      ? 'font-semibold text-[#4A2D3C]'
                      : 'font-medium text-[#7E6F76]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        <UrgentCareModal
          open={safetyModalOpen}
          onClose={() => setSafetyModalOpen(false)}
        />
      </div>
    </div>
  );
}
