import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Wordmark } from "@/components/wordmark";

// Audit F5 — login/signup/check-inbox are transactional, not search-worthy.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className="ap-site flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16"
    >
      <Link href="/" className="inline-flex rounded-md [--wordmark-size:1.7rem]" aria-label="ConnectAble home">
        <Wordmark />
      </Link>
      <Card className="w-full max-w-lg">
        <CardContent className="p-6 sm:p-8">{children}</CardContent>
      </Card>
    </main>
  );
}
