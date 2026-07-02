"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Activity, AlertTriangle, Users, ArrowRight, Clock,
  UserX, BookOpen, Dumbbell, ChevronRight,
} from "lucide-react";

interface Client { id: string; full_name: string | null; email: string }
interface FeedEntry {
  id: string; client_id: string; completed_at: string; rpe: number | null;
  sessionName: string | null;
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
  attention: AttentionClient[];
  recentClients: Client[];
  clientNameMap: Record<string, string>;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function Tile({
  icon: Icon,
  label,
  metric,
  metricLabel,
  danger,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  metric: number | string;
  metricLabel?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 active:scale-[0.98]",
        danger ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
      )}
    >
      <div className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl mb-4",
        danger ? "bg-destructive/10" : "bg-primary/10"
      )}>
        <Icon className={cn("h-5 w-5", danger ? "text-destructive" : "text-primary")} />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{metric}</p>
        {metricLabel && <p className="text-xs text-muted-foreground mt-0.5">{metricLabel}</p>}
        <p className="text-sm font-medium mt-1">{label}</p>
      </div>
    </button>
  );
}

export function DashboardGrid({ clientCount, exerciseCount, feed, attention, recentClients, clientNameMap }: Props) {
  const [open, setOpen] = useState<"feed" | "attention" | "clients" | null>(null);

  const expired = attention.filter(c => c.reason === "expired");
  const expiringSoon = attention.filter(c => c.reason === "expiring");
  const noProgram = attention.filter(c => c.reason === "no_program");

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Tile
          icon={Activity}
          label="Recent activity"
          metric={feed.length}
          metricLabel={feed.length === 1 ? "session" : "sessions"}
          onClick={() => setOpen("feed")}
        />
        <Tile
          icon={AlertTriangle}
          label="Need attention"
          metric={attention.length}
          metricLabel={attention.length === 1 ? "client" : "clients"}
          danger={attention.length > 0}
          onClick={() => setOpen("attention")}
        />
        <Tile
          icon={Users}
          label="Clients"
          metric={clientCount}
          metricLabel={clientCount === 1 ? "athlete" : "athletes"}
          onClick={() => setOpen("clients")}
        />
        <div className="flex flex-col gap-2">
          <Link
            href="/programs/new"
            className={cn(buttonVariants({ size: "sm" }), "flex-1 gap-1.5 justify-start")}
          >
            <BookOpen className="h-4 w-4" /> New program
          </Link>
          <Link
            href="/exercises"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "flex-1 gap-1.5 justify-start")}
          >
            <Dumbbell className="h-4 w-4" /> Exercises
          </Link>
          <Link
            href="/clients"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 gap-1.5 justify-start")}
          >
            <Users className="h-4 w-4" /> All clients
          </Link>
        </div>
      </div>

      {/* Activity feed dialog */}
      <Dialog open={open === "feed"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[80vh] flex flex-col p-0">
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Recent sessions
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {feed.length === 0 ? (
              <p className="px-4 py-8 text-sm text-center text-muted-foreground">No sessions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {feed.map((log) => (
                  <li key={log.id}>
                    <Link
                      href={`/clients/${log.client_id}`}
                      onClick={() => setOpen(null)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{clientNameMap[log.client_id] ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{log.sessionName ?? "Session"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {log.rpe != null && (
                          <Badge variant="secondary" className="text-xs">RPE {log.rpe}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{timeAgo(log.completed_at)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Needs attention dialog */}
      <Dialog open={open === "attention"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[80vh] flex flex-col p-0">
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <h2 className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Needs programming
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {attention.length === 0 ? (
              <p className="px-4 py-8 text-sm text-center text-muted-foreground">All clients are covered.</p>
            ) : (
              <ul className="divide-y divide-border">
                {expired.map((c) => (
                  <li key={c.id}>
                    <Link href={`/clients/${c.id}`} onClick={() => setOpen(null)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{c.full_name ?? c.email}</p>
                        <p className="text-xs text-muted-foreground">{c.programName} — expired {c.endDateStr}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Expired</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
                {expiringSoon.map((c) => (
                  <li key={c.id}>
                    <Link href={`/clients/${c.id}`} onClick={() => setOpen(null)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{c.full_name ?? c.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.programName} — {c.daysLeft === 0 ? "expires today" : `${c.daysLeft}d left`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-amber-600 border-amber-400/40 bg-amber-400/10">
                          <Clock className="h-3 w-3 mr-1" />{c.daysLeft}d left
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
                {noProgram.map((c) => (
                  <li key={c.id}>
                    <Link href={`/clients/${c.id}`} onClick={() => setOpen(null)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{c.full_name ?? c.email}</p>
                        <p className="text-xs text-muted-foreground">No active program</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-muted-foreground" />
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clients dialog */}
      <Dialog open={open === "clients"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[80vh] flex flex-col p-0">
          <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Clients
            </h2>
            <Link
              href="/clients"
              onClick={() => setOpen(null)}
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-border">
              {recentClients.map((c) => (
                <li key={c.id}>
                  <Link href={`/clients/${c.id}`} onClick={() => setOpen(null)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                        {(c.full_name ?? c.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.full_name ?? "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
