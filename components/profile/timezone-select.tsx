"use client";

import { useState, useTransition } from "react";
import { updateTimezone } from "@/lib/actions/profile";
import { toast } from "sonner";

const TIMEZONES = [
  { label: "Melbourne / Sydney (AEST)", value: "Australia/Melbourne" },
  { label: "Brisbane (AEST, no DST)", value: "Australia/Brisbane" },
  { label: "Adelaide (ACST)", value: "Australia/Adelaide" },
  { label: "Darwin (ACST, no DST)", value: "Australia/Darwin" },
  { label: "Perth (AWST)", value: "Australia/Perth" },
  { label: "Auckland (NZST)", value: "Pacific/Auckland" },
  { label: "Singapore / KL (SGT)", value: "Asia/Singapore" },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "New York (ET)", value: "America/New_York" },
  { label: "Los Angeles (PT)", value: "America/Los_Angeles" },
  { label: "UTC", value: "UTC" },
];

export function TimezoneSelect({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const [isPending, startTransition] = useTransition();

  function handleChange(tz: string) {
    setValue(tz);
    startTransition(async () => {
      const result = await updateTimezone(tz);
      if (result.error) {
        toast.error(result.error);
        setValue(current);
      } else {
        toast.success("Timezone updated");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="timezone" className="text-sm font-medium">Timezone</label>
      <select
        id="timezone"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
    </div>
  );
}
