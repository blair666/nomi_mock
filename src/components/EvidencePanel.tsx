import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  ChevronRight,
  Droplet,
  ExternalLink,
  HelpCircle,
  Loader2,
  MessageCircle,
  Moon,
  Scale,
  Search,
  Sparkles,
} from 'lucide-react';
import type {
  EvidenceSource,
  PubMedExplanationResponse,
  PubMedPaper,
  PubMedSearchResponse,
} from '../shared/types';
import { explainPubMedPaper, fetchPubMedResearch } from '../services/apiClient';

interface EvidencePanelProps {
  evidence: EvidenceSource[];
  onAskAboutSource: (source: EvidenceSource) => void;
}

type TopicFilter = 'all' | 'nutrition' | 'sleep' | 'hormones';

interface SpectrumTheme {
  tierKey: 'strong' | 'some' | 'limited';
  tierBadge: string;
  cohortBadge: string;
  tierSummary: string;
  footerLabel: string;
  cardBg: string;
  divider: string;
  badgeClass: string;
  cohortClass: string;
  iconWrap: string;
  waveFill: string;
  wavePath: string;
  icon: 'droplet' | 'moon' | 'alert';
}

function getSpectrumTheme(sourceId: string): SpectrumTheme {
  if (sourceId === 'fasting-cycling-women') {
    return {
      tierKey: 'limited',
      tierBadge: '● Limited Evidence',
      cohortBadge: 'PMID 42429418 · Female % Unknown',
      tierSummary:
        'Most fasting literature relies on male physiology; cycling women may experience cortisol shifts and LH disruption.',
      footerLabel: 'Literature Bias',
      cardBg: 'bg-[#F7EBE8] border-[#F0DCD7]',
      divider: 'border-[#F0DCD7]',
      badgeClass: 'bg-[#B3534B]/15 text-[#B3534B] border-[#B3534B]/30',
      cohortClass: 'bg-[#FAF5EF]/90 text-[#B3534B] border-[#F0DCD7]',
      iconWrap: 'bg-[#B3534B]/10 text-[#B3534B]',
      waveFill: '#DFA99C',
      wavePath: 'M40 90C75 40 120 70 160 30V90H40Z',
      icon: 'alert',
    };
  }
  if (sourceId === 'luteal-sleep-fragmentation') {
    return {
      tierKey: 'some',
      tierBadge: '● Emerging',
      cohortBadge: 'PMID 20469807 · Female % Unknown',
      tierSummary:
        'Progesterone increases nocturnal basal temperature ~0.4°C and is associated with altered REM sleep during the luteal phase.',
      footerLabel: 'Thermal Target',
      cardBg: 'bg-[#F7EFE8] border-[#EFE0D5]',
      divider: 'border-[#EFE0D5]',
      badgeClass: 'bg-[#BA7D32]/15 text-[#BA7D32] border-[#BA7D32]/30',
      cohortClass: 'bg-[#FAF5EF]/90 text-[#78665E] border-[#EFE0D5]',
      iconWrap: 'bg-[#BA7D32]/10 text-[#BA7D32]',
      waveFill: '#E5B888',
      wavePath: 'M20 90C60 30 110 65 160 25V90H20Z',
      icon: 'moon',
    };
  }
  return {
    tierKey: 'strong',
    tierBadge: '● Strong Evidence',
    cohortBadge: '18 RCTs · Female % Unknown',
    tierSummary:
      'Low serum ferritin (<30 ng/mL; WHO threshold <15 ng/mL) correlates with daytime exhaustion in menstruating women even without anemia.',
    footerLabel: 'Target Baseline',
    cardBg: 'bg-[#EEF3E9] border-[#DCE5D5]',
    divider: 'border-[#DCE5D5]',
    badgeClass: 'bg-[#466B56]/15 text-[#466B56] border-[#466B56]/30',
    cohortClass: 'bg-[#FAF5EF]/90 text-[#466B56] border-[#DCE5D5]',
    iconWrap: 'bg-[#466B56]/10 text-[#466B56]',
    waveFill: '#93B49E',
    wavePath: 'M35 90C70 45 110 75 160 30V90H35Z',
    icon: 'droplet',
  };
}

const TOPIC_FILTERS: Array<{ id: TopicFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'hormones', label: 'Hormones' },
];

const TOPIC_PRESETS = [
  'ferritin heavy menstrual bleeding fatigue women',
  'luteal phase progesterone REM sleep women',
  'time-restricted eating reproductive hormones women',
];

