import React, { useState } from 'react';
import { ChevronRight, ExternalLink, HelpCircle, Info, MessageCircle, Scale } from 'lucide-react';
import type { EvidenceSource } from '../shared/types';

interface EvidencePanelProps {
  evidence: EvidenceSource[];
  onAskAboutSource: (source: EvidenceSource) => void;
}

function getSpectrumTheme(sourceId: string) {
  if (sourceId === 'houston-bmjopen-2018') {
    return {
      tierLabel: 'Limited',
      tierSummary: 'Some randomized trials, but inconsistent ferritin cutoffs across studies.',
      filledDots: 1,
      cardBg: 'bg-[#FBF1F1] border-[#F2DCDC]',
      washBg: 'bg-[#f5d8d8]',
      dotColor: 'text-[#C45E5E]',
      dotBg: 'bg-[#C45E5E]',
      dotBorder: 'border-[#C45E5E]',
      titleColor: 'text-[#441B1B]',
      subColor: 'text-[#6F4747]',
      divider: 'border-[#F0D5D5]/80',
      chevronColor: 'text-[#A87F7F]',
      tag1Bg: 'bg-[#FCE5E5] text-[#A63838] border-[#F5C4C4]',
      tag2Bg: 'bg-[#F9ECEC] text-[#805555]',
      tag1Text: 'Non-Anemic Fatigue',
      tag2Text: '18 RCTs · Varied Cutoffs',
    };
  }
  if (sourceId === 'acog-hmb-guidance') {
    return {
      tierLabel: 'Some',
      tierSummary: 'Strong clinical guidance on bleeding & iron loss; individual cause needs workup.',
      filledDots: 2,
      cardBg: 'bg-[#FCF6EB] border-[#F3E7D3]',
      washBg: 'bg-[#f5e3c7]',
      dotColor: 'text-[#C48E38]',
      dotBg: 'bg-[#C48E38]',
      dotBorder: 'border-[#C48E38]',
      titleColor: 'text-[#463214]',
      subColor: 'text-[#705634]',
      divider: 'border-[#EFE0C7]/80',
      chevronColor: 'text-[#A89377]',
      tag1Bg: 'bg-[#FDF0D8] text-[#9A6A1E] border-[#F7DCAC]',
      tag2Bg: 'bg-[#F8EFE1] text-[#7A6242]',
      tag1Text: 'ACOG · FIGO Guidance',
      tag2Text: 'Clinical Evaluation Needed',
    };
  }
  return {
    tierLabel: 'Stronger',
    tierSummary: 'Global normative standard defining iron store depletion below 15 ng/mL.',
    filledDots: 3,
    cardBg: 'bg-[#F0F6F2] border-[#DCEDE0]',
    washBg: 'bg-[#c9e7d3]',
    dotColor: 'text-[#3B8055]',
    dotBg: 'bg-[#3B8055]',
    dotBorder: 'border-[#3B8055]',
    titleColor: 'text-[#1E3B27]',
    subColor: 'text-[#41614A]',
    divider: 'border-[#D5E7DA]/80',
    chevronColor: 'text-[#7EA38B]',
    tag1Bg: 'bg-[#E1F3E6] text-[#2C6B41] border-[#BFDFCA]',
    tag2Bg: 'bg-[#E9F2EC] text-[#4E6B57]',
    tag1Text: 'WHO Guideline (2020)',
    tag2Text: 'Ferritin < 15 ng/mL',
  };
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  onAskAboutSource,
}) => {
  const orderedIds = ['houston-bmjopen-2018', 'acog-hmb-guidance', 'who-ferritin-2020'];
  const orderedEvidence = [...evidence].sort(
    (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
  );
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header Section matching spectrum.html */}
      <div className="px-6 pb-3">
        <h1 className="font-display text-3xl font-medium text-[#2E1E26] tracking-tight">
          Show Me the Science
        </h1>
        <p className="text-[11.5px] leading-relaxed text-[#73636A] mt-1.5">
          Transparently indexing medical guidance against verifiable sources, limitations, and what
          remains unknown.
        </p>
      </div>

      {/* Cards Section matching spectrum.html */}
      <div className="flex-1 px-6 py-2 space-y-4 overflow-y-auto min-h-0">
        {orderedEvidence.map((source) => {
          const theme = getSpectrumTheme(source.id);
          const isOpen = openId === source.id;

          return (
            <div
              key={source.id}
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-xs transition hover:shadow-sm ${theme.cardBg}`}
            >
              {/* Abstract gentle color wash */}
              <div
                aria-hidden="true"
                className={`absolute -right-8 -bottom-8 w-28 h-28 rounded-full blur-xl opacity-60 pointer-events-none ${theme.washBg}`}
              />

              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : source.id)}
                className="relative z-10 w-full text-left cursor-pointer"
                aria-expanded={isOpen}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 ${theme.dotColor}`} aria-hidden="true">
                      {[1, 2, 3].map((dot) => (
                        <span
                          key={dot}
                          className={`w-2.5 h-2.5 rounded-full ${
                            dot <= theme.filledDots
                              ? theme.dotBg
                              : `border ${theme.dotBorder}`
                          }`}
                        />
                      ))}
                    </div>
                    <h3 className={`font-display text-xl font-medium ${theme.titleColor}`}>
                      {theme.tierLabel}
                    </h3>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${theme.chevronColor} ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                <p className={`text-xs mb-3 ${theme.subColor}`}>{theme.tierSummary}</p>

                <div className={`pt-2 border-t ${theme.divider}`}>
                  <p className={`text-xs font-semibold ${theme.titleColor}`}>
                    {source.relevanceTag}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${theme.tag1Bg}`}
                    >
                      {theme.tag1Text}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${theme.tag2Bg}`}>
                      {theme.tag2Text}
                    </span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="relative z-10 mt-3 pt-3 border-t border-black/10 space-y-2.5 text-xs">
                  <div className="rounded-xl bg-white/85 p-3 space-y-1">
                    <p className="font-semibold text-[#2E1E26]">{source.title}</p>
                    <p className="text-[#4A3B42] leading-relaxed">{source.keyFinding}</p>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3 space-y-1">
                    <p className="font-semibold text-[#705634] inline-flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" />
                      Limitations
                    </p>
                    <p className="text-[#4A3B42] leading-relaxed">{source.limitations}</p>
                  </div>

                  <div className="rounded-xl bg-white/80 p-3 space-y-1">
                    <p className="font-semibold text-[#4A2D3C] inline-flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      What Remains Unknown
                    </p>
                    <p className="text-[#4A3B42] leading-relaxed">{source.whatRemainsUnknown}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] inline-flex items-center gap-1 text-xs font-semibold text-[#4A2D3C] underline underline-offset-2"
                    >
                      <span>Open verifiable source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onAskAboutSource(source)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#4A2D3C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Ask Nomi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Footnote Disclaimer matching spectrum.html */}
        <div className="flex items-start space-x-2 pt-2 pb-2 text-[#83737B]">
          <Info className="w-4 h-4 text-[#8A7982] shrink-0 mt-0.5" />
          <span className="text-[11px] leading-tight">
            Evidence coverage represents clinical research volume and limitations, not personal
            health risk. Tap any card to inspect limitations &amp; unknowns.
          </span>
        </div>
      </div>
    </div>
  );
};
