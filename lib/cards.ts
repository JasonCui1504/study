import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade, State } from "ts-fsrs";

// FSRS (the algorithm modern Anki uses) via ts-fsrs. A card row stores the
// scheduler's memory state; these convert between the row and ts-fsrs.

export type CardRow = {
  id: number;
  deck_id: number;
  kind: "basic" | "cloze";
  front: string;
  back: string;
  extra: string;
  cloze_index: number;
  topic_id: string | null;
  tags: string;
  suspended: number;
  flagged: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

export const FSRS_FIELDS = [
  "due",
  "stability",
  "difficulty",
  "elapsed_days",
  "scheduled_days",
  "learning_steps",
  "reps",
  "lapses",
  "state",
  "last_review",
] as const;

export function scheduler(retention: number) {
  return fsrs(generatorParameters({ request_retention: retention, enable_fuzz: true }));
}

export function toFsrs(r: Pick<CardRow, (typeof FSRS_FIELDS)[number]>): Card {
  return {
    due: new Date(r.due),
    stability: Number(r.stability),
    difficulty: Number(r.difficulty),
    elapsed_days: Number(r.elapsed_days),
    scheduled_days: Number(r.scheduled_days),
    learning_steps: Number(r.learning_steps),
    reps: Number(r.reps),
    lapses: Number(r.lapses),
    state: Number(r.state) as State,
    last_review: r.last_review ? new Date(r.last_review) : undefined,
  };
}

/** The FSRS columns of a card as SQL values, in FSRS_FIELDS order. */
export function fsrsValues(c: Card): (string | number | null)[] {
  return [
    c.due.toISOString(),
    c.stability,
    c.difficulty,
    c.elapsed_days,
    c.scheduled_days,
    c.learning_steps,
    c.reps,
    c.lapses,
    c.state,
    c.last_review ? c.last_review.toISOString() : null,
  ];
}

export function newCardValues(now = new Date()) {
  return fsrsValues(createEmptyCard(now));
}

/** "10m", "1d", "3.2mo" — how long until the card comes back. */
export function intervalLabel(from: Date, due: Date): string {
  const min = (due.getTime() - from.getTime()) / 60000;
  if (min < 60) return `${Math.max(1, Math.round(min))}m`;
  if (min < 60 * 24) return `${Math.round(min / 60)}h`;
  const d = min / 1440;
  if (d < 30) return `${Math.round(d)}d`;
  if (d < 365) return `${(d / 30).toFixed(1).replace(/\.0$/, "")}mo`;
  return `${(d / 365).toFixed(1).replace(/\.0$/, "")}y`;
}

/** What each grade would schedule, for the buttons. */
export function previews(row: CardRow, retention: number, now = new Date()): Record<Grade, string> {
  const rec = scheduler(retention).repeat(toFsrs(row), now);
  return {
    1: intervalLabel(now, rec[1].card.due),
    2: intervalLabel(now, rec[2].card.due),
    3: intervalLabel(now, rec[3].card.due),
    4: intervalLabel(now, rec[4].card.due),
  } as Record<Grade, string>;
}

/** The cloze numbers used in a note, e.g. {{c1::…}} {{c2::…}} → [1, 2]. */
export function clozeNumbers(text: string): number[] {
  const nums = new Set<number>();
  for (const m of text.matchAll(/\{\{c(\d+)::/g)) nums.add(Number(m[1]));
  return [...nums].sort((a, b) => a - b);
}

export { State };
