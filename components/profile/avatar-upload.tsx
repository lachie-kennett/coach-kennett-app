"use client";

import { useRef, useState, useTransition } from "react";
import { uploadAvatar } from "@/lib/actions/profile";
import { toast } from "sonner";
import { Camera } from "lucide-react";

interface AvatarUploadProps {
  currentUrl: string | null;
  name: string;
}

export function AvatarUpload({ currentUrl, name }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const initial = (name ?? "?")[0].toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const formData = new FormData();
    formData.append("avatar", file);

    startTransition(async () => {
      const result = await uploadAvatar(formData);
      if (result.error) {
        toast.error(result.error);
        setPreviewUrl(currentUrl);
      } else if (result.url) {
        setPreviewUrl(result.url);
        toast.success("Profile photo updated");
      }
    });
  }

  return (
    <div className="relative w-fit">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        aria-label="Change profile photo"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-primary">{initial}</span>
        )}
        {/* Hover overlay */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-5 w-5 text-white" />
        </span>
        {isPending && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
