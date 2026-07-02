"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startCustomSession } from "@/lib/actions/workouts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Dumbbell, Plus, Minus, X, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseOption {
  id: string;
  name: string;
  description: string | null;
  youtube_url: string | null;
  muscle_groups: string[];
}

interface Selected {
  exercise: ExerciseOption;
  sets: number;
}

export function CustomSessionBuilder({ exercises }: { exercises: ExerciseOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Selected[]>([]);

  const filtered = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleExercise(ex: ExerciseOption) {
    setSelected((prev) => {
      const exists = prev.findIndex((s) => s.exercise.id === ex.id);
      if (exists >= 0) return prev.filter((s) => s.exercise.id !== ex.id);
      return [...prev, { exercise: ex, sets: 3 }];
    });
  }

  function changeSets(exerciseId: string, delta: number) {
    setSelected((prev) =>
      prev.map((s) =>
        s.exercise.id === exerciseId
          ? { ...s, sets: Math.max(1, Math.min(20, s.sets + delta)) }
          : s
      )
    );
  }

  function removeSelected(exerciseId: string) {
    setSelected((prev) => prev.filter((s) => s.exercise.id !== exerciseId));
  }

  function handleStart() {
    if (selected.length === 0) return;
    startTransition(async () => {
      const logId = await startCustomSession(
        selected.map((s) => ({ exerciseId: s.exercise.id, sets: s.sets }))
      );
      router.push(`/workouts/custom/${logId}`);
    });
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto">
      {/* Selected exercises */}
      {selected.length > 0 && (
        <div className="px-4 pt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Session plan</p>
          {selected.map((s) => (
            <div key={s.exercise.id} className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
              <p className="flex-1 text-sm font-medium truncate">{s.exercise.name}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => changeSets(s.exercise.id, -1)}
                  className="h-6 w-6 rounded flex items-center justify-center bg-secondary hover:bg-muted transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm font-semibold w-8 text-center tabular-nums">{s.sets}×</span>
                <button
                  type="button"
                  onClick={() => changeSets(s.exercise.id, 1)}
                  className="h-6 w-6 rounded flex items-center justify-center bg-secondary hover:bg-muted transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSelected(s.exercise.id)}
                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          <Button className="w-full gap-2 mt-1" onClick={handleStart} disabled={pending}>
            <Play className="h-4 w-4" />
            {pending ? "Starting…" : `Start session (${selected.length} exercise${selected.length !== 1 ? "s" : ""})`}
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
        {filtered.map((ex) => {
          const isSelected = selected.some((s) => s.exercise.id === ex.id);
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => toggleExercise(ex)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                isSelected ? "bg-primary/10 border border-primary/30" : "bg-card border border-border hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
              )}>
                {isSelected ? <Plus className="h-4 w-4 rotate-45" /> : <Dumbbell className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{ex.name}</p>
                {ex.muscle_groups?.length > 0 && (
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {ex.muscle_groups.slice(0, 3).join(", ").replace(/_/g, " ")}
                  </p>
                )}
              </div>
              {isSelected && <Badge className="shrink-0 text-xs bg-primary/20 text-primary border-0">Added</Badge>}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No exercises match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
