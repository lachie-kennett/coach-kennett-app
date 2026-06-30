"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Token arrives in the URL hash: #access_token=...&type=recovery
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const type = params.get("type");
    if (token && type === "recovery") {
      setAccessToken(token);
    } else {
      setInvalid(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (!accessToken) return;
    setLoading(true);
    const result = await resetPassword(accessToken, newPassword);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Password updated — please sign in");
      router.push("/login");
    }
  }

  if (invalid) {
    return (
      <div className="w-full max-w-sm text-center space-y-3">
        <p className="text-base font-semibold">Invalid or expired link</p>
        <p className="text-sm text-muted-foreground">
          This reset link has expired or already been used.
        </p>
        <a href="/forgot-password" className="inline-block mt-2 text-sm text-primary hover:underline">
          Request a new link
        </a>
      </div>
    );
  }

  if (!accessToken) {
    return null; // Still reading hash
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-offwhite.svg" alt="Coach Kennett" className="w-44" />
        <p className="text-sm text-muted-foreground">Set your new password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !newPassword || !confirm}
        >
          {loading ? "Updating…" : "Set new password"}
        </Button>
      </form>
    </div>
  );
}
