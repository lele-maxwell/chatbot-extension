const chatDiv = document.getElementById('chat')
const input = document.getElementById('userInput')
const includePageToggle = document.getElementById('includePageToggle')
const pageStatus = document.getElementById('pageStatus')

let includePageContent = false

// Toggle button functionality
includePageToggle.addEventListener('click', async () => {
  includePageContent = !includePageContent
  updateToggleButton()

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
  if (includePageContent) {
    includePageToggle.classList.add('bg-blue-600', 'text-white')
    includePageToggle.classList.remove('border-gray-300', 'dark:border-gray-600')
  } else {
    includePageToggle.classList.remove('bg-blue-600', 'text-white')
    includePageToggle.classList.add('border-gray-300', 'dark:border-gray-600')
  }
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
