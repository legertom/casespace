import "server-only";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { useCaseLinks, useCases } from "@/db/schema";
import type { UcStatus } from "@/lib/domain";
import type { RecordLink } from "@/lib/use-case-links";

/**
 * Every link this record is part of, from its own side. Links whose far end
 * has been deleted are left out — there is nothing to click through to.
 */
export async function listRecordLinks(
  useCaseId: string,
): Promise<RecordLink[]> {
  const db = getDb();
  const columns = {
    id: useCaseLinks.id,
    kind: useCaseLinks.kind,
    createdById: useCaseLinks.createdById,
    createdAt: useCaseLinks.createdAt,
    otherId: useCases.id,
    otherTitle: useCases.title,
    otherOwnerName: useCases.ownerName,
  };

  const [out, incoming] = await Promise.all([
    db
      .select(columns)
      .from(useCaseLinks)
      .innerJoin(useCases, eq(useCaseLinks.toUseCaseId, useCases.id))
      .where(
        and(
          eq(useCaseLinks.fromUseCaseId, useCaseId),
          isNull(useCases.deletedAt),
        ),
      ),
    db
      .select(columns)
      .from(useCaseLinks)
      .innerJoin(useCases, eq(useCaseLinks.fromUseCaseId, useCases.id))
      .where(
        and(eq(useCaseLinks.toUseCaseId, useCaseId), isNull(useCases.deletedAt)),
      ),
  ]);

  return [
    ...out.map((r) => ({ ...r, outgoing: true })),
    ...incoming.map((r) => ({ ...r, outgoing: false })),
  ]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(({ createdAt: _createdAt, ...link }) => link);
}

export interface LinkableUseCase {
  id: string;
  title: string;
  ownerName: string | null;
  status: UcStatus;
}

/**
 * What the picker offers: every live record but this one. ~45 rows at the
 * program's target, so the whole list ships to the client and filters there.
 */
export async function listLinkableUseCases(
  excludeId: string,
): Promise<LinkableUseCase[]> {
  const db = getDb();
  return db
    .select({
      id: useCases.id,
      title: useCases.title,
      ownerName: useCases.ownerName,
      status: useCases.status,
    })
    .from(useCases)
    .where(and(ne(useCases.id, excludeId), isNull(useCases.deletedAt)))
    .orderBy(asc(useCases.title));
}
