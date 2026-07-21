import { PauseCircle } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default function PausedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <PauseCircle className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2 max-w-sm">
        <h1 className="text-xl font-bold">Access paused</h1>
        <p className="text-sm text-muted-foreground">
          Your training access has been paused. Your account and history are safe —
          reach out to your coach if you think this is a mistake.
        </p>
      </div>
      <a
        href="https://wa.me/61439816501"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary hover:underline"
      >
        Message your coach
      </a>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">Log out</Button>
      </form>
    </div>
  );
}
