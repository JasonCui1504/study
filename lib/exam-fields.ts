import { bad, DATE, int, str } from "./route";
import { SECTION_MAX, SECTION_MIN } from "./sections";

export const EXAM_KINDS = ["full_length", "section_bank", "other"] as const;

/** Validated exam columns from a request body (scores optional, 118–132 each). */
export function examFields(b: Record<string, unknown>) {
  const date = str(b.date);
  if (!DATE.test(date)) throw bad("A date is required");
  const name = str(b.name);
  if (!name) throw bad("A name is required");
  const score = (k: string) => {
    if (b[k] === "" || b[k] == null) return null;
    const v = int(b[k]);
    if (v == null || v < SECTION_MIN || v > SECTION_MAX) throw bad(`Section scores run ${SECTION_MIN}–${SECTION_MAX}`);
    return v;
  };
  return {
    date,
    name,
    kind: (EXAM_KINDS as readonly string[]).includes(str(b.kind)) ? str(b.kind) : "full_length",
    cp: score("cp"),
    cars: score("cars"),
    bb: score("bb"),
    ps: score("ps"),
    reviewed: b.reviewed ? 1 : 0,
    notes: str(b.notes),
  };
}
