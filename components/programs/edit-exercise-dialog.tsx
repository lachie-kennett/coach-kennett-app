"use client";

import { useEffect, useState } from "react";
import { updateWorkoutExercise } from "@/lib/actions/programs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type EditableExercise = {
  id: string;
  block_type: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
  rest_seconds: number;
  work_seconds: number | null;
  intensity: string | null;
  notes: string | null;
  exercises: { name: string } | null;
};

function mins(total: number | null): string {
  return total ? String(Math.floor(total / 60)) : "";
}
function secs(total: number | null): string {
  return total ? String(total % 60) : "";
}
function toSeconds(min: string, sec: string): number {
  return (parseInt(min) || 0) * 60 + (parseInt(sec) || 0);
}

export function EditExerciseDialog({
  we,
  open,
  onOpenChange,
  onSaved,
}: {
  we: EditableExercise | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const isConditioning = we?.block_type === "conditioning";
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [restSeconds, setRestSeconds] = useState("");
  const [workMin, setWorkMin] = useState("");
  const [workSec, setWorkSec] = useState("");
  const [restMin, setRestMin] = useState("");
  const [restSec, setRestSec] = useState("");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Seed fields from the exercise whenever the dialog opens.
  useEffect(() => {
    if (open && we) {
      setSets(String(we.sets));
      setReps(we.reps);
      setWeightKg(we.weight_kg?.toString() ?? "");
      setRestSeconds(String(we.rest_seconds));
      setWorkMin(mins(we.work_seconds));
      setWorkSec(secs(we.work_seconds));
      setRestMin(mins(we.rest_seconds));
      setRestSec(secs(we.rest_seconds));
      setIntensity(we.intensity ?? "");
      setNotes(we.notes ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, we?.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!we) return;
    setSaving(true);
    const result = await updateWorkoutExercise({
      workoutExerciseId: we.id,
      sets: parseInt(sets) || 1,
      reps,
      weightKg: isConditioning ? null : weightKg ? parseFloat(weightKg) : null,
      restSeconds: isConditioning ? toSeconds(restMin, restSec) : parseInt(restSeconds) || 0,
      workSeconds: isConditioning ? toSeconds(workMin, workSec) || null : null,
      intensity: isConditioning ? intensity.trim() || null : null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Exercise updated");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">{we?.exercises?.name ?? "Edit exercise"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ee-sets">{isConditioning ? "Sets / rounds" : "Sets"}</Label>
              <Input id="ee-sets" type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ee-reps">Reps</Label>
              <Input id="ee-reps" value={reps} onChange={(e) => setReps(e.target.value)} required={!isConditioning} placeholder={isConditioning ? "400m, 20 cals…" : "10 or 8-12"} />
            </div>
          </div>

          {isConditioning ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Work time</Label>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" min="0" inputMode="numeric" placeholder="min" value={workMin} onChange={(e) => setWorkMin(e.target.value)} className="text-center" />
                    <span className="text-muted-foreground">:</span>
                    <Input type="number" min="0" max="59" inputMode="numeric" placeholder="sec" value={workSec} onChange={(e) => setWorkSec(e.target.value)} className="text-center" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rest time</Label>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" min="0" inputMode="numeric" placeholder="min" value={restMin} onChange={(e) => setRestMin(e.target.value)} className="text-center" />
                    <span className="text-muted-foreground">:</span>
                    <Input type="number" min="0" max="59" inputMode="numeric" placeholder="sec" value={restSec} onChange={(e) => setRestSec(e.target.value)} className="text-center" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ee-intensity">Zone / pace / intensity</Label>
                <Input id="ee-intensity" value={intensity} onChange={(e) => setIntensity(e.target.value)} placeholder="e.g. Zone 2, 5:00/km, RPE 7" />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ee-weight">Weight (kg)</Label>
                <Input id="ee-weight" type="number" step="0.5" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ee-rest">Rest (sec)</Label>
                <Input id="ee-rest" type="number" min="0" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ee-notes">Notes (optional)</Label>
            <Input id="ee-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Coaching cues" />
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
