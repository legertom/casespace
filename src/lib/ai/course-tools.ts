/**
 * The `suggest_courses` tool, declared once.
 *
 * It lives here rather than inline in the Coach route for the same reason the
 * proposal tools do: the description is what the model routes on, so the evals
 * import this declaration instead of restating it. An eval that redeclared the
 * tool would grade a copy and stay green while production drifted.
 *
 * Unlike the casebook read tools, this one needs no session and no database —
 * matching is pure — so the whole thing, `execute` included, is shareable. The
 * evals run the real matcher against the real description, which is the only
 * arrangement in which "did it recommend something the tool never returned"
 * is a question the evals can actually ask.
 */
import { tool } from "ai";
import { z } from "zod";
import { APPROACHES, DEPARTMENTS } from "@/lib/domain";
import {
  APPROACH_TAGS_NOTE,
  MAX_SUGGESTIONS,
  suggestCourses,
  type CourseSignals,
  type CourseSuggestion,
} from "@/lib/ai/courses";

export const courseToolInputSchema = z.object({
  text: z
    .string()
    .nullish()
    .describe(
      "The workflow in their words — title, description, and the current steps, run together.",
    ),
  aiTools: z
    .array(z.string())
    .nullish()
    .describe("Tool names as they gave them, e.g. 'Claude Code', 'Zapier'."),
  approaches: z.array(z.enum(APPROACHES)).nullish().describe(APPROACH_TAGS_NOTE),
  department: z.enum(DEPARTMENTS).nullish(),
  ratings: z
    .object({
      dataAvailability: z.number().int().min(1).max(5).nullish(),
      risk: z.number().int().min(1).max(5).nullish(),
      evaluationClarity: z.number().int().min(1).max(5).nullish(),
      maintenanceBurden: z.number().int().min(1).max(5).nullish(),
    })
    .nullish()
    .describe(
      "The worksheet ratings they gave, 1-5. Only pass one they actually answered.",
    ),
});

function courseSignalsFrom(
  input: z.infer<typeof courseToolInputSchema>,
): CourseSignals {
  return {
    text: input.text ?? undefined,
    aiTools: input.aiTools ?? undefined,
    approaches: input.approaches ?? undefined,
    department: input.department ?? undefined,
    ratings: input.ratings ?? undefined,
  };
}

export const COURSE_TOOL_DESCRIPTION =
  `Free DeepLearning.AI courses relevant to the workflow just described, best first, at most ${MAX_SUGGESTIONS}. ` +
  "Call it once, after they have accepted or declined the proposal card — never mid-interview. " +
  "Pass what the interview established; every argument is optional. " +
  "It returns an empty list when nothing in the catalogue genuinely fits, which is a common and correct answer: say nothing about courses in that case. " +
  "Recommend only what this returns. Never name a course, a link, a duration, or a level from memory.";

/**
 * Wizard-only in the route's tool table. `onResult` exists for the evals,
 * which need to know what the Coach was handed in order to grade whether it
 * relayed that and nothing else; the app passes nothing.
 */
export function courseTools(
  onResult?: (courses: CourseSuggestion[]) => void,
) {
  return {
    suggest_courses: tool({
      description: COURSE_TOOL_DESCRIPTION,
      inputSchema: courseToolInputSchema,
      execute: (input) => {
        const courses = suggestCourses(courseSignalsFrom(input));
        onResult?.(courses);
        return { courses };
      },
    }),
  };
}
