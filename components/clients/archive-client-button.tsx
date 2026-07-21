"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setClientArchived } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

export function ArchiveClientButton({
  clientId,
  name,
  archived,
}: {
  clientId: string;
  name: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!archived && !confirm(`Archive ${name}? They'll lose access to the app immediately, but their account and data are kept. You can restore them anytime.`)) {
      return;
    }
    setLoading(true);
    const result = await setClientArchived(clientId, !archived);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(archived ? `${name} restored — access re-enabled.` : `${name} archived — access removed.`);
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handle}
      disabled={loading}
      className={archived ? "" : "text-destructive hover:text-destructive"}
    >
      {archived ? (
        <><ArchiveRestore className="mr-1.5 h-4 w-4" /> Restore</>
      ) : (
        <><Archive className="mr-1.5 h-4 w-4" /> Archive</>
      )}
    </Button>
  );
}
