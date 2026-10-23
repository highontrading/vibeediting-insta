#!/usr/bin/env bash
# Masters a rendered video's audio in place: brick-wall limiter so stacked SFX never clip.
# The AAC encoder can overshoot the limiter by ~2-3 dB on sharp transients, so the encoded
# true peak (ebur128, 4x oversampled) is measured and the ceiling lowered until it is <= -1 dBTP.
# Usage: npm run master -- out/<Id>.mp4
set -euo pipefail
in="$1"
tmp="${in%.mp4}.mastering.mp4"
src="${in%.mp4}.premaster.mp4"
cp "$in" "$src"
truepeak() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | awk '/True peak:/{f=1} f&&/Peak:/{print $2; exit}'; }
ceiling=-2.0
for attempt in 1 2 3 4 5; do
  limit=$(python3 -c "print(round(10 ** ($ceiling / 20), 4))")
  ffmpeg -v error -y -i "$src" -c:v copy -af "alimiter=limit=$limit:attack=3:release=60:level=disabled" -c:a aac -b:a 192k "$tmp"
  peak=$(truepeak "$tmp")
  echo "ceiling ${ceiling} dB → encoded true peak ${peak} dBTP"
  if python3 -c "import sys; sys.exit(0 if $peak <= -1.0 else 1)"; then break; fi
  ceiling=$(python3 -c "print(round($ceiling - ($peak + 1.0) - 0.3, 2))")
done
mv "$tmp" "$in"
rm -f "$src"
ffmpeg -hide_banner -i "$in" -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume" | sed 's/.*\] //'
echo "true peak: $(truepeak "$in") dBTP"
