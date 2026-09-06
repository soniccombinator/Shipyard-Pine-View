import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { authorizeMediaAccess } from "@/lib/media/authorize-media-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_BUCKETS = new Set(["resumes", "videos", "interviews"]);

/**
 * Short-lived signed URL for a private resume/work-media file. See
 * src/lib/media/authorize-media-access.ts for who's allowed to see what;
 * this route only enforces that decision and, once made, uses the
 * service-role client (only place that's true) to actually mint the URL --
 * Storage RLS alone would never let an employer read a candidate's folder.
 */
export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const bucket = req.nextUrl.searchParams.get("bucket");
  const path = req.nextUrl.searchParams.get("path");
  if (!bucket || !path || !ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "bucket and path are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const authorized = await authorizeMediaAccess(supabase, profile, path);
  if (!authorized) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Couldn't create a link to that file. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ url: data.signedUrl });
}
