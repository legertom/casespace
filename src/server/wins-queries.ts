import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { statusChanges, users } from "@/db/schema";
import type { Department } from "@/lib/domain";
import { listUseCases } from "./use-case-queries";

export interface WinRow {
  id: string;
  title: string;
  department: Department | null;
  teamName: string | null;
  eltOrgName: string | null;
  ownerName: string | null;
  authors: string[];
  confirmedAt: Date | null;
  confirmedByName: string | null;
  /** The mandatory note from the confirming status change — the annual ROI. */
  annualRoiNote: string | null;
  netImpactStatement: string | null;
}

/**
 * Every confirmed win with the annual-ROI note Kate left when she confirmed
 * it. The note comes from the most recent promotion into Confirmed Positive
 * ROI — a record demoted and re-confirmed carries its latest confirmation.
 */
export async function getWins(): Promise<WinRow[]> {
  // Program-only, to match the dashboard's 15. Currently belt-and-braces
  // (Confirmed is admin-gated), but it stops the one real divergence: an admin
  // confirms a community record and forgets the toggle, and /wins then shows a
  // row — with an annual-ROI note, possibly carrying dollars — that the
  // scoreboard excludes.
  const rows = await listUseCases({
    status: "confirmed_positive_roi",
    inProgram: true,
  });
  if (rows.length === 0) return [];

  const db = getDb();
  const confirmations = await db
    .select({
      useCaseId: statusChanges.useCaseId,
      note: statusChanges.note,
      createdAt: statusChanges.createdAt,
      byName: users.name,
    })
    .from(statusChanges)
    .leftJoin(users, eq(statusChanges.changedById, users.id))
    .where(eq(statusChanges.toStatus, "confirmed_positive_roi"))
    .orderBy(desc(statusChanges.createdAt));
  const latest = new Map<string, (typeof confirmations)[number]>();
  for (const c of confirmations) {
    if (!latest.has(c.useCaseId)) latest.set(c.useCaseId, c);
  }

  return rows
    .map((r) => {
      const c = latest.get(r.id);
      return {
        id: r.id,
        title: r.title,
        department: r.department,
        teamName: r.teamName,
        eltOrgName: r.eltOrgName,
        ownerName: r.ownerName,
        authors: r.authors.map((a) => a.displayName),
        confirmedAt: r.roiConfirmedAt ?? c?.createdAt ?? null,
        confirmedByName: c?.byName ?? null,
        annualRoiNote: c?.note ?? null,
        netImpactStatement: r.netImpactStatement,
      };
    })
    .sort(
      (a, b) => (b.confirmedAt?.getTime() ?? 0) - (a.confirmedAt?.getTime() ?? 0),
    );
}
