#!/usr/bin/env bash
# Masters a rendered video's audio in place: brick-wall limiter at about -2 dBFS so stacked SFX never clip.
# Usage: npm run master -- out/<Id>.mp4
set -euo pipefail
in="$1"
tmp="${in%.mp4}.mastering.mp4"
ffmpeg -v error -y -i "$in" -c:v copy -af "alimiter=limit=0.79:attack=3:release=60:level=disabled" -c:a aac -b:a 192k "$tmp"
mv "$tmp" "$in"
ffmpeg -hide_banner -i "$in" -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume" | sed 's/.*\] //'
