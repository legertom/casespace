/**
 * MCP server (streamable HTTP) — file a use case from Claude Code or Cursor
 * mid-build. Auth: personal access tokens; permissions follow the token
 * owner's web role. Sparse is safe: log_use_case needs only title +
 * description.
 */
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { pats, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/current-user";
import {
  proposalPatchToUpdateInput,
  proposalSchema,
  proposalToCreateInput,
} from "@/lib/ai/proposal";
import { hashToken } from "@/server/pat";
import { buildProgressReport } from "@/server/progress-report";
import { listUseCases } from "@/server/use-case-queries";
import {
  createUseCase,
  ForbiddenError,
  NotFoundError,
  resolveTeamId,
  updateUseCase,
} from "@/server/use-case-service";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorText(err: unknown) {
  const message =
    err instanceof ForbiddenError || err instanceof NotFoundError
      ? err.message
      : "Something went wrong.";
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "log_use_case",
      {
        title: "Log a use case",
        description:
          "File an AI use case into Casespace, Clever's casebook of AI workflows. Only title and description are required — a half-filled record that exists beats a perfect record that doesn't. People are full names; the server links them to the directory.",
        inputSchema: proposalSchema,
      },
      async (args, ctx) => {
        const user = ctx.http?.authInfo?.extra?.user as CurrentUser;
        try {
          const input = proposalToCreateInput(args);
          input.teamId = await resolveTeamId(args.team, args.department);
          const id = await createUseCase(
            { id: user.id, role: user.role },
            input,
            "mcp",
          );
          return json({ id, url: `/use-cases/${id}`, status: input.status });
        } catch (err) {
          return errorText(err);
        }
      },
    );

    server.registerTool(
      "update_use_case",
      {
        title: "Update a use case",
        description:
          "Update fields on an existing use case you created, own, or authored. Only the provided fields change. Status is not changed here — that happens in the app so the history stays complete.",
        inputSchema: z.object({
          id: z.string().describe("The use case id"),
          changes: proposalSchema.partial(),
        }),
      },
      async ({ id, changes }, ctx) => {
        const user = ctx.http?.authInfo?.extra?.user as CurrentUser;
        try {
          const patch = proposalPatchToUpdateInput(changes);
          if ("team" in changes) {
            patch.teamId = await resolveTeamId(
              changes.team,
              changes.department ?? null,
            );
          }
          await updateUseCase({ id: user.id, role: user.role }, id, patch);
          return json({ id, url: `/use-cases/${id}`, updated: true });
        } catch (err) {
          return errorText(err);
        }
      },
    );

    server.registerTool(
      "list_my_use_cases",
      {
        title: "List my use cases",
        description:
          "List the use cases that credit you (created, owned, or authored by the token's owner).",
        inputSchema: z.object({}),
      },
      async (_args, ctx) => {
        const user = ctx.http?.authInfo?.extra?.user as CurrentUser;
        const rows = await listUseCases({ mineUserId: user.id });
        return json(
          rows.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            department: r.department,
            owner: r.ownerName,
            updatedAt: r.updatedAt,
          })),
        );
      },
    );

    server.registerTool(
      "get_progress",
      {
        title: "Get program progress",
        description:
          "The program scoreboard: documented (45) and Qualified+ (15) counts with pace, pipeline, per-ELT-org and per-team splits, and attention flags.",
        inputSchema: z.object({}),
      },
      async () => json(await buildProgressReport()),
    );
  },
  {
    serverInfo: { name: "casespace", version: "1.0.0" },
    instructions:
      "Casespace is Clever's AI use-case casebook. Log workflows as you build them — sparse records are welcome; the four documented gates and ROI scoring can come later in the app.",
  },
);

const authed = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    if (!bearerToken || !/^csp_[a-f0-9]{48}$/i.test(bearerToken)) {
      return undefined;
    }
    const db = getDb();
    const [row] = await db
      .select({ pat: pats, user: users })
      .from(pats)
      .innerJoin(users, eq(pats.userId, users.id))
      .where(
        and(eq(pats.tokenHash, hashToken(bearerToken)), isNull(pats.revokedAt)),
      );
    if (!row) return undefined;
    db.update(pats)
      .set({ lastUsedAt: new Date() })
      .where(eq(pats.id, row.pat.id))
      .catch(() => {});
    return {
      token: bearerToken,
      clientId: row.user.id,
      scopes: [row.user.role],
      extra: { user: row.user },
    };
  },
  { required: true },
);

export { authed as GET, authed as POST, authed as DELETE };
