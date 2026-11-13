import type { PubMedPaper } from '../../src/shared/types.ts';

/**
 * Local fallback cache of 3 researcher-verified PubMed records retrieved directly
 * from NCBI ESummary (PMIDs 29626044, 40159291, 31086516).
 * Abstracts, sample conclusions, and cohort percentages are intentionally NOT fabricated.
 */
export const CACHED_PUBMED_PAPERS: PubMedPaper[] = [
  {
    pmid: '29626044',
    title:
      'Efficacy of iron supplementation on fatigue and physical capacity in non-anaemic iron-deficient adults: a systematic review of randomised controlled trials.',
    authors: [
      'Houston BL',
      'Hurrie D',
      'Graham J',
      'Perija B',
      'Rimmer E',
      'Rabbani R',
      'Bernstein CN',
      'Turgeon AF',
      'Fergusson DA',
      'Houston DS',
      'Abou-Setta AM',
      'Zarychanski R',
    ],
    journal: 'BMJ Open',
    fullJournalName: 'BMJ open',
    pubDate: '2018 Apr 5',
    publicationDetails: 'BMJ Open. 2018 Apr 5;8(4):e019240. doi:10.1136/bmjopen-2017-019240',
    publicationTypes: ['Journal Article', 'Systematic Review'],
    doi: '10.1136/bmjopen-2017-019240',
    pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/29626044/',
    isCachedFallback: true,
  },
  {
    pmid: '40159291',
    title: 'Iron Deficiency in Adults: A Review.',
    authors: ['Auerbach M', 'DeLoughery TG', 'Tirnauer JS'],
    journal: 'JAMA',
    fullJournalName: 'JAMA',
    pubDate: '2025 May 27',
    publicationDetails: 'JAMA. 2025 May 27;333(20):1813-1823. doi:10.1001/jama.2025.0452',
    publicationTypes: ['Journal Article', 'Review'],
    doi: '10.1001/jama.2025.0452',
    pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/40159291/',
    isCachedFallback: true,
  },
  {
    pmid: '31086516',
    title:
      'The prevalence and impacts heavy menstrual bleeding on anemia, fatigue and quality of life in women of reproductive age.',
    authors: ['Kocaoz S', 'Cirpan R', 'Degirmencioglu AZ'],
    journal: 'Pak J Med Sci',
    fullJournalName: 'Pakistan journal of medical sciences',
    pubDate: '2019 Mar-Apr',
    publicationDetails: 'Pak J Med Sci. 2019 Mar-Apr;35(2):365-370. doi:10.12669/pjms.35.2.644',
    publicationTypes: ['Journal Article'],
    doi: '10.12669/pjms.35.2.644',
    pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/31086516/',
    isCachedFallback: true,
  },
];
