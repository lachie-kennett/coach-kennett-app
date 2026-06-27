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
import { assignProgram } from "@/lib/actions/programs";

interface Program { id: string; name: string }

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
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!programId) return;
    setLoading(true);

    try {
      await assignProgram({
        clientId,
        programId,
        startDate,
        endDate: endDate || null,
      });
      toast.success("Program assigned");
      setOpen(false);
      setProgramId("");
      setEndDate("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to assign program");
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
              <Label htmlFor="end-date">End date <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !programId}>
            {loading ? "Assigning…" : "Assign program"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
