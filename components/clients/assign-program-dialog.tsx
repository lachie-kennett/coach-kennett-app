"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { assignTemplate } from "@/lib/actions/programs";

interface Program { id: string; name: string }

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

export function AssignProgramDialog({
  clientId,
  coachId: _coachId,
  programs,
}: {
  clientId: string;
  coachId: string;
  programs: Program[];
}) {
  const [open, setOpen] = useState(false);
  const [programId, setProgramId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [weeks, setWeeks] = useState("");
  const [loading, setLoading] = useState(false);

  // Length runs to the Sunday of the final week (weeks * 7 - 1 days).
  const weeksNum = parseInt(weeks, 10);
  const endDate = weeks && weeksNum > 0 ? addDays(startDate, weeksNum * 7 - 1) : null;
  const endLabel = endDate
    ? new Date(endDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : null;

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!programId) return;
    setLoading(true);

    const result = await assignTemplate({
      templateId: programId,
      clientId,
      startDate,
      endDate,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Program assigned");
      setOpen(false);
      setProgramId("");
      setWeeks("");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        <Plus className="mr-1 h-4 w-4" /> Assign
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign program</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAssign} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Program</Label>
            <Select value={programId} onValueChange={(v) => v && setProgramId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-weeks">Length (weeks)</Label>
              <Input
                id="assign-weeks"
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
            <p className="text-xs text-muted-foreground -mt-1">Ends {endLabel}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading || !programId}>
            {loading ? "Assigning…" : "Assign program"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
