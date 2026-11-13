import type { EvidenceSource, PatientProfile } from '../../src/shared/types.ts';

export const DEMO_PATIENT: PatientProfile = {
  id: 'demo-001',
  isSynthetic: true,
  label: 'Synthetic Demo Patient',
  age: 27,
  sexAssignedAtBirth: 'Female',
  lifeStage: 'Reproductive age',
  primaryConcerns: [
    'Recurring fatigue around menstruation',
    'Heavy menstrual bleeding',
  ],
  wearables: 'none',
  symptoms: [
    {
      id: 'sym-fatigue',
      name: 'Recurring fatigue around menstruation',
      frequency: 'Recurring each menstrual cycle, most pronounced during and right after bleeding',
      severity: 'Pronounced',
      duration: '18+ months',
      notes: 'Synthetic record (demo-001): recurring exhaustion around menstruation even with 7–8 hours of sleep.',
    },
    {
      id: 'sym-hmb',
      name: 'Heavy menstrual bleeding',
      frequency: 'Monthly cycles (days 1–3 heaviest)',
      severity: 'Pronounced',
      duration: '2+ years',
      notes: 'Synthetic record (demo-001): heavy flow requiring frequent pad/tampon changes and passing occasional small clots.',
    },
  ],
  labs: [
    {
      id: 'ferritin-2023',
      marker: 'Ferritin',
      year: 2023,
      dateLabel: '2023-06-01',
      value: 52,
      unit: 'ng/mL',
      labReferenceRange: '15–150 ng/mL (varies by lab)',
      clinicalContext: 'Within standard lab reference range',
    },
    {
      id: 'ferritin-2024',
      marker: 'Ferritin',
      year: 2024,
      dateLabel: '2024-06-01',
      value: 34,
      unit: 'ng/mL',
      labReferenceRange: '15–150 ng/mL (varies by lab)',
      clinicalContext: 'Still flagged "normal" on single-year report, though 35% lower than 2023',
    },
    {
      id: 'ferritin-2025',
      marker: 'Ferritin',
      year: 2025,
      dateLabel: '2025-06-01',
      value: 21,
      unit: 'ng/mL',
      labReferenceRange: '15–150 ng/mL (varies by lab)',
      clinicalContext: 'Borderline low iron stores; often overlooked when reviewed without prior years',
    },
    {
      id: 'ferritin-2026',
      marker: 'Ferritin',
      year: 2026,
      dateLabel: '2026-06-01',
      value: 12,
      unit: 'ng/mL',
      labReferenceRange: '15–150 ng/mL (varies by lab)',
      clinicalContext: 'Below WHO 15 ng/mL threshold for depleted iron stores',
    },
  ],
  missingContext: [
    'No wearable physiological data connected (wearables: none)',
    'Complete Blood Count (CBC) including hemoglobin, MCV, and RDW',
    'Inflammatory markers (CRP/ESR), since inflammation can falsely elevate ferritin',
    'Transferrin saturation (TSAT) and serum iron panel',
    'Thyroid panel (TSH), Vitamin B12, and Vitamin D to evaluate overlapping fatigue drivers',
    'Structured menstrual bleeding assessment and clinician evaluation of bleeding causes',
  ],
};

export const CURATED_EVIDENCE: EvidenceSource[] = [
  {
    id: 'iron-ferritin-fatigue',
    title:
      'Efficacy of iron supplementation on fatigue and physical capacity in non-anaemic iron-deficient adults: a systematic review of randomised controlled trials (with WHO ferritin reference)',
    organizationOrJournal: 'BMJ Open (Houston et al.) · WHO Ferritin Standard',
    year: 2018,
    url: 'https://bmjopen.bmj.com/content/8/4/e019240',
    relevanceTag: 'Iron & Ferritin for Fatigue',
    keyFinding:
      'Across 18 randomized controlled trials in non-anemic adults with low ferritin, iron repletion improved subjective fatigue scores compared with placebo. WHO defines <15 ng/mL as depleted iron stores, while clinical studies frequently evaluate cutoffs below 30 ng/mL.',
    femaleRepresentation:
      'Unknown (exact % female participants not retrieved in summary; reproductive-age women are disproportionately affected by menstrual iron loss)',
    sexSpecificFindings:
      'Evaluated non-anemic iron-deficient adults; in menstruating women, recurring menstrual blood loss can lower ferritin before hemoglobin drops.',
    limitations:
      'Included trials used inconsistent ferritin cutoffs (ranging from <15 to <50 ng/mL), varied dosing protocols, and short follow-up windows that did not address ongoing menstrual blood loss.',
    whatRemainsUnknown:
      'How much of an individual’s fatigue is attributable to low iron stores versus other overlapping contributors (sleep quality, thyroid function, vitamin deficiencies, or inflammation falsely elevating ferritin) without clinician-ordered labs.',
  },
  {
    id: 'luteal-sleep-fragmentation',
    title:
      'Circadian variation of sleep during the follicular and luteal phases of the menstrual cycle',
    organizationOrJournal: 'Sleep (PubMed PMID 20469807)',
    year: 2010,
    url: 'https://pubmed.ncbi.nlm.nih.gov/20469807/',
    relevanceTag: 'Luteal Sleep Fragmentation',
    keyFinding:
      'Post-ovulatory progesterone raises nocturnal basal body temperature (~0.4°C) and is associated with measurable changes in REM sleep architecture and sleep continuity during the luteal phase compared with the follicular phase.',
    femaleRepresentation:
      'Unknown across broader sleep trials (PMID 20469807 studied naturally cycling women under controlled lab conditions; exact sample size not retrieved from ESummary alone)',
    sexSpecificFindings:
      'Examines endogenous luteal progesterone and nocturnal thermoregulation specifically in menstruating females—a mechanism absent in male-only sleep baseline studies.',
    limitations:
      'Small laboratory polysomnography cohorts limit generalizability across age groups, hormonal contraception users, irregular cycles, and perimenopause.',
    whatRemainsUnknown:
      'Which cooling, behavioral, or medical strategies best relieve luteal sleep disruption for an individual, and whether concurrent thyroid or iron issues are also driving daytime exhaustion.',
  },
  {
    id: 'fasting-cycling-women',
    title:
      'Impact of time-restricted eating on reproductive hormones and androgen markers in adult females: A systematic review',
    organizationOrJournal: 'Nutrition and Health (PubMed PMID 42429418)',
    year: 2026,
    url: 'https://pubmed.ncbi.nlm.nih.gov/42429418/',
    relevanceTag: '16:8 Fasting in Cycling Women',
    keyFinding:
      'Most intermittent fasting and 16:8 time-restricted eating studies rely heavily on male or mixed cohorts; emerging systematic reviews in adult females highlight small sample sizes and potential sensitivity in cortisol, luteinizing hormone (LH), and androgen markers.',
    femaleRepresentation:
      'Unknown (exact aggregate female % across fasting literature not verified; female-specific reproductive hormone trials remain sparse)',
    sexSpecificFindings:
      'Reviews endocrine and reproductive hormone outcomes specifically in adult females, underscoring that energy-timing stressors can interact with hypothalamic-pituitary-ovarian signaling.',
    limitations:
      'Available female-focused trials vary widely in fasting window duration, caloric intake, baseline body composition, and cycle-phase tracking; full-text effect sizes were not retrieved from ESummary alone.',
    whatRemainsUnknown:
      'Long-term effects of 16:8 time-restricted eating on ovulation, luteal progesterone, and fatigue in naturally cycling women with existing nutrient or iron depletion.',
  },
];

