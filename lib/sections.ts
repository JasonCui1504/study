// The four scored MCAT sections. Colours are fixed per section (validated as
// categorical slots on the dark surface) and "general" covers mixed work like
// full-length exams.

export const SECTIONS = [
  { id: "cp", short: "C/P", name: "Chemical & Physical Foundations", color: "#3987e5" },
  { id: "cars", short: "CARS", name: "Critical Analysis & Reasoning Skills", color: "#c98500" },
  { id: "bb", short: "B/B", name: "Biological & Biochemical Foundations", color: "#199e70" },
  { id: "ps", short: "P/S", name: "Psychological, Social & Biological Foundations", color: "#9085e9" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const GENERAL_COLOR = "#d55181";

export const SECTION_IDS: readonly string[] = SECTIONS.map((s) => s.id);

export function section(id: string | null | undefined) {
  return SECTIONS.find((s) => s.id === id) ?? null;
}

export function sectionColor(id: string | null | undefined): string {
  return section(id)?.color ?? GENERAL_COLOR;
}

export function sectionShort(id: string | null | undefined): string {
  return section(id)?.short ?? "General";
}

/** Scaled score ranges. */
export const SECTION_MIN = 118;
export const SECTION_MAX = 132;
export const TOTAL_MIN = 472;
export const TOTAL_MAX = 528;
