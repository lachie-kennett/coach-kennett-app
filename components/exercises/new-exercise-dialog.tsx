"use client";

import { useEffect, useState } from "react";
import { createExercise } from "@/lib/actions/exercises";
import { FOCUS_AREAS } from "@/lib/focus-areas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

export type CreatedExercise = {
  id: string;
  name: string;
  youtube_url: string | null;
  muscle_groups: string[];
};

// Controlled dialog for creating a new exercise (name + focus tags + optional
// video). Seeds the name from `initialName` each time it opens, and hands the
// created exercise back via onCreated so the caller can select it immediately.
export function NewExerciseDialog({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialName: string;
  onCreated: (ex: CreatedExercise) => void;
}) {
  const [name, setName] = useState(initialName);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [focus, setFocus] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setYoutubeUrl("");
      setFocus([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(m: string) {
    setFocus((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const result = await createExercise({
      name: trimmed,
      description: null,
      youtube_url: youtubeUrl.trim() || null,
      muscle_groups: focus,
    });
    setSaving(false);
    if (result.error || !result.id) {
      toast.error(result.error ?? "Failed to create exercise");
      return;
    }
    toast.success(`"${trimmed}" added to your library`);
    onCreated({ id: result.id, name: trimmed, youtube_url: youtubeUrl.trim() || null, muscle_groups: focus });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New exercise</DialogTitle></DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="qx-name">Name</Label>
            <Input id="qx-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Back Squat" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qx-yt">YouTube URL (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="qx-yt"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                title="Search YouTube"
                onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Focus</Label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle(m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                    focus.includes(m)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Creating…" : "Create exercise"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
