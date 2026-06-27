"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function NewProgramForm({ coachId }: { coachId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("programs")
      .insert({ coach_id: coachId, name, description: description || null })
      .select("id")
      .single();

    if (error || !data) {
      toast.error("Failed to create program");
      setLoading(false);
      return;
    }

    toast.success("Program created");
    router.push(`/programs/${data.id}`);
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prog-name">Program name</Label>
        <Input
          id="prog-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. 12-Week Strength Block"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prog-desc">Description (optional)</Label>
        <Textarea
          id="prog-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Program overview, goals, etc."
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating…" : "Create program"}
      </Button>
    </form>
  );
}
