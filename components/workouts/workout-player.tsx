"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { startWorkoutLog, logSet, finishWorkoutLog, cancelWorkoutLog } from "@/lib/actions/workouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VideoPreviewButton } from "@/components/workouts/video-preview-button";
import { Check, ChevronLeft, ChevronRight, Play, Trophy, X, Timer } from "lucide-react";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  youtube_url: string | null;
  muscle_groups: string[];
}

interface WorkoutExercise {
  id: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
  rest_seconds: number;
  superset_group: string | null;
  notes: string | null;
  order_index: number;
  exercises: Exercise;
}

interface Workout {
  id: string;
  name: string;
  workout_exercises: WorkoutExercise[];
}

interface PrevSet {
  workout_exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps_completed: number | null;
}

interface SetEntry {
  reps: string;
  weight: string;
  completed: boolean;
  isPR: boolean;
}

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onDone]);

  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <Timer className="h-10 w-10 text-primary mb-4" />
      <p className="text-5xl font-bold tabular-nums mb-2">{remaining}s</p>
      <p className="text-sm text-muted-foreground mb-6">Rest</p>
      <Progress value={pct} className="w-48 h-2 mb-6" />
      <Button variant="outline" onClick={onDone}>Skip rest</Button>
    </div>
  );
}

