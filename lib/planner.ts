import { OUTLINE, TOPICS } from "./outline";
import { SECTIONS, sectionShort, type SectionId } from "./sections";
import type { Settings } from "./settings";
import { addDays, daysBetween, weekday } from "./time";

// Builds the study plan between today and the exam from the available hours
// per weekday and the topic confidence ratings. Three phases:
//   1. Content review: every outline topic, more time for weaker ones, sections interleaved.
//   2. Practice: timed passage sets per section, weighted toward weak sections.
//   3. Full-lengths: a full-length exam every few days, each followed by a review day.
// Every study day also gets flashcard reviews and CARS practice. A diagnostic
// full-length opens a long plan. Done tasks and tasks added by hand are kept.

export type PlanTask = {
  date: string;
  start_min: number | null;
  duration_min: number;
  title: string;
  kind: TaskKind;
  section: string;
  topic_id: string | null;
  notes: string;
};

export const TASK_KINDS = ["content", "weak", "practice", "cars", "cards", "full_length", "review", "exam", "rest", "custom"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const KIND_LABELS: Record<TaskKind, string> = {
  content: "Content review",
  weak: "Weak-topic review",
  practice: "Practice set",
  cars: "CARS",
  cards: "Flashcards",
  full_length: "Full-length",
  review: "Exam review",
  exam: "Exam day",
  rest: "Rest",
  custom: "Other",
};

const FL_MIN = 450; // a full-length with breaks runs ~7.5 h
const GAP_MIN = 15; // break between blocks
const round15 = (m: number) => Math.max(15, Math.round(m / 15) * 15);

type Day = { date: string; minutes: number; phase: 1 | 2 | 3 };

export type PlanInput = {
  settings: Settings;
  today: string;
  /** topic id → confidence 1–5 (0/missing = not rated) */
  confidence: Record<string, number>;
  /** topics whose content review is already done */
  doneTopics: Set<string>;
  /** full-lengths already taken (done tasks or logged exams) */
  fullLengthsTaken: number;
};

export function buildPlan({ settings, today, confidence, doneTopics, fullLengthsTaken }: PlanInput): PlanTask[] {
  if (!settings.exam_date) throw new Error("Set your exam date in Settings first");
  const exam = settings.exam_date;
  const start = settings.plan_start && settings.plan_start > today ? settings.plan_start : today;
  if (exam <= start) throw new Error("The exam date has to be after the plan's start");

  const off = new Set(settings.days_off);
  const out: PlanTask[] = [];
  const dayStart = settings.day_start_min;

  // Study days run up to two days before the exam; the day before is rest.
  const days: Day[] = [];
  for (let d = start; d < addDays(exam, -1); d = addDays(d, 1)) {
    const minutes = Math.round((settings.hours[weekday(d)] ?? 0) * 60);
    if (minutes >= 30 && !off.has(d)) days.push({ date: d, minutes, phase: 1 });
  }
  if (!days.length) throw new Error("No study days before the exam: add hours in Settings");

  // Phase lengths. Short plans skip straight to practice; content review gets half of a long one.
  const n = days.length;
  const final = Math.round(n * (n >= 42 ? 0.25 : 0.3));
  const practice = Math.round(n * (n >= 42 ? 0.25 : 0.3));
  days.forEach((d, i) => (d.phase = i >= n - final ? 3 : i >= n - final - practice ? 2 : 1));

  // Full-length days: once the practice phase starts, the longest study day of
  // each week (at most 8), plus a diagnostic at the start of a long plan.
  const flDays = new Set<string>();
  const later = days.filter((d) => d.phase >= 2 && daysBetween(d.date, exam) >= 4);
  for (let i = 0; i < later.length && flDays.size < 8; ) {
    const windowEnd = addDays(later[i].date, 7);
    // At least 5 days after the previous one, so each gets its review day and some practice after.
    const last = [...flDays].sort().pop();
    let j = i;
    let best: Day | null = null;
    while (j < later.length && later[j].date < windowEnd) {
      const d = later[j];
      const spaced = !last || daysBetween(last, d.date) >= 5;
      if (spaced && (!best || d.minutes > best.minutes)) best = d;
      j++;
    }
    if (best) flDays.add(best.date);
    i = j;
  }
  if (n >= 42 && fullLengthsTaken === 0) {
    const firstWeek = days.slice(0, 7).sort((a, b) => b.minutes - a.minutes)[0];
    if (firstWeek) flDays.add(firstWeek.date);
  }
  const flOrder = [...flDays].sort();
  const phaseOf = new Map(days.map((d) => [d.date, d.phase]));
  const flLabel = new Map<string, string>();
  let flCount = fullLengthsTaken;
  for (const f of flOrder) flLabel.set(f, phaseOf.get(f) === 1 ? "Diagnostic full-length" : `Full-length #${++flCount}`);
  const reviewDays = new Map<string, string>();
  for (const f of flOrder) {
    const next = days.find((d) => d.date > f && !flDays.has(d.date));
    if (next && !reviewDays.has(next.date)) reviewDays.set(next.date, flLabel.get(f)!.toLowerCase());
  }

  // Weakness: unrated counts as middling.
  const weak = (topicId: string) => {
    const c = confidence[topicId] ?? 0;
    return c ? 6 - c : 3;
  };
  const sectionWeakness = Object.fromEntries(
    SECTIONS.map((s) => {
      const ts = TOPICS.filter((t) => t.section === s.id);
      return [s.id, ts.reduce((a, t) => a + weak(t.id), 0) / ts.length];
    })
  ) as Record<SectionId, number>;

  // Each day: cards, CARS, then the phase's main work in the remaining time.
  type Slot = { day: Day; free: number; blocks: PlanTask[] };
  const slots: Slot[] = days.map((day) => ({ day, free: day.minutes, blocks: [] }));
  const add = (s: Slot, t: Omit<PlanTask, "date" | "start_min">) => {
    s.blocks.push({ ...t, date: s.day.date, start_min: null });
    s.free -= t.duration_min;
  };

  for (const s of slots) {
    const { date, minutes, phase } = s.day;
    if (flDays.has(date)) {
      add(s, {
        title: flLabel.get(date)!,
        kind: "full_length",
        section: "",
        topic_id: null,
        duration_min: Math.max(FL_MIN, minutes),
        notes: "Timed, test-day conditions: 95 / 90 / 95 / 95 min sections with the real breaks. Log the scores in Exams.",
      });
      s.free = 0;
      continue;
    }
    const cards = minutes >= 180 ? 45 : minutes >= 90 ? 30 : 15;
    add(s, { title: "Flashcard reviews", kind: "cards", section: "", topic_id: null, duration_min: cards, notes: "Clear today's due cards." });
    if (reviewDays.has(date)) {
      add(s, {
        title: `Review ${reviewDays.get(date)}`,
        kind: "review",
        section: "",
        topic_id: null,
        duration_min: round15(Math.max(60, s.free)),
        notes: "Go through every question you missed or guessed. Log each one in the Mistakes page and turn the takeaways into cards.",
      });
      s.free = 0;
      continue;
    }
    if (s.free >= 60) {
      const cars = phase === 1 ? 30 : 45;
      add(s, {
        title: phase === 1 ? "CARS: 2 passages + review" : "CARS: 3 passages + review",
        kind: "cars",
        section: "cars",
        topic_id: "CARS.2",
        duration_min: cars,
        notes: "Timed (~10 min per passage). Review why each wrong answer is wrong.",
      });
    }
  }

  // Phase 1: content topics, interleaved across the three science sections, weighted by weakness.
  const content = slots.filter((s) => s.day.phase === 1 && s.free >= 30);
  const queues = (["bb", "cp", "ps"] as const).map((sec) =>
    TOPICS.filter((t) => t.section === sec && !doneTopics.has(t.id))
  );
  const order: typeof TOPICS = [];
  // Round-robin, so each day mixes sections; bigger sections keep their share.
  const totals = queues.map((q) => q.length);
  const taken = queues.map(() => 0);
  while (taken.some((t, i) => t < totals[i])) {
    let best = -1;
    for (let i = 0; i < queues.length; i++) {
      if (taken[i] >= totals[i]) continue;
      if (best === -1 || taken[i] / totals[i] < taken[best] / totals[best]) best = i;
    }
    order.push(queues[best][taken[best]++]);
  }
  const contentMinutes = content.reduce((a, s) => a + s.free, 0);
  const totalWeight = order.reduce((a, t) => a + weak(t.id), 0);
  const blocks = order.map((t) => ({
    t,
    // 5% slack, since blocks are rounded and not split into tiny pieces.
    minutes: totalWeight ? Math.min(180, Math.max(30, round15((contentMinutes * 0.95 * weak(t.id)) / totalWeight))) : 60,
  }));
  let si = 0;
  for (const b of blocks) {
    let left = b.minutes;
    let part = 1;
    while (left > 0 && si < content.length) {
      const s = content[si];
      if (s.free < 30) {
        si++;
        continue;
      }
      // Split a block only if both parts are worth sitting down for; otherwise start it tomorrow.
      if (left > s.free && (s.free < 45 || left - s.free < 30)) {
        si++;
        continue;
      }
      const take = Math.min(left, s.free);
      const cat = OUTLINE.find((c) => c.id === b.t.category)!;
      add(s, {
        title: `${b.t.name}${part > 1 || take < left ? ` (part ${part})` : ""}`,
        kind: "content",
        section: b.t.section,
        topic_id: b.t.id,
        duration_min: round15(take),
        notes: `${sectionShort(b.t.section)} ${cat.id}: ${cat.name}. Read or watch the content, make flashcards for what's new, then rate your confidence in Outline.`,
      });
      left -= take;
      part++;
    }
  }
  // Content finished early: the leftover days become weak-topic practice.
  for (const s of content) if (s.free >= 30) s.day.phase = 2;

  // Phases 2 and 3: practice sets by section, weighted toward weaker sections; final-phase days also revisit the weakest topics.
  const sciences = (["bb", "cp", "ps"] as const).map((id) => ({ id, w: sectionWeakness[id], given: 0 }));
  const weakest = TOPICS.filter((t) => t.section !== "cars").sort((a, b) => weak(b.id) - weak(a.id) || a.id.localeCompare(b.id));
  let wi = 0;
  for (const s of slots) {
    if (s.day.phase === 1 || s.free < 30 || flDays.has(s.day.date)) continue;
    let k = 0;
    while (s.free >= 30) {
      if (s.day.phase === 3 && k === 1 && weakest.length) {
        const t = weakest[wi++ % weakest.length];
        add(s, {
          title: `Weak-topic review: ${t.name}`,
          kind: "weak",
          section: t.section,
          topic_id: t.id,
          duration_min: round15(Math.min(60, s.free)),
          notes: "Re-read your notes and mistakes on this topic, then do a few questions on it.",
        });
      } else {
        sciences.sort((a, b) => a.given / a.w - b.given / b.w);
        const sec = sciences[0];
        sec.given++;
        const focus = weakest.filter((t) => t.section === sec.id).slice(0, 3);
        add(s, {
          title: `${sectionShort(sec.id)} practice passages + review`,
          kind: "practice",
          section: sec.id,
          topic_id: null,
          duration_min: round15(Math.min(120, s.free)),
          notes: `Timed passage set, then review every miss and log it in Mistakes.${focus.length ? ` Weakest topics: ${focus.map((t) => t.name).join("; ")}.` : ""}`,
        });
      }
      k++;
    }
  }

  // Lay the blocks out in time, with short breaks between.
  for (const s of slots) {
    let at = dayStart;
    for (const b of s.blocks) {
      b.start_min = at;
      at += b.duration_min + GAP_MIN;
      out.push(b);
    }
  }
  out.push({
    date: addDays(exam, -1),
    start_min: null,
    duration_min: 30,
    title: "Rest day: light review only",
    kind: "rest",
    section: "",
    topic_id: null,
    notes: "Pack your ID, snacks and water. Sleep early.",
  });
  out.push({
    date: exam,
    start_min: null,
    duration_min: 480,
    title: "MCAT exam day",
    kind: "exam",
    section: "",
    topic_id: null,
    notes: "Good luck!",
  });
  return out;
}
