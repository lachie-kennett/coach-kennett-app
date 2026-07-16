"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addWorkout,
  updateWorkout,
  deleteWorkout,
  duplicateWorkout,
  addWorkoutExercise,
  deleteWorkoutExercise,
  createSuperset,
  dissolveSuperset,
  reorderWorkoutExercises,
  saveSessionAsTemplate,
  addSessionTemplateToProgram,
} from "@/lib/actions/programs";
import { NewExerciseDialog } from "@/components/exercises/new-exercise-dialog";
import { conditioningSummary, conditioningTotalSeconds, formatSessionTime } from "@/lib/workout-format";
import { EditExerciseDialog } from "@/components/programs/edit-exercise-dialog";
import { SESSION_TYPES } from "@/lib/session-types";
import { SessionTypeBadge } from "@/components/programs/session-type-badge";
import { SessionTypeCounts } from "@/components/programs/session-type-counts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy, Search, Link2, Pencil, Clock, BookMarked } from "lucide-react";
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
  block_type: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
  rest_seconds: number;
  work_seconds: number | null;
  intensity: string | null;
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

function AddExercisePanel({
  workouts,
  activeWorkoutId,
  onActiveWorkoutChange,
  exercises,
  onAdded,
}: {
  workouts: { id: string; name: string; session_type: string | null }[];
  activeWorkoutId: string | null;
  onActiveWorkoutChange: (id: string) => void;
  exercises: Exercise[];
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [restSeconds, setRestSeconds] = useState("");
  // Conditioning-only fields (work/rest as min:sec, plus intensity)
  const [workMin, setWorkMin] = useState("");
  const [workSec, setWorkSec] = useState("");
  const [restMin, setRestMin] = useState("");
  const [restSec, setRestSec] = useState("");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const activeWorkout = workouts.find((w) => w.id === activeWorkoutId);
  // Conditioning + speed days use the conditioning layout; everything else
  // (strength, agility, mobility, untyped…) uses the strength layout.
  const isConditioning =
    activeWorkout?.session_type === "conditioning" || activeWorkout?.session_type === "speed";
  // Exercises created inline this session, merged into the pool so a freshly
  // created exercise is immediately selectable before a refresh.
  const [createdExercises, setCreatedExercises] = useState<Exercise[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const pool = [...createdExercises, ...exercises];
  const filtered = pool.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );
  const trimmedSearch = search.trim();
  const hasExactMatch = pool.some(
    (ex) => ex.name.toLowerCase() === trimmedSearch.toLowerCase()
  );

  function handleCreated(ex: Exercise) {
    setCreatedExercises((prev) => [ex, ...prev]);
    setExerciseId(ex.id);
    setSearch(ex.name);
    setDropdownOpen(false);
  }

  function toSeconds(min: string, sec: string): number {
    return (parseInt(min) || 0) * 60 + (parseInt(sec) || 0);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseId || !activeWorkoutId) return;
    setLoading(true);

    const { error } = await addWorkoutExercise({
      workoutId: activeWorkoutId,
      exerciseId,
      blockType: isConditioning ? "conditioning" : "strength",
      sets: parseInt(sets) || 1,
      reps,
      weightKg: isConditioning ? null : weightKg ? parseFloat(weightKg) : null,
      restSeconds: isConditioning ? toSeconds(restMin, restSec) : parseInt(restSeconds) || 0,
      workSeconds: isConditioning ? toSeconds(workMin, workSec) || null : null,
      intensity: isConditioning ? intensity.trim() || null : null,
      notes: notes || null,
    });

    if (error) { toast.error(error); setLoading(false); return; }
    // Keep the panel open and hold sets/rest so the coach can keep adding, but
    // clear the exercise, reps and notes (which vary per exercise), then refocus.
    setSearch(""); setExerciseId(""); setReps(""); setNotes(""); setDropdownOpen(false);
    onAdded();
    setLoading(false);
    searchRef.current?.focus();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add exercise</CardTitle>
      </CardHeader>
      <CardContent>
        {workouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a workout day below first, then add exercises here.</p>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4">
            {/* Target day */}
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={activeWorkoutId ?? ""} onValueChange={(v) => v && onActiveWorkoutChange(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a day">
                    {(value: string) => workouts.find((w) => w.id === value)?.name ?? "Choose a day"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {workouts.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isConditioning && (
                <p className="text-xs text-primary font-medium">
                  Conditioning session — logging work/rest & intensity
                </p>
              )}
            </div>

            {/* Exercise / method search */}
            <div className="space-y-2">
              <Label>{isConditioning ? "Method" : "Exercise"}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder={isConditioning ? "Run, Bike, Row…" : "Search or create…"}
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
                <div className="max-h-64 overflow-y-auto rounded-md border bg-popover">
                  {filtered.map((ex) => (
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
                  ))}
                  {trimmedSearch && !hasExactMatch && (
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setShowCreateDialog(true); setDropdownOpen(false); }}
                      className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm text-primary hover:bg-secondary transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      Create &ldquo;{trimmedSearch}&rdquo;…
                    </button>
                  )}
                  {filtered.length === 0 && !trimmedSearch && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No exercises found</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="we-sets">{isConditioning ? "Sets / rounds" : "Sets"}</Label>
                <Input id="we-sets" type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="we-reps">Reps</Label>
                <Input id="we-reps" value={reps} onChange={(e) => setReps(e.target.value)} required={!isConditioning} placeholder={isConditioning ? "400m, 20 cals…" : "10 or 8-12"} />
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
                  <Label htmlFor="we-intensity">Zone / pace / intensity</Label>
                  <Input id="we-intensity" value={intensity} onChange={(e) => setIntensity(e.target.value)} placeholder="e.g. Zone 2, 5:00/km, RPE 7" />
                </div>
              </>
            ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="we-weight">Weight (kg)</Label>
                <Input id="we-weight" type="number" step="0.5" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="we-rest">Rest (sec)</Label>
                <Input id="we-rest" type="number" min="0" value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="we-notes">Notes (optional)</Label>
              <Input id="we-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Coaching cues" />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !exerciseId || !activeWorkoutId}>
              {loading ? "Adding…" : activeWorkout ? `Add to ${activeWorkout.name}` : "Add exercise"}
            </Button>
          </form>
        )}
      </CardContent>

      <NewExerciseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        initialName={trimmedSearch}
        onCreated={handleCreated}
      />
    </Card>
  );
}

