"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function parseISO(s: string | null): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseISO(value);
  const today = new Date();

  // Month currently displayed in the calendar.
  const [view, setView] = React.useState(() =>
    selected ? { y: selected.y, m: selected.m } : { y: today.getFullYear(), m: today.getMonth() }
  );

  // Re-centre on the selected month whenever the popover opens.
  React.useEffect(() => {
    if (open && selected) setView({ y: selected.y, m: selected.m });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  }
  function nextMonth() {
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  }

  const label = selected
    ? new Date(selected.y, selected.m, selected.d).toLocaleDateString("en-AU", {
        day: "numeric", month: "short", year: "numeric",
      })
    : placeholder;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full justify-start gap-2 font-normal",
          !selected && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0" />
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} className="z-50">
          <Popover.Popup className="rounded-lg border border-border bg-popover p-3 shadow-md outline-none">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium">{MONTHS[view.m]} {view.y}</span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="h-7 text-center text-xs font-medium text-muted-foreground grid place-items-center">
                  {w}
                </div>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <div key={`e${i}`} />;
                const isSelected = selected && selected.y === view.y && selected.m === view.m && selected.d === day;
                const isToday = today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => { onChange(toISO(view.y, view.m, day)); setOpen(false); }}
                    className={cn(
                      "h-8 w-8 rounded-md text-sm grid place-items-center transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-secondary",
                      !isSelected && isToday && "ring-1 ring-primary/50"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
