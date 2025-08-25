#!/usr/bin/env bash
set -euo pipefail

# Create a minimal static site for hosting the privacy policy on Netlify.
# It copies privacy-policy.html to policy-site/index.html and creates a ZIP.

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
SRC_HTML="$ROOT_DIR/privacy-policy.html"
SITE_DIR="$ROOT_DIR/policy-site"
ZIP_FILE="$ROOT_DIR/policy-site.zip"

if [[ ! -f "$SRC_HTML" ]]; then
  echo "privacy-policy.html not found in project root" >&2
  exit 1
fi

rm -rf "$SITE_DIR" "$ZIP_FILE"
mkdir -p "$SITE_DIR"

# Copy policy as index.html so it serves at the site root
cp "$SRC_HTML" "$SITE_DIR/index.html"

# Optional: basic security headers via Netlify config
cat > "$SITE_DIR/netlify.toml" << 'EOF'
[[headers]]
  for = "/index.html"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    Referrer-Policy = "no-referrer-when-downgrade"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
EOF

# Create a small README to remind deployment steps
cat > "$SITE_DIR/README.txt" << 'EOF'
Netlify deployment (drag & drop):
1) Go to https://app.netlify.com/drop
2) Drag the contents of this folder (policy-site) or upload the ZIP built alongside it.
3) After deploy, click Site settings -> Change site name (e.g., maxaichat-privacy).
4) Your public URL will be: https://<site-name>.netlify.app/

The privacy policy is served at the root (index.html).
EOF

# Zip for easy upload
(
  cd "$SITE_DIR"
  zip -r -q policy-site.zip .
  mv policy-site.zip "$ROOT_DIR/policy-site.zip"
)

echo "Created: $SITE_DIR and $ROOT_DIR/policy-site.zip"
echo "Deploy via Netlify Drop: https://app.netlify.com/drop (upload policy-site.zip)"


