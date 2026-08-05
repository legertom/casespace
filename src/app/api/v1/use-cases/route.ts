import { z } from "zod";
import { DEPARTMENTS, STATUSES, type Department, type UcStatus } from "@/lib/domain";
import { useCaseCreateSchema } from "@/lib/use-case-input";
import { toApiUseCase } from "@/server/api-serializers";
import { authenticatePat } from "@/server/pat";
import { listUseCases } from "@/server/use-case-queries";
import { createUseCase, ForbiddenError } from "@/server/use-case-service";

export async function GET(req: Request) {
  const user = await authenticatePat(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const department = url.searchParams.get("department");
  const rows = await listUseCases({
    q: url.searchParams.get("q") ?? undefined,
    status: STATUSES.includes(status as UcStatus)
      ? (status as UcStatus)
      : undefined,
    department: DEPARTMENTS.includes(department as Department)
      ? (department as Department)
      : undefined,
    mineUserId: url.searchParams.get("mine") === "1" ? user.id : undefined,
  });
  return Response.json({ useCases: rows.map(toApiUseCase) });
}

/**
 * Sparse is safe: only title + description required. Everything else
 * defaults to the emptiest honest value.
 */
export async function POST(req: Request) {
  const user = await authenticatePat(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = useCaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: z.treeifyError(parsed.error) },
      { status: 422 },
    );
  }
  try {
    const id = await createUseCase(
      { id: user.id, role: user.role },
      parsed.data,
      "api",
    );
    return Response.json({ id, url: `/use-cases/${id}` }, { status: 201 });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return Response.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
