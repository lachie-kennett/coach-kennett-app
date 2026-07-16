"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameProgram } from "@/lib/actions/programs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Inline-editable program name. Click the name or the pencil to edit; Enter or
// blur saves, Escape cancels.
export function ProgramNameEditor({
  programId,
  name,
  className,
}: {
  programId: string;
  name: string;
  className?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) { setEditing(false); setValue(name); return; }
    setSaving(true);
    const result = await renameProgram(programId, trimmed);
    setSaving(false);
    if (result.error) { toast.error(result.error); return; }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); save(); }
          if (e.key === "Escape") { setValue(name); setEditing(false); }
        }}
        autoFocus
        disabled={saving}
        className={cn("h-8", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setValue(name); setEditing(true); }}
      className={cn("group inline-flex items-center gap-1.5 text-left min-w-0", className)}
      title="Click to rename"
    >
      <span className="truncate">{name}</span>
      <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
