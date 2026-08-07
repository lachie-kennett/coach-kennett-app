"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteClientProgram } from "@/lib/actions/programs";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteBlockButton({
  clientId,
  programId,
  programName,
}: {
  clientId: string;
  programId: string;
  programName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${programName}"? This removes the block from this client. Any logged sessions are kept in their history.`)) return;
    setLoading(true);
    const result = await deleteClientProgram({ clientId, programId });
    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success(result.keptHistory ? "Block removed — history kept" : "Block deleted");
    router.push(`/clients/${clientId}`);
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" /> {loading ? "Deleting…" : "Delete"}
    </Button>
  );
}