function SortableExerciseRow({
  we,
  isSelected,
  onToggleSelect,
  onDissolveSuperset,
  onEditExercise,
  onDeleteExercise,
}: {
  we: WorkoutExercise;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDissolveSuperset: (group: string) => void;
  onEditExercise: (we: WorkoutExercise) => void;
  onDeleteExercise: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: we.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onToggleSelect(we.id)}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2 py-2 cursor-pointer transition-colors",
        isDragging && "opacity-80 shadow-lg",
        isSelected ? "bg-primary/15 ring-1 ring-primary/40" : "bg-secondary/50 hover:bg-secondary/80"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Superset badge — click to dissolve the whole superset */}
      {we.superset_group ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDissolveSuperset(we.superset_group!); }}
          className="text-xs font-bold text-primary w-4 shrink-0 hover:text-destructive transition-colors"
          title="Remove superset"
        >
          {we.superset_group}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{we.exercises?.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {we.block_type === "conditioning"
            ? conditioningSummary(we)
            : <>{we.sets} × {we.reps}{we.weight_kg ? ` @ ${we.weight_kg}kg` : ""}{we.rest_seconds > 0 ? ` · ${we.rest_seconds}s rest` : ""}</>}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
        onClick={(e) => { e.stopPropagation(); onEditExercise(we); }}
        title="Edit sets, reps…"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
        onClick={(e) => { e.stopPropagation(); onDeleteExercise(we.id); }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function WorkoutCard({
  workout,
  isActive,
  onActivate,
  onUpdate,
}: {
  workout: Workout;
  isActive: boolean;
  onActivate: (workoutId: string) => void;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingWe, setEditingWe] = useState<WorkoutExercise | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(workout.name);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = [...workout.workout_exercises].sort((a, b) => a.order_index - b.order_index);

  // Local order for optimistic drag reordering. Re-synced whenever the server
  // data changes (after a refresh) via the serialized id order below.
  const [items, setItems] = useState<WorkoutExercise[]>(sorted);
  const sortedKey = sorted.map((we) => we.id).join(",");
  useEffect(() => {
    setItems(sorted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((we) => we.id === active.id);
    const newIndex = items.findIndex((we) => we.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered); // optimistic
    const { error } = await reorderWorkoutExercises({
      workoutId: workout.id,
      orderedIds: reordered.map((we) => we.id),
    });
    if (error) {
      toast.error(error);
      setItems(sorted); // revert
      return;
    }
    onUpdate();
  }

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
    const { error } = await createSuperset({ workoutId: workout.id, workoutExerciseIds: [...selected] });
    if (error) { toast.error(error); return; }
    toast.success("Superset created");
    setSelected(new Set());
    onUpdate();
  }

  async function handleDissolveSuperset(group: string) {
    const { error } = await dissolveSuperset({ workoutId: workout.id, group });
    if (error) { toast.error(error); return; }
    toast.success(`Superset ${group.toUpperCase()} removed`);
    onUpdate();
  }

  async function handleSetType(value: string | null) {
    const sessionType = value === "none" ? null : value;
    const { error } = await updateWorkout({ workoutId: workout.id, sessionType });
    if (error) { toast.error(error); return; }
    onUpdate();
  }

  async function handleRename() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === workout.name) { setRenaming(false); return; }
    const { error } = await updateWorkout({ workoutId: workout.id, name: trimmed });
    if (error) { toast.error(error); return; }
    setRenaming(false);
    onUpdate();
  }

  async function handleSaveSession() {
    const { error } = await saveSessionAsTemplate(workout.id);
    if (error) { toast.error(error); return; }
    toast.success(`"${workout.name}" saved to your sessions`);
  }

  return (
    <Card className={cn(isActive && "ring-1 ring-primary/50")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            {renaming ? (
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleRename(); }
                  if (e.key === "Escape") { setNameInput(workout.name); setRenaming(false); }
                }}
                autoFocus
                className="h-7 flex-1 min-w-0 text-base font-semibold"
              />
            ) : (
              <>
                <CardTitle
                  className="text-base truncate cursor-text"
                  onClick={() => { setNameInput(workout.name); setRenaming(true); }}
                  title="Click to rename"
                >
                  {workout.name}
                </CardTitle>
                <SessionTypeBadge type={workout.session_type} className="shrink-0" />
                <Badge variant="secondary" className="text-xs shrink-0">{workout.workout_exercises.length} exercises</Badge>
                {(() => {
                  const secs = conditioningTotalSeconds(workout.workout_exercises);
                  return secs > 0 ? (
                    <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                      <Clock className="h-3 w-3" />~{formatSessionTime(secs)}
                    </Badge>
                  ) : null;
                })()}
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!renaming && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setNameInput(workout.name); setRenaming(true); }} title="Rename day">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveSession} title="Save as session template">
              <BookMarked className="h-3.5 w-3.5" />
            </Button>
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
          {items.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((we) => we.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5 mb-2">
                  {items.map((we) => (
                    <SortableExerciseRow
                      key={we.id}
                      we={we}
                      isSelected={selected.has(we.id)}
                      onToggleSelect={toggleSelect}
                      onDissolveSuperset={handleDissolveSuperset}
                      onEditExercise={setEditingWe}
                      onDeleteExercise={handleDeleteExercise}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
            <Button
              size="sm"
              variant={isActive ? "default" : "outline"}
              className={cn(selected.size >= 2 ? "flex-1" : "w-full")}
              onClick={() => onActivate(workout.id)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isActive ? "Adding here →" : "Add exercise"}
            </Button>
          </div>
        </CardContent>
      )}

      <EditExerciseDialog
        we={editingWe}
        open={!!editingWe}
        onOpenChange={(o) => !o && setEditingWe(null)}
        onSaved={onUpdate}
      />
    </Card>
  );
}

export function ProgramBuilder({
  programId,
  initialWorkouts,
  exercises,
  sessionTemplates = [],
}: {
  programId: string;
  initialWorkouts: Workout[];
  exercises: Exercise[];
  sessionTemplates?: { id: string; name: string; session_type: string | null }[];
}) {
  const router = useRouter();
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [newWorkoutType, setNewWorkoutType] = useState<string>("none");
  const [addingWorkout, setAddingWorkout] = useState(false);

  async function handleAddSessionTemplate(sessionTemplateId: string) {
    const { error } = await addSessionTemplateToProgram({ programId, sessionTemplateId });
    if (error) { toast.error(error); return; }
    toast.success("Session added");
    router.refresh();
  }

  // The workout day the side "Add exercise" panel currently targets.
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(
    initialWorkouts[0]?.id ?? null
  );
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep the active day valid as workouts are added/removed.
  useEffect(() => {
    if (initialWorkouts.length === 0) {
      setActiveWorkoutId(null);
    } else if (!initialWorkouts.some((w) => w.id === activeWorkoutId)) {
      setActiveWorkoutId(initialWorkouts[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkouts.map((w) => w.id).join(",")]);

  function activateWorkout(id: string) {
    setActiveWorkoutId(id);
    // On narrow screens the panel sits below the days — scroll it into view.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

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

  const sessionTypes = initialWorkouts.map((w) => w.session_type);
  const typedSessions = sessionTypes.filter(Boolean).length;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_minmax(400px,460px)] lg:gap-5 lg:items-start">
      <div className="space-y-4 min-w-0">
      {typedSessions > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Weekly sessions</CardTitle>
              <Badge variant="secondary" className="text-xs">{initialWorkouts.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <SessionTypeCounts types={sessionTypes} />
          </CardContent>
        </Card>
      )}

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
          <WorkoutCard
            key={w.id}
            workout={w}
            isActive={w.id === activeWorkoutId}
            onActivate={activateWorkout}
            onUpdate={refresh}
          />
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

      {sessionTemplates.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Or add a saved session:</span>
          <Select value="" onValueChange={(v) => v && handleAddSessionTemplate(v)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Choose a saved session…" />
            </SelectTrigger>
            <SelectContent>
              {sessionTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{t.session_type ? ` · ${t.session_type}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      </div>

      <div ref={panelRef} className="mt-4 lg:mt-0 lg:sticky lg:top-4">
        <AddExercisePanel
          workouts={initialWorkouts.map((w) => ({ id: w.id, name: w.name, session_type: w.session_type }))}
          activeWorkoutId={activeWorkoutId}
          onActiveWorkoutChange={setActiveWorkoutId}
          exercises={exercises}
          onAdded={refresh}
        />
      </div>
    </div>
  );
}
