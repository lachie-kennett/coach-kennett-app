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
import { UserPlus, Check, Mail } from "lucide-react";
import { toast } from "sonner";

type Added = { name: string; email: string; password: string; emailed: boolean };

export function AddClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Added | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await addClient(name, email);
      if (result.error) {
        toast.error(result.error);
      } else {
        setAdded({ name: name.trim(), email: email.trim().toLowerCase(), password: result.password ?? "", emailed: !!result.emailed });
        toast.success(`${name.trim()} added as a client.`);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setName("");
    setEmail("");
    setAdded(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger className={cn(buttonVariants({ size: "sm" }))}>
        <UserPlus className="mr-2 h-4 w-4" /> Add client
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{added ? "Client added" : "Add client"}</DialogTitle>
        </DialogHeader>

        {added ? (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 text-sm">
              {added.emailed ? (
                <>
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span>Onboarding email sent to <span className="font-medium">{added.email}</span>.</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{added.name} added. Email isn&rsquo;t set up yet — send them these details:</span>
                </>
              )}
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Login:</span> coach-kennett-app.vercel.app</p>
              <p><span className="text-muted-foreground">Email:</span> {added.email}</p>
              <p><span className="text-muted-foreground">Password:</span> <span className="font-medium">{added.password}</span></p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Add another</Button>
              <Button className="flex-1" onClick={() => { setOpen(false); reset(); }}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="client-name">Full name</Label>
              <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" />
            </div>
            <p className="text-xs text-muted-foreground">
              Their password is set automatically to their name (e.g. JaneSmith). They can change it later under Profile.
            </p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Adding…" : "Add client"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
