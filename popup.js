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
    let systemMessage = 'You are a helpful AI assistant. Provide direct, clear, and concise responses. Do not show your internal reasoning or thinking process. Respond naturally as if in a conversation.'
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
      let botReply = data.choices?.[0]?.message?.content || 'No response'
      
      // Clean the response to remove internal reasoning
      botReply = cleanAIResponse(botReply)
      
      appendMessage('bot', botReply)
    } catch (err) {
      console.error(err)
      appendMessage('bot', '⚠️ Failed to fetch response.')
    }
  }
})

// Function to clean AI response and remove internal reasoning
function cleanAIResponse(response) {
  if (!response) return response;
  
  // Remove <think> tags and their content
  response = response.replace(/<think>.*?<\/think>/gs, '');
  
  // Remove any remaining XML-like tags that might contain reasoning
  response = response.replace(/<[^>]*>/g, '');
  
  // Remove common reasoning patterns
  response = response.replace(/^I think\s+/i, '');
  response = response.replace(/^Let me\s+/i, '');
  response = response.replace(/^Based on\s+/i, '');
  response = response.replace(/^To address your\s+/i, '');
  response = response.replace(/^Here's a structured plan based on your thoughts:/i, 'Here are some fun ideas to try:');
  response = response.replace(/^Here's a plan to help you:/i, 'Here are some fun ideas to try:');
  
  // Convert markdown formatting to plain text - do this BEFORE other formatting
  response = response.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold markers
  response = response.replace(/\*(.*?)\*/g, '$1'); // Remove italic markers
  response = response.replace(/`(.*?)`/g, '$1'); // Remove code markers
  response = response.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove link formatting
  response = response.replace(/^#+\s+/gm, ''); // Remove heading markers
  
  // Improve list formatting with better spacing
  response = response.replace(/^\d+\.\s+/gm, '• '); // Convert numbered lists to bullet points
  
  // Add proper spacing around bullet points
  response = response.replace(/([.!?])\s*•/g, '$1\n\n•'); // Add double line break before bullet points
  response = response.replace(/•\s*([^•\n]+?)(?=\n•|\n\n|$)/g, '• $1'); // Ensure proper spacing after bullet points
  
  // Format category headers (like "Creative:", "Body:", "New:") - WITHOUT adding markdown back
  response = response.replace(/([A-Z][a-z\s]+):\s*/g, '\n$1:\n');
  
  // Clean up multiple newlines and ensure proper spacing
  response = response.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive newlines
  response = response.replace(/\n{3,}/g, '\n\n'); // Limit to max 2 consecutive newlines
  
  // Make responses more conversational and friendly
  response = response.replace(/^Here are a few ideas:/i, 'Here are some fun ideas to try:');
  response = response.replace(/^Here are some ideas to help you overcome boredom:/i, 'Here are some fun ideas to beat boredom:');
  response = response.replace(/^Here are some ideas to help you shake off boredom:/i, 'Here are some fun ideas to beat boredom:');
  response = response.replace(/^If you're feeling bored, here are a few ideas to liven things up:/i, 'Here are some fun ideas to beat boredom:');
  response = response.replace(/^Hope these help!/i, 'Give one of these a try! 😊');
  response = response.replace(/^Hope these ideas help you find something enjoyable to do!/i, 'Give one of these a try! 😊');
  response = response.replace(/^Here are some suggestions:/i, 'Here are some cool things you could do:');
  response = response.replace(/Feel free to ask for more ideas if you need them! I'm here to help\./i, 'Try one of these and let me know how it goes! 😊');
  response = response.replace(/What sounds interesting to you\?/i, 'Which one sounds fun to you? 😊');
  
  // Remove analytical and reasoning language
  response = response.replace(/Remember, it's okay to feel bored sometimes\./gi, '');
  response = response.replace(/Embrace it as an opportunity to explore new activities or simply relax\./gi, '');
  response = response.replace(/Mix different activities to keep things interesting and engaging\./gi, '');
  response = response.replace(/Enjoy your time!/gi, 'Have fun! 😊');
  response = response.replace(/This can help energize you and provide a change of scenery\./gi, 'This can help energize you!');
  response = response.replace(/This can be a fun way to express yourself and discover new interests\./gi, 'This can be a fun way to express yourself!');
  response = response.replace(/This can be both engaging and educational\./gi, 'This can be both fun and educational!');
  response = response.replace(/Socializing can lift your spirits and make the time pass enjoyably\./gi, 'Socializing can lift your spirits!');
  response = response.replace(/Recognize that rest is important and can help alleviate boredom\./gi, 'Rest is important too!');
  
  // Add final spacing
  response = response.trim();
  
  return response;
}

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

// Add TTS toggle state
let ttsEnabled = true;

// Initialize TTS toggle button
document.getElementById('ttsToggle').addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    const ttsButton = document.getElementById('ttsToggle');
    ttsButton.classList.toggle('active', ttsEnabled);
    
    // Show status message
    showPageStatus(`Text-to-Speech ${ttsEnabled ? 'enabled' : 'disabled'}`, false);
});

// Initialize speech recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true; // Enable interim results for better feedback
        
        recognition.onstart = () => {
            isRecording = true;
            const micButton = document.getElementById('micButton');
            micButton.classList.add('recording');
            showPageStatus('Listening...', false);
        };
        
        recognition.onend = () => {
            isRecording = false;
            const micButton = document.getElementById('micButton');
            micButton.classList.remove('recording');
            showPageStatus('Voice input stopped', false);
        };
        
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            // Update input field with interim results
            document.getElementById('userInput').value = transcript;
            
            // If this is the final result, send the message
            if (event.results[0].isFinal) {
                const input = document.getElementById('userInput');
                const enterEvent = new KeyboardEvent('keypress', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                });
                input.dispatchEvent(enterEvent);
            }
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isRecording = false;
            document.getElementById('micButton').classList.remove('recording');
            
            let errorMessage = 'Speech recognition error: ';
            switch(event.error) {
                case 'no-speech':
                    errorMessage += 'No speech was detected. Please try speaking again.';
                    break;
                case 'audio-capture':
                    errorMessage += 'No microphone was found. Please check your microphone connection.';
                    break;
                case 'not-allowed':
                    errorMessage += 'Permission to use microphone was denied. Please allow microphone access in your browser settings.';
                    break;
                case 'aborted':
                    errorMessage += 'Voice input was aborted. Please try again.';
                    break;
                case 'network':
                    errorMessage += 'Network error occurred. Please check your internet connection.';
                    break;
                default:
                    errorMessage += event.error;
            }
            showPageStatus(errorMessage, true);
        };
    } else {
        console.error('Speech recognition not supported');
        showPageStatus('Speech recognition is not supported in your browser.', true);
    }
}

