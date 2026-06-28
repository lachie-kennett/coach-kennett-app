"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { startWorkoutLog, logSet, saveExerciseLog, finishWorkoutLog, cancelWorkoutLog } from "@/lib/actions/workouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { VideoPreviewButton } from "@/components/workouts/video-preview-button";
import { Check, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trophy, X, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string; name: string; description: string | null;
  youtube_url: string | null; muscle_groups: string[];
}
interface WorkoutExercise {
  id: string; sets: number; reps: string; weight_kg: number | null;
  rest_seconds: number; superset_group: string | null; notes: string | null;
  order_index: number; exercises: Exercise;
}
interface Workout { id: string; name: string; workout_exercises: WorkoutExercise[] }

interface SetLog { workout_exercise_id: string; set_number: number; weight_kg: number | null; reps_completed: number | null }
interface ExerciseLog { workout_exercise_id: string; notes: string | null; rpe: number | null }
interface PreviousSession { id: string; started_at: string; set_logs: SetLog[]; exercise_session_logs: ExerciseLog[] }

interface SetEntry { reps: string; weight: string; completed: boolean; isPR: boolean }

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

function RpeButtons({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "flex-1 h-8 rounded text-xs font-medium transition-colors",
            value === n
              ? n <= 4 ? "bg-green-500 text-white" : n <= 7 ? "bg-yellow-500 text-white" : "bg-red-500 text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function formatDate(iso: string, timezone = "Australia/Melbourne") {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: timezone });
}

function SessionHistory({ weId, sessions, timezone }: { weId: string; sessions: PreviousSession[]; timezone: string }) {
  const [open, setOpen] = useState(false);
  const relevant = sessions.filter((s) => s.set_logs.some((sl) => sl.workout_exercise_id === weId));
  if (relevant.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        History ({relevant.length} session{relevant.length !== 1 ? "s" : ""})
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-1">
          {relevant.map((session) => {
            const sets = session.set_logs
              .filter((sl) => sl.workout_exercise_id === weId)
              .sort((a, b) => a.set_number - b.set_number);
            const exLog = session.exercise_session_logs.find((el) => el.workout_exercise_id === weId);
            return (
              <div key={session.id} className="text-xs border-l-2 border-border pl-2">
                <p className="font-medium text-muted-foreground">{formatDate(session.started_at, timezone)}</p>
                <div className="space-y-0.5 mt-0.5">
                  {sets.map((sl) => (
                    <p key={sl.set_number} className="text-muted-foreground">
                      Set {sl.set_number}: {sl.weight_kg ? `${sl.weight_kg}kg` : "—"} × {sl.reps_completed ?? "—"}
                    </p>
                  ))}
                </div>
                {(exLog?.notes || exLog?.rpe) && (
                  <div className="mt-1 flex items-center gap-2">
                    {exLog.rpe && <span className="font-medium">RPE {exLog.rpe}</span>}
                    {exLog.notes && <span className="text-muted-foreground italic">{exLog.notes}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WorkoutPlayer({
  workout,
  previousSessions,
  timezone = "Australia/Melbourne",
}: {
  workout: Workout;
  previousSessions: PreviousSession[];
  timezone?: string;
}) {
  const router = useRouter();
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [showRest, setShowRest] = useState(false);
  const [restSeconds, setRestSeconds] = useState(90);
  const [showFinish, setShowFinish] = useState(false);
  const [saving, setSaving] = useState(false);
  const startedRef = useRef(false);

  // Per-exercise notes and RPE
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [exerciseRpe, setExerciseRpe] = useState<Record<string, number | null>>({});

  // Session-level notes and RPE (for finish dialog)
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionRpe, setSessionRpe] = useState<number | null>(null);

  const exercises = workout.workout_exercises;
  const currentEx = exercises[currentExIdx];

  // Most recent previous session
  const mostRecent = previousSessions[0];

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

  // Init set entries and exercise notes from most recent session
  useEffect(() => {
    const initSets: Record<string, SetEntry[]> = {};
    const initNotes: Record<string, string> = {};
    const initRpe: Record<string, number | null> = {};

    for (const we of exercises) {
      initSets[we.id] = Array.from({ length: we.sets }, (_, i) => {
        const prev = mostRecent?.set_logs.find(
          (p) => p.workout_exercise_id === we.id && p.set_number === i + 1
        );
        return {
          reps: prev?.reps_completed?.toString() ?? we.reps.split("-")[0] ?? "",
          weight: prev?.weight_kg?.toString() ?? we.weight_kg?.toString() ?? "",
          completed: false,
          isPR: false,
        };
      });

      const prevExLog = mostRecent?.exercise_session_logs.find((el) => el.workout_exercise_id === we.id);
      initNotes[we.id] = prevExLog?.notes ?? "";
      initRpe[we.id] = null; // don't pre-fill RPE — should be fresh each session
    }

    setSets(initSets);
    setExerciseNotes(initNotes);
    setExerciseRpe(initRpe);
  }, [exercises, mostRecent]);

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
        workoutLogId, workoutExerciseId: we.id, exerciseId: we.exercises.id,
        setNumber: setIdx + 1, repsCompleted, weightKg,
      });
      isPR = result.isPR;
    } catch {
      toast.error("Failed to save set");
      return;
    }

    if (isPR) toast.success(`New PR on ${we.exercises.name}!`, { icon: "🏆" });

    setSets((prev) => {
      const copy = [...(prev[we.id] ?? [])];
      copy[setIdx] = { ...copy[setIdx], completed: true, isPR };
      return { ...prev, [we.id]: copy };
    });

    const isLastSetOfExercise = setIdx === we.sets - 1;
    const isLastExercise = currentExIdx === exercises.length - 1;
    if (!(isLastSetOfExercise && isLastExercise)) {
      setRestSeconds(we.rest_seconds);
      setShowRest(true);
    }
  }

  async function handleExerciseRpe(weId: string, rpe: number) {
    setExerciseRpe((prev) => ({ ...prev, [weId]: rpe }));
    if (!workoutLogId) return;
    await saveExerciseLog({ workoutLogId, workoutExerciseId: weId, notes: exerciseNotes[weId] || null, rpe });
  }

  async function handleExerciseNotesBlur(weId: string) {
    if (!workoutLogId) return;
    await saveExerciseLog({ workoutLogId, workoutExerciseId: weId, notes: exerciseNotes[weId] || null, rpe: exerciseRpe[weId] ?? null });
  }

  async function finishWorkout() {
    if (!workoutLogId || saving) return;
    setSaving(true);
    await finishWorkoutLog(workoutLogId, sessionNotes || null, sessionRpe);
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
  const totalCompleted = Object.values(sets).reduce((sum, arr) => sum + arr.filter((s) => s.completed).length, 0);
  const totalSets = exercises.reduce((sum, we) => sum + we.sets, 0);
  const overallProgress = totalSets > 0 ? (totalCompleted / totalSets) * 100 : 0;

  if (!currentEx) return null;

  return (
    <>
      {showRest && <RestTimer seconds={restSeconds} onDone={() => setShowRest(false)} />}

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
            <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 px-1">
              <span className="text-xs text-muted-foreground text-center">Set</span>
              <span className="text-xs text-muted-foreground text-center">Weight (kg)</span>
              <span className="text-xs text-muted-foreground text-center">Reps</span>
              <span />
            </div>
            {(sets[currentEx.id] ?? []).map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center rounded-lg px-1 py-1.5 transition-colors",
                  entry.completed ? "bg-primary/10" : "bg-secondary/40"
                )}
              >
                <div className="flex items-center justify-center">
                  {entry.isPR ? (
                    <Trophy className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{i + 1}</span>
                  )}
                </div>
                <Input
                  type="number" inputMode="decimal" step="0.5" placeholder="0"
                  value={entry.weight}
                  onChange={(e) => updateSet(currentEx.id, i, "weight", e.target.value)}
                  disabled={entry.completed} className="h-10 text-center text-base"
                />
                <Input
                  type="number" inputMode="numeric" placeholder="0"
                  value={entry.reps}
                  onChange={(e) => updateSet(currentEx.id, i, "reps", e.target.value)}
                  disabled={entry.completed} className="h-10 text-center text-base"
                />
                <Button
                  size="sm" variant={entry.completed ? "default" : "outline"}
                  className="h-10 w-10 p-0"
                  onClick={() => !entry.completed && completeSet(currentEx, i)}
                  disabled={entry.completed}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* History */}
          <SessionHistory weId={currentEx.id} sessions={previousSessions} timezone={timezone} />

          {/* Exercise RPE */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Exercise RPE</p>
            <RpeButtons
              value={exerciseRpe[currentEx.id] ?? null}
              onChange={(v) => handleExerciseRpe(currentEx.id, v)}
            />
          </div>

          {/* Exercise notes */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Exercise notes</p>
            <Textarea
              placeholder="Add notes for this exercise…"
              value={exerciseNotes[currentEx.id] ?? ""}
              onChange={(e) => setExerciseNotes((prev) => ({ ...prev, [currentEx.id]: e.target.value }))}
              onBlur={() => handleExerciseNotesBlur(currentEx.id)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer navigation */}
        <div className="px-4 pb-safe-bottom pt-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1"
              disabled={currentExIdx === 0} onClick={() => setCurrentExIdx((i) => i - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            {currentExIdx < exercises.length - 1 ? (
              <Button size="sm" className="flex-1" onClick={() => setCurrentExIdx((i) => i + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" className="flex-1 bg-primary" onClick={() => setShowFinish(true)}>
                Finish workout
              </Button>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {exercises.map((_, i) => (
              <button key={i} onClick={() => setCurrentExIdx(i)}
                className={cn("rounded-full transition-all", i === currentExIdx
                  ? "w-4 h-2 bg-primary"
                  : sets[exercises[i].id]?.every((s) => s.completed)
                  ? "w-2 h-2 bg-primary/40"
                  : "w-2 h-2 bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Finish dialog */}
      <Dialog open={showFinish} onOpenChange={setShowFinish}>
        <DialogContent>
          <div className="py-2 space-y-5">
            <div className="text-center space-y-1">
              <div className="text-4xl">🎉</div>
              <h2 className="text-xl font-bold">Workout complete!</h2>
              <p className="text-sm text-muted-foreground">{totalCompleted} sets completed</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Session RPE</p>
              <RpeButtons value={sessionRpe} onChange={setSessionRpe} />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Session notes</p>
              <Textarea
                placeholder="How did the session feel? Any notes…"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>

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
