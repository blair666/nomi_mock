import type { LabResult, TrendAnalysis, UrgentAlert, YearOverYearChange } from '../../src/shared/types.ts';

const WHO_DEFICIENCY_THRESHOLD = 15; // ng/mL (WHO 2020 guideline)
const SUBOPTIMAL_STORE_THRESHOLD = 30; // ng/mL common clinical low-store watch threshold

const URGENT_SYMPTOM_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'Chest pain or pressure', regex: /\b(chest pain|chest pressure|tightness in my chest)\b/i },
  { label: 'Shortness of breath at rest', regex: /\b(shortness of breath|can't catch my breath|trouble breathing|difficulty breathing)\b/i },
  { label: 'Fainting or passing out', regex: /\b(faint|fainted|fainting|passed out|blacked out|syncope|lose consciousness)\b/i },
  { label: 'Severe bleeding saturation', regex: /\b(soaking through|pad every hour|tampon every hour|bleeding heavily for hours|hemorrhag)\b/i },
  { label: 'Severe dizziness or racing heartbeat', regex: /\b(severe dizziness|about to pass out|heart racing at rest|palpitations)\b/i },
  { label: 'Pregnancy with heavy bleeding', regex: /\b(pregnant.*bleeding|bleeding.*pregnant)\b/i },
];

export function analyzeFerritinTrend(labs: LabResult[]): TrendAnalysis {
  const sorted = [...labs]
    .filter((item) => item.marker === 'Ferritin' && Number.isFinite(item.value))
    .sort((a, b) => a.year - b.year);

  if (sorted.length === 0) {
    return {
      marker: 'Ferritin',
      unit: 'ng/mL',
      dataPointsCount: 0,
      startYear: 0,
      endYear: 0,
      startValue: 0,
      latestValue: 0,
      totalDelta: 0,
      totalPercentChange: 0,
      annualSlope: 0,
      consecutiveDeclines: 0,
      isMonotonicDecline: false,
      yearOverYear: [],
      thresholds: {
        whoDeficiencyThreshold: WHO_DEFICIENCY_THRESHOLD,
        suboptimalStoreThreshold: SUBOPTIMAL_STORE_THRESHOLD,
        belowWhoDeficiency: false,
        belowSuboptimalStore: false,
        crossedSuboptimalYear: null,
        crossedWhoDeficiencyYear: null,
      },
      signalClassification: 'Insufficient Data',
      deterministicSummary: 'No ferritin lab results are currently loaded to calculate a longitudinal trend.',
    };
  }

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const totalDelta = Number((latest.value - first.value).toFixed(1));
  const totalPercentChange =
    first.value > 0 ? Number((((latest.value - first.value) / first.value) * 100).toFixed(1)) : 0;

  // Ordinary least squares linear regression: y = slope * x + intercept
  let annualSlope = 0;
  if (sorted.length >= 2) {
    const n = sorted.length;
    const meanX = sorted.reduce((sum, p) => sum + p.year, 0) / n;
    const meanY = sorted.reduce((sum, p) => sum + p.value, 0) / n;
    const numerator = sorted.reduce((sum, p) => sum + (p.year - meanX) * (p.value - meanY), 0);
    const denominator = sorted.reduce((sum, p) => sum + Math.pow(p.year - meanX, 2), 0);
    annualSlope = denominator > 0 ? Number((numerator / denominator).toFixed(2)) : 0;
  }

  const yearOverYear: YearOverYearChange[] = [];
  let consecutiveDeclines = 0;
  let allDecreasing = sorted.length >= 2;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const delta = Number((curr.value - prev.value).toFixed(1));
    const percentChange =
      prev.value > 0 ? Number((((curr.value - prev.value) / prev.value) * 100).toFixed(1)) : 0;

    yearOverYear.push({
      fromYear: prev.year,
      toYear: curr.year,
      fromValue: prev.value,
      toValue: curr.value,
      delta,
      percentChange,
    });

    if (delta < 0) {
      consecutiveDeclines += 1;
    } else {
      allDecreasing = false;
      consecutiveDeclines = 0;
    }
  }

  const crossedSuboptimal = sorted.find((p) => p.value < SUBOPTIMAL_STORE_THRESHOLD)?.year ?? null;
  const crossedWhoDeficiency = sorted.find((p) => p.value < WHO_DEFICIENCY_THRESHOLD)?.year ?? null;
  const belowWhoDeficiency = latest.value < WHO_DEFICIENCY_THRESHOLD;
  const belowSuboptimalStore = latest.value < SUBOPTIMAL_STORE_THRESHOLD;

  let signalClassification: TrendAnalysis['signalClassification'] = 'Stable';
  if (sorted.length < 2) {
    signalClassification = belowWhoDeficiency
      ? 'Depleted & Declining'
      : belowSuboptimalStore
      ? 'Low Stores & Declining'
      : 'Insufficient Data';
  } else if (belowWhoDeficiency && annualSlope < 0) {
    signalClassification = 'Depleted & Declining';
  } else if (belowSuboptimalStore && annualSlope < 0) {
    signalClassification = 'Low Stores & Declining';
  } else if (annualSlope < -2) {
    signalClassification = 'Declining Within Range';
  }

  const deterministicSummary =
    sorted.length >= 2
      ? `Ferritin changed from ${first.value} ng/mL (${first.year}) to ${latest.value} ng/mL (${latest.year}), a net change of ${totalDelta} ng/mL (${totalPercentChange}%) at an average linear rate of ${annualSlope} ng/mL per year.`
      : `Single ferritin measurement recorded: ${latest.value} ng/mL in ${latest.year}. Additional prior results are needed to calculate a multi-year rate of change.`;

  return {
    marker: 'Ferritin',
    unit: 'ng/mL',
    dataPointsCount: sorted.length,
    startYear: first.year,
    endYear: latest.year,
    startValue: first.value,
    latestValue: latest.value,
    totalDelta,
    totalPercentChange,
    annualSlope,
    consecutiveDeclines,
    isMonotonicDecline: allDecreasing,
    yearOverYear,
    thresholds: {
      whoDeficiencyThreshold: WHO_DEFICIENCY_THRESHOLD,
      suboptimalStoreThreshold: SUBOPTIMAL_STORE_THRESHOLD,
      belowWhoDeficiency,
      belowSuboptimalStore,
      crossedSuboptimalYear: crossedSuboptimal,
      crossedWhoDeficiencyYear: crossedWhoDeficiency,
    },
    signalClassification,
    deterministicSummary,
  };
}

export function detectUrgentSymptoms(text: string): UrgentAlert {
  const matchedSignals: string[] = [];
  for (const pattern of URGENT_SYMPTOM_PATTERNS) {
    if (pattern.regex.test(text)) {
      matchedSignals.push(pattern.label);
    }
  }

  if (matchedSignals.length === 0) {
    return {
      triggered: false,
      matchedSignals: [],
      guidance: '',
    };
  }

  return {
    triggered: true,
    matchedSignals,
    guidance:
      'You mentioned symptoms that can sometimes require prompt medical attention (such as chest pain, breathing difficulty, fainting, severe dizziness, or soaking through a pad/tampon every hour for 2+ hours). Please seek urgent medical care or contact emergency services rather than relying on an educational tool.',
  };
}