// Initialize speech synthesis
function initSpeechSynthesis() {
    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        const languageSelect = document.getElementById('languageSelect');
        
        // Populate language selector
        const languages = {
            'en-US': 'English (US)',
            'es-ES': 'Spanish',
            'fr-FR': 'French',
            'de-DE': 'German',
            'it-IT': 'Italian',
            'pt-BR': 'Portuguese',
            'ru-RU': 'Russian',
            'ja-JP': 'Japanese',
            'zh-CN': 'Chinese'
        };
        
        // Add language options
        Object.entries(languages).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            languageSelect.appendChild(option);
        });
    }
}

// Speak text using TTS
function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    const language = document.getElementById('languageSelect').value;
    const speed = parseFloat(document.getElementById('speedSelect').value);
    
    // Get available voices
    const voices = speechSynthesis.getVoices();
    
    // Find a voice matching the selected language
    const voice = voices.find(v => v.lang.startsWith(language)) || voices[0];
    
    // Create and configure speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = speed;
    utterance.pitch = 1;
    
    // Speak the text
    speechSynthesis.speak(utterance);
}

// Handle mic button events with better feedback
document.getElementById('micButton').addEventListener('mousedown', async () => {
    if (!recognition) {
        showPageStatus('Initializing speech recognition...', false);
        initSpeechRecognition();
    }
    
    if (!isRecording) {
        try {
            recognition.lang = document.getElementById('languageSelect').value;
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            showPageStatus('Failed to start voice input. Please try again.', true);
        }
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
    if (lastResponse && ttsEnabled) {
        speakText(lastResponse);
    }
});

// Modify the existing appendMessage function to respect TTS toggle
const originalAppendMessage = appendMessage;
appendMessage = (sender, text) => {
    originalAppendMessage(sender, text);
    
    if (sender === 'bot') {
        lastResponse = text;
        document.getElementById('replayButton').style.display = 'block';
        if (ttsEnabled) {
            speakText(text);
        }
    }
};

// Initialize voice features when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    initSpeechRecognition();
    initSpeechSynthesis();
    
    // Set initial TTS toggle state
    const ttsButton = document.getElementById('ttsToggle');
    ttsButton.classList.toggle('active', ttsEnabled);
    
    // Load voices when they become available
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            initSpeechSynthesis();
        };
    }
});
