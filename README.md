# MaxAiChat - Firefox Extension

AI-powered chatbot with voice input, TTS, and conversation memory. Powered by OpenAI-compatible APIs.

## Build Instructions for Mozilla Reviewers

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **Yarn**: Version 1.22.0 or higher (or npm 8.0.0+)
- **Operating System**: Linux, macOS, or Windows

### Installation Steps

1. **Install Node.js** (if not already installed):
   ```bash
   # Download from https://nodejs.org/
   # Or use package manager:
   # Ubuntu/Debian: sudo apt install nodejs
   # macOS: brew install node
   # Windows: Download installer from nodejs.org
   ```

2. **Install Yarn** (if not already installed):
   ```bash
   npm install -g yarn
   # Or use package manager:
   # Ubuntu/Debian: sudo apt install yarn
   # macOS: brew install yarn
   ```

3. **Clone or extract the source code** to a directory

4. **Install dependencies**:
   ```bash
   yarn install
   # Or with npm: npm install
   ```

### Build Process

1. **Build the CSS** (generates output.css):
   ```bash
   yarn build
   # Or with npm: npm run build
   ```

2. **Verify the build output**:
   - Check that `output.css` is generated
   - Verify file size and content

3. **Package the extension**:
   ```bash
   ./package-extension.sh
   ```

### Build Script Details

The build process uses:
- **Tailwind CSS**: CSS framework for styling
- **PostCSS**: CSS processing and optimization
- **Autoprefixer**: CSS vendor prefixing

### File Structure After Build

```
chatbot-extension/
├── manifest.json          # Extension manifest
├── popup.html            # Main popup interface
├── popup.js              # Main JavaScript logic
├── output.css            # Generated CSS (from build)
├── settings.html         # Settings page
├── settings.js           # Settings logic
├── icons/                # Extension icons
│   ├── icon128.png
│   └── icon1285.png
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
├── package-extension.sh  # Packaging script
└── README.md            # This file
```

### Verification Steps

1. **Check build output**:
   ```bash
   ls -la output.css
   # Should show the generated CSS file
   ```

2. **Test the extension locally**:
   - Open Firefox
   - Go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file

3. **Verify functionality**:
   - Click the extension icon
   - Test voice input (requires microphone permission)
   - Test TTS functionality
   - Test settings configuration

### Build Environment Notes

- **CSS Processing**: Tailwind CSS processes utility classes into final CSS
- **No Minification**: Source code is not minified or obfuscated
- **No Transpilation**: JavaScript is not transpiled (uses modern ES6+ features)
- **Dependencies**: All dependencies are standard npm packages

### Troubleshooting

If build fails:
1. Ensure Node.js version is 18.0.0+
2. Clear node_modules and reinstall: `rm -rf node_modules && yarn install`
3. Check for any missing dependencies in package.json

### Source Code Verification

All source files are human-readable:
- `popup.js`: Main application logic (710 lines)
- `popup.html`: HTML structure (498 lines)
- `output.css`: Generated CSS (744 lines)
- `settings.js`: Settings logic (18 lines)
- `settings.html`: Settings page (25 lines)

No obfuscation, minification, or machine-generated code is included in the final extension.

## 🌟 Features

- 🤖 **AI-Powered Chat Interface**
  - Seamless conversation with an AI assistant
  - Context-aware responses based on current page content
  - Support for OpenAI-compatible APIs

- 🌐 **Smart Page Analysis**
  - Real-time webpage content scraping
  - Intelligent content extraction
  - Automatic context integration with chat

- ⚙️ **Customizable Configuration**
  - Flexible API endpoint configuration
  - Secure API key management
  - Easy-to-use settings interface

- 🎨 **Modern User Interface**
  - Clean, responsive design
  - Dark mode support
  - Intuitive user experience

## 🚀 Installation

### From Source

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatbot-extension.git
cd chatbot-extension
```

2. Install dependencies:
```bash
yarn install
```

3. Build the extension:
```bash
yarn build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory

## ⚙️ Configuration

1. Click the extension icon to open the chat interface
2. Click the settings icon (⚙️) in the top right
3. Enter your API configuration:
   - API Key: Your OpenAI-compatible API key
   - API URL: Your API endpoint URL
4. Click "Save" to apply the settings

## 💡 Usage

### Basic Chat
1. Click the extension icon to open the chat interface
2. Type your message and press Enter
3. The AI will respond based on your input

### Page Content Analysis
1. Navigate to any webpage you want to analyze
2. Click the extension icon
3. Toggle the "Include Page Content" button
4. The AI will now have access to the page content
5. Ask questions about the page content

## 🛠️ Development

### Project Structure
```
chatbot-extension/
├── manifest.json      # Extension configuration
├── popup.html        # Main popup interface
├── popup.js          # Popup logic and chat functionality
├── settings.html     # Settings interface
├── settings.js       # Settings management
└── icons/           # Extension icons
```

### Building
The project uses Tailwind CSS for styling. To build the CSS:
```bash
yarn build
```

### Technologies Used
- Chrome Extension APIs
- Tailwind CSS
- Modern JavaScript (ES6+)
- OpenAI-compatible API integration

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

- API keys are stored securely in Chrome's local storage
- All communication is done over HTTPS
- No data is sent to any servers other than your configured API endpoint
- Regular security updates and maintenance

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/chatbot-extension/issues) page
2. Create a new issue if your problem isn't already listed
3. Include detailed information about your problem

## 🙏 Acknowledgments

- OpenAI for the API inspiration
- Chrome Extension documentation
- Tailwind CSS for the styling framework
- All contributors and users of this extension 