export interface LabResult {
  id: string;
  marker: 'Ferritin';
  year: number;
  dateLabel: string;
  value: number;
  unit: 'ng/mL';
  labReferenceRange: string;
  clinicalContext?: string;
}

export interface SymptomEntry {
  id: string;
  name: string;
  frequency: string;
  severity: 'Mild' | 'Moderate' | 'Pronounced';
  duration: string;
  notes: string;
}

export interface PatientProfile {
  id: string;
  isSynthetic: boolean;
  label: string;
  age: number;
  sexAssignedAtBirth: 'Female';
  lifeStage: string;
  primaryConcerns: string[];
  symptoms: SymptomEntry[];
  labs: LabResult[];
  missingContext: string[];
}

export interface YearOverYearChange {
  fromYear: number;
  toYear: number;
  fromValue: number;
  toValue: number;
  delta: number;
  percentChange: number;
}

export interface TrendAnalysis {
  marker: 'Ferritin';
  unit: 'ng/mL';
  dataPointsCount: number;
  startYear: number;
  endYear: number;
  startValue: number;
  latestValue: number;
  totalDelta: number;
  totalPercentChange: number;
  annualSlope: number;
  consecutiveDeclines: number;
  isMonotonicDecline: boolean;
  yearOverYear: YearOverYearChange[];
  thresholds: {
    whoDeficiencyThreshold: number;
    suboptimalStoreThreshold: number;
    belowWhoDeficiency: boolean;
    belowSuboptimalStore: boolean;
    crossedSuboptimalYear: number | null;
    crossedWhoDeficiencyYear: number | null;
  };
  signalClassification: 'Depleted & Declining' | 'Low Stores & Declining' | 'Declining Within Range' | 'Stable' | 'Insufficient Data';
  deterministicSummary: string;
}

export interface EvidenceSource {
  id: string;
  title: string;
  organizationOrJournal: string;
  year: number;
  url: string;
  relevanceTag: string;
  keyFinding: string;
  limitations: string;
  whatRemainsUnknown: string;
}

export interface UrgentAlert {
  triggered: boolean;
  matchedSignals: string[];
  guidance: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  urgentAlert?: UrgentAlert;
  referencedEvidenceIds?: string[];
}

export interface SignalExplanationResponse {
  trend: TrendAnalysis;
  explanation: string;
  questionsToExplore: string[];
  urgentAlert: UrgentAlert;
}

export interface DoctorSummaryData {
  generatedAt: string;
  patient: PatientProfile;
  trend: TrendAnalysis;
  evidence: EvidenceSource[];
  visitOverview: string;
  uncertainties: string[];
  questionsForDoctor: string[];
  urgentGuidanceNote: string;
}
