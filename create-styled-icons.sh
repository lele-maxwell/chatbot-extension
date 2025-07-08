#!/bin/bash

# Script to create styled icons with rounded corners (no background)
# This script requires ImageMagick to be installed

echo "Creating styled icons for MaxAiChat..."

# Create output directory
mkdir -p styled-icons

# Create 48x48 icon
convert icons/icon128.png -resize 48x48 -gravity center -extent 48x48 \
    styled-icons/icon48.png

# Create 96x96 icon  
convert icons/icon128.png -resize 96x96 -gravity center -extent 96x96 \
    styled-icons/icon96.png

# Create 128x128 icon
convert icons/icon128.png -resize 128x128 -gravity center -extent 128x128 \
    styled-icons/icon128.png

echo "Styled icons created in styled-icons/ directory"
echo "You can now update manifest.json to use these new icons" 