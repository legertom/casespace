/**
 * Generating a post for a fixture week, and grading it.
 *
 * Deliberately never imports `src/server/whats-new.ts`: that reads the
 * database and writes a row to `posts`. Evals render the same prompt against
 * fixture data and throw the result away.
 */
import { Output, generateText } from "ai";
import { z } from "zod";
import { MODELS } from "@/lib/ai/config";
import {
  EDITORIAL_INSTRUCTIONS,
  whatsNewPrompt,
  type WeekData,
} from "@/lib/ai/whats-new-prompt";

/** Eval spend shows up under its own tag in the AI Gateway dashboard. */
const EVAL_ATTRIBUTION = {
  gateway: { user: "eval", tags: ["feature:eval"] },
};

/** The date the fixtures are written as if it were "today". */
export const EVAL_TODAY = "2026-08-10";

/** Run the real editorial prompt against a fixture week. */
export async function generatePost(data: WeekData): Promise<string> {
  const result = await generateText({
    model: MODELS.coach,
    instructions: EDITORIAL_INSTRUCTIONS,
    prompt: whatsNewPrompt(data, EVAL_TODAY),
    providerOptions: EVAL_ATTRIBUTION,
  });
  return result.text;
}

export interface Rubric {
  /** Short id, used as the test's failure label. */
  id: string;
  /** The yes/no question the judge answers. Phrase so that "yes" is a pass. */
  question: string;
}

export interface Finding {
  id: string;
  pass: boolean;
  evidence: string;
}

const verdictSchema = z.object({
  findings: z.array(
    z.object({
      id: z.string().describe("The rubric id being answered"),
      pass: z.boolean().describe("true when the post satisfies the rubric"),
      evidence: z
        .string()
        .describe(
          "A short quote from the post that justifies the verdict, or an explanation when it fails",
        ),
    }),
  ),
});

const JUDGE_INSTRUCTIONS = `You grade an internal newsletter against an editorial brief. You are strict, literal, and you do not give credit for good intentions.

You are given the SOURCE DATA the writer was working from and the POST they produced, then a list of rubric questions. Answer every rubric with pass=true or pass=false.

Rules for grading:
- Judge only what the rubric asks. Do not invent additional standards.
- A number in the post is "supported" only if it appears in, or is a direct sum of, the source data. Treat a plausible-sounding but absent number as unsupported.
- Quote the offending text as evidence when you fail a rubric.
- Answer every rubric id exactly once.`;

/** Grade one post against a set of rubrics in a single model call. */
export async function judgePost(
  post: string,
  data: WeekData,
  rubrics: Rubric[],
): Promise<Finding[]> {
  const { output } = await generateText({
    model: MODELS.judge,
    output: Output.object({ schema: verdictSchema }),
    instructions: JUDGE_INSTRUCTIONS,
    prompt: `SOURCE DATA:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\nPOST:\n\`\`\`markdown\n${post}\n\`\`\`\n\nRubrics:\n${rubrics
      .map((r) => `- ${r.id}: ${r.question}`)
      .join("\n")}`,
    providerOptions: EVAL_ATTRIBUTION,
  });

  // A judge that silently drops a rubric would read as a pass; make it a fail.
  return rubrics.map(
    (r) =>
      output.findings.find((f) => f.id === r.id) ?? {
        id: r.id,
        pass: false,
        evidence: "The judge returned no verdict for this rubric.",
      },
  );
}

/** Failure message listing what the judge rejected. */
export function describeFailures(findings: Finding[]): string {
  return findings
    .filter((f) => !f.pass)
    .map((f) => `  • ${f.id} — ${f.evidence}`)
    .join("\n");
}
