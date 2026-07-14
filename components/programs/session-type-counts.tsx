import { cn } from "@/lib/utils";
import { SESSION_TYPES, sessionTypeClass, type SessionType } from "@/lib/session-types";

// Counts how many sessions of each type appear in a program and renders them
// as colour-coded pills, ordered by the canonical session-type order. Server-
// safe (no client hooks). Returns null when nothing is typed.
export function SessionTypeCounts({
  types,
  className,
}: {
  types: (string | null | undefined)[];
  className?: string;
}) {
  const counts = new Map<string, number>();
  for (const t of types) {
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  const rank = (t: string) => {
    const i = SESSION_TYPES.indexOf(t as SessionType);
    return i === -1 ? SESSION_TYPES.length : i;
  };
  const ordered = [...counts.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {ordered.map(([type, count]) => (
        <div
          key={type}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
            sessionTypeClass(type)
          )}
        >
          <span className="font-medium capitalize">{type}</span>
          <span className="font-bold tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  );
}
