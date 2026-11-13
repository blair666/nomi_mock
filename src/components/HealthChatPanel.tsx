import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  FileText,
  Loader2,
  Send,
} from 'lucide-react';
import type { ChatMessage, EvidenceSource, PatientProfile } from '../shared/types';
import { sendHealthChat } from '../services/apiClient';

interface HealthChatPanelProps {
  patient: PatientProfile | null;
  evidence: EvidenceSource[];
  messages: ChatMessage[];
  onUpdateMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  onLoadDemoPatient: () => void;
  onViewSignals: () => void;
  onViewScience: () => void;
  onOpenDoctorSummary: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Why did my ferritin drop from 52 to 12 even though early tests looked normal?',
  'How could heavy menstrual bleeding connect to recurring fatigue?',
  'What labs are still missing before drawing conclusions?',
];

export const HealthChatPanel: React.FC<HealthChatPanelProps> = ({
  patient,
  evidence,
  messages,
  onUpdateMessages,
  onLoadDemoPatient,
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
        patient,
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
      <div className="px-6 pb-3 flex items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-medium text-[#2E1E26] tracking-tight">
            Ask Nomi
          </h1>
          <p className="text-xs text-[#73636A] mt-1">
            Ask, reflect, and get evidence-informed support.
          </p>
        </div>

        {!patient && (
          <button
            type="button"
            onClick={onLoadDemoPatient}
            className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#4A2D3C] text-white text-xs font-medium hover:bg-[#3D2331] transition shadow-xs shrink-0 cursor-pointer"
          >
            Try Demo Patient
          </button>
        )}
      </div>

      {/* Chat Messages Flow */}
      <div className="flex-1 px-5 py-2 space-y-5 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-4">
            {/* Initial Bestie greeting styled like index.html AI card */}
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 rounded-full bg-[#EBDCE4] text-[#4F2D3F] flex items-center justify-center shrink-0 mt-1 shadow-xs">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-white/80 backdrop-blur-sm border border-[#ECE0D8] text-[#2E1E26] text-[13.5px] leading-relaxed p-4 rounded-2xl rounded-tl-sm shadow-xs space-y-2.5">
                  <p>
                    I connect your recurring symptoms, multi-year lab trends, and trustworthy
                    women&apos;s health research—without diagnosing or guessing.
                  </p>
                  <p className="text-[#73636A] text-xs">
                    Tap <strong>Try Demo Patient</strong> to load our synthetic 27-year-old case
                    (ferritin 52 → 12 ng/mL), or ask a question below.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={onLoadDemoPatient}
                    className="min-h-[40px] inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#EFE4EB] text-[#4A2D3C] hover:bg-[#E8D7E3] transition border border-[#E3D1DD] cursor-pointer"
                  >
                    Try Demo Patient
                  </button>
                  <button
                    type="button"
                    onClick={onViewScience}
                    className="min-h-[40px] inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/75 text-[#4A2D3C] hover:bg-white transition border border-[#E4D7CF] cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                    See research
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-medium text-[#73636A] px-1">
                Or try asking:
              </p>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((q) => (
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
                  <div className="w-7 h-7 rounded-full bg-[#EBDCE4] text-[#4F2D3F] flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="bg-white/80 backdrop-blur-sm border border-[#ECE0D8] text-[#2E1E26] text-[13.5px] leading-relaxed p-4 rounded-2xl rounded-tl-sm shadow-xs whitespace-pre-wrap break-words">
                      {msg.content.split(/(\*\*[^*]+\*\*)/g).map((part, pIdx) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={pIdx} className="font-semibold text-[#2E1E26]">
                            {part.slice(2, -2)}
                          </strong>
                        ) : (
                          <React.Fragment key={pIdx}>{part}</React.Fragment>
                        )
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1 ml-1">
                      <span className="text-[11px] text-[#96868E]">
                        {formatTime(msg.timestamp)}
                      </span>
                      {citedEvidence.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#73636A]">
                          {citedEvidence.map((ev, eIdx) => (
                            <React.Fragment key={ev.id}>
                              {eIdx > 0 && <span aria-hidden="true">·</span>}
                              <button
                                type="button"
                                onClick={onViewScience}
                                className="text-[#4A2D3C] underline underline-offset-2 cursor-pointer"
                              >
                                {ev.organizationOrJournal} ({ev.year})
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>

                    {isLastAssistant && (
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={onViewSignals}
                          className="min-h-[40px] inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#EFE4EB] text-[#4A2D3C] hover:bg-[#E8D7E3] transition border border-[#E3D1DD] cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                          View Hidden Signals
                        </button>
                        <button
                          type="button"
                          onClick={onViewScience}
                          className="min-h-[40px] inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/75 text-[#4A2D3C] hover:bg-white transition border border-[#E4D7CF] cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                          Show Me the Science
                        </button>
                        {patient && (
                          <button
                            type="button"
                            onClick={onOpenDoctorSummary}
                            className="min-h-[40px] inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/75 text-[#4A2D3C] hover:bg-white transition border border-[#E4D7CF] cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5 text-[#5A384A]" />
                            Doctor Summary
                          </button>
                        )}
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
      <div className="px-5 pt-2 pb-3 shrink-0">
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
