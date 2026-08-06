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
  lastSeen: string;
};

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
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                      {(client.name || client.email)[0].toUpperCase()}
                    </div>
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {(client.name || client.email)[0].toUpperCase()}
                    </div>
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
