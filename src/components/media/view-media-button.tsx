"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Opens a private resume/work-media file in a new tab via a short-lived
 * signed URL (see src/app/api/media/signed-url/route.ts) -- the file's
 * Storage path is private, so nothing here ever links to it directly.
 */
export function ViewMediaButton({
  bucket,
  path,
  children,
}: {
  bucket: "resumes" | "videos" | "interviews";
  path: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const res = await fetch(`/api/media/signed-url?bucket=${bucket}&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "We couldn't open that file. Please try again.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("We couldn't open that file. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={open} disabled={loading}>
      {loading ? "Opening…" : children}
    </Button>
  );
}
