"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExercise, updateExercise, deleteExercise } from "@/lib/actions/exercises";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Play, Pencil, Trash2, Dumbbell, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Database, MuscleGroup } from "@/lib/supabase/types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

const FOCUS_OPTIONS: MuscleGroup[] = [
  "lower push", "lower pull", "upper push", "upper pull",
  "arms", "mobility", "core", "power", "plyo",
  "resilience", "conditioning", "speed", "agility", "other",
];

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function ExerciseFormDialog({
  exercise,
  onClose,
}: {
  exercise?: Exercise;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(exercise?.name ?? "");
  const [description, setDescription] = useState(exercise?.description ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(exercise?.youtube_url ?? "");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>((exercise?.muscle_groups ?? []) as MuscleGroup[]);
  const [loading, setLoading] = useState(false);

  function toggleMuscle(m: MuscleGroup) {
    setMuscleGroups((prev) =>
      prev.includes(m) ? prev.filter((g) => g !== m) : [...prev, m]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      description: description || null,
      youtube_url: youtubeUrl || null,
      muscle_groups: muscleGroups,
    };

    const result = exercise
      ? await updateExercise(exercise.id, payload)
      : await createExercise(payload);

    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(exercise ? "Exercise updated" : "Exercise created");
    onClose();
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 mt-2">
      <div className="space-y-2">
        <Label htmlFor="ex-name">Name</Label>
        <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Back Squat" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ex-desc">Description (optional)</Label>
        <Textarea id="ex-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Coaching cues or notes" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ex-yt">YouTube URL (optional)</Label>
        <div className="flex gap-2">
          <Input id="ex-yt" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="Search YouTube"
            onClick={() => {
              const query = encodeURIComponent(`${name} exercise tutorial`);
              window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Focus</Label>
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleMuscle(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                muscleGroups.includes(m)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving…" : exercise ? "Save changes" : "Create exercise"}
      </Button>
    </form>
  );
}

function VideoDialog({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  const videoId = exercise.youtube_url ? getYouTubeId(exercise.youtube_url) : null;
  if (!videoId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 w-8 p-0")}>
        <Play className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-4">
          <p className="font-semibold">{exercise.name}</p>
          {exercise.description && (
            <p className="text-sm text-muted-foreground mt-1">{exercise.description}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExerciseLibrary({
  exercises,
  isCoach,
  coachId,
}: {
  exercises: Exercise[];
  isCoach: boolean;
  coachId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscle_groups.some((m) => m.includes(search.toLowerCase()))
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this exercise?")) return;
    const result = await deleteExercise(id);
    if (result.error) { toast.error(result.error); return; }
    toast.success("Deleted");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercises</h1>
          <p className="text-sm text-muted-foreground mt-1">{exercises.length} in library</p>
        </div>
        {isCoach && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="mr-2 h-4 w-4" /> Add exercise
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New exercise</DialogTitle></DialogHeader>
              <ExerciseFormDialog onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search exercises or muscle groups…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((ex) => (
            <Card key={ex.id}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{ex.name}</p>
                    {ex.youtube_url && (
                      <Badge variant="secondary" className="text-xs shrink-0">Video</Badge>
                    )}
                  </div>
                  {ex.muscle_groups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ex.muscle_groups.map((m) => (
                        <span key={m} className="text-xs text-muted-foreground">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <VideoDialog exercise={ex} />
                  {isCoach && (
                    <>
                      <Dialog open={editExercise?.id === ex.id} onOpenChange={(o) => !o && setEditExercise(null)}>
                        <DialogTrigger
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 w-8 p-0")}
                          onClick={() => setEditExercise(ex)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Edit exercise</DialogTitle></DialogHeader>
                          <ExerciseFormDialog exercise={ex} onClose={() => setEditExercise(null)} />
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(ex.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No exercises match your search." : "No exercises yet. Add your first one."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
