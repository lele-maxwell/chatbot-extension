#!/bin/bash

# Script to create styled icons with green background and rounded corners
# This script requires ImageMagick to be installed

echo "Creating styled icons for MaxAiChat..."

# Create output directory
mkdir -p styled-icons

# Define the green color (matching the CSS variable)
GREEN_COLOR="#7ED957"

# Create 48x48 icon
convert icons/icon128.png -resize 48x48 -background "$GREEN_COLOR" -gravity center -extent 48x48 \
    -fill "$GREEN_COLOR" -draw "roundrectangle 0,0 48,48 8,8" \
    styled-icons/icon48.png

# Create 96x96 icon  
convert icons/icon128.png -resize 96x96 -background "$GREEN_COLOR" -gravity center -extent 96x96 \
    -fill "$GREEN_COLOR" -draw "roundrectangle 0,0 96,96 16,16" \
    styled-icons/icon96.png

# Create 128x128 icon
convert icons/icon128.png -resize 128x128 -background "$GREEN_COLOR" -gravity center -extent 128x128 \
    -fill "$GREEN_COLOR" -draw "roundrectangle 0,0 128,128 20,20" \
    styled-icons/icon128.png

echo "Styled icons created in styled-icons/ directory"
echo "You can now update manifest.json to use these new icons" 