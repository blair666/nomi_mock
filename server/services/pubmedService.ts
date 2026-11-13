import type { PubMedPaper, PubMedSearchResponse } from '../../src/shared/types.ts';
import { CACHED_PUBMED_PAPERS } from '../data/pubmedCache.ts';

const NCBI_EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DEFAULT_TOPIC_QUERY = 'ferritin heavy menstrual bleeding fatigue women';
const REQUEST_TIMEOUT_MS = 6000;
const MEMORY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RESULTS = 5;

interface CachedEntry {
  expiresAt: number;
  response: PubMedSearchResponse;
}

const memoryCache = new Map<string, CachedEntry>();

interface ESearchJson {
  esearchresult?: {
    count?: string;
    idlist?: string[];
  };
}

interface ESummaryAuthor {
  name?: string;
}

interface ESummaryArticleId {
  idtype?: string;
  value?: string;
}

interface ESummaryRecord {
  uid?: string;
  title?: string;
  authors?: ESummaryAuthor[];
  source?: string;
  fulljournalname?: string;
  pubdate?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  pubtype?: string[];
  articleids?: ESummaryArticleId[];
}

interface ESummaryJson {
  result?: {
    uids?: string[];
    [pmid: string]: ESummaryRecord | string[] | undefined;
  };
}

/**
 * Strips any accidental patient identifiers, ISO dates, numeric lab values/units,
 * or non-topic clutter so only general medical search terms are sent to PubMed.
 */
export function sanitizeMedicalTopicQuery(rawQuery?: string): string {
  const trimmed = (rawQuery || '').trim();
  if (!trimmed) {
    return DEFAULT_TOPIC_QUERY;
  }

  const cleaned = trimmed
    .replace(/\bdemo-\d+\b/gi, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/\b\d+(?:\.\d+)?\s*(?:ng\/ml|ug\/l|µg\/l|g\/dl|years?\s*old|yo|y\/o)\b/gi, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

  return cleaned || DEFAULT_TOPIC_QUERY;
}

function buildPublicationDetails(record: ESummaryRecord, doi: string | null): string {
  const parts: string[] = [];
  if (record.source) parts.push(`${record.source}.`);
  if (record.pubdate) parts.push(record.pubdate);

  const volIssuePages = [
    record.volume ? `${record.volume}` : '',
    record.issue ? `(${record.issue})` : '',
    record.pages ? `:${record.pages}` : '',
  ]
    .join('')
    .trim();

  if (volIssuePages) {
    parts.push(volIssuePages + '.');
  }
  if (doi) {
    parts.push(`doi:${doi}`);
  }
  return parts.join(' ').trim() || 'Bibliographic metadata retrieved via NCBI ESummary';
}

function mapESummaryRecord(pmid: string, record: ESummaryRecord): PubMedPaper {
  const authors = Array.isArray(record.authors)
    ? record.authors
        .map((a) => (typeof a?.name === 'string' ? a.name.trim() : ''))
        .filter(Boolean)
    : [];

  const doi =
    (Array.isArray(record.articleids)
      ? record.articleids.find((item) => item?.idtype === 'doi')?.value
      : undefined) || null;

  const publicationTypes = Array.isArray(record.pubtype)
    ? record.pubtype.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];

  return {
    pmid,
    title: (record.title || 'Untitled PubMed record').trim(),
    authors,
    journal: (record.source || 'PubMed').trim(),
    fullJournalName: (record.fulljournalname || record.source || 'PubMed').trim(),
    pubDate: (record.pubdate || 'Date unavailable').trim(),
    publicationDetails: buildPublicationDetails(record, doi),
    publicationTypes,
    doi,
    pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    isCachedFallback: false,
  };
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NomiWomenHealthApp/1.0',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`NCBI E-utilities returned HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchPubMedResearch(rawQuery?: string): Promise<PubMedSearchResponse> {
  const originalQuery = (rawQuery || '').trim() || DEFAULT_TOPIC_QUERY;
  const sanitizedQuery = sanitizeMedicalTopicQuery(originalQuery);
  const cacheKey = sanitizedQuery.toLowerCase();

  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.response,
      query: originalQuery,
      source: 'memory-cache',
    };
  }

  try {
    // 1. Official NCBI ESearch call to retrieve PubMed IDs
    const esearchParams = new URLSearchParams({
      db: 'pubmed',
      term: sanitizedQuery,
      retmax: String(MAX_RESULTS),
      retmode: 'json',
      sort: 'relevance',
      tool: 'nomi_womens_health',
    });
    const esearchUrl = `${NCBI_EUTILS_BASE}/esearch.fcgi?${esearchParams.toString()}`;
    const esearchData = await fetchJsonWithTimeout<ESearchJson>(esearchUrl);

    const idList = Array.isArray(esearchData.esearchresult?.idlist)
      ? esearchData.esearchresult.idlist.filter((id) => /^\d+$/.test(id))
      : [];
    const totalFound = Number(esearchData.esearchresult?.count || idList.length) || 0;

    if (idList.length === 0) {
      return {
        query: originalQuery,
        sanitizedQuery,
        source: 'pubmed-live',
        fallbackUsed: false,
        totalFound: 0,
        papers: [],
        notice: `No PubMed records matched "${sanitizedQuery}". Try broader medical terms like "ferritin fatigue" or "heavy menstrual bleeding".`,
      };
    }

    // 2. Official NCBI ESummary call to retrieve real titles, authors, journals, and dates
    const esummaryParams = new URLSearchParams({
      db: 'pubmed',
      id: idList.join(','),
      retmode: 'json',
      tool: 'nomi_womens_health',
    });
    const esummaryUrl = `${NCBI_EUTILS_BASE}/esummary.fcgi?${esummaryParams.toString()}`;
    const esummaryData = await fetchJsonWithTimeout<ESummaryJson>(esummaryUrl);

    const resultObj = esummaryData.result;
    const orderedUids = Array.isArray(resultObj?.uids) ? resultObj.uids : idList;
    const papers: PubMedPaper[] = [];

    for (const pmid of orderedUids) {
      const rec = resultObj?.[pmid];
      if (rec && !Array.isArray(rec) && typeof rec === 'object') {
        papers.push(mapESummaryRecord(pmid, rec));
      }
    }

    if (papers.length === 0) {
      return {
        query: originalQuery,
        sanitizedQuery,
        source: 'pubmed-live',
        fallbackUsed: false,
        totalFound,
        papers: [],
        notice: 'PubMed returned matching IDs, but ESummary metadata was empty. Please try again.',
      };
    }

    const liveResponse: PubMedSearchResponse = {
      query: originalQuery,
      sanitizedQuery,
      source: 'pubmed-live',
      fallbackUsed: false,
      totalFound,
      papers,
      notice:
        'Live bibliographic metadata from NCBI PubMed ESearch + ESummary (titles, authors, journals, dates; abstracts and cohort % are not returned by ESummary).',
    };

    memoryCache.set(cacheKey, {
      expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
      response: liveResponse,
    });

    return liveResponse;
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'AbortError'
        ? 'PubMed timed out'
        : error instanceof Error
        ? error.message
        : 'PubMed unavailable';

    return {
      query: originalQuery,
      sanitizedQuery,
      source: 'local-cache',
      fallbackUsed: true,
      totalFound: CACHED_PUBMED_PAPERS.length,
      papers: CACHED_PUBMED_PAPERS,
      notice: `${reason}. Showing ${CACHED_PUBMED_PAPERS.length} locally cached, researcher-verified PubMed records.`,
    };
  }
}
