import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Activity, AlertTriangle, Users, ArrowRight, Clock,
  BookOpen, Dumbbell, MessageSquare,
} from "lucide-react";

interface Client { id: string; full_name: string | null; email: string }
interface FeedEntry {
  id: string; client_id: string; completed_at: string; rpe: number | null;
  notes: string | null; sessionName: string | null;
}
interface AttentionClient extends Client {
  reason: "expired" | "expiring" | "no_program";
  programName?: string;
  daysLeft?: number;
  endDateStr?: string;
}

interface Props {
  clientCount: number;
  exerciseCount: number;
  feed: FeedEntry[];
  needsProgram: AttentionClient[];
  endingSoon: AttentionClient[];
  recentClients: Client[];
  clientNameMap: Record<string, string>;
}

function sessionDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

export function DashboardGrid({ feed, needsProgram, endingSoon, clientNameMap }: Props) {
  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/programs/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <BookOpen className="h-4 w-4" /> New program
        </Link>
        <Link href="/exercises" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "gap-1.5")}>
          <Dumbbell className="h-4 w-4" /> Exercises
        </Link>
        <Link href="/clients" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          <Users className="h-4 w-4" /> Clients
        </Link>
      </div>

      {/* Needs a program */}
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-destructive/20">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Needs a program
          </h2>
          <Badge variant={needsProgram.length > 0 ? "destructive" : "secondary"}>{needsProgram.length}</Badge>
        </div>
        {needsProgram.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Everyone has an active program 🎉</p>
        ) : (
          <ul className="divide-y divide-destructive/10">
            {needsProgram.map((c) => (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-destructive/5 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.full_name ?? c.email}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.reason === "expired" ? `${c.programName ?? "Program"} — ended ${c.endDateStr}` : "No active program"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ending this week */}
      {endingSoon.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/20">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" /> Ending this week
            </h2>
            <Badge variant="secondary" className="text-amber-700 bg-amber-400/15 border-amber-400/40">{endingSoon.length}</Badge>
          </div>
          <ul className="divide-y divide-amber-500/10">
            {endingSoon.map((c) => (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-amber-500/5 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.full_name ?? c.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.programName} — ends {c.endDateStr}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 ml-3 text-amber-700 bg-amber-400/15 border-amber-400/40">
                    {c.daysLeft === 0 ? "today" : `${c.daysLeft}d`}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent sessions log */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Recent sessions
          </h2>
        </div>
        {feed.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No sessions logged yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {feed.map((log) => (
              <li key={log.id}>
                <Link href={`/clients/${log.client_id}`} className="block px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{clientNameMap[log.client_id] ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.sessionName ?? "Session"} · {sessionDay(log.completed_at)}
                      </p>
                    </div>
                    {log.rpe != null && (
                      <Badge variant="secondary" className="text-xs shrink-0">RPE {log.rpe}</Badge>
                    )}
                  </div>
                  {log.notes && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground italic">
                      <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{log.notes}</span>
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
