import { topic } from "./outline";
import { bad, DATE, str } from "./route";
import { MISTAKE_REASONS } from "./mistake-reasons";
import { SECTION_IDS } from "./sections";


export function mistakeFields(b: Record<string, unknown>) {
  const date = str(b.date);
  if (!DATE.test(date)) throw bad("A date is required");
  const t = topic(str(b.topic_id));
  return {
    date,
    source: str(b.source),
    section: SECTION_IDS.includes(str(b.section)) ? str(b.section) : t?.section ?? "",
    topic_id: t?.id ?? null,
    reason: MISTAKE_REASONS.some((r) => r.id === str(b.reason)) ? str(b.reason) : "content",
    question: str(b.question),
    takeaway: str(b.takeaway),
  };
}
