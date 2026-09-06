-- The "videos" bucket only allowed video mime types, but a short photo of
-- someone doing the work is just as credible as a video and much easier for
-- some people to produce -- allow images in the same bucket rather than
-- stand up a second one. video_path stays the column name; it now means
-- "work media path" (a photo or a video), not video-only.
update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
where id = 'videos';
