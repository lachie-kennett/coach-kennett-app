"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type VolumePoint = { label: string; value: number };

const W = 320;
const H = 150;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 22;

function LineChart({ points }: { points: VolumePoint[] }) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = Math.max(0, min === max ? min - 1 : min - (max - min) * 0.15);
  const hi = min === max ? max + 1 : max + (max - min) * 0.15;

  const x = (i: number) =>
    points.length === 1 ? (PAD_L + (W - PAD_R)) / 2 : PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${path} L ${x(points.length - 1).toFixed(1)} ${H - PAD_B} L ${x(0).toFixed(1)} ${H - PAD_B} Z`;

  const labelIdx = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Volume over time">
      {[hi, (hi + lo) / 2, lo].map((v, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="currentColor" className="text-border" strokeWidth="0.5" />
          <text x={PAD_L - 5} y={y(v) + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">{fmt(v)}</text>
        </g>
      ))}
      <path d={area} className="fill-primary/10" />
      <path d={path} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="2.5" className="fill-primary" />
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize="9">{points[i].label}</text>
      ))}
    </svg>
  );
}

export function VolumeChart({ points }: { points: VolumePoint[] }) {
  if (points.length < 2) return null;
  const last = points[points.length - 1].value;
  const first = points[0].value;
  const change = Math.round(last - first);
  const Trend = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? "text-primary" : change < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Volume lifted
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold tabular-nums">
            {last.toLocaleString()}<span className="text-sm font-normal text-muted-foreground"> kg</span>
          </span>
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
            <Trend className="h-3.5 w-3.5" />
            {change > 0 ? "+" : ""}{change.toLocaleString()} kg
          </span>
          <span className="text-xs text-muted-foreground">last session</span>
        </div>
        <LineChart points={points} />
        <p className="text-xs text-muted-foreground mt-1">Total weight lifted (weight × reps) each session.</p>
      </CardContent>
    </Card>
  );
}
