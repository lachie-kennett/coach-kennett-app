import { cn } from "@/lib/utils";
import { sessionTypeClass } from "@/lib/session-types";

// Server-safe (no client hooks) so it can render in server components.
export function SessionTypeBadge({
  type,
  className,
}: {
  type: string | null | undefined;
  className?: string;
}) {
  if (!type) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        sessionTypeClass(type),
        className
      )}
    >
      {type}
    </span>
  );
}
