"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveConditioningWeeks } from "@/lib/actions/programs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CalendarRange, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ConditioningWeek } from "@/lib/workout-format";

type Base = { sets: number; reps: string; work_seconds: number | null; rest_seconds: number; intensity: string | null };
type Row = { sets: string; reps: string; workMin: string; workSec: string; restMin: string; restSec: string; intensity: string };

const mins = (t: number | null) => (t && t >= 60 ? String(Math.floor(t / 60)) : "");
const secs = (t: number | null) => (t ? String(t % 60) : "");
const toSeconds = (min: string, sec: string) => (parseInt(min) || 0) * 60 + (parseInt(sec) || 0);

function rowFromWeek(w: { sets: number; reps: string; work_seconds: number | null; rest_seconds: number; intensity: string | null }): Row {
  return {
    sets: String(w.sets ?? 1),
    reps: w.reps ?? "",
    workMin: mins(w.work_seconds), workSec: secs(w.work_seconds),
    restMin: mins(w.rest_seconds), restSec: secs(w.rest_seconds),
    intensity: w.intensity ?? "",
  };
}

export function ConditioningWeeksDialog({
  workoutExerciseId,
  exerciseName,
  base,
  weeks,
  onSaved,
}: {
  workoutExerciseId: string;
  exerciseName: string;
  base: Base;
  weeks: ConditioningWeek[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  function seed() {
    if (weeks && weeks.length > 0) {
      setRows([...weeks].sort((a, b) => a.week_number - b.week_number).map(rowFromWeek));
    } else {
      setRows([rowFromWeek(base)]);
    }
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addWeek() {
    setRows((prev) => [...prev, { ...(prev[prev.length - 1] ?? rowFromWeek(base)) }]);
  }
  function removeWeek(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save(clear = false) {
    setSaving(true);
    const payload = clear
      ? []
      : rows.map((r, i) => ({
          weekNumber: i + 1,
          sets: parseInt(r.sets) || 1,
          reps: r.reps.trim(),
          workSeconds: toSeconds(r.workMin, r.workSec) || null,
          restSeconds: toSeconds(r.restMin, r.restSec),
          intensity: r.intensity.trim() || null,
        }));
    const { error } = await saveConditioningWeeks({ workoutExerciseId, weeks: payload });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(clear ? "Weekly progression cleared" : "Weekly progression saved");
    setOpen(false);
    onSaved();
    router.refresh();
  }

  const hasProgression = weeks && weeks.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) seed(); }}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 gap-1 px-2 text-xs")}>
        <CalendarRange className="h-3.5 w-3.5" />
        {hasProgression ? `${weeks.length} wk` : "Weeks"}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="truncate">Weekly progression — {exerciseName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            Set different numbers for each week. The athlete sees the week matching their spot in the program;
            after the last week it holds those numbers.
          </p>
          {rows.map((r, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Week {i + 1}</span>
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeWeek(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Sets / rounds</Label>
                  <Input type="number" min="1" inputMode="numeric" value={r.sets} onChange={(e) => update(i, { sets: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reps / distance</Label>
                  <Input value={r.reps} onChange={(e) => update(i, { reps: e.target.value })} placeholder="400m, 20 cals…" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Work (min:sec)</Label>
                  <div className="flex items-center gap-1">
                    <Input type="number" min="0" inputMode="numeric" value={r.workMin} onChange={(e) => update(i, { workMin: e.target.value })} placeholder="0" className="h-9 text-center" />
                    <span className="text-muted-foreground">:</span>
                    <Input type="number" min="0" max="59" inputMode="numeric" value={r.workSec} onChange={(e) => update(i, { workSec: e.target.value })} placeholder="00" className="h-9 text-center" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rest (min:sec)</Label>
                  <div className="flex items-center gap-1">
                    <Input type="number" min="0" inputMode="numeric" value={r.restMin} onChange={(e) => update(i, { restMin: e.target.value })} placeholder="0" className="h-9 text-center" />
                    <span className="text-muted-foreground">:</span>
                    <Input type="number" min="0" max="59" inputMode="numeric" value={r.restSec} onChange={(e) => update(i, { restSec: e.target.value })} placeholder="00" className="h-9 text-center" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Zone / pace / intensity</Label>
                <Input value={r.intensity} onChange={(e) => update(i, { intensity: e.target.value })} placeholder="Zone 2, 5k pace…" className="h-9" />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addWeek}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add week
          </button>
        </div>
        <div className="border-t border-border p-4 flex gap-2">
          {hasProgression && (
            <Button variant="ghost" className="text-muted-foreground" onClick={() => save(true)} disabled={saving}>
              Clear
            </Button>
          )}
          <Button className="flex-1" onClick={() => save(false)} disabled={saving}>
            {saving ? "Saving…" : "Save progression"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
