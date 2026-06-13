// Canonical standard lecturer-evaluation question set.
// Shared between client (preview) and server (insert).
export type EvalQuestion = {
  id: string;
  type: "text" | "choice" | "rating";
  text: string;
  options?: string[];
};

export const STANDARD_EVAL_QUESTIONS: ReadonlyArray<Omit<EvalQuestion, "id">> = [
  { type: "rating", text: "Teaching clarity — how clearly did the lecturer explain concepts?" },
  { type: "rating", text: "Fairness — were grading and assessments fair and consistent?" },
  { type: "rating", text: "Availability — was the lecturer reachable outside class for help?" },
  { type: "rating", text: "Course materials — quality of slides, notes, and references?" },
  { type: "rating", text: "Overall — how would you rate this lecturer overall?" },
  { type: "text", text: "What did this lecturer do well?" },
  { type: "text", text: "What could this lecturer improve?" },
];

export function buildStandardEvalPayload(
  lecturerName: string,
  courseCode: string | null,
): { title: string; description: string; questions: EvalQuestion[] } {
  const course = courseCode ? ` (${courseCode})` : "";
  return {
    title: `Evaluation of ${lecturerName}${course}`,
    description:
      "This is an official end-of-semester evaluation. Your honest feedback is anonymous to the lecturer and helps the department improve teaching.",
    questions: STANDARD_EVAL_QUESTIONS.map((q) => ({
      ...q,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2),
    })),
  };
}
