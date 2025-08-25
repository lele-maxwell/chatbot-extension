#!/usr/bin/env bash

# Resize images to Chrome Web Store requirements without distortion.
# Requires ImageMagick (convert or magick).
#
# Usage examples:
#   ./resize-webstore.sh screenshot.jpg            # produce all sizes
#   ./resize-webstore.sh screenshot.jpg --dark     # dark padding
#   ./resize-webstore.sh input.png --only banner   # only banner
#
# Outputs are written to assets/webstore/

set -euo pipefail

INPUT=""
THEME="light"
ONLY=""

# Parse args in any order: [--dark] [--only value] <input>
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dark)
      THEME="dark"; shift ;;
    --only)
      ONLY="${2:-}"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--dark] [--only screenshot|small|banner] <input-image>"; exit 0 ;;
    *)
      # first non-flag token is the input path
      if [[ -z "$INPUT" ]]; then INPUT="$1"; else break; fi; shift ;;
  esac
done

if [[ -z "$INPUT" || ! -f "$INPUT" ]]; then
  echo "Usage: $0 [--dark] [--only screenshot|small|banner] <input-image>" >&2
  exit 1
fi

mkdir -p assets/webstore

# Pick background color
BG="#FFFFFF"
[[ "$THEME" == "dark" ]] && BG="#0F172A"

# Detect ImageMagick command
IM_CMD="convert"
command -v magick >/dev/null 2>&1 && IM_CMD="magick"

do_screenshot() {
  $IM_CMD "$INPUT" -background "$BG" -resize 1280x800^ -gravity center -extent 1280x800 -strip -quality 88 assets/webstore/screenshot-1280x800.jpg
}

do_small() {
  $IM_CMD "$INPUT" -background "$BG" -resize 440x280^ -gravity center -extent 440x280 -strip -quality 90 assets/webstore/promo-440x280.jpg
}

do_banner() {
  $IM_CMD "$INPUT" -background "$BG" -resize 1400x560^ -gravity center -extent 1400x560 -strip -quality 90 assets/webstore/promo-1400x560.jpg
}

case "$ONLY" in
  screenshot) do_screenshot ;;
  small) do_small ;;
  banner) do_banner ;;
  "") do_screenshot; do_small; do_banner ;;
  *) echo "Unknown --only value: $ONLY" >&2; exit 1 ;;
esac

echo "Done. Files in assets/webstore/:"
ls -la assets/webstore | sed -e 's/^/  /'


