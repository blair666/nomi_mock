import type {
  DoctorSummaryData,
  EvidenceSource,
  PatientProfile,
  PubMedExplanationResponse,
  PubMedPaper,
  PubMedSearchResponse,
  SignalExplanationResponse,
  TrendAnalysis,
  UrgentAlert,
} from '../shared/types';

export interface DemoPatientResponse {
  patient: PatientProfile;
  trend: TrendAnalysis;
  evidence: EvidenceSource[];
}

export interface ChatApiResponse {
  reply: string;
  referencedEvidenceIds: string[];
  urgentAlert: UrgentAlert;
  trend: TrendAnalysis | null;
  demoMode?: boolean;
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string })?.error ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchDemoPatient(): Promise<DemoPatientResponse> {
  const res = await fetch('/api/demo-patient');
  return handleJsonResponse<DemoPatientResponse>(res);
}

export async function fetchCuratedEvidence(): Promise<{ evidence: EvidenceSource[] }> {
  const res = await fetch('/api/evidence');
  return handleJsonResponse<{ evidence: EvidenceSource[] }>(res);
}

export async function fetchPubMedResearch(query: string): Promise<PubMedSearchResponse> {
  const params = new URLSearchParams({ query });
  const res = await fetch(`/api/research?${params.toString()}`);
  return handleJsonResponse<PubMedSearchResponse>(res);
}

export async function explainPubMedPaper(
  paper: PubMedPaper,
  topic?: string
): Promise<PubMedExplanationResponse> {
  const res = await fetch('/api/research/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paper, topic }),
  });
  return handleJsonResponse<PubMedExplanationResponse>(res);
}

export async function analyzeSignals(
  patient: PatientProfile
): Promise<SignalExplanationResponse> {
  const res = await fetch('/api/analyze-signals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient }),
  });
  return handleJsonResponse<SignalExplanationResponse>(res);
}

export async function sendHealthChat(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  demoMode: boolean;
  patient: PatientProfile | null;
}): Promise<ChatApiResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: params.messages,
      demoMode: params.demoMode,
      patient: params.demoMode ? params.patient : null,
    }),
  });
  return handleJsonResponse<ChatApiResponse>(res);
}

export async function fetchDoctorSummary(
  patient: PatientProfile
): Promise<DoctorSummaryData> {
  const res = await fetch('/api/doctor-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient }),
  });
  return handleJsonResponse<DoctorSummaryData>(res);
}
