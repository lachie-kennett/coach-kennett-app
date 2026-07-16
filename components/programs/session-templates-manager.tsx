"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSessionTemplate } from "@/lib/actions/programs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Trash2 } from "lucide-react";
import { SessionTypeBadge } from "@/components/programs/session-type-badge";
import { toast } from "sonner";

export function SessionTemplatesManager({
  templates,
}: {
  templates: { id: string; name: string; session_type: string | null }[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  if (templates.length === 0) return null;

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved session?")) return;
    setDeleting(id);
    const result = await deleteSessionTemplate(id);
    setDeleting(null);
    if (result.error) { toast.error(result.error); return; }
    toast.success("Session deleted");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-semibold">Saved sessions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Single sessions you can drop into any program from the builder.
        </p>
      </div>
      {templates.map((t) => (
        <Card key={t.id}>
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-medium truncate">{t.name}</p>
                <SessionTypeBadge type={t.session_type} className="shrink-0" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
              disabled={deleting === t.id}
              onClick={() => handleDelete(t.id)}
              title="Delete saved session"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
