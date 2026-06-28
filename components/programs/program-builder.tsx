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
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy, Search, Link2 } from "lucide-react";
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

function nextSupersetLetter(exercises: WorkoutExercise[]): string {
  const used = exercises
    .filter((we) => we.superset_group)
    .map((we) => we.superset_group!.toUpperCase());
  if (used.length === 0) return "A";
  const maxCode = Math.max(...used.map((g) => g.charCodeAt(0)));
  return String.fromCharCode(maxCode + 1);
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
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [restSeconds, setRestSeconds] = useState("90");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );
  const selectedExercise = exercises.find((ex) => ex.id === exerciseId);

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
      superset_group: null,
      notes: notes || null,
    });

    if (error) { toast.error("Failed to add exercise"); setLoading(false); return; }
    toast.success("Exercise added");
    setOpen(false);
    setSearch(""); setDropdownOpen(false); setExerciseId(""); setSets("3"); setReps("");
    setWeightKg(""); setRestSeconds("90"); setNotes("");
    onAdded();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(""); setDropdownOpen(false); setExerciseId(""); } }}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full mt-2")}>
        <Plus className="mr-2 h-4 w-4" /> Add exercise
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add exercise</DialogTitle></DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4 mt-2">

          {/* Exercise search */}
          <div className="space-y-2">
            <Label>Exercise</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setExerciseId("");
                  setDropdownOpen(true);
                }}
                onFocus={() => { if (search) setDropdownOpen(true); }}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            {dropdownOpen && search && (
              <div className="max-h-44 overflow-y-auto rounded-md border bg-popover">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No exercises found</p>
                ) : (
                  filtered.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevent input blur before click registers
                        setExerciseId(ex.id);
                        setSearch(ex.name);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors",
                        exerciseId === ex.id && "bg-secondary font-medium"
                      )}
                    >
                      {ex.name}
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedExercise && (
              <p className="text-xs text-muted-foreground">Selected: <span className="font-medium text-foreground">{selectedExercise.name}</span></p>
            )}
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  const sorted = [...workout.workout_exercises].sort((a, b) => a.order_index - b.order_index);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
    setSelected((prev) => { const next = new Set(prev); next.delete(weId); return next; });
    onUpdate();
  }

  async function handleDuplicateWorkout() {
    const supabase = createClient();
    const { data: newWorkout, error } = await supabase
      .from("program_workouts")
      .insert({ program_id: workout.program_id, name: `${workout.name} (copy)`, day_order: workout.day_order + 1 })
      .select("id")
      .single();

    if (error || !newWorkout) { toast.error("Failed to duplicate"); return; }

    if (workout.workout_exercises.length > 0) {
      await supabase.from("workout_exercises").insert(
        workout.workout_exercises.map((we) => ({
          workout_id: (newWorkout as { id: string }).id,
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

  async function handleMakeSuperset() {
    if (selected.size < 2) return;
    const letter = nextSupersetLetter(workout.workout_exercises);
    const supabase = createClient();
    const ids = [...selected];
    const { error } = await supabase
      .from("workout_exercises")
      .update({ superset_group: letter })
      .in("id", ids);
    if (error) { toast.error("Failed to create superset"); return; }
    toast.success(`Superset ${letter} created`);
    setSelected(new Set());
    onUpdate();
  }

  async function handleRemoveSuperset(weId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("workout_exercises")
      .update({ superset_group: null })
      .eq("id", weId);
    if (error) { toast.error("Failed to remove from superset"); return; }
    onUpdate();
  }

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
            <div className="space-y-1.5 mb-2">
              {sorted.map((we) => {
                const isSelected = selected.has(we.id);
                return (
                  <div
                    key={we.id}
                    onClick={() => toggleSelect(we.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
                      isSelected ? "bg-primary/15 ring-1 ring-primary/40" : "bg-secondary/50 hover:bg-secondary/80"
                    )}
                  >
                    {/* Superset badge — click to remove */}
                    {we.superset_group ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveSuperset(we.id); }}
                        className="text-xs font-bold text-primary w-5 shrink-0 hover:text-destructive transition-colors"
                        title="Remove from superset"
                      >
                        {we.superset_group}
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" />
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
                      onClick={(e) => { e.stopPropagation(); handleDeleteExercise(we.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-2">No exercises yet.</p>
          )}

          <div className="flex gap-2">
            {selected.size >= 2 && (
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={handleMakeSuperset}
              >
                <Link2 className="mr-2 h-3.5 w-3.5" />
                Superset ({selected.size})
              </Button>
            )}
            <div className={cn(selected.size >= 2 ? "flex-1" : "w-full")}>
              <AddExerciseDialog
                workoutId={workout.id}
                exercises={exercises}
                currentCount={workout.workout_exercises.length}
                onAdded={onUpdate}
              />
            </div>
          </div>
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
      day_order: initialWorkouts.length,
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
        {initialWorkouts.map((w) => (
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
