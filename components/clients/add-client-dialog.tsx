"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addClient } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export function AddClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await addClient(name, email, password);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${name} added as a client.`);
        setOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ size: "sm" }))}>
        <UserPlus className="mr-2 h-4 w-4" /> Add client
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="client-name">Full name</Label>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">Email</Label>
            <Input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-password">Temporary password</Label>
            <Input id="client-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding…" : "Add client"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
