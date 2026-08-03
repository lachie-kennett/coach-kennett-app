"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, LineChart as LineChartIcon } from "lucide-react";
import type { ExerciseWithHistory, HistSet } from "@/lib/exercise-history";

function e1rm(sets: HistSet[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (s.weight != null && s.reps != null && s.reps > 0) {
      const v = s.weight * (1 + s.reps / 30);
      if (best == null || v > best) best = v;
    }
  }
  return best;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

const W = 300, H = 90, PAD = 6;

function MiniChart({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const lo = min === max ? min - 1 : min, hi = min === max ? max + 1 : max;
  const x = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - lo) / (hi - lo)) * (H - PAD * 2);
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${path} L ${x(values.length - 1).toFixed(1)} ${H - PAD} L ${x(0).toFixed(1)} ${H - PAD} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      <path d={area} className="fill-primary/10" />
      <path d={path} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" className="fill-primary" />)}
    </svg>
  );
}

function ExerciseRow({ ex }: { ex: ExerciseWithHistory }) {
  const [open, setOpen] = useState(false);
  // sessions come most-recent-first; oldest→newest for the chart.
  const chartVals = [...ex.sessions].reverse().map((s) => e1rm(s.sets)).filter((v): v is number => v != null).map((v) => Math.round(v));
  const latest = chartVals[chartVals.length - 1];
  const first = chartVals[0];
  const change = latest != null && first != null ? Math.round(latest - first) : 0;
  const Trend = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? "text-primary" : change < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <li className="border-t border-border first:border-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors">
        <span className="text-sm font-medium truncate">{ex.name}</span>
        <span className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          {latest != null && <span className="tabular-nums">{latest}kg</span>}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-3">
          {chartVals.length >= 2 && (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold tabular-nums">{latest}<span className="text-xs font-normal text-muted-foreground"> kg est. 1RM</span></span>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
                  <Trend className="h-3.5 w-3.5" />{change > 0 ? "+" : ""}{change} kg
                </span>
              </div>
              <MiniChart values={chartVals} />
            </div>
          )}
          <div className="space-y-1.5">
            {ex.sessions.map((s, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-muted-foreground">{fmtDate(s.date)}</p>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {s.sets.map((sl) => (
                    <span key={sl.setNumber} className="tabular-nums rounded bg-secondary px-1.5 py-0.5">
                      {sl.weight ? `${sl.weight}kg` : "BW"} × {sl.reps ?? "—"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

export function ExerciseHistoryBrowser({ exercises, title = "Exercise history" }: { exercises: ExerciseWithHistory[]; title?: string }) {
  const [q, setQ] = useState("");
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LineChartIcon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {exercises.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">No logged exercises yet.</p>
        ) : (
          <>
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises…" className="pl-9 h-9" />
              </div>
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {filtered.map((ex) => <ExerciseRow key={ex.id} ex={ex} />)}
              {filtered.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">No matches.</li>}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
