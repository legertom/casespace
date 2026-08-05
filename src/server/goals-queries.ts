import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pulseMetrics, pulseSnapshots } from "@/db/schema";

export interface PulsePoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface PulseSeries {
  key: string;
  label: string;
  unit: string;
  baselineValue: number;
  baselineDate: string;
  targetValue: number;
  points: PulsePoint[];
  latest: PulsePoint | null;
}

export async function getPulseSeries(): Promise<PulseSeries[]> {
  const db = getDb();
  const metrics = await db
    .select()
    .from(pulseMetrics)
    .orderBy(asc(pulseMetrics.sort));
  const result: PulseSeries[] = [];
  for (const m of metrics) {
    const snaps = await db
      .select()
      .from(pulseSnapshots)
      .where(eq(pulseSnapshots.metricKey, m.key))
      .orderBy(asc(pulseSnapshots.takenOn));
    const points = snaps.map((s) => ({ date: s.takenOn, value: s.value }));
    result.push({
      key: m.key,
      label: m.label,
      unit: m.unit,
      baselineValue: m.baselineValue,
      baselineDate: m.baselineDate,
      targetValue: m.targetValue,
      points,
      latest: points.at(-1) ?? null,
    });
  }
  return result;
}