function matchesTopicFilter(source: EvidenceSource, filter: TopicFilter): boolean {
  if (filter === 'all') return true;
  const text = `${source.id} ${source.relevanceTag} ${source.title} ${source.keyFinding}`.toLowerCase();
  if (filter === 'nutrition') {
    return text.includes('iron') || text.includes('ferritin') || text.includes('fasting');
  }
  if (filter === 'sleep') {
    return text.includes('sleep') || text.includes('rem');
  }
  if (filter === 'hormones') {
    return (
      text.includes('progesterone') ||
      text.includes('luteal') ||
      text.includes('hormone') ||
      text.includes('fasting') ||
      text.includes('lh')
    );
  }
  return true;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  onAskAboutSource,
}) => {
  const orderedIds = [
    'iron-ferritin-fatigue',
    'luteal-sleep-fragmentation',
    'fasting-cycling-women',
  ];
  const orderedEvidence = [...evidence].sort(
    (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
  );

  const [activeFilter, setActiveFilter] = useState<TopicFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredEvidence = orderedEvidence.filter((source) =>
    matchesTopicFilter(source, activeFilter)
  );

  // Deterministic counts from the curated evidence dataset (never fabricated percentages)
  const tierCounts = orderedEvidence.reduce(
    (acc, item) => {
      const key = getSpectrumTheme(item.id).tierKey;
      acc[key] += 1;
      return acc;
    },
    { strong: 0, some: 0, limited: 0 }
  );
  const totalSources = orderedEvidence.length || 1;
  const strongWidth = Math.round((tierCounts.strong / totalSources) * 100);
  const someWidth = Math.round((tierCounts.some / totalSources) * 100);
  const limitedWidth = Math.max(0, 100 - strongWidth - someWidth);

  const [topicQuery, setTopicQuery] = useState(TOPIC_PRESETS[0]);
  const [researchResult, setResearchResult] = useState<PubMedSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [explanations, setExplanations] = useState<Record<string, PubMedExplanationResponse>>({});
  const [explainingPmid, setExplainingPmid] = useState<string | null>(null);
  const [explainErrors, setExplainErrors] = useState<Record<string, string>>({});

  const runPubMedSearch = async (queryToRun: string) => {
    const clean = queryToRun.trim() || TOPIC_PRESETS[0];
    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await fetchPubMedResearch(clean);
      setResearchResult(data);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : 'Unable to reach PubMed search right now.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    runPubMedSearch(TOPIC_PRESETS[0]);
  }, []);

  const handleExplainPaper = async (paper: PubMedPaper) => {
    if (explainingPmid === paper.pmid) return;
    setExplainingPmid(paper.pmid);
    setExplainErrors((prev) => {
      const next = { ...prev };
      delete next[paper.pmid];
      return next;
    });
    try {
      const res = await explainPubMedPaper(paper, researchResult?.sanitizedQuery || topicQuery);
      setExplanations((prev) => ({ ...prev, [paper.pmid]: res }));
    } catch (err) {
      setExplainErrors((prev) => ({
        ...prev,
        [paper.pmid]:
          err instanceof Error ? err.message : 'Unable to explain this PubMed record right now.',
      }));
    } finally {
      setExplainingPmid(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header Section matching spectrum.html */}
      <div className="px-5 pt-1 pb-3">
        <h1 className="font-display text-[29px] leading-tight text-[#2B1810] font-normal tracking-[-0.015em]">
          Evidence
        </h1>
        <p className="text-[13px] leading-relaxed text-[#73635A] mt-1 pr-2">
          Transparently indexing medical guidance against verifiable sources, limitations, and what
          remains unknown.
        </p>
      </div>

      {/* Scrollable Evidence Spectrum + PubMed Literature Search */}
      <div className="flex-1 px-5 py-2 space-y-3.5 overflow-y-auto min-h-0">
        {/* Profile Evidence Audit KPI Card (computed deterministically from loaded curated sources) */}
        <section
          aria-label="Evidence Spectrum Audit"
          className="rounded-[20px] bg-[#FBF7F2] border border-[#EAE2D8] p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[10px] tracking-[0.16em] uppercase font-semibold text-[#78665E]">
              Curated Evidence Audit
            </span>
            <div className="flex items-center space-x-2 text-[11px] font-semibold">
              <span className="text-[#466B56]">● {tierCounts.strong}</span>
              <span className="text-[#BA7D32]">● {tierCounts.some}</span>
              <span className="text-[#B3534B]">● {tierCounts.limited}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 mb-2.5">
            <h2 className="font-display text-[22px] font-normal text-[#2B1810] tracking-[-0.015em]">
              Clinical Rigor
            </h2>
            <span className="text-[11px] text-[#73635A]">Cohort %: Unknown</span>
          </div>

          {/* Segmented horizontal progress bar */}
          <div
            aria-hidden="true"
            className="h-2.5 w-full bg-[#EAE2D8]/60 rounded-full flex overflow-hidden p-0.5 gap-0.5"
          >
            {strongWidth > 0 && (
              <div
                className="bg-[#466B56] h-full rounded-l-full transition-all"
                style={{ width: `${strongWidth}%` }}
              />
            )}
            {someWidth > 0 && (
              <div
                className="bg-[#BA7D32] h-full transition-all"
                style={{ width: `${someWidth}%` }}
              />
            )}
            {limitedWidth > 0 && (
              <div
                className="bg-[#B3534B] h-full rounded-r-full transition-all"
                style={{ width: `${limitedWidth}%` }}
              />
            )}
          </div>

          {/* Legend row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[10.5px] text-[#6F6057] pt-2 border-t border-[#EAE2D8]/70">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#466B56]" />
              Strong ({tierCounts.strong})
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#BA7D32]" />
              Emerging ({tierCounts.some})
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#B3534B]" />
              Limited ({tierCounts.limited})
            </span>
          </div>
        </section>

        {/* Topic Explorer Filter Pills */}
        <section aria-label="Topic Explorer" className="pt-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-[0.16em] uppercase font-semibold text-[#78665E]">
              Topic Explorer
            </span>
            <span className="text-[11px] text-[#78665E]">
              Showing {filteredEvidence.length} of {orderedEvidence.length} sources
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {TOPIC_FILTERS.map((filter) => {
              const isSelected = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  aria-pressed={isSelected}
                  className={`min-h-[36px] px-3.5 py-1 rounded-full text-[11.5px] font-medium whitespace-nowrap cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#2B1810] text-[#FAF5EF] shadow-sm'
                      : 'bg-[#FAF5EF] text-[#5C4D44] border border-[#EAE2D8] hover:border-[#C7B7AB]'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Curated Evidence Spectrum Cards */}
        {filteredEvidence.map((source) => {
          const theme = getSpectrumTheme(source.id);
          const isOpen = openId === source.id;

          return (
            <article
              key={source.id}
              className={`relative overflow-hidden rounded-[20px] border p-4 transition-all ${theme.cardBg}`}
            >
              {/* Soft Corner Wave SVG matching spectrum.html */}
              <div
                aria-hidden="true"
                className="absolute bottom-0 right-0 w-36 h-20 pointer-events-none opacity-40 overflow-hidden"
              >
                <svg className="w-full h-full" fill="none" viewBox="0 0 160 90">
                  <path d={theme.wavePath} fill={theme.waveFill} />
                </svg>
              </div>

              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : source.id)}
                className="relative z-10 w-full text-left cursor-pointer"
                aria-expanded={isOpen}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${theme.badgeClass}`}
                    >
                      {theme.tierBadge}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${theme.cohortClass}`}
                    >
                      {theme.cohortBadge}
                    </span>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${theme.iconWrap}`}
                    aria-hidden="true"
                  >
                    {theme.icon === 'droplet' && <Droplet className="w-3.5 h-3.5" />}
                    {theme.icon === 'moon' && <Moon className="w-3.5 h-3.5" />}
                    {theme.icon === 'alert' && <AlertCircle className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <h3 className="font-display text-[20px] font-medium text-[#2B1810] tracking-tight leading-snug">
                  {source.relevanceTag}
                </h3>
                <p className="text-[12.5px] leading-relaxed text-[#594C44] mt-1">
                  {theme.tierSummary}
                </p>

                <div
                  className={`mt-3 pt-2.5 border-t ${theme.divider} flex items-center justify-between gap-2`}
                >
                  <span className="text-[11px] font-medium text-[#73635A] truncate">
                    {theme.footerLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2B1810] shrink-0">
                    <span>{isOpen ? 'Hide details' : 'Challenge This Insight'}</span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                    />
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="relative z-10 mt-3 pt-3 border-t border-black/10 space-y-2.5 text-xs">
                  <div className="rounded-2xl bg-[#FAF5EF]/95 border border-[#EAE2D8] p-3 space-y-1">
                    <p className="font-semibold text-[#2B1810] leading-snug">{source.title}</p>
                    <p className="text-[#594C44] leading-relaxed">{source.keyFinding}</p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF5EF]/95 border border-[#EAE2D8] p-3 space-y-1">
                    <p className="font-semibold text-[#2B1810]">
                      Female Representation &amp; Sex-Specific Findings
                    </p>
                    <p className="text-[#594C44] leading-relaxed">
                      <span className="font-medium text-[#2B1810]">Cohort representation:</span>{' '}
                      {source.femaleRepresentation}
                    </p>
                    <p className="text-[#594C44] leading-relaxed">
                      <span className="font-medium text-[#2B1810]">Sex-specific findings:</span>{' '}
                      {source.sexSpecificFindings}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF5EF]/95 border border-[#EAE2D8] p-3 space-y-1">
                    <p className="font-semibold text-[#785322] inline-flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" />
                      Limitations
                    </p>
                    <p className="text-[#594C44] leading-relaxed">{source.limitations}</p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF5EF]/95 border border-[#EAE2D8] p-3 space-y-1">
                    <p className="font-semibold text-[#2B1810] inline-flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      What Remains Unknown
                    </p>
                    <p className="text-[#594C44] leading-relaxed">{source.whatRemainsUnknown}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] inline-flex items-center gap-1 text-xs font-semibold text-[#2B1810] underline underline-offset-2"
                    >
                      <span>Open verifiable source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onAskAboutSource(source)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#2B1810] text-[#FAF5EF] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#3E261B]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Ask Nomi</span>
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {/* PubMed Live Search (NCBI ESearch + ESummary) */}
        <section
          aria-label="PubMed Literature Search"
          className="rounded-[20px] border border-[#EAE2D8] bg-[#FBF7F2] p-4 space-y-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-[21px] font-normal text-[#2B1810] inline-flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#2B1810] shrink-0" />
                <span>PubMed Literature Search</span>
              </h2>
              <p className="text-[11.5px] text-[#73635A] mt-0.5 leading-relaxed">
                Searches general medical topics only via NCBI ESearch &amp; ESummary (no personal
                patient data sent).
              </p>
            </div>
            {researchResult && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                  researchResult.fallbackUsed
                    ? 'bg-[#BA7D32]/15 text-[#BA7D32] border-[#BA7D32]/30'
                    : 'bg-[#466B56]/15 text-[#466B56] border-[#466B56]/30'
                }`}
              >
                {researchResult.fallbackUsed ? 'Verified Cache' : 'NCBI Live'}
              </span>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runPubMedSearch(topicQuery);
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="pubmed-topic-input" className="sr-only">
              Search PubMed medical topics
            </label>
            <input
              id="pubmed-topic-input"
              type="text"
              value={topicQuery}
              onChange={(e) => setTopicQuery(e.target.value)}
              placeholder="Search general medical topic..."
              className="flex-1 min-w-0 min-h-[44px] bg-[#FAF5EF] border border-[#EAE2D8] rounded-full px-3.5 text-xs text-[#2B1810] placeholder-[#8C7A70] focus:outline-none focus:ring-1 focus:ring-[#2B1810]"
            />
            <button
              type="submit"
              disabled={isSearching}
              aria-label="Search PubMed"
              className="min-h-[44px] px-4 rounded-full bg-[#2B1810] text-[#FAF5EF] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#3E261B] disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Search</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {TOPIC_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setTopicQuery(preset);
                  runPubMedSearch(preset);
                }}
                className="min-h-[34px] px-3 py-1 rounded-full border border-[#EAE2D8] bg-[#FAF5EF] hover:border-[#C7B7AB] text-[10.5px] text-[#5C4D44] text-left cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {searchError && (
            <div
              role="alert"
              className="rounded-2xl border border-[#F0DCD7] bg-[#F7EBE8] p-3 text-xs text-[#B3534B]"
            >
              {searchError}
            </div>
          )}

          {researchResult?.notice && (
            <p className="text-[11px] text-[#73635A] bg-[#FAF5EF] border border-[#EAE2D8] rounded-2xl px-3 py-2 leading-relaxed">
              {researchResult.notice}
            </p>
          )}

          {isSearching && !researchResult && (
            <div className="flex items-center gap-2 text-xs text-[#2B1810] py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching NCBI PubMed...</span>
            </div>
          )}

          {researchResult && researchResult.papers.length === 0 && (
            <div className="rounded-2xl border border-[#EAE2D8] bg-[#FAF5EF] p-3 text-xs text-[#73635A]">
              No matching PubMed articles found for this topic. Try another general medical search
              phrase.
            </div>
          )}

          {researchResult && researchResult.papers.length > 0 && (
            <div className="space-y-3">
              {researchResult.papers.map((paper) => {
                const explanation = explanations[paper.pmid];
                const isExplaining = explainingPmid === paper.pmid;
                const explainErr = explainErrors[paper.pmid];
                const authorSummary =
                  paper.authors.length > 3
                    ? `${paper.authors.slice(0, 3).join(', ')} et al.`
                    : paper.authors.join(', ') || 'Authors not listed in ESummary';

                return (
                  <article
                    key={paper.pmid}
                    className="rounded-2xl border border-[#EAE2D8] bg-[#FAF5EF] p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-mono text-[10.5px] font-semibold text-[#2B1810] bg-[#E9DEE4] px-2.5 py-0.5 rounded-full">
                        PMID {paper.pmid}
                      </span>
                      <span className="text-[10.5px] font-medium text-[#73635A]">
                        {paper.journal} · {paper.pubDate}
                      </span>
                    </div>

                    <h3 className="font-display text-[17px] font-medium text-[#2B1810] leading-snug">
                      {paper.title}
                    </h3>

                    <p className="text-[11px] text-[#594C44] leading-relaxed">
                      <span className="font-semibold text-[#2B1810]">Authors:</span> {authorSummary}
                    </p>

                    <p className="text-[11px] text-[#73635A] leading-relaxed break-words">
                      {paper.publicationDetails}
                    </p>

                    {paper.publicationTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {paper.publicationTypes.slice(0, 3).map((pt) => (
                          <span
                            key={pt}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#FBF7F2] border border-[#EAE2D8] text-[#6F6057]"
                          >
                            {pt}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <a
                        href={paper.pubmedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] inline-flex items-center gap-1 text-xs font-semibold text-[#2B1810] underline underline-offset-2"
                      >
                        <span>Open PubMed</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleExplainPaper(paper)}
                        disabled={isExplaining}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#E9DEE4] hover:bg-[#DFCFD7] border border-[#D8C5CF] text-[#2B1810] text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isExplaining ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {explanation ? 'Re-check with Gemini' : 'Explain with Gemini'}
                        </span>
                      </button>
                    </div>

                    {explainErr && (
                      <div
                        role="alert"
                        className="rounded-xl border border-[#F0DCD7] bg-[#F7EBE8] p-2.5 text-[11px] text-[#B3534B]"
                      >
                        {explainErr}
                      </div>
                    )}

                    {explanation && (
                      <div className="rounded-xl border border-[#EAE2D8] bg-[#FBF7F2] p-3 space-y-2 text-[11.5px]">
                        <p className="text-[#2B1810] leading-relaxed">{explanation.summaryNote}</p>

                        <div className="space-y-1">
                          <p className="font-semibold text-[#466B56]">
                            Supported by Retrieved Record:
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5 text-[#594C44]">
                            {explanation.sourceSupported.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1">
                          <p className="font-semibold text-[#BA7D32]">
                            Uncertainty &amp; Not Retrieved:
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5 text-[#594C44]">
                            {explanation.uncertaintyAndGaps.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        {explanation.questionsForClinician.length > 0 && (
                          <div className="pt-1 border-t border-[#EAE2D8] space-y-1">
                            <p className="font-semibold text-[#2B1810]">
                              Questions for a Clinician:
                            </p>
                            <ul className="list-disc pl-4 space-y-0.5 text-[#594C44]">
                              {explanation.questionsForClinician.map((q) => (
                                <li key={q}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Explanatory Footnote matching spectrum.html */}
        <aside className="flex items-start space-x-2 pt-1 pb-3 px-1 text-[#6F6057]">
          <div className="w-4 h-4 rounded-full border border-[#8C7A70] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-display italic font-medium leading-none">i</span>
          </div>
          <span className="text-[12px] font-normal leading-normal">
            Evidence coverage reflects verifiable clinical guidance and retrieved metadata—not
            unverified cohort percentages or personal health risk.
          </span>
        </aside>
      </div>
    </div>
  );
};
