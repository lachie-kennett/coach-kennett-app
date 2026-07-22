"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAssistant, assignClientToAssistant, unassignClientFromAssistant } from "@/lib/actions/assistants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UserPlus, X, Check, Mail } from "lucide-react";
import { toast } from "sonner";

type Client = { id: string; name: string };
type Assistant = { id: string; name: string; email: string; clientIds: string[] };

function AddAssistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<{ name: string; email: string; password: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await addAssistant(name, email);
    setLoading(false);
    if (res.error) { toast.error(res.error); return; }
    setAdded({ name: name.trim(), email: email.trim().toLowerCase(), password: res.password ?? "" });
    toast.success(`${name.trim()} added as an assistant`);
    router.refresh();
  }

  function reset() { setName(""); setEmail(""); setAdded(null); }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger className={cn(buttonVariants({ size: "sm" }))}>
        <UserPlus className="mr-2 h-4 w-4" /> Add assistant
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{added ? "Assistant added" : "Add assistant coach"}</DialogTitle></DialogHeader>
        {added ? (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>{added.name} added. Send them these details:</span>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Login:</span> coach-kennett-app.vercel.app</p>
              <p><span className="text-muted-foreground">Email:</span> {added.email}</p>
              <p><span className="text-muted-foreground">Password:</span> <span className="font-medium">{added.password}</span></p>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Now assign them clients below — they&rsquo;ll only see and manage those.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Add another</Button>
              <Button className="flex-1" onClick={() => { setOpen(false); reset(); }}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="a-name">Full name</Label>
              <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jordan Lee" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-email">Email</Label>
              <Input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jordan@email.com" />
            </div>
            <p className="text-xs text-muted-foreground">
              Their password is set to their name (e.g. JordanLee). They can change it later under Profile.
            </p>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Adding…" : "Add assistant"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssistantCard({ assistant, clients }: { assistant: Assistant; clients: Client[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const assigned = clients.filter((c) => assistant.clientIds.includes(c.id));
  const unassigned = clients.filter((c) => !assistant.clientIds.includes(c.id));

  async function assign(clientId: string) {
    setBusy(true);
    const res = await assignClientToAssistant(assistant.id, clientId);
    setBusy(false);
    if (res.error) { toast.error(res.error); return; }
    router.refresh();
  }
  async function unassign(clientId: string) {
    setBusy(true);
    const res = await unassignClientFromAssistant(assistant.id, clientId);
    setBusy(false);
    if (res.error) { toast.error(res.error); return; }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{assistant.name}</CardTitle>
        <p className="text-xs text-muted-foreground">{assistant.email} · {assigned.length} client{assigned.length !== 1 ? "s" : ""}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {assigned.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {assigned.map((c) => (
              <span key={c.id} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                {c.name}
                <button type="button" onClick={() => unassign(c.id)} disabled={busy} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No clients assigned yet.</p>
        )}
        {unassigned.length > 0 && (
          <Select value="" onValueChange={(v) => v && assign(v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Assign a client…" />
            </SelectTrigger>
            <SelectContent>
              {unassigned.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamManager({ assistants, clients }: { assistants: Assistant[]; clients: Client[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {assistants.length} assistant{assistants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddAssistant />
      </div>

      {assistants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No assistant coaches yet. Add one, then assign them the clients they should manage.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assistants.map((a) => (
            <AssistantCard key={a.id} assistant={a} clients={clients} />
          ))}
        </div>
      )}
    </div>
  );
}
