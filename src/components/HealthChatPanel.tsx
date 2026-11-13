import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  FileText,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import type { ChatMessage, EvidenceSource, PatientProfile } from '../shared/types';
import { sendHealthChat } from '../services/apiClient';

interface HealthChatPanelProps {
  demoMode: boolean;
  patient: PatientProfile | null;
  evidence: EvidenceSource[];
  messages: ChatMessage[];
  onUpdateMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  onLoadDemoPatient: () => void;
  onDisableDemoMode: () => void;
  onViewSignals: () => void;
  onViewScience: () => void;
  onOpenDoctorSummary: () => void;
}

const GENERAL_QUESTIONS = [
  'Why am I always exhausted during my period?',
  'Hi, my period is irregular — what patterns matter?',
  'What can heavy menstrual bleeding mean for iron stores over time?',
];

const PATIENT_QUESTIONS = [
  'Why am I always exhausted during my period?',
  'Why did my ferritin drop from 52 to 12 even though early tests looked normal?',
  'What labs are still missing before drawing conclusions?',
];

function sanitizeChatMarkdown(raw: string): string {
  return raw
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<\/?svg[^>]*>/gi, '')
    .replace(/\\\*/g, '*');
}

export const HealthChatPanel: React.FC<HealthChatPanelProps> = ({
  demoMode,
  patient,
  evidence,
  messages,
  onUpdateMessages,
  onLoadDemoPatient,
  onDisableDemoMode,
  onViewSignals,
  onViewScience,
  onOpenDoctorSummary,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const handleSend = async (overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    onUpdateMessages(() => nextHistory);
    if (!overrideText) setInput('');
    setIsLoading(true);

    try {
      const response = await sendHealthChat({
        messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        demoMode,
        patient: demoMode ? patient : null,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        urgentAlert: response.urgentAlert,
        referencedEvidenceIds: response.referencedEvidenceIds,
      };

      onUpdateMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach Nomi right now.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page Title matching index.html */}
      <div className="px-5 sm:px-6 pb-2.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-medium text-[#2E1E26] tracking-tight">
            Ask Nomi
          </h1>
          <p className="text-xs text-[#73636A] mt-1">
            Ask, reflect, and get evidence-informed support.
          </p>
        </div>
      </div>

      {/* Explicit Demo Patient ON/OFF Status Bar */}
      <div className="mx-4 sm:mx-5 mb-2 rounded-2xl border border-[#E3D1DD] bg-[#F5EDF2] px-3.5 py-2 text-[11px] text-[#4A2D3C] flex flex-wrap items-center justify-between gap-2">
        {demoMode && patient ? (
          <>
            <div className="min-w-0">
              <span className="font-semibold">Synthetic Demo Patient</span>{' '}
              <span className="font-mono text-[10.5px]">({patient.id} · 27y · Ferritin 52→12)</span>
            </div>
            <button
              type="button"
              onClick={onDisableDemoMode}
              className="min-h-[32px] px-2.5 py-1 rounded-full bg-white border border-[#D7BFD0] text-[11px] font-semibold text-[#4A2D3C] cursor-pointer shrink-0"
            >
              Turn Demo OFF
            </button>
          </>
        ) : (
          <>
            <span className="text-[#6C5B63] min-w-0">
              Demo Mode: <strong className="text-[#4A2D3C]">OFF</strong> (general chat only)
            </span>
            <button
              type="button"
              onClick={onLoadDemoPatient}
              className="min-h-[32px] px-2.5 py-1 rounded-full bg-[#4A2D3C] text-[11px] font-semibold text-white cursor-pointer shrink-0"
            >
              Turn Demo ON
            </button>
          </>
        )}
      </div>

      {/* Chat Messages Flow */}
      <div className="flex-1 px-4 sm:px-5 py-2 space-y-5 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-4">
            {/* Initial Nomi greeting card */}
            <div className="flex items-start space-x-3">
              <div
                aria-hidden="true"
                className="w-7 h-7 rounded-full bg-[#EBDCE4] text-[#4F2D3F] flex items-center justify-center shrink-0 mt-1 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-white/80 backdrop-blur-sm border border-[#ECE0D8] text-[#2E1E26] text-[13.5px] leading-relaxed p-4 rounded-2xl rounded-tl-sm shadow-xs space-y-2.5">
                  <p>
                    I help explore your questions alongside women&apos;s health research—without
                    diagnosing or guessing.
                  </p>
                  <p className="text-[#73636A] text-xs">
                    {demoMode && patient
                      ? `Synthetic Demo Patient (${patient.id}, ${patient.age}y, ferritin 52 → 12 ng/mL, wearables: ${patient.wearables}) is active. Any synthetic data referenced will be clearly labeled.`
                      : 'Demo Mode is currently OFF—I will only respond to what you share, without assuming any demo labs or history.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={onViewSignals}
                    className="min-h-[44px] inline-flex items-center px-3.5 py-2 rounded-full text-xs font-medium bg-[#EFE4EB] text-[#4A2D3C] hover:bg-[#E8D7E3] transition border border-[#E3D1DD] cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                    View Timeline
                  </button>
                  <button
                    type="button"
                    onClick={onViewScience}
                    className="min-h-[44px] inline-flex items-center px-3.5 py-2 rounded-full text-xs font-medium bg-white/80 text-[#4A2D3C] hover:bg-white transition border border-[#E4D7CF] cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                    View Evidence
                  </button>
                  <button
                    type="button"
                    onClick={onOpenDoctorSummary}
                    className="min-h-[44px] inline-flex items-center px-3.5 py-2 rounded-full text-xs font-medium bg-white/80 text-[#4A2D3C] hover:bg-white transition border border-[#E4D7CF] cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                    Doctor Summary
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-medium text-[#73636A] px-1">
                Or try asking:
              </p>
              <div className="space-y-2">
                {(demoMode && patient ? PATIENT_QUESTIONS : GENERAL_QUESTIONS).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="w-full min-h-[44px] text-left bg-white/75 hover:bg-white border border-[#ECE0D8] text-[#2E1E26] text-xs leading-relaxed px-4 py-2.5 rounded-2xl transition cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <aside
              aria-label="Medical and privacy disclaimer"
              className="rounded-2xl border border-[#EAE2D8] bg-[#FAF5EF]/90 px-3.5 py-2.5 text-[11px] leading-relaxed text-[#6F6057] space-y-1"
            >
              <p>
                Educational only, not a medical diagnosis or treatment advice. Always review
                laboratory results and symptoms with a qualified clinician.
              </p>
              <p className="font-medium text-[#78665E]">
                Session-only memory · synthetic demo data · not HIPAA-certified
              </p>
            </aside>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isLastAssistant = !isUser && idx === messages.length - 1;
            const citedEvidence = (msg.referencedEvidenceIds || [])
              .map((id) => evidence.find((e) => e.id === id))
              .filter((e): e is EvidenceSource => Boolean(e));

            if (isUser) {
              return (
                <div key={msg.id} className="flex flex-col items-end">
                  <div className="max-w-[85%] bg-[#F0E6EC] text-[#2E1E26] text-sm leading-relaxed p-4 rounded-2xl rounded-tr-sm shadow-sm border border-[#E8D9E3] whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                  <span className="text-[11px] text-[#96868E] mt-1 mr-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="space-y-2">
                {msg.urgentAlert?.triggered && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[#F2DCDC] bg-[#FBF1F1] p-3.5 text-xs text-[#441B1B]"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#A63838]" />
                      <div className="space-y-1">
                        <p className="font-semibold">
                          Urgent Symptom Guidance ({msg.urgentAlert.matchedSignals.join(', ')})
                        </p>
                        <p className="leading-relaxed text-[#6F4747]">
                          {msg.urgentAlert.guidance}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <div
                    aria-hidden="true"
                    className="w-7 h-7 rounded-full bg-[#EBDCE4] text-[#4F2D3F] flex items-center justify-center shrink-0 mt-1 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="bg-white/85 backdrop-blur-sm border border-[#ECE0D8] text-[#2E1E26] text-[13.5px] leading-relaxed p-4 rounded-2xl rounded-tl-sm shadow-xs break-words space-y-2">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="leading-relaxed mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-4 space-y-1 mb-2 last:mb-0">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-4 space-y-1 mb-2 last:mb-0">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-[#2E1E26]">{children}</strong>
                          ),
                          em: ({ children }) => <em className="italic">{children}</em>,
                          h1: ({ children }) => (
                            <h3 className="font-semibold text-[#2E1E26] mt-2 mb-1">{children}</h3>
                          ),
                          h2: ({ children }) => (
                            <h3 className="font-semibold text-[#2E1E26] mt-2 mb-1">{children}</h3>
                          ),
                          h3: ({ children }) => (
                            <h4 className="font-semibold text-[#2E1E26] mt-2 mb-1">{children}</h4>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#4A2D3C] underline underline-offset-2 font-medium break-all"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {sanitizeChatMarkdown(msg.content)}
                      </ReactMarkdown>
                    </div>

                    <div className="mt-1 ml-1">
                      <span className="text-[11px] text-[#96868E]">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    {citedEvidence.length > 0 && (
                      <div className="mt-2.5 space-y-2">
                        <p className="text-[11px] font-semibold text-[#4A2D3C] px-0.5">
                          Verified Sources Referenced:
                        </p>
                        {citedEvidence.map((ev) => (
                          <div
                            key={ev.id}
                            className="rounded-xl border border-[#ECE0D7] bg-white/85 p-3 text-[11px] text-[#4A3B42] space-y-1"
                          >
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-[#4A2D3C] underline underline-offset-2 inline-flex items-start gap-1 leading-snug"
                            >
                              <span>
                                {ev.title} ({ev.organizationOrJournal}, {ev.year})
                              </span>
                              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                            </a>
                            <p>
                              <span className="font-semibold text-[#2E1E26]">
                                Female representation:
                              </span>{' '}
                              {ev.femaleRepresentation}
                            </p>
                            <p>
                              <span className="font-semibold text-[#2E1E26]">Limitations:</span>{' '}
                              {ev.limitations}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {isLastAssistant && (
                      <div
                        role="group"
                        aria-label="Follow-up actions"
                        className="flex flex-wrap items-center gap-2 mt-3"
                      >
                        <button
                          type="button"
                          onClick={onViewSignals}
                          className="min-h-[44px] inline-flex items-center px-3.5 py-2 rounded-full text-xs font-medium bg-[#EFE4EB] text-[#4A2D3C] hover:bg-[#E8D7E3] transition border border-[#E3D1DD] cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                          <span>View Timeline</span>
                        </button>
                        <button
                          type="button"
                          onClick={onViewScience}
                          className="min-h-[44px] inline-flex items-center px-3.5 py-2 rounded-full text-xs font-medium bg-white/85 text-[#4A2D3C] hover:bg-white transition border border-[#E4D7CF] cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                          <span>View Evidence</span>
                        </button>
                        <button
                          type="button"
                          onClick={onOpenDoctorSummary}
                          className="min-h-[44px] inline-flex items-center px-3.5 py-2 rounded-full text-xs font-medium bg-white/85 text-[#4A2D3C] hover:bg-white transition border border-[#E4D7CF] cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                          <span>Doctor Summary</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#4A2D3C] bg-white/85 border border-[#ECE0D8] rounded-2xl px-4 py-3 w-fit shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking with Gemini...</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-[#F2DCDC] bg-[#FBF1F1] px-4 py-3 text-xs text-[#441B1B]"
          >
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Message Input Bar matching index.html */}
      <div className="px-4 sm:px-5 pt-2 pb-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <label htmlFor="health-chat-input" className="sr-only">
            Ask Nomi
          </label>
          <input
            id="health-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Nomi..."
            className="w-full min-h-[46px] bg-white/90 border border-[#E6D7CD] placeholder-[#9D8E95] text-xs sm:text-sm text-[#2E1E26] rounded-full pl-4 pr-12 py-3 shadow-xs focus:outline-none focus:ring-1 focus:ring-[#8E5E77]"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            className="absolute right-1.5 w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-[#4A2D3C] text-white flex items-center justify-center hover:bg-[#3D2331] disabled:opacity-40 transition shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
