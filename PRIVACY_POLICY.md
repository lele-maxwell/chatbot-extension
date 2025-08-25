# Privacy Policy for MaxAiChat (Chrome/Firefox Extension)

**Last updated:** August 2025  
**Extension:** MaxAiChat  
**Developer:** Maxwell  
**GitHub:** https://github.com/lele-maxwell/chatbot-extension

## Overview

MaxAiChat is a browser extension (Chrome and Firefox) that provides AI-powered chat with optional page context, voice input, and text-to-speech. This policy explains how we handle data and protect your privacy.

## Data Collection

### What We Collect

**We DO NOT collect, store, or transmit any personal data to our servers.** We do not run analytics or ads.

The extension operates locally in your browser and only communicates with the AI service you configure.

### What We Store Locally

The extension stores the following data locally in your browser:

- **API Configuration**: Your OpenAI‑compatible API endpoint and key (stored in `chrome.storage.local`/`browser.storage.local`)
- **Settings**: Preferences for language/TTS and interface options
- **Conversation Context**: Recent messages shown in the popup (in‑memory; optionally persisted if implemented)
- **Page Content (optional)**: Text from the current tab only when you enable “Include Page.” It is processed locally and may be sent to your configured AI endpoint only after you submit a prompt.

## Data Usage

### How Your Data is Used

1. **API Communication**: Your prompts and the scraped page text (if you enabled it) are sent to the AI service you configure (e.g., OpenAI‑compatible providers). The API key is included only to authenticate your request.
2. **Voice Processing**: Voice input is processed by your browser's speech recognition API
3. **Text-to-Speech**: AI responses are converted to speech using your browser's TTS capabilities
4. **Page Analysis**: When enabled, we read the visible text (title and body) of the active tab to provide context. We do not access chrome:// pages or other restricted schemes.

### Third-Party Services

- **AI Service Providers**: Your messages are sent only to the AI endpoint you configure.
- **Browser APIs**: We use your browser's built-in speech recognition and text-to-speech APIs
- **No Other Third Parties**: We do not share data with any other third-party services

## Data Security

### Protection Measures

- **Local Storage**: Settings and API credentials are stored locally in your browser’s extension storage
- **HTTPS Only**: All API communications use encrypted HTTPS connections
- **No Server Storage**: We do not maintain any servers that store your data
- **API Key Security**: Your API keys are stored securely in browser storage

### Your Responsibilities

- **API Key Management**: You are responsible for keeping your API keys secure
- **Service Provider Privacy**: Review the privacy policies of your chosen AI service provider
- **Browser Security**: Ensure your browser and system are kept up to date

## Data Retention

### Local Data

- **Chat History (if stored)**: Until you clear browser data or uninstall the extension
- **Settings**: Until you change them or uninstall the extension
- **API Configuration**: Until you update or remove it

### No Server Retention

We do not maintain any servers or databases that store your data.

## Your Rights

### Data Control

- **Access**: All your data is stored locally and accessible through browser developer tools
- **Deletion**: Clear all data by uninstalling the extension or clearing browser storage
- **Export**: You can export your chat history through browser storage inspection
- **Modification**: Update your settings and API configuration at any time

### Opt-Out

- **Disable Features**: Turn off voice input, TTS, or page analysis in settings
- **Uninstall**: Remove the extension to delete all local data
- **API Access**: Stop using the extension to cease API communications

## Children's Privacy

This extension is not intended for children under 13. We do not knowingly collect personal information from children under 13.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted in the GitHub repository and reflected in the extension's documentation.

## Contact Information

If you have questions about this privacy policy or our data practices:

- **GitHub Issues**: https://github.com/lele-maxwell/chatbot-extension/issues
- **Repository**: https://github.com/lele-maxwell/chatbot-extension

## Compliance

This extension complies with:
- **GDPR**: European data protection regulations
- **CCPA**: California Consumer Privacy Act
- **Chrome Web Store Developer Program Policies**: data safety, permissions, and user transparency
- **Firefox Add‑on Policies**: Mozilla’s privacy and security requirements

## Legal Basis

Our legal basis for processing your data is:
- **Consent**: You choose to install and use the extension
- **Legitimate Interest**: Providing the requested AI chat functionality
- **Contract**: Your agreement to use the extension with your chosen AI service

---

**By using MaxAiChat, you agree to this privacy policy. If you do not agree, please do not use the extension.** 