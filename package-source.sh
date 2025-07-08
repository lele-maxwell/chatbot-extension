#!/bin/bash

# Source Code Packaging Script for Mozilla Submission
echo "Packaging MaxAiChat source code for Mozilla submission..."

# Create a temporary directory for source code
mkdir -p source-package

# Copy all source files
echo "Copying source files..."

# Core extension files
cp manifest.json source-package/
cp popup.html source-package/
cp popup.js source-package/
cp settings.html source-package/
cp settings.js source-package/

# Build configuration files
cp package.json source-package/
cp tailwind.config.js source-package/
cp postcss.config.js source-package/
cp yarn.lock source-package/

# Icons
mkdir -p source-package/icons
cp icons/icon128.png source-package/icons/
cp icons/icon1285.png source-package/icons/

# Styled icons
mkdir -p source-package/styled-icons
cp styled-icons/icon48.png source-package/styled-icons/
cp styled-icons/icon96.png source-package/styled-icons/
cp styled-icons/icon128.png source-package/styled-icons/

# Scripts
cp package-extension.sh source-package/
cp package-source.sh source-package/
cp create-styled-icons.sh source-package/

# Documentation and legal files
cp README.md source-package/
cp PRIVACY_POLICY.md source-package/
cp privacy-policy.html source-package/

# Create the source code ZIP file
echo "Creating source code ZIP package..."
cd source-package
zip -r ../maxaichat-source-code.zip . -x "*.DS_Store" "*/node_modules/*" "*.git*" "*.css.map" "*.log"

# Clean up
cd ..
rm -rf source-package

echo "Source code package created: maxaichat-source-code.zip"
echo ""
echo "Files included in source package:"
echo "- manifest.json (extension manifest)"
echo "- popup.html (main interface)"
echo "- popup.js (main logic - 710 lines)"
echo "- settings.html (settings page)"
echo "- settings.js (settings logic)"
echo "- package.json (dependencies)"
echo "- tailwind.config.js (Tailwind config)"
echo "- postcss.config.js (PostCSS config)"
echo "- yarn.lock (dependency lock file)"
echo "- icons/ (extension icons)"
echo "- styled-icons/ (styled icons)"
echo "- package-extension.sh (packaging script)"
echo "- package-source.sh (this script)"
echo "- create-styled-icons.sh (icon creation script)"
echo "- README.md (build instructions)"
echo "- PRIVACY_POLICY.md (privacy policy)"
echo "- privacy-policy.html (web version of privacy policy)"
echo ""
echo "Ready for Mozilla source code submission!"
echo ""
echo "Build instructions are in README.md"
echo "Reviewers can run:"
echo "1. yarn install"
echo "2. yarn build"
echo "3. ./package-extension.sh"
echo "4. Load manifest.json in Firefox" 