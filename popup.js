const chatDiv = document.getElementById('chat')
const input = document.getElementById('userInput')
const includePageToggle = document.getElementById('includePageToggle')
const pageStatus = document.getElementById('pageStatus')

let includePageContent = false

// Toggle button functionality
document.getElementById('includePageToggle').addEventListener('change', async (e) => {
  includePageContent = e.target.checked;
  
  if (includePageContent) {
    try {
      console.log('Starting page scraping process...'); // Debug log
      
      // Query the active tab without URL filtering first
      const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true
      });

      if (!tab) {
        console.log('No active tab found');
        showPageStatus('No active tab found.', true);
        return;
      }

      console.log('Active tab:', tab.id, tab.url); // Debug log

      // Check if we can access the tab
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.log('Cannot access this type of page:', tab.url);
        showPageStatus('Cannot scrape this type of page.', true);
        return;
      }

      // Send message to content script
      console.log('Sending message to content script...'); // Debug log
      chrome.tabs.sendMessage(tab.id, { action: 'scrapePage' }, async (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
          // Try to inject the content script if it's not already there
          try {
            console.log('Attempting to inject scraping function...');
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                // This function will be injected into the page
                return {
                  title: document.title,
                  content: document.body.innerText
                };
              }
            });
            
            if (results && results[0] && results[0].result) {
              console.log('Successfully scraped content');
              handleScrapedContent(results[0].result);
            } else {
              console.log('No content found in results');
              showPageStatus('Failed to scrape page content.', true);
            }
          } catch (err) {
            console.error('Failed to inject scraping function:', err);
            showPageStatus('Failed to scrape page content. Please refresh the page.', true);
          }
          return;
        }
        
        handleScrapedContent(response);
      });
    } catch (err) {
      console.error('Error in scraping process:', err);
      showPageStatus('Failed to scrape page content.', true);
    }
  } else {
    showPageStatus('Page scraping disabled.', false);
    window.scrapedContent = null;
  }
});

// Helper function to handle scraped content
function handleScrapedContent(response) {
  console.log('Received response from content script:', response ? 'Success' : 'No data');
  
  if (response && response.content) {
    showPageStatus(`Scraped: ${response.title}`, false);
    // Store the scraped content for use in chat
    window.scrapedContent = response.content;
    console.log('Content length:', response.content.length);
  } else {
    showPageStatus('No content found on this page.', true);
    console.log('No content in response');
  }
}

function updateToggleButton() {
  const toggleInput = document.getElementById('includePageToggle');
  toggleInput.checked = includePageContent;
}

function showPageStatus(text, isError = false) {
  pageStatus.textContent = text
  pageStatus.classList.remove('hidden')
  pageStatus.classList.toggle('text-red-500', isError)
  pageStatus.classList.toggle('text-gray-500', !isError)
  setTimeout(() => {
    pageStatus.classList.add('hidden')
  }, 3000)
}

input.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter' && input.value.trim()) {
    const userText = input.value
    appendMessage('user', userText)
    input.value = ''

    const { apiKey, apiUrl } = await loadSettings()
    if (!apiKey || !apiUrl) {
      alert('Please set your API key and endpoint.')
      return
    }

    // Prepare the system message with page content if enabled
    let systemMessage = 'You are a helpful assistant.'
    if (includePageContent && window.scrapedContent) {
      systemMessage += `\n\nCurrent page content:\n${window.scrapedContent}`
    }

    const requestPayload = {
      model: 'deepseek-r1-distill-llama-70b',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userText },
      ],
    }

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      const data = await res.json()
      const botReply = data.choices?.[0]?.message?.content || 'No response'
      appendMessage('bot', botReply)
    } catch (err) {
      console.error(err)
      appendMessage('bot', '⚠️ Failed to fetch response.')
    }
  }
})

function appendMessage(sender, text) {
  const msg = document.createElement('div')
  msg.className =
    sender === 'user'
      ? 'text-right text-sm text-black dark:text-white'
      : 'text-left text-blue-700 dark:text-blue-300'
  msg.textContent = text
  chatDiv.appendChild(msg)
  chatDiv.scrollTop = chatDiv.scrollHeight
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey', 'apiUrl'], resolve)
  })
}

const apiKeyInput = document.getElementById('apiKey')
const apiUrlInput = document.getElementById('apiUrl')
const saveBtn = document.getElementById('saveBtn')

