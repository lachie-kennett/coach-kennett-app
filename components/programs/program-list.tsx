"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { AssignTemplateDialog } from "@/components/programs/assign-template-dialog";
import { ProgramNameEditor } from "@/components/programs/program-name-editor";
import { cn } from "@/lib/utils";

type ProgramRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type SortKey = "created" | "name";

export function ProgramList({
  programs,
  clients,
}: {
  programs: ProgramRow[];
  clients: { id: string; name: string }[];
}) {
  const [sort, setSort] = useState<SortKey>("created");

  const sorted = useMemo(() => {
    const list = [...programs];
    if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return list;
  }, [programs, sort]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 text-sm">
        <span className="text-muted-foreground mr-1">Sort:</span>
        {([
          ["created", "Newest"],
          ["name", "Name"],
        ] as [SortKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              sort === key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((p) => (
          <Card key={p.id} className="hover:bg-secondary/30 transition-colors">
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <ProgramNameEditor programId={p.id} name={p.name} className="font-medium" />
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/programs/${p.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                  Open <ArrowRight className="h-4 w-4" />
                </Link>
                <AssignTemplateDialog templateId={p.id} templateName={p.name} clients={clients} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
