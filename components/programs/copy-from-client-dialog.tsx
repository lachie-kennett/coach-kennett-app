"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copyProgramToClient } from "@/lib/actions/programs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { toast } from "sonner";

type SourceClient = { id: string; name: string; programs: { id: string; name: string }[] };

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

export function CopyFromClientDialog({
  targetClientId,
  sources,
}: {
  targetClientId: string;
  sources: SourceClient[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sourceClientId, setSourceClientId] = useState("");
  const [programId, setProgramId] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [weeks, setWeeks] = useState("");
  const [saving, setSaving] = useState(false);

  const sourceClient = sources.find((c) => c.id === sourceClientId);
  const programs = sourceClient?.programs ?? [];

  const weeksNum = parseInt(weeks, 10);
  const endDate = weeks && weeksNum > 0 ? addDays(startDate, weeksNum * 7 - 1) : null;

  async function handleCopy() {
    if (!programId) return;
    setSaving(true);
    const result = await copyProgramToClient({ sourceProgramId: programId, clientId: targetClientId, startDate, endDate });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Program copied in");
    setOpen(false);
    setSourceClientId("");
    setProgramId("");
    setWeeks("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
        <Copy className="h-3.5 w-3.5" /> Copy from
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy a program from another client</DialogTitle>
        </DialogHeader>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">None of your other clients have a program to copy yet.</p>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Copy from client</Label>
              <Select value={sourceClientId} onValueChange={(v) => { if (v) { setSourceClientId(v); setProgramId(""); } }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client">
                    {(value: string) => sources.find((c) => c.id === value)?.name ?? "Choose a client"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sources.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={programId} onValueChange={(v) => v && setProgramId(v)} disabled={!sourceClient}>
                <SelectTrigger>
                  <SelectValue placeholder={sourceClient ? "Choose a program" : "Pick a client first"}>
                    {(value: string) => programs.find((p) => p.id === value)?.name ?? "Choose a program"}
                  </SelectValue>
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
                <Label>Start date</Label>
                <DatePicker value={startDate} onChange={setStartDate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="copyfrom-weeks">Length (weeks)</Label>
                <Input id="copyfrom-weeks" type="number" min="1" inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} placeholder="e.g. 8" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A fresh, independent copy is created for this client — editing it won&rsquo;t affect the original.
            </p>
            <Button className="w-full" onClick={handleCopy} disabled={saving || !programId}>
              {saving ? "Copying…" : "Copy program in"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