// Load saved values
chrome.storage.local.get(['apiKey', 'apiUrl'], ({ apiKey, apiUrl }) => {
  if (apiKey) apiKeyInput.value = apiKey
  if (apiUrl) apiUrlInput.value = apiUrl
})

saveBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim()
  const apiUrl = apiUrlInput.value.trim()
  chrome.storage.local.set({ apiKey, apiUrl }, () => {
    alert('Saved!')
    document.getElementById('settingsPanel').classList.add('hidden')
    document.getElementById('chatPanel').classList.remove('hidden')
  })
})

// Panel toggle logic
document.getElementById('openSettings').addEventListener('click', () => {
  document.getElementById('chatPanel').classList.add('hidden')
  document.getElementById('settingsPanel').classList.remove('hidden')
})

document.getElementById('backToChat').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.add('hidden')
  document.getElementById('chatPanel').classList.remove('hidden')
})

// Voice Input and TTS functionality
let recognition = null;
let lastResponse = null;
let isRecording = false;

// Initialize speech recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            isRecording = true;
            document.getElementById('micButton').classList.add('recording');
        };
        
        recognition.onend = () => {
            isRecording = false;
            document.getElementById('micButton').classList.remove('recording');
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('userInput').value = transcript;
            
            // Send the message using the existing input handler
            const input = document.getElementById('userInput');
            const enterEvent = new KeyboardEvent('keypress', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
            });
            input.dispatchEvent(enterEvent);
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isRecording = false;
            document.getElementById('micButton').classList.remove('recording');
            
            // Show error message to user
            let errorMessage = 'Speech recognition error: ';
            switch(event.error) {
                case 'no-speech':
                    errorMessage += 'No speech was detected.';
                    break;
                case 'audio-capture':
                    errorMessage += 'No microphone was found.';
                    break;
                case 'not-allowed':
                    errorMessage += 'Permission to use microphone was denied.';
                    break;
                default:
                    errorMessage += event.error;
            }
            showPageStatus(errorMessage, true);
        };
    } else {
        console.error('Speech recognition not supported');
    }
}

// Initialize speech synthesis
function initSpeechSynthesis() {
    if ('speechSynthesis' in window) {
        // Set default voice
        const voices = speechSynthesis.getVoices();
        const defaultVoice = voices.find(voice => voice.lang === 'en-US') || voices[0];
        if (defaultVoice) {
            window.speechSynthesis.defaultVoice = defaultVoice;
        }
    }
}

// Speak text using TTS
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = document.getElementById('languageSelect').value;
        utterance.rate = parseFloat(document.getElementById('speedSelect').value);
        
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(voice => voice.lang === utterance.lang) || voices[0];
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }
}

// Handle mic button events
document.getElementById('micButton').addEventListener('mousedown', () => {
    if (recognition && !isRecording) {
        recognition.lang = document.getElementById('languageSelect').value;
        recognition.start();
    }
});

document.getElementById('micButton').addEventListener('mouseup', () => {
    if (recognition && isRecording) {
        recognition.stop();
    }
});

document.getElementById('micButton').addEventListener('mouseleave', () => {
    if (recognition && isRecording) {
        recognition.stop();
    }
});

// Add touch events for mobile support
document.getElementById('micButton').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (recognition && !isRecording) {
        recognition.lang = document.getElementById('languageSelect').value;
        recognition.start();
    }
});

document.getElementById('micButton').addEventListener('touchend', (e) => {
    e.preventDefault();
    if (recognition && isRecording) {
        recognition.stop();
    }
});

// Handle language change
document.getElementById('languageSelect').addEventListener('change', () => {
    if (recognition) {
        recognition.lang = document.getElementById('languageSelect').value;
    }
});

// Handle replay button
document.getElementById('replayButton').addEventListener('click', () => {
    if (lastResponse) {
        speakText(lastResponse);
    }
});

// Modify the existing appendMessage function to include TTS
const originalAppendMessage = appendMessage;
appendMessage = (message, isUser = false) => {
    originalAppendMessage(message, isUser);
    
    if (!isUser) {
        lastResponse = message;
        document.getElementById('replayButton').classList.add('visible');
        speakText(message);
    }
};

