"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProgram } from "@/lib/actions/programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function NewProgramForm({
  clientId,
}: {
  clientId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [weeks, setWeeks] = useState("");
  const [loading, setLoading] = useState(false);

  const weeksNum = parseInt(weeks, 10);
  const endDate = clientId && weeks && weeksNum > 0 ? addDays(startDate, weeksNum * 7 - 1) : null;
  const endLabel = endDate
    ? new Date(endDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : null;

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const { id } = await createProgram({
        name,
        description: description || null,
        clientId,
        startDate: clientId ? startDate : undefined,
        endDate: clientId ? endDate : undefined,
      });
      toast.success("Program created");
      router.push(clientId ? `/programs/${id}?clientId=${clientId}` : `/programs/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create program");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prog-name">Program name</Label>
        <Input
          id="prog-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. 12-Week Strength Block"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prog-desc">Description (optional)</Label>
        <Textarea
          id="prog-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Program overview, goals, etc."
        />
      </div>

      {clientId && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prog-weeks">Length (weeks)</Label>
              <Input
                id="prog-weeks"
                type="number"
                min="1"
                inputMode="numeric"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
          </div>
          {endLabel && <p className="text-xs text-muted-foreground">Ends {endLabel}</p>}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating…" : "Create program"}
      </Button>
    </form>
  );
}
