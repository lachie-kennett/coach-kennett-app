"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type LeaderEntry = { clientId: string; name: string; avatarUrl: string | null; score: number };
export type Board = { key: string; title: string; unit: string; entries: LeaderEntry[] };

const MEDALS = ["🥇", "🥈", "🥉"];

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-primary">{name[0]?.toUpperCase() ?? "?"}</span>
      )}
    </div>
  );
}

function Row({ entry, rank, unit, isViewer }: { entry: LeaderEntry; rank: number; unit: string; isViewer: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", isViewer && "bg-primary/5")}>
      <span className="w-6 shrink-0 text-center text-sm">
        {rank <= 3 ? MEDALS[rank - 1] : <span className="text-muted-foreground font-medium">{rank}</span>}
      </span>
      <Avatar name={entry.name} avatarUrl={entry.avatarUrl} />
      <span className="flex-1 text-sm font-medium truncate">
        {entry.name}
        {isViewer && <span className="ml-1.5 text-xs text-primary font-normal">(you)</span>}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-right">
        {entry.score} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </span>
    </div>
  );
}

export function LeaderboardView({ boards, viewerId }: { boards: Board[]; viewerId: string }) {
  const [key, setKey] = useState(boards[0]?.key ?? "");
  const board = boards.find((b) => b.key === key) ?? boards[0];
  const entries = board?.entries ?? [];
  const top = entries.slice(0, 10);
  const viewerIdx = entries.findIndex((e) => e.clientId === viewerId);
  const viewerInTop = viewerIdx >= 0 && viewerIdx < 10;

  return (
    <div className="space-y-3">
      <Select value={key} onValueChange={(v) => v && setKey(v)}>
        <SelectTrigger className="w-full">
          <SelectValue>{(value: string) => boards.find((b) => b.key === value)?.title ?? "Leaderboard"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {boards.map((b) => (
            <SelectItem key={b.key} value={b.key}>{b.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {top.map((entry, idx) => (
                <Row
                  key={entry.clientId}
                  entry={entry}
                  rank={idx + 1}
                  unit={board.unit}
                  isViewer={entry.clientId === viewerId}
                />
              ))}
              {/* Show the viewer their own standing if they're outside the top 10 */}
              {!viewerInTop && viewerIdx >= 0 && (
                <>
                  <div className="px-4 py-1 text-center text-xs text-muted-foreground">···</div>
                  <Row
                    entry={entries[viewerIdx]}
                    rank={viewerIdx + 1}
                    unit={board.unit}
                    isViewer
                  />
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
