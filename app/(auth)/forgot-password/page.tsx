"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-offwhite.svg" alt="Coach Kennett" className="w-44" />
      </div>

      {sent ? (
        <div className="text-center space-y-3">
          <p className="text-base font-semibold">Check your email</p>
          <p className="text-sm text-muted-foreground">
            We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
            It may take a minute to arrive.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted-foreground text-center">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
