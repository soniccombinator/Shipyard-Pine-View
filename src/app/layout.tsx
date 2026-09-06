import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Poppins } from "next/font/google";
import { ConsentBanner } from "@/components/consent-banner";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

// Designed by the Braille Institute for low-vision legibility.
const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Typeface of the ConnectAble.work logo (see components/wordmark); nothing else uses it.
const poppins = Poppins({
  weight: ["300", "400", "600"],
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});

// Audit F1: process.env.NEXT_PUBLIC_SITE_URL was falling back to
// http://localhost:3000 in production because .env defines PUBLIC_SITE_URL
// (no NEXT_PUBLIC_ prefix, so Next never inlines it). @/lib/site.SITE_URL
// carries its own https://connectable.work fallback.
export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

// Audit F10 — no explicit viewport/themeColor previously; theme_color below
// is a placeholder, swap for the real green token in globals.css.
export const viewport: Viewport = {
  themeColor: "#1f7a4d",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${atkinson.variable} ${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-yellow focus:px-4 focus:py-2 focus:font-bold focus:text-yellow-foreground"
        >
          Skip to main content
        </a>
        {children}
        <ConsentBanner />
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
