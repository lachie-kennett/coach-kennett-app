"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { WeeklyVolume } from "@/lib/volume";

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg}kg`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-primary font-semibold">{formatVolume(payload[0].value)}</p>
    </div>
  );
}

export function VolumeChart({ data }: { data: WeeklyVolume[] }) {
  const hasData = data.some((d) => d.volume > 0);
  const maxVol = Math.max(...data.map((d) => d.volume), 1);

  if (!hasData) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No weight data yet — log some sets with weight to see your volume.
      </p>
    );
  }

  // Show only every 3rd label to avoid crowding on mobile
  const labelStep = data.length > 8 ? 3 : 2;

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            interval={labelStep - 1}
          />
          <YAxis
            tickFormatter={formatVolume}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="volume" radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.week}
                fill={entry.volume >= maxVol * 0.85 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
