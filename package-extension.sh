#!/bin/bash

# Extension Packaging Script for MaxAiChat
echo "Packaging MaxAiChat extension for distribution..."

# Create distribution package
zip -r chatbot-extension.zip \
    manifest.json \
    popup.html \
    popup.js \
    output.css \
    settings.html \
    settings.js \
    icons/ \
    styled-icons/ \
    -x "*.DS_Store" "*.git*" "node_modules/*" "*.log"

echo "Package created successfully: chatbot-extension.zip"
echo "Ready for upload to Add-on Developer Hub" 