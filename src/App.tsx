import React, { useEffect, useState } from 'react';
import {
  BellRing,
  Calendar,
  Check,
  ChevronRight,
  FileText,
  Layers,
  MessageCircle,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import type {
  CareReminder,
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
import { SistersCommunityPanel } from './components/SistersCommunityPanel';
import { DoctorSummaryPanel } from './components/DoctorSummaryPanel';
import { UrgentCareModal } from './components/UrgentCareModal';
import { PreventativeCareModal } from './components/PreventativeCareModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  addDaysIso,
  advanceDateByFrequency,
  getDefaultReminders,
  getReminderStatus,
  loadSavedReminders,
  saveReminders,
  todayIsoDate,
} from './data/preventativeReminders';

type ActiveTab = 'ask' | 'signals' | 'science' | 'sisters';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ask');
  const [demoMode, setDemoMode] = useState(false);
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

  const [reminders, setReminders] = useState<CareReminder[]>(() => loadSavedReminders());
  const [remindersModalOpen, setRemindersModalOpen] = useState(false);
  const [promptBannerVisible, setPromptBannerVisible] = useState(true);
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  const dueReminders = reminders.filter((r) => {
    const st = getReminderStatus(r);
    return st.kind === 'due' || st.kind === 'soon';
  });

  // Rotate proactive preventative & medication prompts periodically
  useEffect(() => {
    if (dueReminders.length <= 1) return;
    const timer = window.setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % dueReminders.length);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [dueReminders.length]);

  const activePrompt =
    dueReminders.length > 0
      ? dueReminders[promptIndex % dueReminders.length]
      : null;

  const handleMarkReminderDone = (id: string) => {
    const today = todayIsoDate();
    setReminders((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              lastCompletedDate: today,
              nextDueDate: advanceDateByFrequency(today, item.frequency),
            }
          : item
      )
    );
  };

  const handleSnoozeReminder = (id: string, days: number) => {
    setReminders((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              nextDueDate: addDaysIso(todayIsoDate(), days),
            }
          : item
      )
    );
  };

  const handleToggleReminderEnabled = (id: string) => {
    setReminders((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleAddReminder = (newItem: Omit<CareReminder, 'id'>) => {
    setReminders((prev) => [
      {
        ...newItem,
        id: `rem-custom-${Date.now()}`,
      },
      ...prev,
    ]);
    setPromptBannerVisible(true);
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetReminders = () => {
    setReminders(getDefaultReminders());
    setPromptIndex(0);
    setPromptBannerVisible(true);
  };

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
      setDemoMode(true);
      setPatient(data.patient);
      setTrend(data.trend);
      setEvidence(data.evidence);
      setSignalExplanation(null);
      setDoctorSummary(null);
      setMessages([]);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleDisableDemoMode = () => {
    setDemoMode(false);
    setPatient(null);
    setTrend(null);
    setSignalExplanation(null);
    setDoctorSummary(null);
    setShowDoctorSummary(false);
    setExplainError(null);
    setSummaryError(null);
    // Clear demo-derived conversation context when switching demo mode OFF
    setMessages([]);
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
        dateLabel: `${year}-06-01`,
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
      demoMode,
      patient: demoMode ? patient : null,
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
    { id: 'signals', label: 'Timeline', icon: <Calendar className="w-5 h-5" /> },
    { id: 'science', label: 'Evidence', icon: <Layers className="w-5 h-5" /> },
    { id: 'sisters', label: 'Sisters', icon: <Users className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-dvh flex justify-center bg-[#eae1d8] sm:py-6 overflow-x-hidden">
      {/* Mobile-First App Shell matching nomiUI.png & HTML prototypes */}
      <div className="relative w-full max-w-[440px] min-h-dvh sm:min-h-[860px] sm:max-h-[920px] bg-[#FAF5EF] text-[#2B1810] flex flex-col justify-between shadow-2xl overflow-hidden sm:rounded-[40px] border border-[#E8DED2]">
        {/* Top Decorative Watercolor Wave Effect matching spectrum_6373acb6.html */}
        <div
          aria-hidden="true"
          className="no-print absolute top-0 right-0 w-64 h-48 pointer-events-none opacity-80 z-0 overflow-hidden"
        >
          <svg
            className="w-full h-full object-cover"
            fill="none"
            viewBox="0 0 260 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M70 -20C110 40 180 30 220 90C250 135 280 140 290 190L300 -20Z"
              fill="url(#wave-gradient-1)"
              opacity="0.6"
            />
            <path
              d="M120 -30C160 50 200 45 250 110C270 140 280 170 300 210L300 -30Z"
              fill="url(#wave-gradient-2)"
              opacity="0.45"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="wave-gradient-1"
                x1="120"
                x2="270"
                y1="0"
                y2="180"
              >
                <stop stopColor="#E2B6BF" />
                <stop offset="0.6" stopColor="#CAB5CB" />
                <stop offset="1" stopColor="#DFD1C7" />
              </linearGradient>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="wave-gradient-2"
                x1="160"
                x2="290"
                y1="-20"
                y2="190"
              >
                <stop stopColor="#C5B1C9" />
                <stop offset="0.7" stopColor="#E6C6BA" />
                <stop offset="1" stopColor="#F2DEC9" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Brand Header Section matching nomiUI.png */}
        <header className="no-print relative z-10 px-4 sm:px-6 pt-5 pb-3 shrink-0">
          {/* Quiet utility row: Safety Guide + Demo/Doctor Summary pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={() => setSafetyModalOpen(true)}
              className="min-h-[36px] inline-flex items-center gap-1 text-[11px] font-medium text-[#7C6A72] hover:text-[#4A2D3C] cursor-pointer shrink-0"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Educational only</span>
            </button>

            <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setRemindersModalOpen(true)}
                aria-label={`Open preventative care and medication reminders (${dueReminders.length} due)`}
                className="min-h-[36px] px-2.5 py-1 rounded-full bg-[#FBF7F2] border border-[#EAE2D8] text-[#2B1810] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer hover:border-[#C7B7AB]"
              >
                <BellRing className="w-3.5 h-3.5 text-[#B3534B]" />
                <span>Checkups</span>
                {dueReminders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#B3534B] text-white text-[10px] font-semibold">
                    {dueReminders.length}
                  </span>
                )}
              </button>
              <PWAInstallButton />
              {demoMode && patient ? (
                <>
                  <button
                    type="button"
                    onClick={handleDisableDemoMode}
                    aria-label="Turn Synthetic Demo Patient mode off"
                    className="min-h-[36px] px-2.5 py-1 rounded-full bg-[#4A2D3C] text-white text-[11px] font-medium cursor-pointer"
                  >
                    Demo: ON
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDoctorSummary}
                    className="min-h-[36px] px-3 py-1 rounded-full bg-[#EFE4EB] text-[#4A2D3C] border border-[#E3D1DD] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Doctor Summary</span>
                  </button>
                </>
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

        {/* Proactive Preventative Checkups, Ultrasound, & Medication Prompt Strip */}
        {!showDoctorSummary && promptBannerVisible && activePrompt && (
          <div className="no-print relative z-10 mx-4 sm:mx-5 mb-2 rounded-2xl border border-[#E8D5D0] bg-[#FBF7F2]/95 px-3 py-2 shadow-xs flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setRemindersModalOpen(true)}
              className="flex-1 min-w-0 text-left flex items-center gap-2 cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-[#F7EBE8] text-[#B3534B] flex items-center justify-center shrink-0">
                <BellRing className="w-3.5 h-3.5" />
              </span>
              <span className="min-w-0 block">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#B3534B]">
                  {getReminderStatus(activePrompt).label} · {activePrompt.frequency}
                </span>
                <span className="block text-[11.5px] font-medium text-[#2B1810] truncate">
                  {activePrompt.title}
                </span>
              </span>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleMarkReminderDone(activePrompt.id)}
                title="Mark completed"
                aria-label={`Mark ${activePrompt.title} done`}
                className="min-h-[32px] px-2 py-1 rounded-full bg-[#EEF3E9] border border-[#DCE5D5] text-[#466B56] text-[10.5px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Done</span>
              </button>
              {dueReminders.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setPromptIndex((prev) => (prev + 1) % dueReminders.length)
                  }
                  title="Next reminder"
                  aria-label="Next preventative reminder"
                  className="min-w-[30px] min-h-[32px] rounded-full bg-[#FAF5EF] border border-[#EAE2D8] text-[#5C4D44] flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setPromptBannerVisible(false)}
                aria-label="Hide reminder banner"
                className="min-w-[28px] min-h-[32px] rounded-full text-[#8C7A70] hover:text-[#2B1810] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

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
                demoMode={demoMode}
                patient={demoMode ? patient : null}
                evidence={evidence}
                messages={messages}
                onUpdateMessages={setMessages}
                onLoadDemoPatient={handleLoadDemoPatient}
                onDisableDemoMode={handleDisableDemoMode}
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
                dueRemindersCount={dueReminders.length}
                onOpenReminders={() => setRemindersModalOpen(true)}
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

            {activeTab === 'sisters' && (
              <SistersCommunityPanel
                onAskNomiToFactCheck={(question) => handleAskQuestionInChat(question)}
              />
            )}
          </main>
        )}

        {/* Fixed 4-Tab Bottom Navigation Bar */}
        <nav
          aria-label="Bottom navigation"
          className="no-print relative z-10 border-t border-[#EBDDD4] bg-[#FBF7F2]/95 backdrop-blur-md px-2 py-2.5 pb-safe flex justify-around items-center shrink-0"
        >
          {navTabs.map((tab) => {
            const isActive = !showDoctorSummary && activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`min-h-[48px] flex-1 min-w-0 flex flex-col items-center justify-center cursor-pointer transition ${
                  isActive ? '' : 'text-[#7E6F76] hover:text-[#4A2D3C]'
                }`}
              >
                <div
                  className={`px-3.5 py-1 rounded-full flex items-center justify-center transition ${
                    isActive ? 'bg-[#EDE1E8] text-[#4A2D3C]' : ''
                  }`}
                >
                  {tab.icon}
                </div>
                <span
                  className={`text-[11px] mt-1 leading-tight text-center truncate max-w-full px-0.5 ${
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

        <PreventativeCareModal
          open={remindersModalOpen}
          reminders={reminders}
          onClose={() => setRemindersModalOpen(false)}
          onMarkDone={handleMarkReminderDone}
          onSnooze={handleSnoozeReminder}
          onToggleEnabled={handleToggleReminderEnabled}
          onAddReminder={handleAddReminder}
          onDeleteReminder={handleDeleteReminder}
          onResetDefaults={handleResetReminders}
          onAskInChat={handleAskQuestionInChat}
        />
      </div>
    </div>
  );
}
