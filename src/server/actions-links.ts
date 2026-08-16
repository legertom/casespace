"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  notifications,
  useCaseAuthors,
  useCaseLinks,
  useCases,
} from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { isLinkKind } from "@/lib/domain";
import { linkNotifications } from "@/lib/link-notifications";
import { canLinkUseCases, canUnlinkUseCases } from "@/lib/permissions";
import { existingLinkLabel } from "@/lib/use-case-links";
import type { ActionResult } from "./actions";
import { getOwnership } from "./use-case-queries";

/**
 * Link two workflows and tell the people credited on either one.
 *
 * Ownership is deliberately not checked: any AI lead can link any two
 * records, including two they had no hand in. The notification is what keeps
 * that honest — nobody finds a link on their record without hearing about it.
 */
export async function linkUseCasesAction(
  fromId: string,
  toId: string,
  kind: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!canLinkUseCases(user.role)) {
    return { error: "You can't link workflows." };
  }
  if (!isLinkKind(kind)) return { error: "Say how the two are related." };
  if (fromId === toId) return { error: "A workflow can't link to itself." };

  const db = getDb();
  const records = await db
    .select({
      id: useCases.id,
      title: useCases.title,
      ownerUserId: useCases.ownerUserId,
      createdById: useCases.createdById,
    })
    .from(useCases)
    .where(and(inArray(useCases.id, [fromId, toId]), isNull(useCases.deletedAt)));
  const from = records.find((r) => r.id === fromId);
  const to = records.find((r) => r.id === toId);
  if (!from || !to) return { error: "That workflow no longer exists." };

  // One link per pair, whichever way round it was made.
  const [existing] = await db
    .select({
      fromUseCaseId: useCaseLinks.fromUseCaseId,
      kind: useCaseLinks.kind,
    })
    .from(useCaseLinks)
    .where(
      or(
        and(
          eq(useCaseLinks.fromUseCaseId, fromId),
          eq(useCaseLinks.toUseCaseId, toId),
        ),
        and(
          eq(useCaseLinks.fromUseCaseId, toId),
          eq(useCaseLinks.toUseCaseId, fromId),
        ),
      ),
    );
  if (existing) {
    const label = existingLinkLabel({
      kind: existing.kind,
      outgoing: existing.fromUseCaseId === fromId,
    });
    return { error: `These two are already linked, as “${label}”.` };
  }

  // The link and its notifications land together — the notification is what
  // keeps ownerless linking honest, so it must not be lost to a mid-write
  // failure.
  await db.transaction(async (tx) => {
    const [link] = await tx
      .insert(useCaseLinks)
      .values({
        fromUseCaseId: fromId,
        toUseCaseId: toId,
        kind,
        createdById: user.id,
      })
      .returning({ id: useCaseLinks.id });

    const authors = await tx
      .select({
        useCaseId: useCaseAuthors.useCaseId,
        userId: useCaseAuthors.userId,
      })
      .from(useCaseAuthors)
      .where(inArray(useCaseAuthors.useCaseId, [fromId, toId]));
    const credited = (record: (typeof records)[number]) => [
      record.ownerUserId,
      record.createdById,
      ...authors.filter((a) => a.useCaseId === record.id).map((a) => a.userId),
    ];

    const recipients = linkNotifications({
      actorId: user.id,
      from: { useCaseId: fromId, creditedUserIds: credited(from) },
      to: { useCaseId: toId, creditedUserIds: credited(to) },
    });
    if (recipients.length > 0) {
      await tx.insert(notifications).values(
        recipients.map((r) => ({
          userId: r.userId,
          kind: "link" as const,
          useCaseId: r.useCaseId,
          linkId: link.id,
          actorId: user.id,
        })),
      );
    }
  });

  revalidatePath(`/use-cases/${fromId}`);
  revalidatePath(`/use-cases/${toId}`);
  return {};
}

/** Remove a link. Both records lose it — it was only ever stored once. */
export async function unlinkUseCasesAction(
  linkId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const [link] = await db
    .select()
    .from(useCaseLinks)
    .where(eq(useCaseLinks.id, linkId));
  if (!link) return {};

  const ends = (
    await Promise.all([
      getOwnership(link.fromUseCaseId),
      getOwnership(link.toUseCaseId),
    ])
  ).filter((end) => end !== null);

  if (!canUnlinkUseCases({ id: user.id, role: user.role }, link, ends)) {
    return {
      error:
        "Only whoever made this link, someone on either record, or an admin can remove it.",
    };
  }

  await db.delete(useCaseLinks).where(eq(useCaseLinks.id, linkId));
  revalidatePath(`/use-cases/${link.fromUseCaseId}`);
  revalidatePath(`/use-cases/${link.toUseCaseId}`);
  return {};
}
