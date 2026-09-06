"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { commuteCommand, type CommuteCommand } from "./model";

export async function saveCommute(
  command: CommuteCommand,
): Promise<{ error?: string }> {
  const parsed = commuteCommand.safeParse(command);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const db = await createClient();
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError || !user) return { error: "Please sign in again." };
  const { error } = await db.rpc("commute_command", { command: parsed.data });
  if (error)
    return {
      error:
        error.code === "40001"
          ? "This ride changed. Refresh to review the latest plan."
          : error.code === "42501"
            ? "You do not have permission for that step. Refresh to check your pairing."
            : error.code === "22023"
              ? "Check the trip times: pickup must be in the future and before arrival."
              : "Could not save. Refresh and try again.",
    };
  revalidatePath("/app", "layout");
  return {};
}
