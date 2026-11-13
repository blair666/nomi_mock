import type {
  CareReminder,
  ReminderCategory,
  ReminderFrequency,
} from '../shared/types';

const STORAGE_KEY = 'nomi_care_reminders_v1';

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(baseIso: string, days: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function daysUntil(dateIso: string): number {
  const today = todayIsoDate();
  const [ty, tm, td] = today.split('-').map(Number);
  const [dy, dm, dd] = dateIso.split('-').map(Number);
  const tMs = Date.UTC(ty, (tm || 1) - 1, td || 1);
  const dMs = Date.UTC(dy, (dm || 1) - 1, dd || 1);
  return Math.round((dMs - tMs) / 86400000);
}

export function advanceDateByFrequency(
  fromIso: string,
  frequency: ReminderFrequency
): string {
  switch (frequency) {
    case 'Daily':
      return addDaysIso(fromIso, 1);
    case 'Weekly':
      return addDaysIso(fromIso, 7);
    case 'Monthly':
      return addDaysIso(fromIso, 30);
    case 'Every 3 months':
      return addDaysIso(fromIso, 90);
    case 'Every 6 months':
      return addDaysIso(fromIso, 180);
    case 'Yearly':
      return addDaysIso(fromIso, 365);
    case 'Every 3 years':
      return addDaysIso(fromIso, 1095);
    case 'As needed':
    default:
      return addDaysIso(fromIso, 30);
  }
}

export function getReminderStatus(reminder: CareReminder): {
  kind: 'due' | 'soon' | 'scheduled' | 'paused';
  label: string;
} {
  if (!reminder.enabled) {
    return { kind: 'paused', label: 'Paused' };
  }
  const diff = daysUntil(reminder.nextDueDate);
  if (diff <= 0) {
    return {
      kind: 'due',
      label: diff === 0 ? 'Due today' : `Overdue ${Math.abs(diff)}d`,
    };
  }
  if (diff <= 14) {
    return { kind: 'soon', label: `Due in ${diff}d` };
  }
  return { kind: 'scheduled', label: `Next: ${reminder.nextDueDate}` };
}

export function getDefaultReminders(): CareReminder[] {
  const today = todayIsoDate();
  return [
    {
      id: 'rem-pap-smear',
      title: 'Pap Smear / Cervical Screening',
      category: 'screening',
      frequency: 'Every 3 years',
      nextDueDate: today,
      rationale:
        'Routine cervical cytology (or HPV testing based on age) detects precancerous cell changes early.',
      whenAppropriate:
        'General USPSTF/ACOG guidance recommends screening starting at age 21 every 3 years (or HPV co-testing options ages 30–65). Confirm your exact interval with your clinician.',
      suggestedQuestion:
        'What Pap smear or HPV screening schedule is appropriate for my age and health history?',
      enabled: true,
    },
    {
      id: 'rem-pelvic-ultrasound',
      title: 'Pelvic Ultrasound Check-In (When Appropriate)',
      category: 'imaging',
      frequency: 'As needed',
      nextDueDate: addDaysIso(today, 2),
      rationale:
        'Non-invasive pelvic imaging helps clinicians evaluate structural causes of heavy bleeding, pelvic pain, or ovarian cysts.',
      whenAppropriate:
        'Not a routine annual screening for everyone; ask a clinician whether an ultrasound is appropriate if you have persistent heavy menstrual bleeding, pelvic pain, or cycle changes.',
      suggestedQuestion:
        'When is a pelvic ultrasound appropriate for symptoms like heavy menstrual bleeding or pelvic discomfort?',
      enabled: true,
    },
    {
      id: 'rem-daily-meds',
      title: 'Daily Medication / Prescribed Supplement Dose',
      category: 'medication',
      frequency: 'Daily',
      nextDueDate: today,
      timeOfDay: '08:00',
      rationale:
        'Consistent timing supports effectiveness and avoids missed doses for prescribed medications or clinician-recommended supplements.',
      whenAppropriate:
        'Always take prescribed medications or iron/vitamins exactly as directed by your prescriber or pharmacist (for example, spacing iron away from calcium/coffee if advised).',
      suggestedQuestion:
        'What timing or food interactions should I ask my pharmacist about for daily medications or iron supplements?',
      enabled: true,
    },
    {
      id: 'rem-rx-refill',
      title: 'Prescription Refill Check',
      category: 'prescription',
      frequency: 'Monthly',
      nextDueDate: addDaysIso(today, 5),
      refillDaysLeft: 5,
      rationale:
        'Requesting prescription refills 5–7 days early prevents therapy gaps over weekends or prior-authorization delays.',
      whenAppropriate:
        'Check remaining refills on your pharmacy label and message your clinic ahead of running out.',
      suggestedQuestion:
        'How should I organize a list of my current prescriptions and refills before a clinic visit?',
      enabled: true,
    },
    {
      id: 'rem-annual-physical',
      title: 'Annual Well-Woman & Primary Care Checkup',
      category: 'checkup',
      frequency: 'Yearly',
      nextDueDate: addDaysIso(today, 10),
      rationale:
        'Covers blood pressure, clinical breast exam discussion, cycle changes, immunizations, and overall preventative planning.',
      whenAppropriate:
        'Recommended once a year, or sooner if new fatigue, dizziness, or bleeding changes appear.',
      suggestedQuestion:
        'What preventative checkups and vitals are typically reviewed at an annual well-woman visit?',
      enabled: true,
    },
    {
      id: 'rem-lab-panel',
      title: 'Routine Labs (CBC, Ferritin & Thyroid Review)',
      category: 'checkup',
      frequency: 'Every 6 months',
      nextDueDate: addDaysIso(today, 7),
      rationale:
        'Tracking hemoglobin, ferritin, and thyroid markers alongside symptoms reveals gradual depletion that single normal labs can miss.',
      whenAppropriate:
        'Discuss testing frequency with your doctor—especially if you experience recurring fatigue or heavy menstrual bleeding.',
      suggestedQuestion:
        'Which baseline blood tests (such as CBC, ferritin, and TSH) are worth discussing for ongoing fatigue?',
      enabled: true,
    },
    {
      id: 'rem-sti-screening',
      title: 'STI & Reproductive Health Checkup',
      category: 'screening',
      frequency: 'Yearly',
      nextDueDate: addDaysIso(today, 25),
      rationale:
        'Many common infections have no early symptoms; routine testing protects long-term reproductive and pelvic health.',
      whenAppropriate:
        'Recommended annually for sexually active women under 25 or any time with new/multiple partners or symptoms.',
      suggestedQuestion:
        'Which routine STI or reproductive screenings do clinicians recommend based on age and risk factors?',
      enabled: true,
    },
    {
      id: 'rem-breast-awareness',
      title: 'Clinical Breast Health & Screening Check-In',
      category: 'imaging',
      frequency: 'Yearly',
      nextDueDate: addDaysIso(today, 45),
      rationale:
        'Establishes personal breast-health baseline and ensures timely imaging discussions (mammogram/ultrasound when indicated).',
      whenAppropriate:
        'Discuss personal and family history with a clinician; screening mammography generally begins at age 40 (USPSTF) or earlier if high-risk.',
      suggestedQuestion:
        'How do family history and age affect when breast imaging like mammograms or ultrasounds is recommended?',
      enabled: true,
    },
  ];
}

export function loadSavedReminders(): CareReminder[] {
  if (typeof window === 'undefined') return getDefaultReminders();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultReminders();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return getDefaultReminders();
    }
    return parsed;
  } catch {
    return getDefaultReminders();
  }
}

export function saveReminders(reminders: CareReminder[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch {
    // Ignore storage quota issues
  }
}

export const CATEGORY_META: Record<
  ReminderCategory,
  { label: string; badgeClass: string }
> = {
  screening: {
    label: 'Screening',
    badgeClass: 'bg-[#EEF3E9] text-[#466B56] border-[#DCE5D5]',
  },
  imaging: {
    label: 'Ultrasound / Imaging',
    badgeClass: 'bg-[#F5EDF2] text-[#4A2D3C] border-[#E3D1DD]',
  },
  checkup: {
    label: 'Standard Checkup',
    badgeClass: 'bg-[#F7EFE8] text-[#9A6A1E] border-[#EFE0D5]',
  },
  medication: {
    label: 'Medication Dose',
    badgeClass: 'bg-[#E9DEE4] text-[#2B1810] border-[#D8C5CF]',
  },
  prescription: {
    label: 'Rx Refill',
    badgeClass: 'bg-[#F7EBE8] text-[#B3534B] border-[#F0DCD7]',
  },
};
