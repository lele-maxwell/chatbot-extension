# AI Chatbot Assistant Browser Extension

A sophisticated browser extension that combines the power of AI with dynamic page content analysis. This extension provides an intelligent chat interface that can understand and reference the content of your current webpage, making it an invaluable tool for research, learning, and productivity.

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