// Why a question was missed (client-safe; validated in lib/mistake-fields.ts).
export const MISTAKE_REASONS = [
  { id: "content", label: "Content gap" },
  { id: "misread", label: "Misread question/passage" },
  { id: "reasoning", label: "Faulty reasoning" },
  { id: "timing", label: "Ran out of time" },
  { id: "careless", label: "Careless / math slip" },
  { id: "guess", label: "Guessed (got lucky or not)" },
] as const;
