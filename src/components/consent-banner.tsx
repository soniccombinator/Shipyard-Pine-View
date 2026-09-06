"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CONSENT_EVENT, getConsent, setConsent } from "@/lib/consent";

/** Public showcase pages with nothing to type: the draft-saving ask would be noise there. */
const NO_FORM_ROUTES = ["/nick"];

export function hidesConsentBanner(pathname: string | null): boolean {
  return NO_FORM_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`) === true);
}

/**
 * Site-wide, one-time ask: may we save what you type on this device so you
 * don't lose it if the page closes? Rendered once in the root layout. Shows
 * only until a choice is made, then never again (the choice lives in the
 * `connectable.consent` cookie).
 */
export function ConsentBanner() {
  // Assume "decided" during SSR and first paint so nothing flashes; the
  // effect corrects it on the client.
  const [decided, setDecided] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => setDecided(getConsent() !== null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (decided || hidesConsentBanner(pathname)) return null;

  return (
    <div
      role="region"
      aria-label="Save your progress on this device"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          We can save what you type on this device, so you don&apos;t lose it if this page closes. Is that okay?{" "}
          <Link href="/privacy" className="font-bold text-green underline">
            How we handle your information
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" size="lg" className="min-h-11 px-4" onClick={() => setConsent("granted")}>
            Yes, save my progress
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="min-h-11 px-4"
            onClick={() => setConsent("essential")}
          >
            No thanks
          </Button>
        </div>
      </div>
    </div>
  );
}
