"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  youtube_url: string | null;
  muscle_groups: string[];
}

interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
  rest_seconds: number;
  order_index: number;
  superset_group: string | null;
  notes: string | null;
  exercises: Exercise;
}

interface Workout {
  id: string;
  program_id: string;
  name: string;
  day_order: number;
  workout_exercises: WorkoutExercise[];
}

function AddExerciseDialog({
  workoutId,
  exercises,
  currentCount,
  onAdded,
}: {
  workoutId: string;
  exercises: Exercise[];
  currentCount: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weightKg, setWeightKg] = useState("");
  const [restSeconds, setRestSeconds] = useState("60");
  const [supersetGroup, setSupersetGroup] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseId) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("workout_exercises").insert({
      workout_id: workoutId,
      exercise_id: exerciseId,
      sets: parseInt(sets),
      reps,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      rest_seconds: parseInt(restSeconds),
      order_index: currentCount,
      superset_group: supersetGroup || null,
      notes: notes || null,
    });

    if (error) { toast.error("Failed to add exercise"); setLoading(false); return; }
    toast.success("Exercise added");
    setOpen(false);
    setExerciseId(""); setSets("3"); setReps("10"); setWeightKg("");
    setRestSeconds("60"); setSupersetGroup(""); setNotes("");
    onAdded();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full mt-2")}>
        <Plus className="mr-2 h-4 w-4" /> Add exercise
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add exercise to workout</DialogTitle></DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Exercise</Label>
            <Select value={exerciseId} onValueChange={(v) => v && setExerciseId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="we-sets">Sets</Label>
              <Input id="we-sets" type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="we-reps">Reps</Label>
              <Input id="we-reps" value={reps} onChange={(e) => setReps(e.target.value)} required placeholder="10 or 8-12" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="we-weight">Target weight (kg)</Label>
              <Input id="we-weight" type="number" step="0.5" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="we-rest">Rest (sec)</Label>
              <Input id="we-rest" type="number" min="0" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="we-superset">Superset group (optional)</Label>
            <Input id="we-superset" value={supersetGroup} onChange={(e) => setSupersetGroup(e.target.value)} placeholder="e.g. A (pairs A1 + A2)" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="we-notes">Notes (optional)</Label>
            <Input id="we-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Coaching cues" />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !exerciseId}>
            {loading ? "Adding…" : "Add exercise"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutCard({
  workout,
  exercises,
  onUpdate,
}: {
  workout: Workout;
  exercises: Exercise[];
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const router = useRouter();

  async function handleDeleteWorkout() {
    if (!confirm(`Delete "${workout.name}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("program_workouts").delete().eq("id", workout.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Workout deleted");
    onUpdate();
  }

  async function handleDeleteExercise(weId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("workout_exercises").delete().eq("id", weId);
    if (error) { toast.error("Failed to remove"); return; }
    toast.success("Exercise removed");
    onUpdate();
  }

  async function handleDuplicateWorkout() {
    const supabase = createClient();
    const { data: newWorkout, error } = await supabase
      .from("program_workouts")
      .insert({
        program_id: workout.program_id,
        name: `${workout.name} (copy)`,
        day_order: workout.day_order + 1,
      })
      .select("id")
      .single();

    if (error || !newWorkout) { toast.error("Failed to duplicate"); return; }

    if (workout.workout_exercises.length > 0) {
      await supabase.from("workout_exercises").insert(
        workout.workout_exercises.map((we) => ({
          workout_id: newWorkout.id,
          exercise_id: we.exercise_id,
          sets: we.sets,
          reps: we.reps,
          weight_kg: we.weight_kg,
          rest_seconds: we.rest_seconds,
          order_index: we.order_index,
          superset_group: we.superset_group,
          notes: we.notes,
        }))
      );
    }

    toast.success("Workout duplicated");
    onUpdate();
  }

  const sorted = [...workout.workout_exercises].sort((a, b) => a.order_index - b.order_index);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{workout.name}</CardTitle>
            <Badge variant="secondary" className="text-xs">{workout.workout_exercises.length} exercises</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleDuplicateWorkout} title="Duplicate">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={handleDeleteWorkout}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {sorted.length > 0 ? (
            <div className="space-y-2 mb-2">
              {sorted.map((we) => (
                <div key={we.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                  {we.superset_group && (
                    <span className="text-xs font-bold text-primary w-4">{we.superset_group}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{we.exercises?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {we.sets} × {we.reps}
                      {we.weight_kg ? ` @ ${we.weight_kg}kg` : ""}
                      {" · "}{we.rest_seconds}s rest
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDeleteExercise(we.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-2">No exercises yet.</p>
          )}

          <AddExerciseDialog
            workoutId={workout.id}
            exercises={exercises}
            currentCount={workout.workout_exercises.length}
            onAdded={onUpdate}
          />
        </CardContent>
      )}
    </Card>
  );
}

export function ProgramBuilder({
  programId,
  initialWorkouts,
  exercises,
}: {
  programId: string;
  initialWorkouts: Workout[];
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [addingWorkout, setAddingWorkout] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function handleAddWorkout(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkoutName.trim()) return;
    setAddingWorkout(true);

    const supabase = createClient();
    const { error } = await supabase.from("program_workouts").insert({
      program_id: programId,
      name: newWorkoutName.trim(),
      day_order: workouts.length,
    });

    if (error) { toast.error("Failed to add workout"); setAddingWorkout(false); return; }
    toast.success("Workout added");
    setNewWorkoutName("");
    setAddingWorkout(false);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {workouts.map((w) => (
          <WorkoutCard key={w.id} workout={w} exercises={exercises} onUpdate={refresh} />
        ))}
      </div>

      <Separator />

      <form onSubmit={handleAddWorkout} className="flex gap-2">
        <Input
          value={newWorkoutName}
          onChange={(e) => setNewWorkoutName(e.target.value)}
          placeholder="e.g. Day 1 — Lower Body"
          className="flex-1"
        />
        <Button type="submit" disabled={addingWorkout || !newWorkoutName.trim()}>
          <Plus className="mr-2 h-4 w-4" /> Add workout
        </Button>
      </form>

      {exercises.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          You need to add exercises to your library first.{" "}
          <a href="/exercises" className="text-primary hover:underline">Go to exercises</a>
        </p>
      )}
    </div>
  );
}
