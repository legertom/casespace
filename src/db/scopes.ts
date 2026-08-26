import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { useCases } from "./schema";

/**
 * The two halves of the casebook, as reusable SQL predicates.
 *
 * Every number the program is measured by comes from IN_PROGRAM_ALIVE — the
 * dashboard, /goals, /graphs, the progress report, and the weekly post. Having
 * them in one place makes "which reads are program-scoped" a single grep, which
 * matters because the alternative is discovering months later that one query
 * quietly counted community work toward the 45.
 *
 * Lists are the other way round: the casebook, the REST collection, and the
 * Coach's search all return both and label each record. Metrics are
 * program-only; lists are everything, labeled.
 */

/** Alive and counted by the program. */
export const IN_PROGRAM_ALIVE = and(
  isNull(useCases.deletedAt),
  eq(useCases.inProgram, true),
);

/** Alive and not counted — the community submissions queue. */
export const COMMUNITY_ALIVE = and(
  isNull(useCases.deletedAt),
  eq(useCases.inProgram, false),
);
