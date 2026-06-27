"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  youtube_url: string | null;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function VideoPreviewButton({ exercise }: { exercise: Exercise | null }) {
  const [open, setOpen] = useState(false);
  if (!exercise?.youtube_url) return null;

  const videoId = getYouTubeId(exercise.youtube_url);
  if (!videoId) return null;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 text-primary shrink-0"
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
      >
        <Play className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
