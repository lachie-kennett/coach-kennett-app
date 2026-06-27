"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, CheckCircle, XCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importClients, type ImportRow, type ImportResult } from "@/lib/actions/clients";
import { cn } from "@/lib/utils";

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const rawHeaders = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  const nameIdx = rawHeaders.findIndex(h => h === "name" || h === "full name" || h === "fullname" || h === "client name");
  const firstIdx = rawHeaders.findIndex(h => h.includes("first"));
  const lastIdx = rawHeaders.findIndex(h => h.includes("last"));
  const emailIdx = rawHeaders.findIndex(h => h.includes("email"));
  const phoneIdx = rawHeaders.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("cell"));

  return lines.slice(1)
    .map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));

      let name = "";
      if (nameIdx >= 0) {
        name = cols[nameIdx] ?? "";
      } else if (firstIdx >= 0 || lastIdx >= 0) {
        const first = firstIdx >= 0 ? (cols[firstIdx] ?? "") : "";
        const last = lastIdx >= 0 ? (cols[lastIdx] ?? "") : "";
        name = [first, last].filter(Boolean).join(" ");
      }

      return {
        name: name.trim(),
        email: (cols[emailIdx] ?? "").trim(),
        phone: phoneIdx >= 0 ? (cols[phoneIdx] ?? "").trim() || undefined : undefined,
      };
    })
    .filter(row => row.name || row.email);
}

export default function ImportClientsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportRow[] | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target?.result as string);
      setPreview(rows);
      setResults(null);
      setError(null);
    };
    reader.readAsText(file);
  }

  function reset() {
    setPreview(null);
    setResults(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleImport() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await importClients(preview));
      setPreview(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const created = results?.filter(r => r.status === "created") ?? [];
  const failed = results?.filter(r => r.status !== "created") ?? [];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
      {/* Always-mounted hidden file input */}
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />

      <div className="flex items-center gap-3">
        <Link href="/clients" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Import Clients</h1>
          <p className="text-sm text-muted-foreground">Upload your Trainerize CSV export</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Upload area */}
      {!preview && !results && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Choose your CSV file</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Columns detected automatically — name, email, phone
                </p>
              </div>
              <Button onClick={() => fileRef.current?.click()}>
                Choose file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{preview.length} clients detected</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset}>Cancel</Button>
              <Button size="sm" onClick={handleImport} disabled={loading}>
                {loading ? "Importing…" : `Import ${preview.length} clients`}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Name</th>
                    <th className="px-4 py-2 text-left font-medium">Email</th>
                    <th className="px-4 py-2 text-left font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-4 py-2">{row.name || <span className="text-destructive">missing</span>}</td>
                      <td className="px-4 py-2">{row.email || <span className="text-destructive">missing</span>}</td>
                      <td className="px-4 py-2 text-muted-foreground">{row.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{created.length}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <XCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{failed.length}</p>
                  <p className="text-xs text-muted-foreground">Failed / Skipped</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {created.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Imported — screenshot or copy these passwords to send to clients
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Email</th>
                        <th className="px-4 py-2 text-left font-medium">Phone</th>
                        <th className="px-4 py-2 text-left font-medium">Temp Password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {created.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-4 py-2">{r.name}</td>
                          <td className="px-4 py-2">{r.email}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.phone ?? "—"}</td>
                          <td className="px-4 py-2">
                            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{r.tempPassword}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {failed.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive">Failed / Skipped</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Email</th>
                        <th className="px-4 py-2 text-left font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {failed.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-4 py-2">{r.name}</td>
                          <td className="px-4 py-2">{r.email}</td>
                          <td className="px-4 py-2 text-destructive">{r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Link href="/clients" className={cn(buttonVariants())}>
              Go to Clients
            </Link>
            <Button variant="outline" onClick={reset}>Import Another</Button>
          </div>
        </div>
      )}
    </div>
  );
}
