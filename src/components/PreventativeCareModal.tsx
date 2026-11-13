import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  CalendarCheck,
  Check,
  Clock,
  MessageCircle,
  Pill,
  Plus,
  RotateCcw,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CareReminder,
  ReminderCategory,
  ReminderFrequency,
} from '../shared/types';
import {
  CATEGORY_META,
  getReminderStatus,
  todayIsoDate,
} from '../data/preventativeReminders';

interface PreventativeCareModalProps {
  open: boolean;
  reminders: CareReminder[];
  onClose: () => void;
  onMarkDone: (id: string) => void;
  onSnooze: (id: string, days: number) => void;
  onToggleEnabled: (id: string) => void;
  onAddReminder: (reminder: Omit<CareReminder, 'id'>) => void;
  onDeleteReminder: (id: string) => void;
  onResetDefaults: () => void;
  onAskInChat: (question: string) => void;
}

type CategoryFilter = 'all' | ReminderCategory;

export const PreventativeCareModal: React.FC<PreventativeCareModalProps> = ({
  open,
  reminders,
  onClose,
  onMarkDone,
  onSnooze,
  onToggleEnabled,
  onAddReminder,
  onDeleteReminder,
  onResetDefaults,
  onAskInChat,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ReminderCategory>('medication');
  const [frequency, setFrequency] = useState<ReminderFrequency>('Daily');
  const [nextDueDate, setNextDueDate] = useState(todayIsoDate());
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [notes, setNotes] = useState('');

  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  if (!open) return null;

  const sorted = [...reminders].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.nextDueDate.localeCompare(b.nextDueDate);
  });

  const filtered = sorted.filter((item) =>
    categoryFilter === 'all' ? true : item.category === categoryFilter
  );

  const dueCount = reminders.filter((r) => {
    const status = getReminderStatus(r);
    return status.kind === 'due' || status.kind === 'soon';
  }).length;

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        new Notification('Nomi Care Reminders Enabled', {
          body: `You have ${dueCount} preventative checkup or medication reminder${
            dueCount === 1 ? '' : 's'
          } due soon.`,
        });
      }
    } catch {
      // Ignore browser notification permission restrictions in embedded iframes
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    onAddReminder({
      title: cleanTitle,
      category,
      frequency,
      nextDueDate: nextDueDate || todayIsoDate(),
      timeOfDay:
        category === 'medication' || category === 'prescription'
          ? timeOfDay || '08:00'
          : undefined,
      rationale:
        notes.trim() ||
        'Personal preventative checkup, medication, or prescription reminder tracked locally.',
      whenAppropriate:
        'Confirm exact screening intervals, dosage, or refill timing with your clinician or pharmacist.',
      suggestedQuestion: `What questions should I bring to my clinician or pharmacist about "${cleanTitle}"?`,
      enabled: true,
      isCustom: true,
    });

    setTitle('');
    setNotes('');
    setShowAddForm(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preventative Care and Medication Reminders"
      className="fixed inset-0 z-50 bg-[#2B1810]/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full max-w-[440px] max-h-[90dvh] bg-[#FAF5EF] text-[#2B1810] rounded-t-[28px] sm:rounded-[28px] border border-[#E8DED2] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[#EAE2D8] bg-[#FBF7F2] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase font-semibold text-[#78665E]">
              <BellRing className="w-3.5 h-3.5 text-[#B3534B]" />
              <span>Preventative Care &amp; Rx</span>
            </div>
            <h2 className="font-display text-2xl font-normal text-[#2B1810] mt-0.5">
              Checkups &amp; Medications
            </h2>
            <p className="text-[11.5px] text-[#73635A] mt-0.5 leading-snug">
              Frequent prompts for Pap smears, appropriate ultrasounds, standard checkups, and
              medications/refills.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reminders"
            className="min-w-[40px] min-h-[40px] rounded-full bg-[#FAF5EF] border border-[#EAE2D8] flex items-center justify-center text-[#2B1810] hover:bg-[#EFE4EB] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action & Filter Strip */}
        <div className="px-5 py-3 border-b border-[#EAE2D8] space-y-2.5 shrink-0 bg-[#FAF5EF]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-[#2B1810] text-[#FAF5EF] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : 'Add Reminder'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              {notificationPermission !== 'unsupported' &&
                notificationPermission !== 'granted' && (
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    className="min-h-[38px] px-3 py-1.5 rounded-full bg-[#FBF7F2] border border-[#EAE2D8] text-[11px] font-medium text-[#2B1810] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Browser Alerts</span>
                  </button>
                )}
              <button
                type="button"
                onClick={onResetDefaults}
                title="Reset default reminders"
                className="min-h-[38px] px-3 py-1.5 rounded-full bg-[#FBF7F2] border border-[#EAE2D8] text-[11px] font-medium text-[#73635A] inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(
              [
                { id: 'all', label: `All (${reminders.length})` },
                { id: 'screening', label: 'Pap & Screenings' },
                { id: 'imaging', label: 'Ultrasound' },
                { id: 'checkup', label: 'Checkups' },
                { id: 'medication', label: 'Medications' },
                { id: 'prescription', label: 'Rx Refills' },
              ] as const
            ).map((tab) => {
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap cursor-pointer transition ${
                    active
                      ? 'bg-[#2B1810] text-[#FAF5EF]'
                      : 'bg-[#FBF7F2] text-[#5C4D44] border border-[#EAE2D8]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3 min-h-0">
          {showAddForm && (
            <form
              onSubmit={handleAddSubmit}
              className="rounded-[20px] border border-[#E3D1DD] bg-[#FBF7F2] p-4 space-y-3 text-xs shadow-xs"
            >
              <p className="font-semibold text-[#2B1810]">
                New Preventative Checkup or Medication Reminder
              </p>
              <div>
                <label htmlFor="rem-title" className="block text-[11px] text-[#594C44] mb-1">
                  Reminder Name
                </label>
                <input
                  id="rem-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Iron bisglycinate, Pap smear, Thyroid lab"
                  className="w-full min-h-[42px] rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] px-3 text-xs text-[#2B1810]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="rem-cat" className="block text-[11px] text-[#594C44] mb-1">
                    Category
                  </label>
                  <select
                    id="rem-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ReminderCategory)}
                    className="w-full min-h-[42px] rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] px-2.5 text-xs text-[#2B1810]"
                  >
                    <option value="medication">Medication Dose</option>
                    <option value="prescription">Prescription Refill</option>
                    <option value="screening">Pap / Screening</option>
                    <option value="imaging">Ultrasound / Imaging</option>
                    <option value="checkup">Standard Checkup</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="rem-freq" className="block text-[11px] text-[#594C44] mb-1">
                    Frequency
                  </label>
                  <select
                    id="rem-freq"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
                    className="w-full min-h-[42px] rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] px-2.5 text-xs text-[#2B1810]"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Every 3 months">Every 3 months</option>
                    <option value="Every 6 months">Every 6 months</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Every 3 years">Every 3 years</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="rem-date" className="block text-[11px] text-[#594C44] mb-1">
                    Next Due Date
                  </label>
                  <input
                    id="rem-date"
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full min-h-[42px] rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] px-2.5 text-xs text-[#2B1810]"
                  />
                </div>
                {(category === 'medication' || category === 'prescription') && (
                  <div>
                    <label htmlFor="rem-time" className="block text-[11px] text-[#594C44] mb-1">
                      Time of Day
                    </label>
                    <input
                      id="rem-time"
                      type="time"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                      className="w-full min-h-[42px] rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] px-2.5 text-xs text-[#2B1810]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="rem-notes" className="block text-[11px] text-[#594C44] mb-1">
                  Notes (optional)
                </label>
                <input
                  id="rem-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Pharmacy refill # or questions for OB/GYN"
                  className="w-full min-h-[42px] rounded-xl border border-[#EAE2D8] bg-[#FAF5EF] px-3 text-xs text-[#2B1810]"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-full bg-[#2B1810] text-[#FAF5EF] text-xs font-semibold cursor-pointer"
              >
                Save Reminder
              </button>
            </form>
          )}

          {filtered.map((item) => {
            const status = getReminderStatus(item);
            const catMeta = CATEGORY_META[item.category];
            const isUrgentDue = status.kind === 'due' || status.kind === 'soon';

            return (
              <article
                key={item.id}
                className={`rounded-[20px] border p-4 space-y-2.5 transition ${
                  !item.enabled
                    ? 'bg-[#FBF7F2]/60 border-[#EAE2D8] opacity-70'
                    : isUrgentDue
                    ? 'bg-[#FBF7F2] border-[#E3C8C2] shadow-xs'
                    : 'bg-[#FBF7F2] border-[#EAE2D8]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catMeta.badgeClass}`}
                    >
                      {item.category === 'medication' || item.category === 'prescription' ? (
                        <Pill className="w-3 h-3" />
                      ) : (
                        <Stethoscope className="w-3 h-3" />
                      )}
                      {catMeta.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        status.kind === 'due'
                          ? 'bg-[#B3534B]/15 text-[#B3534B]'
                          : status.kind === 'soon'
                          ? 'bg-[#BA7D32]/15 text-[#BA7D32]'
                          : status.kind === 'paused'
                          ? 'bg-[#EAE2D8] text-[#73635A]'
                          : 'bg-[#EEF3E9] text-[#466B56]'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleEnabled(item.id)}
                    className="text-[11px] font-medium text-[#73635A] underline underline-offset-2 cursor-pointer shrink-0"
                  >
                    {item.enabled ? 'Pause' : 'Resume'}
                  </button>
                </div>

                <div>
                  <h3 className="font-display text-[19px] font-medium text-[#2B1810] leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[#78665E] mt-0.5">
                    Schedule: <strong className="text-[#2B1810]">{item.frequency}</strong>
                    {item.timeOfDay ? ` · ${item.timeOfDay}` : ''}
                    {item.lastCompletedDate ? ` · Last done: ${item.lastCompletedDate}` : ''}
                  </p>
                </div>

                <p className="text-xs text-[#594C44] leading-relaxed">{item.rationale}</p>
                <p className="text-[11px] text-[#6F6057] bg-[#FAF5EF] border border-[#EAE2D8] rounded-xl px-3 py-2 leading-relaxed">
                  <strong className="text-[#2B1810]">When appropriate:</strong>{' '}
                  {item.whenAppropriate}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onMarkDone(item.id)}
                    className="min-h-[38px] px-3 py-1.5 rounded-full bg-[#466B56] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {item.category === 'medication' ? 'Taken Today' : 'Mark Completed'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSnooze(item.id, 7)}
                    className="min-h-[38px] px-3 py-1.5 rounded-full bg-[#FAF5EF] border border-[#EAE2D8] text-[#5C4D44] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Snooze 7d</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onAskInChat(item.suggestedQuestion);
                      onClose();
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-full bg-[#E9DEE4] text-[#2B1810] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Ask Nomi</span>
                  </button>

                  {item.isCustom && (
                    <button
                      type="button"
                      onClick={() => onDeleteReminder(item.id)}
                      aria-label={`Delete ${item.title}`}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-full bg-[#F7EBE8] text-[#B3534B] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          <p className="text-[11px] text-[#73635A] leading-relaxed px-1 pb-2">
            Educational self-tracking only. Always follow your clinician&apos;s and pharmacist&apos;s
            recommended screening intervals, imaging orders, and prescription instructions.
          </p>
        </div>
      </div>
    </div>
  );
};
