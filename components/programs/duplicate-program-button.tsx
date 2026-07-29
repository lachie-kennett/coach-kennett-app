"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { duplicateProgramForClient } from "@/lib/actions/programs";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export function DuplicateProgramButton({ programId }: { programId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!confirm("Duplicate this program for the next block? A fresh copy is created for this client that you can edit.")) return;
    setLoading(true);
    const res = await duplicateProgramForClient(programId);
    setLoading(false);
    if (res.error || !res.id) {
      toast.error(res.error ?? "Failed to duplicate");
      return;
    }
    toast.success("Duplicated — edit the next block");
    router.push(`/programs/${res.id}?clientId=${res.clientId}`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading}>
      <Copy className="mr-1 h-3.5 w-3.5" /> {loading ? "Duplicating…" : "Duplicate"}
    </Button>
  );
}
