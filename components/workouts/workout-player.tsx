"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { startWorkoutLog, logSet, saveExerciseLog, finishWorkoutLog, cancelWorkoutLog, addSessionExercise, getCoachExercisesForLog } from "@/lib/actions/workouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { VideoPreviewButton } from "@/components/workouts/video-preview-button";
import { Check, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trophy, X, Timer, Plus, Minus, Search, Dumbbell } from "lucide-react";
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

interface AdHocExercise {
  sessionExId: string;
  exercise: Exercise;
}

type PickerExercise = { id: string; name: string; description: string | null; youtube_url: string | null; muscle_groups: string[] };

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
  forClient,
}: {
  workout: Workout;
  previousSessions: PreviousSession[];
  timezone?: string;
  forClient?: { id: string; name: string };
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

  // Ad-hoc exercises added during the session
  const [adHocExercises, setAdHocExercises] = useState<AdHocExercise[]>([]);

  // Exercise picker dialog
  const [showExPicker, setShowExPicker] = useState(false);
  const [pickerExercises, setPickerExercises] = useState<PickerExercise[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");

  // Session-level notes and RPE (for finish dialog)
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionRpe, setSessionRpe] = useState<number | null>(null);

  const exercises = workout.workout_exercises;
  const currentEx = exercises[currentExIdx];
  const currentAdHoc = currentExIdx >= exercises.length
    ? adHocExercises[currentExIdx - exercises.length]
    : null;
  const totalExCount = exercises.length + adHocExercises.length;

  // Most recent previous session
  const mostRecent = previousSessions[0];

  // Start the workout log on mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    async function startLog() {
      try {
        const id = await startWorkoutLog(workout.id, forClient?.id);
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

  async function completeSet(
    weOrAhId: string,
    exerciseId: string,
    exerciseName: string,
    setIdx: number,
    restSecs: number,
    isAdHoc: boolean,
  ) {
    if (!workoutLogId) return;
    const entry = sets[weOrAhId]?.[setIdx];
    if (!entry) return;

    const weightKg = entry.weight ? parseFloat(entry.weight) : null;
    const repsCompleted = entry.reps ? parseInt(entry.reps) : null;

    let isPR = false;
    try {
      const result = await logSet({
        workoutLogId,
        workoutExerciseId: isAdHoc ? null : weOrAhId,
        sessionExerciseId: isAdHoc ? weOrAhId : null,
        exerciseId,
        setNumber: setIdx + 1,
        repsCompleted,
        weightKg,
        forClientId: forClient?.id,
      });
      isPR = result.isPR;
    } catch {
      toast.error("Failed to save set");
      return;
    }

    if (isPR) toast.success(`New PR on ${exerciseName}!`, { icon: "🏆" });

    setSets((prev) => {
      const copy = [...(prev[weOrAhId] ?? [])];
      copy[setIdx] = { ...copy[setIdx], completed: true, isPR };
      return { ...prev, [weOrAhId]: copy };
    });

    const isLastSetOfExercise = setIdx === (sets[weOrAhId]?.length ?? 0) - 1;
    const isLastExercise = currentExIdx === totalExCount - 1;
    if (!(isLastSetOfExercise && isLastExercise)) {
      setRestSeconds(restSecs);
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

  function addSet(weId: string) {
    setSets((prev) => {
      const current = prev[weId] ?? [];
      const last = current[current.length - 1];
      return {
        ...prev,
        [weId]: [...current, { reps: last?.reps ?? "", weight: last?.weight ?? "", completed: false, isPR: false }],
      };
    });
  }

  function removeSet(weId: string) {
    setSets((prev) => {
      const current = [...(prev[weId] ?? [])];
      // Remove the last uncompleted set
      for (let i = current.length - 1; i >= 0; i--) {
        if (!current[i].completed) {
          current.splice(i, 1);
          break;
        }
      }
      return { ...prev, [weId]: current };
    });
  }

  async function openExercisePicker() {
    if (!workoutLogId) return;
    setPickerSearch("");
    setShowExPicker(true);
    if (pickerExercises.length === 0) {
      const exs = await getCoachExercisesForLog(workoutLogId);
      setPickerExercises(exs);
    }
  }

  async function handlePickExercise(ex: PickerExercise) {
    if (!workoutLogId) return;
    setShowExPicker(false);
    try {
      const sessionExId = await addSessionExercise({ workoutLogId, exerciseId: ex.id });
      const adHocEx: AdHocExercise = { sessionExId, exercise: { ...ex, muscle_groups: ex.muscle_groups ?? [] } };
      setAdHocExercises((prev) => [...prev, adHocEx]);
      setSets((prev) => ({
        ...prev,
        [sessionExId]: [{ reps: "", weight: "", completed: false, isPR: false }, { reps: "", weight: "", completed: false, isPR: false }, { reps: "", weight: "", completed: false, isPR: false }],
      }));
      setCurrentExIdx(exercises.length + adHocExercises.length);
    } catch {
      toast.error("Failed to add exercise");
    }
  }

  const returnPath = forClient ? `/clients/${forClient.id}` : "/home";
  const cancelPath = forClient ? `/clients/${forClient.id}` : "/workouts";

  async function finishWorkout() {
    if (!workoutLogId || saving) return;
    setSaving(true);
    await finishWorkoutLog(workoutLogId, sessionNotes || null, sessionRpe);
    toast.success(forClient ? `Logged for ${forClient.name}!` : "Workout complete! Great work.");
    router.push(returnPath);
  }

  async function cancelWorkout() {
    if (!workoutLogId) return router.push(cancelPath);
    if (!confirm("Cancel this workout? Progress will be lost.")) return;
    await cancelWorkoutLog(workoutLogId);
    router.push(cancelPath);
  }

  const activeId = currentEx?.id ?? currentAdHoc?.sessionExId ?? "";
  const completedSets = sets[activeId]?.filter((s) => s.completed).length ?? 0;
  const totalCompleted = Object.values(sets).reduce((sum, arr) => sum + arr.filter((s) => s.completed).length, 0);
  const totalSets = exercises.reduce((sum, we) => sum + (sets[we.id]?.length ?? we.sets), 0)
    + adHocExercises.reduce((sum, ah) => sum + (sets[ah.sessionExId]?.length ?? 0), 0);
  const overallProgress = totalSets > 0 ? (totalCompleted / totalSets) * 100 : 0;

  if (!currentEx && !currentAdHoc) return null;

  return (
    <>
      {showRest && <RestTimer seconds={restSeconds} onDone={() => setShowRest(false)} />}

      <div className="flex flex-col h-full max-w-lg mx-auto">
        {forClient && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Logging for {forClient.name}
            </span>
          </div>
        )}
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
            {currentAdHoc ? (
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs shrink-0">Added</Badge>
                  <h2 className="text-lg font-bold">{currentAdHoc.exercise.name}</h2>
                  <VideoPreviewButton exercise={currentAdHoc.exercise} />
                </div>
                {currentAdHoc.exercise.muscle_groups?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentAdHoc.exercise.muscle_groups.map((m) => (
                      <span key={m} className="text-xs text-muted-foreground capitalize">{m.replace("_", " ")}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {currentEx!.superset_group && (
                      <Badge className="text-xs shrink-0">{currentEx!.superset_group}</Badge>
                    )}
                    <h2 className="text-lg font-bold">{currentEx!.exercises.name}</h2>
                    <VideoPreviewButton exercise={currentEx!.exercises} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sets[currentEx!.id]?.length ?? currentEx!.sets} sets × {currentEx!.reps}
                    {currentEx!.weight_kg ? ` @ ${currentEx!.weight_kg}kg` : ""}
                    {" · "}{currentEx!.rest_seconds}s rest
                  </p>
                  {currentEx!.notes && (
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">{currentEx!.notes}</p>
                  )}
                </div>
              </div>
            )}
            {!currentAdHoc && currentEx!.exercises.muscle_groups?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentEx!.exercises.muscle_groups.map((m) => (
                  <span key={m} className="text-xs text-muted-foreground capitalize">{m.replace("_", " ")}</span>
                ))}
              </div>
            )}
          </div>

          {/* Sets */}
          <div className="space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] gap-2 px-1">
              <span className="text-xs text-muted-foreground text-center">Set</span>
              <span className="text-xs text-muted-foreground text-center">Weight (kg)</span>
              <span className="text-xs text-muted-foreground text-center">Reps</span>
              <span />
              <span />
            </div>
            {(sets[activeId] ?? []).map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] gap-2 items-center rounded-lg px-1 py-1.5 transition-colors",
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
                  onChange={(e) => updateSet(activeId, i, "weight", e.target.value)}
                  disabled={entry.completed} className="h-10 text-center text-base"
                />
                <Input
                  type="number" inputMode="numeric" placeholder="0"
                  value={entry.reps}
                  onChange={(e) => updateSet(activeId, i, "reps", e.target.value)}
                  disabled={entry.completed} className="h-10 text-center text-base"
                />
                <Button
                  size="sm" variant={entry.completed ? "default" : "outline"}
                  className="h-10 w-10 p-0"
                  onClick={() => !entry.completed && completeSet(
                    activeId,
                    currentAdHoc?.exercise.id ?? currentEx!.exercises.id,
                    currentAdHoc?.exercise.name ?? currentEx!.exercises.name,
                    i,
                    currentAdHoc ? 90 : currentEx!.rest_seconds,
                    !!currentAdHoc,
                  )}
                  disabled={entry.completed}
                >
                  <Check className="h-4 w-4" />
                </Button>
                {!entry.completed && (
                  <button
                    type="button"
                    className="flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeSet(activeId)}
                    title="Remove set"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addSet(activeId)}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add set
            </button>
          </div>

          {/* History (program exercises only) */}
          {!currentAdHoc && <SessionHistory weId={currentEx!.id} sessions={previousSessions} timezone={timezone} />}

          {/* Exercise RPE */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Exercise RPE</p>
            <RpeButtons
              value={exerciseRpe[activeId] ?? null}
              onChange={(v) => handleExerciseRpe(activeId, v)}
            />
          </div>

          {/* Exercise notes */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Exercise notes</p>
            <Textarea
              placeholder="Add notes for this exercise…"
              value={exerciseNotes[activeId] ?? ""}
              onChange={(e) => setExerciseNotes((prev) => ({ ...prev, [activeId]: e.target.value }))}
              onBlur={() => handleExerciseNotesBlur(activeId)}
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
            {currentExIdx < totalExCount - 1 ? (
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
            {adHocExercises.map((ah, i) => (
              <button key={ah.sessionExId} onClick={() => setCurrentExIdx(exercises.length + i)}
                className={cn("rounded-full transition-all", (exercises.length + i) === currentExIdx
                  ? "w-4 h-2 bg-primary"
                  : sets[ah.sessionExId]?.every((s) => s.completed)
                  ? "w-2 h-2 bg-primary/40"
                  : "w-2 h-2 bg-muted"
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={openExercisePicker}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add exercise
          </button>
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

      {/* Exercise picker dialog */}
      <Dialog open={showExPicker} onOpenChange={setShowExPicker}>
        <DialogContent className="max-h-[80vh] flex flex-col p-0">
          <div className="px-4 pt-4 pb-2 border-b border-border">
            <h2 className="text-base font-bold mb-3">Add exercise</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search exercises…"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {pickerExercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Dumbbell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Loading exercises…</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {pickerExercises
                  .filter((ex) => ex.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map((ex) => (
                    <li key={ex.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => handlePickExercise(ex)}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Dumbbell className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ex.name}</p>
                          {ex.muscle_groups?.length > 0 && (
                            <p className="text-xs text-muted-foreground capitalize truncate">
                              {ex.muscle_groups.join(", ").replace(/_/g, " ")}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
