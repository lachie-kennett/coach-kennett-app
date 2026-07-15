"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAssignmentDates } from "@/lib/actions/programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
// Adds days to a YYYY-MM-DD string using local date parts (no timezone drift).
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
// Whole weeks between two dates, or "" if there is no end date.
function weeksFrom(start: string, end: string | null): string {
  if (!end) return "";
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (days <= 0) return "";
  return String(Math.round(days / 7));
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
  const [weeks, setWeeks] = useState(weeksFrom(initialStart, initialEnd));
  const [saving, setSaving] = useState(false);

  const initialWeeks = weeksFrom(initialStart, initialEnd);
  const changed = startDate !== initialStart || weeks !== initialWeeks;

  const weeksNum = parseInt(weeks, 10);
  const endDate = weeks && weeksNum > 0 ? addDays(startDate, weeksNum * 7) : null;
  const endLabel = endDate
    ? new Date(endDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : null;

  async function handleSave() {
    setSaving(true);
    const result = await updateAssignmentDates({
      clientId,
      programId,
      startDate,
      endDate,
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
      <p className="text-sm font-medium">Program length</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Start date</Label>
          <DatePicker value={startDate} onChange={setStartDate} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="len-weeks" className="text-xs text-muted-foreground">Length (weeks)</Label>
          <Input
            id="len-weeks"
            type="number"
            min="1"
            inputMode="numeric"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            placeholder="e.g. 8"
          />
        </div>
      </div>
      {endLabel && (
        <p className="text-xs text-muted-foreground">Ends {endLabel}</p>
      )}
      <Button size="sm" onClick={handleSave} disabled={saving || !changed}>
        {saving ? "Saving…" : "Save length"}
      </Button>
    </div>
  );
}