// Add permission handling
async function checkMicrophonePermission() {
    try {
        // First check if we already have permission
        const result = await navigator.permissions.query({ name: 'microphone' });
        
        if (result.state === 'granted') {
            return true;
        } else if (result.state === 'prompt') {
            // Show a user-friendly message before requesting permission
            showPageStatus('Click the microphone icon and allow access when prompted.', false);
            return true; // Return true to allow the prompt to show
        } else if (result.state === 'denied') {
            showPageStatus('Microphone access is blocked. Please follow these steps:', true);
            setTimeout(() => {
                showPageStatus('1. Look at the top-right of your browser window', true);
                setTimeout(() => {
                    showPageStatus('2. Find the extension icon (puzzle piece) and click it', true);
                    setTimeout(() => {
                        showPageStatus('3. Click "Manage Extensions" in the dropdown menu', true);
                        setTimeout(() => {
                            showPageStatus('4. Find "MaxAiChat" in the list of extensions', true);
                            setTimeout(() => {
                                showPageStatus('5. Click "Details" under the extension', true);
                                setTimeout(() => {
                                    showPageStatus('6. Scroll down to "Site access" and change to "Allow"', true);
                                }, 4000);
                            }, 4000);
                        }, 4000);
                    }, 4000);
                }, 4000);
            }, 4000);
            return false;
        }
    } catch (err) {
        console.error('Microphone permission error:', err);
        if (err.name === 'NotAllowedError') {
            showPageStatus('Microphone access was denied. Please follow these steps:', true);
            setTimeout(() => {
                showPageStatus('1. Click the extension icon (puzzle piece) in the top-right', true);
                setTimeout(() => {
                    showPageStatus('2. Click "Manage Extensions"', true);
                    setTimeout(() => {
                        showPageStatus('3. Find "MaxAiChat" and click "Details"', true);
                        setTimeout(() => {
                            showPageStatus('4. Scroll to "Site access" and set to "Allow"', true);
                        }, 4000);
                    }, 4000);
                }, 4000);
            }, 4000);
        } else {
            showPageStatus('Error accessing microphone. Please check your browser settings.', true);
        }
        return false;
    }
}

// Update the mic button click handler
document.getElementById('micButton').addEventListener('click', async (e) => {
    e.preventDefault();
    if (!recognition) {
        showPageStatus('Speech recognition is not supported in your browser.', true);
        return;
    }
    
    if (!isRecording) {
        try {
            // Request permission directly through getUserMedia
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            // If we get here, permission was granted
            recognition.lang = document.getElementById('languageSelect').value;
            recognition.start();
        } catch (err) {
            console.error('Microphone permission error:', err);
            if (err.name === 'NotAllowedError') {
                showPageStatus('Microphone access was denied. Please follow these steps:', true);
                setTimeout(() => {
                    showPageStatus('1. Click the extension icon (puzzle piece) in the top-right', true);
                    setTimeout(() => {
                        showPageStatus('2. Click "Manage Extensions"', true);
                        setTimeout(() => {
                            showPageStatus('3. Find "MaxAiChat" and click "Details"', true);
                            setTimeout(() => {
                                showPageStatus('4. Scroll to "Site access" and set to "Allow"', true);
                            }, 4000);
                        }, 4000);
                    }, 4000);
                }, 4000);
            } else {
                showPageStatus('Error accessing microphone. Please check your browser settings.', true);
            }
        }
    } else {
        try {
            recognition.stop();
        } catch (err) {
            console.error('Error stopping recognition:', err);
            showPageStatus('Error stopping voice recognition.', true);
        }
    }
});

// Add a function to check browser support
function checkBrowserSupport() {
    if (!('webkitSpeechRecognition' in window)) {
        showPageStatus('Speech recognition is not supported in your browser. Please use Chrome.', true);
        return false;
    }
    if (!('mediaDevices' in navigator)) {
        showPageStatus('Microphone access is not supported in your browser. Please use Chrome.', true);
        return false;
    }
    return true;
}

// Update the initialization
document.addEventListener('DOMContentLoaded', async () => {
    if (checkBrowserSupport()) {
        initSpeechRecognition();
        initSpeechSynthesis();
        
        // Load voices when they become available
        if ('speechSynthesis' in window) {
            speechSynthesis.onvoiceschanged = () => {
                initSpeechSynthesis();
            };
        }
    }
});
