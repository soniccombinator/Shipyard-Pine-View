"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ViewMediaButton } from "@/components/media/view-media-button";
import { removeWorkMedia, uploadWorkMedia } from "@/lib/profile/work-media-actions";

/**
 * A short photo or video of someone actually doing similar work -- entirely
 * optional, but a lot more convincing to an employer than a written
 * description alone. Uploads straight to the private "videos" bucket (see
 * src/lib/profile/work-media-actions.ts); nothing here is ever public --
 * an employer can only view it through the signed-url route, and only for
 * a candidate they actually have a match with.
 */
export function WorkMediaUpload({ videoPath }: { videoPath: string | null }) {
  const [pending, startTransition] = useTransition();
  const [hasFile, setHasFile] = useState(Boolean(videoPath));
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadWorkMedia(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.success ?? "Uploaded.");
      setHasFile(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeWorkMedia();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setHasFile(false);
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Show your work</h2>
      <p className="text-sm text-muted-foreground">
        Optional: a short video or photo of you doing similar work. Employers only see this if you&apos;re a match for
        their job -- it&apos;s never public.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={pending}>
          {pending ? "Uploading…" : hasFile ? "Replace" : "Upload a photo or video"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload a photo or video of your work"
        />
        {hasFile && videoPath && (
          <>
            <ViewMediaButton bucket="videos" path={videoPath}>
              View what&apos;s on file
            </ViewMediaButton>
            <Button type="button" variant="outline" onClick={handleRemove} disabled={pending}>
              Remove
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
