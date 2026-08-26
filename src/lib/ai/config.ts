/**
 * All model choices live here — nowhere else. Models are Vercel AI Gateway
 * ids (verified against the live gateway list).
 */
export const MODELS = {
  /** Coach conversation + the weekly What's New draft (capable default). */
  coach: "anthropic/claude-sonnet-5",
  /** Parsing/extraction — fast and cheap. */
  extract: "anthropic/claude-haiku-4.5",
  /**
   * Grades eval output (`pnpm eval`). Dev tooling only — the app never calls
   * it, and its calls are deliberately absent from `ai_usage`.
   */
  judge: "anthropic/claude-sonnet-5",
} as const;

export type AiFeature =
  | "coach"
  | "notes_parser"
  | "search_parser"
  | "whats_new";

export function aiConfigured(): boolean {
  // Gateway auth: static key, or Vercel OIDC token (vercel env pull).
  return Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );
}

/** Per-call gateway attribution (shows up in the AI Gateway dashboard). */
export function gatewayOptions(userId: string, feature: AiFeature) {
  return { gateway: { user: userId, tags: [`feature:${feature}`] } };
}

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI features aren't set up yet — an admin needs to add AI_GATEWAY_API_KEY. Everything else in Casespace works without it.";
