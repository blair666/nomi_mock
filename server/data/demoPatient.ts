import type { EvidenceSource, PatientProfile } from '../../src/shared/types.ts';

export const DEMO_PATIENT: PatientProfile = {
  id: 'demo-patient-27f',
  isSynthetic: true,
  label: 'Synthetic Demo Patient',
  age: 27,
  sexAssignedAtBirth: 'Female',
  lifeStage: 'Reproductive age',
  primaryConcerns: ['Recurring fatigue', 'Heavy menstrual bleeding'],
  symptoms: [
    {
      id: 'sym-fatigue',
      name: 'Recurring fatigue',
      frequency: 'Most days, worsening in late afternoon and post-menstruation',
      severity: 'Pronounced',
      duration: '18+ months',
      notes: 'Synthetic record: feels unrefreshed after 7–8 hours of sleep; reduced exercise tolerance on stairs.',
    },
    {
      id: 'sym-hmb',
      name: 'Heavy menstrual bleeding',
      frequency: 'Monthly cycles (days 1–3 heaviest)',
      severity: 'Pronounced',
      duration: '2+ years',
      notes: 'Synthetic record: needing frequent pad/tampon changes and passing occasional small clots.',
    },
  ],
  labs: [
    {
      id: 'ferritin-2023',
      marker: 'Ferritin',
      year: 2023,
      dateLabel: 'Mar 2023',
      value: 52,
      unit: 'ng/mL',
      labReferenceRange: '15–150 ng/mL (varies by lab)',
      clinicalContext: 'Within standard lab reference range',
    },
    {
      id: 'ferritin-2024',
      marker: 'Ferritin',
      year: 2024,
      dateLabel: 'Mar 2024',
      value: 34,
      unit: 'ng/mL',
      labReferenceRange: '15–150 ng/mL (varies by lab)',
      clinicalContext: 'Still flagged "normal" on single-year report, though 35% lower than 2023',
    },
    {
      id: 'ferritin-2025',
      marker: 'Ferritin',
      year: 2025,
      dateLabel: 'Mar 2025',
      value: 21,
      unit: 'ng/mL',
      labReferenceRange: '15–150 ng/mL (varies by lab)',
      clinicalContext: 'Borderline low iron stores; often overlooked when reviewed without prior years',
    },
    {
      id: 'ferritin-2026',
      marker: 'Ferritin',
      year: 2026,
      dateLabel: 'Mar 2026',
      value: 12,
      unit: 'ng/mL',
      labReferenceRange: '15–150 ng/mL (varies by lab)',
      clinicalContext: 'Below WHO 15 ng/mL threshold for depleted iron stores',
    },
  ],
  missingContext: [
    'Complete Blood Count (CBC) including hemoglobin, MCV, and RDW',
    'Inflammatory markers (CRP/ESR), since inflammation can falsely elevate ferritin',
    'Transferrin saturation (TSAT) and serum iron panel',
    'Thyroid panel (TSH), Vitamin B12, and Vitamin D to evaluate overlapping fatigue drivers',
    'Structured menstrual bleeding assessment and clinician evaluation of bleeding causes',
  ],
};

export const CURATED_EVIDENCE: EvidenceSource[] = [
  {
    id: 'who-ferritin-2020',
    title: 'WHO Guideline on Use of Ferritin Concentrations to Assess Iron Status in Individuals and Populations',
    organizationOrJournal: 'World Health Organization (WHO)',
    year: 2020,
    url: 'https://www.who.int/publications/i/item/9789240000124',
    relevanceTag: 'Ferritin Thresholds & Interpretation',
    keyFinding:
      'Defines serum ferritin below 15 µg/L (equivalent to 15 ng/mL) as depleted iron stores in apparently healthy individuals aged 5 years and older. Emphasizes that ferritin is an acute-phase protein that rises during infection or inflammation.',
    limitations:
      'A single population cutoff does not capture individual symptom sensitivity, and ferritin alone cannot distinguish depleted stores with normal hemoglobin from iron-deficiency anemia without a CBC.',
    whatRemainsUnknown:
      'Whether an individual experiences symptoms at borderline ferritin levels (15–30 ng/mL), and whether concurrent inflammation is masking an even lower true iron store.',
  },
  {
    id: 'acog-hmb-guidance',
    title: 'Heavy Menstrual Bleeding — Patient & Clinical Evaluation Guidance (FIGO PALM-COEIN Framework)',
    organizationOrJournal: 'American College of Obstetricians and Gynecologists (ACOG)',
    year: 2023,
    url: 'https://www.acog.org/womens-health/faqs/heavy-menstrual-bleeding',
    relevanceTag: 'Heavy Menstrual Bleeding & Iron Loss',
    keyFinding:
      'Identifies heavy menstrual bleeding as a primary driver of progressive iron depletion in reproductive-age women. Recurrent monthly blood loss can steadily draw down ferritin over multiple years before hemoglobin falls.',
    limitations:
      'Self-reported bleeding heaviness varies widely between individuals and does not identify the underlying structural, ovulatory, endometrial, or coagulation cause on its own.',
    whatRemainsUnknown:
      'The exact cause of heavy bleeding (such as uterine fibroids, adenomyosis, hormonal factors, or an inherited bleeding tendency) requires in-person gynecologic assessment and targeted testing.',
  },
  {
    id: 'houston-bmjopen-2018',
    title: 'Efficacy of iron supplementation on fatigue and physical capacity in non-anaemic iron-deficient adults: a systematic review of randomised controlled trials',
    organizationOrJournal: 'BMJ Open (Houston et al.)',
    year: 2018,
    url: 'https://bmjopen.bmj.com/content/8/4/e019240',
    relevanceTag: 'Low Ferritin & Fatigue',
    keyFinding:
      'Across 18 randomized controlled trials in non-anemic adults with low ferritin, iron repletion was associated with improved subjective fatigue scores compared with placebo, though definitions of low ferritin varied across studies.',
    limitations:
      'Included trials used inconsistent ferritin cutoffs (ranging from <15 to <50 ng/mL), varied dosing protocols, and short follow-up windows that did not address ongoing menstrual blood loss.',
    whatRemainsUnknown:
      'How much of an individual’s fatigue is attributable to low iron stores versus other overlapping contributors (sleep quality, thyroid function, vitamin deficiencies, or stress) without clinician-ordered labs.',
  },
];
