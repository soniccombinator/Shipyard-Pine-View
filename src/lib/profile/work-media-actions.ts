"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

const WORK_MEDIA_EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads a short photo or video of the person actually doing the kind of
 * work they're looking for -- optional, but a real look at someone doing
 * the job is a lot more convincing to an employer than a written
 * description alone. Stored in the same private "videos" bucket the
 * database already had a video_path column for; that column now means
 * "work media path" (a photo or a video), not video-only -- see the
 * migration that widened the bucket's allowed mime types.
 */
export async function uploadWorkMedia(formData: FormData): Promise<{ error?: string; success?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file received." };

  const ext = WORK_MEDIA_EXT_BY_MIME[file.type];
  if (!ext) return { error: "Please upload an mp4/webm/mov video or a jpeg/png/webp photo." };

  const { userId } = await requireRole("employee");
  const supabase = await createClient();
  const path = `${userId}/work.${ext}`;
  const { error: uploadError } = await supabase.storage.from("videos").upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) return { error: "We couldn't upload that file. Please try again." };

  const { error: dbError } = await supabase.from("employee_profiles").update({ video_path: path }).eq("user_id", userId);
  if (dbError) return { error: "Uploaded, but couldn't save it to your profile. Please try again." };

  revalidatePath("/app/profile");
  return { success: "Uploaded." };
}

export async function removeWorkMedia(): Promise<{ error?: string; success?: string }> {
  const { userId } = await requireRole("employee");
  const supabase = await createClient();
  const { data } = await supabase.from("employee_profiles").select("video_path").eq("user_id", userId).maybeSingle();
  const path = data?.video_path as string | null | undefined;
  if (path) await supabase.storage.from("videos").remove([path]);
  const { error } = await supabase.from("employee_profiles").update({ video_path: null }).eq("user_id", userId);
  if (error) return { error: "We couldn't remove that. Please try again." };
  revalidatePath("/app/profile");
  return { success: "Removed." };
}
