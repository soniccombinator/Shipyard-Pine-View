#!/usr/bin/env bash
# Encode the raw 4K "Clips of Nick Working" exports into the files /nick uses.
#   bash scripts/encode-clips.sh "/path/to/Clips of Nick Working"
# Needs ffmpeg + ffprobe on PATH. Re-run whenever a clip is re-exported.
set -euo pipefail

SRC="${1:?usage: encode-clips.sh <folder with the three .mp4 exports>}"
OUT="public/passport/nick"
mkdir -p "$OUT"

# name | source file | filter to run before scaling | poster time (s)
# The vacuuming export is black until 79.5 s. Keep the last 1.25 s and slow it
# to half speed with motion interpolation so it loops like the other two.
CLIPS=(
  "detailing|Clip of Nick Detailing.mp4||1"
  "drill|Clip of Nick Using Drill.mp4||1"
  "vacuuming|Clip of Nick Vacuuming.mp4|trim=start=79.5,setpts=2*(PTS-STARTPTS),|80"
)

for entry in "${CLIPS[@]}"; do
  IFS='|' read -r name file pre poster_at <<<"$entry"
  in="$SRC/$file"
  post=""
  if [ -n "$pre" ]; then post=",minterpolate=fps=24:mi_mode=mci"; fi
  echo "== $name  <-  $file"
  # Looping version: 720p, silent, moov atom first so playback starts early.
  ffmpeg -y -v error -i "$in" -an -vf "${pre}scale=1280:-2${post}" \
    -c:v libx264 -profile:v high -preset slow -crf 23 -pix_fmt yuv420p \
    -movflags +faststart "$OUT/$name.mp4"
  # Modal version: 1080p, silent.
  ffmpeg -y -v error -i "$in" -an -vf "${pre}scale=1920:-2${post}" \
    -c:v libx264 -profile:v high -preset slow -crf 20 -pix_fmt yuv420p \
    -movflags +faststart "$OUT/$name-full.mp4"
  # Poster frame.
  ffmpeg -y -v error -ss "$poster_at" -i "$in" -frames:v 1 -vf "scale=1280:-2" -q:v 4 "$OUT/$name.jpg"
done

echo
printf '%-22s %10s %9s  %s\n' file bytes seconds size
for f in "$OUT"/*.mp4; do
  printf '%-22s %10s %9s  %s\n' "$(basename "$f")" "$(stat -c %s "$f")" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" \
    "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$f")"
done
