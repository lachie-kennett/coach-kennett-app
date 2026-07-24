"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell, ChevronDown, ChevronUp, Trophy, MessageSquare } from "lucide-react";

export type HistoryExercise = {
  name: string;
  sets: { setNumber: number; reps: number | null; weight: number | null; isPR: boolean }[];
};
export type HistoryEntry = {
  id: string;
  title: string;
  dateLabel: string;
  duration: string;
  totalSets: number;
  prCount: number;
  rpe: number | null;
  notes: string | null;
  exercises: HistoryExercise[];
};

export function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{entry.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{entry.dateLabel}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3.5 w-3.5" />
              {entry.duration}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3.5 w-3.5" /> {entry.totalSets} sets
            </span>
            {entry.prCount > 0 && (
              <Badge className="text-xs bg-primary/20 text-primary border-0">
                🏆 {entry.prCount} PR{entry.prCount > 1 ? "s" : ""}
              </Badge>
            )}
            {entry.rpe != null && (
              <Badge variant="secondary" className="text-xs">RPE {entry.rpe}</Badge>
            )}
            <span className="ml-auto flex items-center gap-0.5 text-xs text-primary">
              {open ? <>Hide <ChevronUp className="h-3.5 w-3.5" /></> : <>Details <ChevronDown className="h-3.5 w-3.5" /></>}
            </span>
          </div>
        </CardContent>
      </button>

      {open && (
        <CardContent className="pt-0 space-y-3 border-t border-border mt-1">
          {entry.exercises.length === 0 ? (
            <p className="pt-3 text-sm text-muted-foreground">No set details recorded.</p>
          ) : (
            entry.exercises.map((ex, i) => (
              <div key={i} className="pt-3 first:pt-3">
                <p className="text-sm font-medium mb-1">{ex.name}</p>
                <div className="space-y-0.5">
                  {ex.sets.map((s) => (
                    <div key={s.setNumber} className="flex items-center gap-2 text-xs">
                      <span className="w-5 text-muted-foreground tabular-nums">{s.setNumber}</span>
                      <span className="tabular-nums">
                        {s.weight != null ? `${s.weight}kg` : "BW"} × {s.reps ?? "—"}
                      </span>
                      {s.isPR && <Trophy className="h-3 w-3 text-primary" />}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          {entry.notes && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground italic border-t border-border pt-2">
              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
              {entry.notes}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
