---
title: AI configuration
audience: engineering
updated: 2026-08-14
code:
  - src/lib/ai/config.ts
  - src/lib/ai/usage.ts
  - src/lib/ai/proposal.ts
  - src/lib/ai/coach-prompt.ts
---

# AI configuration

## Models live in exactly one file

`src/lib/ai/config.ts` — nowhere else. Model ids are Vercel AI Gateway ids,
verified against the live gateway list.

| Use | Model |
|---|---|
| The Coach, and the weekly What's New post | `anthropic/claude-sonnet-5` |
| Parsing and extraction (the notes door) | `anthropic/claude-haiku-4.5` |

Features are tagged `coach`, `notes_parser`, `whats_new` for per-call
attribution in the AI Gateway dashboard.

## Usage logging

**Every model call logs tokens to `ai_usage`.** No exceptions — a new AI
feature that doesn't log is a bug.

## Graceful degradation

`aiConfigured()` is true when `AI_GATEWAY_API_KEY` is set, or when a Vercel
OIDC token is present (`vercel env pull` locally, automatic on Vercel).

Without it, the Coach and notes parsing show a polite notice — *"AI features
aren't set up yet…"* — and **everything else in Casespace works**. Nothing
crashes, nothing 500s, no deploy fails.

The weekly post is the exception, because nobody is watching it run: the
[cron job](../integrations/cron.md) returns 503 and writes nothing, so that
week simply has no post rather than a placeholder explaining itself.

## The rule about writes

**The AI never writes a record.** Its tools emit **proposals** with no
execute path; the only writes are buttons a human clicks. This holds for the
Coach, the notes parser, and anything added later — see
[the Coach](../features/coach.md#the-coach-never-writes).

Read that literally, because there is one AI write that no human confirms:
**the weekly What's New post publishes itself**, unreviewed, straight to
everyone at Clever. The rule protects the casebook — the program's data —
not every surface. If you are adding an AI feature, the question to ask is
not "does a human click something?" but "what does this write, and who sees
it before a person does?"

## What the AI cannot see

Comments. Not in `get_use_case`, not on the MCP surface, not in What's New
generation. If the AI is ever given a voice there, it must arrive as a
proposal card a human confirms.

## Related

- [The Coach](../features/coach.md)
- [What's New](../features/whats-new.md)
- [Deploying](deploy.md)
