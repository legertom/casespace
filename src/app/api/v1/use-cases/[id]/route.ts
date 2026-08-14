import { z } from "zod";
import { useCaseUpdateApiSchema } from "@/lib/use-case-input";
import { toApiUseCase } from "@/server/api-serializers";
import { authenticatePat } from "@/server/pat";
import { getUseCase, listUseCases } from "@/server/use-case-queries";
import {
  ForbiddenError,
  NotFoundError,
  updateUseCase,
} from "@/server/use-case-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticatePat(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const uc = await getUseCase(id).catch(() => null);
  if (!uc) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({
    useCase: {
      ...toApiUseCase({ ...uc, authors: uc.authors }),
      history: uc.history.map((h) => ({
        at: h.createdAt,
        from: h.fromStatus,
        to: h.toStatus,
        by: h.changedByName,
        note: h.note,
      })),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticatePat(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = useCaseUpdateApiSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: z.treeifyError(parsed.error) },
      { status: 422 },
    );
  }
  try {
    await updateUseCase({ id: user.id, role: user.role }, id, parsed.data);
    const [row] = await listUseCases({}).then((rows) =>
      rows.filter((r) => r.id === id),
    );
    return Response.json({ useCase: row ? toApiUseCase(row) : { id } });
  } catch (err) {
    if (err instanceof NotFoundError)
      return Response.json({ error: err.message }, { status: 404 });
    if (err instanceof ForbiddenError)
      return Response.json({ error: err.message }, { status: 403 });
    console.error(err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
