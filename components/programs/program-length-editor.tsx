"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAssignmentDates } from "@/lib/actions/programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function weeksBetween(start: string, end: string | null): string | null {
  if (!end) return null;
  const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  if (days <= 0) return null;
  const weeks = days / 7;
  // Show whole weeks where clean, otherwise one decimal.
  const rounded = Math.round(weeks * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} week${rounded === 1 ? "" : "s"}` : `${rounded} weeks`;
}

export function ProgramLengthEditor({
  clientId,
  programId,
  startDate: initialStart,
  endDate: initialEnd,
}: {
  clientId: string;
  programId: string;
  startDate: string;
  endDate: string | null;
}) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd ?? "");
  const [saving, setSaving] = useState(false);

  const changed = startDate !== initialStart || endDate !== (initialEnd ?? "");
  const length = weeksBetween(startDate, endDate || null);

  async function handleSave() {
    setSaving(true);
    const result = await updateAssignmentDates({
      clientId,
      programId,
      startDate,
      endDate: endDate || null,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Program length updated");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Program length</p>
        {length && <span className="text-xs text-muted-foreground">{length}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="len-start" className="text-xs text-muted-foreground">Start</Label>
          <Input
            id="len-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="len-end" className="text-xs text-muted-foreground">End</Label>
          <Input
            id="len-end"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving || !changed}>
        {saving ? "Saving…" : "Save length"}
      </Button>
    </div>
  );
}
