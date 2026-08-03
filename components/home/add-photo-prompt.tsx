"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, X } from "lucide-react";

const KEY = "ck-photo-prompt-dismissed";

// Gentle, dismissible nudge shown on the home screen when a client has no
// profile photo yet — encourages adding one without forcing it.
export function AddPhotoPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) !== "1") setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  function dismiss() {
    setShow(false);
    try { window.localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  }

  if (!show) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Camera className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Add a profile photo</p>
        <p className="text-xs text-muted-foreground">So your coach and teammates can put a face to the name.</p>
      </div>
      <Link
        href="/profile"
        onClick={dismiss}
        className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
      >
        Add photo
      </Link>
      <button type="button" onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
