"use client";

import { useState } from "react";
import { updateHabitTrackerUrl } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

export function HabitTrackerForm({ current }: { current: string | null }) {
  const [url, setUrl] = useState(current ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateHabitTrackerUrl(url);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Habit tracker link saved");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1">Habit tracker URL</p>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-10 w-10 shrink-0 rounded-md border border-border hover:bg-muted transition-colors"
              title="Open tracker"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How to get your link</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-none">
          <li>1. Open your habit tracker in Google Sheets</li>
          <li>2. Tap the <span className="font-medium">Share</span> button (top right)</li>
          <li>3. Change access to <span className="font-medium">"Anyone with the link"</span></li>
          <li>4. Tap <span className="font-medium">Copy link</span></li>
          <li>5. Paste it in the field above and save</li>
        </ol>
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
