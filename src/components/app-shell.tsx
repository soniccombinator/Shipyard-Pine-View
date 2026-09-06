"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, FilePlus2, Home, IdCard, LogOut, SquarePen, Star, Handshake } from "lucide-react";
import { ROLE_LABELS, RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { signOut } from "@/lib/auth/actions";
import type { CurrentProfile } from "@/lib/data/profile";
import type { Role } from "@/lib/domain";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const NAV: Record<Role, NavItem[]> = {
  employee: [
    { href: "/app", label: "Home", icon: Home },
    { href: "/app/passport", label: "Passport", icon: IdCard },
    { href: "/app/profile", label: "Profile", icon: SquarePen },
    { href: "/app/matches", label: "Matches", icon: Star },
    { href: "/app/commutes", label: "Commutes", icon: Handshake },
  ],
  employer: [
    { href: "/app/employer", label: "Jobs", icon: Briefcase },
    { href: "/app/employer/jobs/new", label: "Post a job", icon: FilePlus2 },
    { href: "/app/commutes", label: "Commutes", icon: Handshake },
  ],
  mentor: [{ href: "/app/mentor", label: "Employees", icon: Home }, { href: "/app/commutes", label: "Commutes", icon: Handshake }],
};

/** Exact match for the section roots, prefix match for everything below them. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/app" || href === "/app/employer") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "•";
}

export function AppShell({ profile, children }: { profile: CurrentProfile; children: React.ReactNode }) {
  const pathname = usePathname();
  const items = NAV[profile.role];
  const home = profile.role === "employer" ? "/app/employer" : "/app";

  return (
    <div className="ap-app flex flex-1 flex-col md:pl-[248px]">
      {/* Desktop: left sidebar */}
      <aside className="ap-sidebar hidden md:flex print:hidden">
        <Link href={home} className="mb-4 inline-flex self-start rounded-md px-2 py-1 [--wordmark-size:1rem]" aria-label="ConnectAble home">
          <Wordmark />
        </Link>
        <nav aria-label="App" className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className="ap-navitem"
              >
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 pt-3">
          <div className="ap-userchip">
            <span className="ap-ava" aria-hidden="true">
              {initials(profile.fullName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{profile.fullName || "You"}</span>
              <span className="block truncate text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</span>
            </span>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full justify-center gap-2">
              <LogOut aria-hidden="true" className="size-4" />
              Log out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile: top bar */}
      <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 md:hidden print:hidden">
        <Link href={home} className="inline-flex rounded-md [--wordmark-size:.95rem]" aria-label="ConnectAble home">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <RoleBadge role={profile.role} />
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-7 pb-28 md:px-10 md:py-10 md:pb-10">
        {children}
      </main>

      {/* Mobile: bottom tab bar */}
      <nav aria-label="App" className="ap-tabbar flex md:hidden print:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="ap-tab"
            >
              <Icon aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
