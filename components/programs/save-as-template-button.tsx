"use client";

import { useState } from "react";
import { saveProgramAsTemplate } from "@/lib/actions/programs";
import { Button } from "@/components/ui/button";
import { BookMarked } from "lucide-react";
import { toast } from "sonner";

export function SaveAsTemplateButton({ programId }: { programId: string }) {
  const [saving, setSaving] = useState(false);

  async function handle() {
    setSaving(true);
    const result = await saveProgramAsTemplate(programId);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Saved to your templates (Programs tab)");
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={saving} className="gap-1.5">
      <BookMarked className="h-3.5 w-3.5" />
      {saving ? "Saving…" : "Save as template"}
    </Button>
  );
}
