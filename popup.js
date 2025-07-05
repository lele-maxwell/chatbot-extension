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
  response = response.replace(/^To overcome boredom, consider the following organized approach:/i, 'Here are some fun ideas to beat boredom:');
  response = response.replace(/^Consider the following organized approach:/i, 'Here are some fun ideas to try:');
  
  // Remove detailed internal reasoning patterns
  response = response.replace(/The response to the user's request.*?Final Response:/gs, '');
  response = response.replace(/Thought Process:.*?Final Response:/gs, '');
  response = response.replace(/Here's the organized presentation of the thought process and the final response:/gi, '');
  response = response.replace(/Context Consideration:.*?Final Response:/gs, '');
  response = response.replace(/• Context Consideration:.*?Final Response:/gs, '');
  response = response.replace(/• Appeal Factors:.*?Final Response:/gs, '');
  response = response.replace(/• Diversity:.*?Final Response:/gs, '');
  response = response.replace(/• User Needs:.*?Final Response:/gs, '');
  
  // Remove specific reasoning patterns
  response = response.replace(/I've decided to try.*?which is a great motivator\./gi, '');
  response = response.replace(/It seems like you might be trying to say.*?I'm here to help!/gi, '');
  response = response.replace(/Could you clarify or provide more details about what you're asking or referring to\?/gi, '');
  
  // Remove academic and formal language patterns
  response = response.replace(/Step-by-step explanation:.*?Verification:.*?confirms the solution is correct\./gs, '');
  response = response.replace(/This can be proven using mathematical induction:.*?Conclusion:.*?for all positive integers n\./gs, '');
  response = response.replace(/Base Case.*?Inductive Step:.*?completing the induction\./gs, '');
  
  // Remove Chinese responses (unless user is speaking Chinese)
  if (response.includes('您好') || response.includes('建议您') || response.includes('抱歉')) {
    response = 'I apologize, but I should respond in the same language as you. Could you please repeat your question in English?';
  }
  
  // Convert markdown formatting to plain text - do this BEFORE other formatting
  response = response.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold markers
  response = response.replace(/\*(.*?)\*/g, '$1'); // Remove italic markers
  response = response.replace(/`(.*?)`/g, '$1'); // Remove code markers
  response = response.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove link formatting
  response = response.replace(/^#+\s+/gm, ''); // Remove heading markers
  
  // Remove LaTeX math formatting
  response = response.replace(/\\\(.*?\\\)/g, ''); // Remove inline math
  response = response.replace(/\\\[.*?\\\]/g, ''); // Remove display math
  
  // Improve list formatting with better spacing
  response = response.replace(/^\d+\.\s+/gm, '• '); // Convert numbered lists to bullet points
  
  // Ensure proper spacing between bullet points - add line breaks before each bullet
  response = response.replace(/([.!?])\s*•/g, '$1\n\n•'); // Add double line break before bullet points
  response = response.replace(/([^•\n])\s*•/g, '$1\n\n•'); // Add double line break before bullet points that don't follow punctuation
  
  // Format category headers (like "Creative:", "Body:", "New:") - WITHOUT adding markdown back
  response = response.replace(/([A-Z][a-z\s]+):\s*/g, '\n$1:\n');
  
  // Ensure each bullet point is on its own line with proper spacing
  response = response.replace(/•\s*([^•\n]+?)(?=\n•|\n\n|$)/g, '• $1\n');
  
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
  response = response.replace(/^I hope these ideas help you find something enjoyable to do!/i, 'Give one of these a try! 😊');
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
  
  // Make bullet points more concise by removing verbose explanations
  response = response.replace(/•\s*([^:]+):\s*([^.]+)\.\s*These activities can be both relaxing and fulfilling\./gi, '• $1: $2');
  response = response.replace(/•\s*([^:]+):\s*([^.]+)\.\s*It's a fun way to be creative and enjoy the fruits of your labor\./gi, '• $1: $2');
  response = response.replace(/•\s*([^:]+):\s*([^.]+)\.\s*Gaming can be an engaging way to spend time\./gi, '• $1: $2');
  response = response.replace(/•\s*([^:]+):\s*([^.]+)\.\s*Socializing can make the time pass enjoyably\./gi, '• $1: $2');
  response = response.replace(/•\s*([^:]+):\s*([^.]+)\.\s*It can be productive and make your environment feel fresh\./gi, '• $1: $2');
  response = response.replace(/•\s*([^:]+):\s*([^.]+)\.\s*You might discover a new hobby or interest\./gi, '• $1: $2');
  response = response.replace(/•\s*([^:]+):\s*([^.]+)\.\s*Dancing is also a great way to get moving and enjoy some music\./gi, '• $1: $2');
  response = response.replace(/•\s*([^:]+):\s*([^.]+)\.\s*to give yourself something to look forward to\./gi, '• $1: $2');
  response = response.replace(/•\s*([^:]+):\s*([^.]+)\.\s*I hope these ideas help you find something enjoyable to do!/gi, '• $1: $2');
  
  // Remove recipe-specific reasoning
  response = response.replace(/Each recipe offers something unique, catering to various tastes and dietary preferences, providing flexibility for different meal needs\./gi, '');
  response = response.replace(/Here are five unique and flavorful recipes, each with a brief description and key ingredients:/gi, 'Here are some delicious recipes to try:');
  
  // Remove verbose endings
  response = response.replace(/Start with simple activities like a walk, then gradually explore new hobbies or classes to find what excites you\./gi, '');
  response = response.replace(/which one do you advice me to do/gi, 'Which one sounds fun to you? 😊');
  
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
