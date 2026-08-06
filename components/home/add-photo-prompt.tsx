"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shown once per app open (session) while a client still has no profile photo.
// Dismissing only hides it for the current session, so it reappears next time
// they open the app — until a photo is set, at which point the parent stops
// rendering it entirely.
const KEY = "ck-photo-prompt-seen";

export function AddPhotoPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function close() {
    setOpen(false);
    try { window.sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <Camera className="h-7 w-7 text-primary" />
        </div>
        <DialogHeader className="items-center">
          <DialogTitle>Add a profile photo</DialogTitle>
          <DialogDescription>
            So your coach and teammates can put a face to the name — and you show up on the leaderboard.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <Link href="/profile" onClick={close} className={cn(buttonVariants({ size: "sm" }), "w-full")}>
            Add photo
          </Link>
          <Button variant="ghost" size="sm" onClick={close} className="w-full">
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
