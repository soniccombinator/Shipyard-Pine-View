"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { firstFieldErrors, friendlyAuthError, logInSchema, signUpSchema, type FormState } from "./schemas";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Only allow same-site relative paths as post-login targets. */
function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error) };
  const { email, password, full_name, role } = parsed.data;

  // Employees and employers each get a guided setup at /onboarding (it
  // branches by role -- see src/app/onboarding/page.tsx). There's no
  // mentor onboarding yet, so mentors go straight to their dashboard.
  const postSignupPath = role === "mentor" ? "/app" : "/onboarding";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, role },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${postSignupPath}`,
    },
  });
  if (error) return { error: friendlyAuthError(error.message) };

  // With email confirmation off the user is signed in immediately.
  if (data.session) redirect(postSignupPath);
  redirect(`/check-inbox?email=${encodeURIComponent(email)}`);
}

export async function logIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = logInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendlyAuthError(error.message) };

  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
