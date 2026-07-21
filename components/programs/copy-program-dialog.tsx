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

export function CopyProgramDialog({
  sourceProgramId,
  programName,
  clients,
}: {
  sourceProgramId: string;
  programName: string;
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [weeks, setWeeks] = useState("");
  const [saving, setSaving] = useState(false);

  const weeksNum = parseInt(weeks, 10);
  const endDate = weeks && weeksNum > 0 ? addDays(startDate, weeksNum * 7) : null;

  async function handleCopy() {
    if (!clientId) return;
    setSaving(true);
    const result = await copyProgramToClient({ sourceProgramId, clientId, startDate, endDate });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const name = clients.find((c) => c.id === clientId)?.name ?? "client";
    toast.success(`Copied to ${name}`);
    setOpen(false);
    setClientId("");
    setWeeks("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
        <Copy className="h-3.5 w-3.5" /> Copy to client
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">Copy &ldquo;{programName}&rdquo; to another client</DialogTitle>
        </DialogHeader>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">You don&rsquo;t have any other active clients to copy this to.</p>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={(v) => v && setClientId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client">
                    {(value: string) => clients.find((c) => c.id === value)?.name ?? "Choose a client"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                <Label htmlFor="copy-weeks">Length (weeks)</Label>
                <Input id="copy-weeks" type="number" min="1" inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} placeholder="e.g. 8" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A fresh, independent copy is created for that client — editing it won&rsquo;t affect this one.
            </p>
            <Button className="w-full" onClick={handleCopy} disabled={saving || !clientId}>
              {saving ? "Copying…" : "Copy program"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