export function WorkoutPlayer({
  workout,
  previousSets,
}: {
  workout: Workout;
  previousSets: PrevSet[];
}) {
  const router = useRouter();
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [showRest, setShowRest] = useState(false);
  const [restSeconds, setRestSeconds] = useState(60);
  const [showFinish, setShowFinish] = useState(false);
  const [saving, setSaving] = useState(false);
  const startedRef = useRef(false);

  const exercises = workout.workout_exercises;
  const currentEx = exercises[currentExIdx];

  // Start the workout log on mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function startLog() {
      try {
        const id = await startWorkoutLog(workout.id);
        setWorkoutLogId(id);
      } catch {
        toast.error("Failed to start workout");
      }
    }

    startLog();
  }, [workout.id]);

  // Init set entries for each exercise
  useEffect(() => {
    const init: Record<string, SetEntry[]> = {};
    for (const we of exercises) {
      init[we.id] = Array.from({ length: we.sets }, (_, i) => {
        const prev = previousSets.find(
          (p) => p.workout_exercise_id === we.id && p.set_number === i + 1
        );
        return {
          reps: prev?.reps_completed?.toString() ?? we.reps.split("-")[0] ?? "",
          weight: prev?.weight_kg?.toString() ?? we.weight_kg?.toString() ?? "",
          completed: false,
          isPR: false,
        };
      });
    }
    setSets(init);
  }, [exercises, previousSets]);

  function updateSet(weId: string, setIdx: number, field: "reps" | "weight", value: string) {
    setSets((prev) => {
      const copy = [...(prev[weId] ?? [])];
      copy[setIdx] = { ...copy[setIdx], [field]: value };
      return { ...prev, [weId]: copy };
    });
  }

  async function completeSet(we: WorkoutExercise, setIdx: number) {
    if (!workoutLogId) return;

    const entry = sets[we.id]?.[setIdx];
    if (!entry) return;

    const weightKg = entry.weight ? parseFloat(entry.weight) : null;
    const repsCompleted = entry.reps ? parseInt(entry.reps) : null;

    let isPR = false;
    try {
      const result = await logSet({
        workoutLogId,
        workoutExerciseId: we.id,
        exerciseId: we.exercises.id,
        setNumber: setIdx + 1,
        repsCompleted,
        weightKg,
      });
      isPR = result.isPR;
    } catch {
      toast.error("Failed to save set");
      return;
    }

    if (isPR) {
      toast.success(`New PR on ${we.exercises.name}!`, { icon: "🏆" });
    }

    setSets((prev) => {
      const copy = [...(prev[we.id] ?? [])];
      copy[setIdx] = { ...copy[setIdx], completed: true, isPR };
      return { ...prev, [we.id]: copy };
    });

    // Show rest timer after completing a set (not the last set of last exercise)
    const isLastSetOfExercise = setIdx === we.sets - 1;
    const isLastExercise = currentExIdx === exercises.length - 1;

    if (!(isLastSetOfExercise && isLastExercise)) {
      setRestSeconds(we.rest_seconds);
      setShowRest(true);
    }
  }

  async function finishWorkout() {
    if (!workoutLogId || saving) return;
    setSaving(true);

    await finishWorkoutLog(workoutLogId);
    toast.success("Workout complete! Great work.");
    router.push("/home");
  }

  async function cancelWorkout() {
    if (!workoutLogId) return router.push("/workouts");
    if (!confirm("Cancel this workout? Progress will be lost.")) return;

    await cancelWorkoutLog(workoutLogId);
    router.push("/workouts");
  }

  const completedSets = sets[currentEx?.id]?.filter((s) => s.completed).length ?? 0;
  const totalSetsForEx = currentEx?.sets ?? 0;
  const allSetsForExDone = completedSets === totalSetsForEx && totalSetsForEx > 0;

  const totalCompleted = Object.values(sets).reduce(
    (sum, arr) => sum + arr.filter((s) => s.completed).length, 0
  );
  const totalSets = exercises.reduce((sum, we) => sum + we.sets, 0);
  const overallProgress = totalSets > 0 ? (totalCompleted / totalSets) * 100 : 0;

  if (!currentEx) return null;

  return (
    <>
      {showRest && (
        <RestTimer seconds={restSeconds} onDone={() => setShowRest(false)} />
      )}

      <div className="flex flex-col h-full max-w-lg mx-auto">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold truncate">{workout.name}</h1>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={cancelWorkout}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={overallProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">{totalCompleted}/{totalSets} sets</p>
        </div>

        {/* Exercise card */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Exercise header */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {currentEx.superset_group && (
                    <Badge className="text-xs shrink-0">{currentEx.superset_group}</Badge>
                  )}
                  <h2 className="text-lg font-bold">{currentEx.exercises.name}</h2>
                  <VideoPreviewButton exercise={currentEx.exercises} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentEx.sets} sets × {currentEx.reps}
                  {currentEx.weight_kg ? ` @ ${currentEx.weight_kg}kg` : ""}
                  {" · "}{currentEx.rest_seconds}s rest
                </p>
                {currentEx.notes && (
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">{currentEx.notes}</p>
                )}
              </div>
            </div>

            {currentEx.exercises.muscle_groups?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentEx.exercises.muscle_groups.map((m) => (
                  <span key={m} className="text-xs text-muted-foreground capitalize">{m.replace("_", " ")}</span>
                ))}
              </div>
            )}
          </div>

          {/* Sets */}
          <div className="space-y-2">
            {/* Column headers */}
            <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 px-1">
              <span className="text-xs text-muted-foreground text-center">Set</span>
              <span className="text-xs text-muted-foreground text-center">Weight (kg)</span>
              <span className="text-xs text-muted-foreground text-center">Reps</span>
              <span />
            </div>

            {(sets[currentEx.id] ?? []).map((entry, i) => (
              <div
                key={i}
                className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center rounded-lg px-1 py-1.5 transition-colors ${
                  entry.completed ? "bg-primary/10" : "bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-center">
                  {entry.isPR ? (
                    <Trophy className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{i + 1}</span>
                  )}
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder="0"
                  value={entry.weight}
                  onChange={(e) => updateSet(currentEx.id, i, "weight", e.target.value)}
                  disabled={entry.completed}
                  className="h-10 text-center text-base"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={entry.reps}
                  onChange={(e) => updateSet(currentEx.id, i, "reps", e.target.value)}
                  disabled={entry.completed}
                  className="h-10 text-center text-base"
                />
                <Button
                  size="sm"
                  variant={entry.completed ? "default" : "outline"}
                  className="h-10 w-10 p-0"
                  onClick={() => !entry.completed && completeSet(currentEx, i)}
                  disabled={entry.completed}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Prev session note */}
          {previousSets.some((p) => p.workout_exercise_id === currentEx.id) && (
            <p className="text-xs text-muted-foreground text-center">
              Weights pre-filled from your last session
            </p>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-4 pb-safe-bottom pt-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={currentExIdx === 0}
              onClick={() => setCurrentExIdx((i) => i - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>

            {currentExIdx < exercises.length - 1 ? (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => setCurrentExIdx((i) => i + 1)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1 bg-primary"
                onClick={() => setShowFinish(true)}
              >
                Finish workout
              </Button>
            )}
          </div>

          {/* Exercise progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {exercises.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentExIdx(i)}
                className={`rounded-full transition-all ${
                  i === currentExIdx
                    ? "w-4 h-2 bg-primary"
                    : sets[exercises[i].id]?.every((s) => s.completed)
                    ? "w-2 h-2 bg-primary/40"
                    : "w-2 h-2 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Finish dialog */}
      <Dialog open={showFinish} onOpenChange={setShowFinish}>
        <DialogContent className="text-center">
          <div className="py-4 space-y-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold">Workout complete!</h2>
            <p className="text-sm text-muted-foreground">
              {totalCompleted} sets completed
            </p>
            <Button className="w-full" onClick={finishWorkout} disabled={saving}>
              {saving ? "Saving…" : "Save & finish"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowFinish(false)}>
              Keep going
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
