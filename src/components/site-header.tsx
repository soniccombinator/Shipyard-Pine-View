import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="inline-flex rounded-md [--wordmark-size:1.15rem]" aria-label="ConnectAble home">
          <Wordmark />
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="lg" className="rounded-full" render={<Link href="/about" />}>
            About
          </Button>
          <Button variant="outline" size="lg" className="rounded-full" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button
            size="lg"
            className="rounded-full bg-coral-strong text-coral-strong-foreground shadow-[var(--ap-shadow-md)] hover:bg-coral-strong/90"
            render={<Link href="/signup" />}
          >
            Get started
          </Button>
        </div>
      </nav>
    </header>
  );
}
