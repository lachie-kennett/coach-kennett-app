"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addWorkout,
  updateWorkout,
  deleteWorkout,
  duplicateWorkout,
  addWorkoutExercise,
  deleteWorkoutExercise,
  setSupersetGroup,
} from "@/lib/actions/programs";
import { SESSION_TYPES } from "@/lib/session-types";
import { SessionTypeBadge } from "@/components/programs/session-type-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  session_type: string | null;
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

    const { error } = await addWorkoutExercise({
      workoutId,
      exerciseId,
      sets: parseInt(sets),
      reps,
      weightKg: weightKg ? parseFloat(weightKg) : null,
      restSeconds: parseInt(restSeconds),
      orderIndex: currentCount,
      notes: notes || null,
    });

    if (error) { toast.error(error); setLoading(false); return; }
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
    const { error } = await deleteWorkout(workout.id);
    if (error) { toast.error(error); return; }
    toast.success("Workout deleted");
    onUpdate();
  }

  async function handleDeleteExercise(weId: string) {
    const { error } = await deleteWorkoutExercise(weId);
    if (error) { toast.error(error); return; }
    toast.success("Exercise removed");
    setSelected((prev) => { const next = new Set(prev); next.delete(weId); return next; });
    onUpdate();
  }

  async function handleDuplicateWorkout() {
    const { error } = await duplicateWorkout(workout.id);
    if (error) { toast.error(error); return; }
    toast.success("Workout duplicated");
    onUpdate();
  }

  async function handleMakeSuperset() {
    if (selected.size < 2) return;
    const letter = nextSupersetLetter(workout.workout_exercises);
    const { error } = await setSupersetGroup({ workoutExerciseIds: [...selected], group: letter });
    if (error) { toast.error(error); return; }
    toast.success(`Superset ${letter} created`);
    setSelected(new Set());
    onUpdate();
  }

  async function handleRemoveSuperset(weId: string) {
    const { error } = await setSupersetGroup({ workoutExerciseIds: [weId], group: null });
    if (error) { toast.error(error); return; }
    onUpdate();
  }

  async function handleSetType(value: string | null) {
    const sessionType = value === "none" ? null : value;
    const { error } = await updateWorkout({ workoutId: workout.id, sessionType });
    if (error) { toast.error(error); return; }
    onUpdate();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CardTitle className="text-base truncate">{workout.name}</CardTitle>
            <SessionTypeBadge type={workout.session_type} className="shrink-0" />
            <Badge variant="secondary" className="text-xs shrink-0">{workout.workout_exercises.length} exercises</Badge>
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
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground shrink-0">Session type</span>
            <Select value={workout.session_type ?? "none"} onValueChange={(v) => v && handleSetType(v)}>
              <SelectTrigger size="sm" className="h-8 flex-1 capitalize">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {SESSION_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
  const [newWorkoutType, setNewWorkoutType] = useState<string>("none");
  const [addingWorkout, setAddingWorkout] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function handleAddWorkout(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkoutName.trim()) return;
    setAddingWorkout(true);

    const { error } = await addWorkout({
      programId,
      name: newWorkoutName.trim(),
      dayOrder: initialWorkouts.length,
      sessionType: newWorkoutType === "none" ? null : newWorkoutType,
    });

    if (error) { toast.error(error); setAddingWorkout(false); return; }
    toast.success("Workout added");
    setNewWorkoutName("");
    setNewWorkoutType("none");
    setAddingWorkout(false);
    refresh();
  }

  // Total sets allocated to each focus area across the whole program. Each
  // exercise's sets count toward every focus tag on that exercise. Sets from
  // untagged exercises are surfaced separately so nothing is silently dropped.
  const { focusVolume, untaggedSets } = useMemo(() => {
    const map = new Map<string, number>();
    let untagged = 0;
    for (const w of initialWorkouts) {
      for (const we of w.workout_exercises) {
        const focuses = we.exercises?.muscle_groups ?? [];
        if (focuses.length === 0) {
          untagged += we.sets;
          continue;
        }
        for (const f of focuses) {
          map.set(f, (map.get(f) ?? 0) + we.sets);
        }
      }
    }
    return {
      focusVolume: [...map.entries()].sort((a, b) => b[1] - a[1]),
      untaggedSets: untagged,
    };
  }, [initialWorkouts]);

  const totalSets = focusVolume.reduce((sum, [, n]) => sum + n, 0) + untaggedSets;

  return (
    <div className="space-y-4">
      {totalSets > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Set volume by focus</CardTitle>
              <Badge variant="secondary" className="text-xs">{totalSets} sets total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {focusVolume.map(([focus, count]) => (
                <div
                  key={focus}
                  className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs"
                >
                  <span className="font-medium capitalize">{focus}</span>
                  <span className="font-bold text-primary tabular-nums">{count}</span>
                </div>
              ))}
              {untaggedSets > 0 && (
                <div className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
                  <span className="font-medium">untagged</span>
                  <span className="font-bold tabular-nums">{untaggedSets}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {initialWorkouts.map((w) => (
          <WorkoutCard key={w.id} workout={w} exercises={exercises} onUpdate={refresh} />
        ))}
      </div>

      <Separator />

      <form onSubmit={handleAddWorkout} className="flex flex-col sm:flex-row gap-2">
        <Input
          value={newWorkoutName}
          onChange={(e) => setNewWorkoutName(e.target.value)}
          placeholder="e.g. Day 1 — Lower Body"
          className="flex-1"
        />
        <Select value={newWorkoutType} onValueChange={(v) => v && setNewWorkoutType(v)}>
          <SelectTrigger className="sm:w-40 capitalize">
            <SelectValue placeholder="Session type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No type</SelectItem>
            {SESSION_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
