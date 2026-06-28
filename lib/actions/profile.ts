"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateTimezone(timezone: string): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ timezone } as never)
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/settings");
  return {};
}

export async function uploadAvatar(formData: FormData): Promise<{ error?: string; url?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) return { error: "No file selected" };
  if (file.size > 5 * 1024 * 1024) return { error: "Image must be under 5MB" };
  if (!file.type.startsWith("image/")) return { error: "File must be an image" };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}.${ext}`;
  const bytes = await file.arrayBuffer();

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = admin.storage.from("avatars").getPublicUrl(path);
  // Append version to bust browser cache on re-upload
  const url = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/profile");
  return { url };
}
