"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dumbbell, Play, ChevronDown, ChevronUp } from "lucide-react";
import { SessionTypeBadge } from "@/components/programs/session-type-badge";
import { conditioningSummary } from "@/lib/workout-format";

export type DayExercise = {
  id: string;
  name: string;
  block_type: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
  rest_seconds: number;
  work_seconds: number | null;
  intensity: string | null;
  superset_group: string | null;
  order_index: number;
};
export type WorkoutDay = {
  id: string;
  name: string;
  session_type: string | null;
  exercises: DayExercise[];
};

function exerciseLine(e: DayExercise): string {
  if (e.block_type === "conditioning") {
    return conditioningSummary({ sets: e.sets, reps: e.reps, work_seconds: e.work_seconds, rest_seconds: e.rest_seconds, intensity: e.intensity });
  }
  const parts = [`${e.sets} × ${e.reps}`];
  if (e.weight_kg) parts.push(`${e.weight_kg}kg`);
  return parts.join(" · ");
}

function DayRow({ day }: { day: WorkoutDay }) {
  const [open, setOpen] = useState(false);
  const sorted = [...day.exercises].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="border-t border-border first:border-0">
      <div className="flex items-center gap-2 px-6 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
            <Dumbbell className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{day.name}</p>
              <SessionTypeBadge type={day.session_type} className="shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground">{sorted.length} exercise{sorted.length !== 1 ? "s" : ""}</p>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>
        <Link href={`/workouts/${day.id}/start`} className={cn(buttonVariants({ size: "sm" }), "ml-1 h-8 shrink-0 gap-1.5")}>
          <Play className="h-3.5 w-3.5" /> Start
        </Link>
      </div>

      {open && (
        <div className="px-6 pb-3 pl-[4.25rem] space-y-1.5">
          {sorted.length === 0 ? (
            <p className="text-xs text-muted-foreground">No exercises in this session yet.</p>
          ) : (
            sorted.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 text-xs">
                <span className="font-medium min-w-0">
                  {e.superset_group && <span className="text-primary mr-1">{e.superset_group}</span>}
                  {e.name}
                </span>
                <span className="text-muted-foreground text-right shrink-0 tabular-nums">{exerciseLine(e)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function WorkoutDayList({ days }: { days: WorkoutDay[] }) {
  return (
    <>
      {days.map((d) => (
        <DayRow key={d.id} day={d} />
      ))}
    </>
  );
}
