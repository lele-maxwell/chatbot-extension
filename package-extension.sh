#!/bin/bash

# Extension Packaging Script for MaxAiChat
echo "Packaging MaxAiChat extension for distribution..."

# Create a temporary directory for packaging
mkdir -p dist

# Copy all required files
echo "Copying required files..."

# Core extension files
cp manifest.json dist/
cp popup.html dist/
cp popup.js dist/
cp output.css dist/
cp settings.html dist/
cp settings.js dist/

# Icons
mkdir -p dist/icons
cp icons/icon128.png dist/icons/
cp icons/icon1285.png dist/icons/

# Create the ZIP file
echo "Creating ZIP package..."
cd dist
zip -r ../chatbot-extension.zip . -x "*.DS_Store" "*/node_modules/*" "*.git*" "*.md" "*.lock" "*.config.js" "*.css.map"

# Clean up
cd ..
rm -rf dist

echo "Package created: chatbot-extension.zip"
echo "Files included:"
echo "- manifest.json"
echo "- popup.html"
echo "- popup.js"
echo "- output.css"
echo "- settings.html"
echo "- settings.js"
echo "- icons/icon128.png"
echo "- icons/icon1285.png"

echo "Ready for upload to Add-on Developer Hub!" 