"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search } from "lucide-react";

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  lastSeen: string;
};

// First + last initial (e.g. "Jai Sneddon" → "JS"). Falls back to the first
// two letters of a single-word name, or the email's first letter.
function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email[0] ?? "?").toUpperCase();
}

function Avatar({
  name,
  email,
  avatarUrl,
  archived,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  archived?: boolean;
}) {
  const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden text-sm font-semibold";
  if (avatarUrl) {
    return (
      <span className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt={name || email} className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span className={`${base} ${archived ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}>
      {initials(name, email)}
    </span>
  );
}

export function ClientList({
  clients,
  archived,
}: {
  clients: ClientRow[];
  archived: ClientRow[];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const matches = (c: ClientRow) =>
    !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);

  const filteredActive = useMemo(() => clients.filter(matches), [clients, q]);
  const filteredArchived = useMemo(() => archived.filter(matches), [archived, q]);

  const nothing = filteredActive.length === 0 && filteredArchived.length === 0;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="pl-9"
        />
      </div>

      {filteredActive.length > 0 && (
        <div className="space-y-2">
          {filteredActive.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:bg-secondary/30 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={client.name} email={client.email} avatarUrl={client.avatarUrl} />
                    <div>
                      <p className="font-medium">{client.name || "Unnamed"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {client.lastSeen}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {filteredArchived.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground pt-2">
            Archived ({filteredArchived.length})
          </h2>
          {filteredArchived.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="opacity-60 hover:opacity-100 hover:bg-secondary/30 transition-all cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={client.name} email={client.email} avatarUrl={client.avatarUrl} archived />
                    <div>
                      <p className="font-medium">{client.name || "Unnamed"}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">Archived</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {nothing && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No clients match “{query}”.
        </p>
      )}
    </div>
  );
}
