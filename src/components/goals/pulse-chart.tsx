"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PulsePoint } from "@/server/goals-queries";

interface Props {
  points: PulsePoint[];
  targetValue: number;
  unit: string;
  label: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtTick(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function PulseChart({ points, targetValue, unit, label }: Props) {
  const values = [...points.map((p) => p.value), targetValue];
  const lo = Math.max(0, Math.floor((Math.min(...values) - 8) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...values) + 4) / 10) * 10);

  return (
    <figure aria-label={`${label} over time; target ${targetValue}${unit}`}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={points}
          margin={{ top: 12, right: 76, bottom: 0, left: -18 }}
        >
          <CartesianGrid stroke="#e5ded1" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtTick}
            tick={{ fill: "#8b8377", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#d4caba" }}
          />
          <YAxis
            domain={[lo, hi]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: "#8b8377", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={54}
          />
          <Tooltip
            formatter={(value) => [`${value}${unit}`, label]}
            labelFormatter={(d) => fmtTick(String(d))}
            contentStyle={{
              backgroundColor: "#fffdf9",
              border: "1px solid #d4caba",
              borderRadius: 6,
              fontSize: 13,
              color: "#22201c",
            }}
          />
          <ReferenceLine
            y={targetValue}
            stroke="#8b8377"
            strokeDasharray="5 4"
            label={{
              value: `target ${targetValue}${unit}`,
              position: "right",
              fill: "#5c564c",
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#9a4520"
            strokeWidth={2}
            dot={{ r: 4, fill: "#9a4520", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
