"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, fieldAria } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth/actions";
import type { FormState } from "@/lib/auth/schemas";

const ROLE_OPTIONS = [
  { value: "employee", label: "I'm looking for a job", hint: "Build your Ability Passport and get matched." },
  { value: "employer", label: "I'm hiring", hint: "Post a role and see candidates ranked by fit." },
] as const;

const initial: FormState = {};

export function SignupForm({ defaultRole }: { defaultRole?: string }) {
  const [state, action, pending] = useActionState(signUp, initial);
  const e = state.fieldErrors ?? {};
  const preset = ROLE_OPTIONS.some((r) => r.value === defaultRole) ? defaultRole : "employee";

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-base font-bold">First, who are you?</legend>
        {ROLE_OPTIONS.map((r) => (
          <label
            key={r.value}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 shadow-[var(--ap-shadow-md)] has-[:checked]:border-green has-[:checked]:bg-green-soft"
          >
            <input type="radio" name="role" value={r.value} defaultChecked={r.value === preset} className="mt-1 size-5 accent-green" />
            <span className="font-bold">{r.label}</span>
            <span className="block text-sm text-muted-foreground">{r.hint}</span>
          </label>
        ))}
        {e.role && <p role="alert" className="text-sm font-bold text-destructive">{e.role}</p>}
      </fieldset>

      <Field id="full_name" label="Your name" error={e.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" {...fieldAria("full_name", { error: e.full_name })} />
      </Field>
      <Field id="email" label="Email" error={e.email}>
        <Input id="email" name="email" type="email" autoComplete="email" {...fieldAria("email", { error: e.email })} />
      </Field>
      <Field id="password" label="Password" hint="At least 8 characters." error={e.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" {...fieldAria("password", { hint: true, error: e.password })} />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:checked]:border-green has-[:checked]:bg-green-soft">
        <input type="checkbox" name="age_confirmed" className="mt-1 size-5 accent-green" />
        <span>I confirm I am 18 years old or older.</span>
      </label>
      {e.age_confirmed && <p role="alert" className="text-sm font-bold text-destructive">{e.age_confirmed}</p>}

      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral-soft p-4 font-bold text-coral-foreground">
          {state.error}
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="font-bold text-green underline">
          terms and conditions
        </Link>{" "}
        and the agreement for your role (
        <Link href="/terms/employee" className="font-bold text-green underline">
          job seeker
        </Link>
        ,{" "}
        <Link href="/terms/employer" className="font-bold text-green underline">
          employer
        </Link>
        ,{" "}
        <Link href="/terms/mentor" className="font-bold text-green underline">
          mentor
        </Link>
        ).
      </p>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating your account…" : "Create my account"}
      </Button>
    </form>
  );
}
