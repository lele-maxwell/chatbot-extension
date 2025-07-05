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

// Add conversation memory
let conversationHistory = [];

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
    let systemMessage = 'You are MaxAiChat, a helpful AI assistant. Always respond in the same language as the user. Provide direct, clear, and concise responses. Never show your internal reasoning, thinking process, or analytical steps. Respond naturally as if in a casual conversation. Keep responses conversational and avoid formal or academic language unless specifically requested. Remember the context of the conversation and respond appropriately.'
    if (includePageContent && window.scrapedContent) {
      systemMessage += `\n\nCurrent page content:\n${window.scrapedContent}`
    }

    // Add conversation history to maintain context
    const messages = [
      { role: 'system', content: systemMessage },
      ...conversationHistory,
      { role: 'user', content: userText }
    ];

    const requestPayload = {
      model: 'deepseek-r1-distill-llama-70b',
      messages: messages,
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
      
      // Add messages to conversation history (keep last 10 exchanges to prevent token limit)
      conversationHistory.push({ role: 'user', content: userText });
      conversationHistory.push({ role: 'assistant', content: botReply });
      
      // Keep only the last 10 exchanges (20 messages total)
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }
      
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
  
  // Define cleaning rules in a maintainable structure
  const cleaningRules = [
    // High-priority: Remove internal reasoning tags
    { pattern: /<think>.*?<\/think>/gs, replacement: '', description: 'Remove think tags' },
    { pattern: /<[^>]*>/g, replacement: '', description: 'Remove XML tags' },
    
    // Remove common reasoning patterns
    { pattern: /^I think\s+/i, replacement: '', description: 'Remove "I think" prefix' },
    { pattern: /^Let me\s+/i, replacement: '', description: 'Remove "Let me" prefix' },
    { pattern: /^Based on\s+/i, replacement: '', description: 'Remove "Based on" prefix' },
    { pattern: /^To address your\s+/i, replacement: '', description: 'Remove "To address your" prefix' },
    
    // Remove detailed internal reasoning patterns
    { pattern: /The response to the user's request.*?Final Response:/gs, replacement: '', description: 'Remove response analysis' },
    { pattern: /Thought Process:.*?Final Response:/gs, replacement: '', description: 'Remove thought process' },
    { pattern: /Here's the organized presentation of the thought process and the final response:/gi, replacement: '', description: 'Remove process description' },
    { pattern: /Context Consideration:.*?Final Response:/gs, replacement: '', description: 'Remove context analysis' },
    
    // Remove academic and formal language patterns
    { pattern: /Step-by-step explanation:.*?Verification:.*?confirms the solution is correct\./gs, replacement: '', description: 'Remove step-by-step explanations' },
    { pattern: /This can be proven using mathematical induction:.*?Conclusion:.*?for all positive integers n\./gs, replacement: '', description: 'Remove mathematical proofs' },
    { pattern: /Base Case.*?Inductive Step:.*?completing the induction\./gs, replacement: '', description: 'Remove induction proofs' },
    
    // Convert markdown formatting to plain text
    { pattern: /\*\*(.*?)\*\*/g, replacement: '$1', description: 'Remove bold markers' },
    { pattern: /\*(.*?)\*/g, replacement: '$1', description: 'Remove italic markers' },
    { pattern: /`(.*?)`/g, replacement: '$1', description: 'Remove code markers' },
    { pattern: /\[(.*?)\]\(.*?\)/g, replacement: '$1', description: 'Remove link formatting' },
    { pattern: /^#+\s+/gm, replacement: '', description: 'Remove heading markers' },
    
    // Remove LaTeX math formatting
    { pattern: /\\\(.*?\\\)/g, replacement: '', description: 'Remove inline math' },
    { pattern: /\\\[.*?\\\]/g, replacement: '', description: 'Remove display math' },
    
    // Improve list formatting
    { pattern: /^\d+\.\s+/gm, replacement: '• ', description: 'Convert numbered lists to bullet points' },
    
    // Add proper spacing around bullet points
    { pattern: /([.!?])\s*•/g, replacement: '$1\n\n•', description: 'Add line breaks before bullet points' },
    { pattern: /([^•\n])\s*•/g, replacement: '$1\n\n•', description: 'Add line breaks before bullet points' },
    
    // Format category headers
    { pattern: /([A-Z][a-z\s]+):\s*/g, replacement: '\n$1:\n', description: 'Format category headers' },
    
    // Ensure each bullet point is on its own line
    { pattern: /•\s*([^•\n]+?)(?=\n•|\n\n|$)/g, replacement: '• $1\n', description: 'Add line breaks after bullet points' },
    
    // Clean up multiple newlines
    { pattern: /\n\s*\n\s*\n/g, replacement: '\n\n', description: 'Remove excessive newlines' },
    { pattern: /\n{3,}/g, replacement: '\n\n', description: 'Limit consecutive newlines' },
    
    // Make responses more conversational
    { pattern: /^Here are a few ideas:/i, replacement: 'Here are some fun ideas to try:', description: 'Improve response tone' },
    { pattern: /^Here are some ideas to help you overcome boredom:/i, replacement: 'Here are some fun ideas to beat boredom:', description: 'Improve response tone' },
    { pattern: /^Here are some ideas to help you shake off boredom:/i, replacement: 'Here are some fun ideas to beat boredom:', description: 'Improve response tone' },
    { pattern: /^If you're feeling bored, here are a few ideas to liven things up:/i, replacement: 'Here are some fun ideas to beat boredom:', description: 'Improve response tone' },
    { pattern: /^Hope these help!/i, replacement: 'Give one of these a try! 😊', description: 'Improve response tone' },
    { pattern: /^Hope these ideas help you find something enjoyable to do!/i, replacement: 'Give one of these a try! 😊', description: 'Improve response tone' },
    { pattern: /^I hope these ideas help you find something enjoyable to do!/i, replacement: 'Give one of these a try! 😊', description: 'Improve response tone' },
    { pattern: /^Here are some suggestions:/i, replacement: 'Here are some cool things you could do:', description: 'Improve response tone' },
    { pattern: /Feel free to ask for more ideas if you need them! I'm here to help\./i, replacement: 'Try one of these and let me know how it goes! 😊', description: 'Improve response tone' },
    { pattern: /What sounds interesting to you\?/i, replacement: 'Which one sounds fun to you? 😊', description: 'Improve response tone' },
    
    // Remove analytical and reasoning language
    { pattern: /Remember, it's okay to feel bored sometimes\./gi, replacement: '', description: 'Remove philosophical statements' },
    { pattern: /Embrace it as an opportunity to explore new activities or simply relax\./gi, replacement: '', description: 'Remove philosophical statements' },
    { pattern: /Mix different activities to keep things interesting and engaging\./gi, replacement: '', description: 'Remove analytical language' },
    { pattern: /Enjoy your time!/gi, replacement: 'Have fun! 😊', description: 'Improve response tone' },
    
    // Remove verbose explanations
    { pattern: /Start with simple activities like a walk, then gradually explore new hobbies or classes to find what excites you\./gi, replacement: '', description: 'Remove verbose endings' },
    { pattern: /which one do you advice me to do/gi, replacement: 'Which one sounds fun to you? 😊', description: 'Improve response tone' },
  ];
  
  // Apply rules based on context
  let cleaned = response;
  
  // Check if response contains Chinese characters (but don't force English)
  const hasChinese = /[\u4e00-\u9fff]/.test(response);
  
  for (const rule of cleaningRules) {
    // Skip language-specific rules that might interfere with Chinese responses
    if (hasChinese && rule.description.includes('Remove Chinese responses')) {
      continue;
    }
    
    cleaned = cleaned.replace(rule.pattern, rule.replacement);
  }
  
  return cleaned.trim();
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
    console.log('Initializing speech recognition...');
    
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true; // Enable interim results for better feedback
        recognition.maxAlternatives = 1;
        
        console.log('Speech recognition object created');
        
        recognition.onstart = () => {
            console.log('Speech recognition started - listening...');
            isRecording = true;
            const micButton = document.getElementById('micButton');
            micButton.classList.add('recording');
            showPageStatus('Listening... Speak now!', false);
        };
        
        recognition.onend = () => {
            console.log('Speech recognition ended');
            isRecording = false;
            const micButton = document.getElementById('micButton');
            micButton.classList.remove('recording');
            showPageStatus('Voice input stopped', false);
        };
        
        recognition.onresult = (event) => {
            console.log('Speech recognition result received:', event.results);
            
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            console.log('Transcript:', transcript);
            
            // Update input field with interim results
            document.getElementById('userInput').value = transcript;
            
            // If this is the final result, send the message
            if (event.results[0].isFinal) {
                console.log('Final transcript:', transcript);
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
        
        console.log('Speech recognition initialized successfully');
    } else {
        console.error('Speech recognition not supported in this browser');
        showPageStatus('Speech recognition is not supported in your browser. Please use Chrome.', true);
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
    
    // Stop any current speech to prevent overlapping
    speechSynthesis.cancel();
    
    const language = document.getElementById('languageSelect').value;
    const speed = parseFloat(document.getElementById('speedSelect').value);
    
    // Get available voices
    const voices = speechSynthesis.getVoices();
    
    // Find a voice matching the selected language
    const voice = voices.find(v => v.lang.startsWith(language)) || voices[0];
    
    // Split long text into smaller chunks if needed
    const maxChunkLength = 200; // Maximum characters per chunk
    const textChunks = [];
    
    if (text.length > maxChunkLength) {
        // Split by sentences first, then by words if needed
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let currentChunk = '';
        
        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxChunkLength && currentChunk.length > 0) {
                textChunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                currentChunk += (currentChunk ? '. ' : '') + sentence;
            }
        }
        
        if (currentChunk.trim()) {
            textChunks.push(currentChunk.trim());
        }
    } else {
        textChunks.push(text);
    }
    
    // Speak each chunk sequentially
    let currentChunkIndex = 0;
    
    function speakNextChunk() {
        if (currentChunkIndex < textChunks.length) {
            const chunk = textChunks[currentChunkIndex];
            
            // Create and configure speech
            const utterance = new SpeechSynthesisUtterance(chunk);
            utterance.voice = voice;
            utterance.rate = speed;
            utterance.pitch = 1;
            
            // Add event listeners for this chunk
            utterance.onend = () => {
                currentChunkIndex++;
                speakNextChunk(); // Speak the next chunk
            };
            
            utterance.onerror = (event) => {
                console.error('TTS error:', event);
                currentChunkIndex++;
                speakNextChunk(); // Continue with next chunk even if there's an error
            };
            
            // Speak the current chunk
            speechSynthesis.speak(utterance);
        }
    }
    
    // Start speaking the first chunk
    speakNextChunk();
}

// Add microphone test function
function testMicrophone() {
    console.log('Testing microphone access...');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showPageStatus('Microphone access not supported in this browser', true);
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            console.log('Microphone access granted!');
            showPageStatus('Microphone is working! ✅', false);
            // Stop the stream immediately
            stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
            console.error('Microphone access error:', err);
            let errorMsg = 'Microphone access failed: ';
            
            if (err.name === 'NotAllowedError') {
                errorMsg += 'Permission denied. Please allow microphone access in your browser settings.';
            } else if (err.name === 'NotFoundError') {
                errorMsg += 'No microphone found. Please check your microphone connection.';
            } else if (err.name === 'NotReadableError') {
                errorMsg += 'Microphone is in use by another application.';
            } else {
                errorMsg += err.message;
            }
            
            showPageStatus(errorMsg, true);
        });
}

// Handle mic button events with better feedback
document.getElementById('micButton').addEventListener('mousedown', async () => {
    console.log('Microphone button pressed');
    
    if (!recognition) {
        showPageStatus('Initializing speech recognition...', false);
        initSpeechRecognition();
        return; // Wait for initialization
    }
    
    if (!isRecording) {
        try {
            // Test microphone access first
            testMicrophone();
            
            const selectedLang = document.getElementById('languageSelect').value;
            console.log('Starting voice recognition with language:', selectedLang);
            recognition.lang = selectedLang;
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            showPageStatus('Failed to start voice input. Please try again.', true);
        }
    }
});

document.getElementById('micButton').addEventListener('mouseup', () => {
    if (recognition && isRecording) {
        console.log('Stopping voice recognition');
        recognition.stop();
    }
});

document.getElementById('micButton').addEventListener('mouseleave', () => {
    if (recognition && isRecording) {
        console.log('Stopping voice recognition (mouse left)');
        recognition.stop();
    }
});

// Add touch events for mobile support
document.getElementById('micButton').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!recognition) {
        showPageStatus('Initializing speech recognition...', false);
        initSpeechRecognition();
        return;
    }
    
    if (!isRecording) {
        try {
            const selectedLang = document.getElementById('languageSelect').value;
            console.log('Starting voice recognition (touch) with language:', selectedLang);
            recognition.lang = selectedLang;
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition (touch):', error);
            showPageStatus('Failed to start voice input. Please try again.', true);
        }
    }
});

document.getElementById('micButton').addEventListener('touchend', (e) => {
    e.preventDefault();
    if (recognition && isRecording) {
        console.log('Stopping voice recognition (touch end)');
        recognition.stop();
    }
});

// Add click event as fallback
document.getElementById('micButton').addEventListener('click', (e) => {
    e.preventDefault();
    if (!recognition) {
        showPageStatus('Initializing speech recognition...', false);
        initSpeechRecognition();
        return;
    }
    
    if (!isRecording) {
        try {
            const selectedLang = document.getElementById('languageSelect').value;
            console.log('Starting voice recognition (click) with language:', selectedLang);
            recognition.lang = selectedLang;
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition (click):', error);
            showPageStatus('Failed to start voice input. Please try again.', true);
        }
    } else {
        console.log('Stopping voice recognition (click)');
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
            // Add a small delay to ensure the message is fully displayed before speaking
            setTimeout(() => {
                speakText(text);
            }, 100);
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
