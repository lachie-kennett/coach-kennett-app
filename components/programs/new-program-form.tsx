"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProgram } from "@/lib/actions/programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function NewProgramForm({
  clientId,
}: {
  clientId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const { id } = await createProgram({
        name,
        description: description || null,
        clientId,
      });
      toast.success("Program created");
      router.push(`/programs/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create program");
      setLoading(false);
    }
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
