// Content script for MaxAiChat extension
// Handles page scraping requests from the popup

// Ensure the content script is properly loaded

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}

function initContentScript() {
  
  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === 'scrapePage') {
      try {
        // Wait a bit to ensure page is fully loaded
        setTimeout(() => {
          try {
            // Extract page content with better error handling
            const title = document.title || 'Untitled Page';
            const body = document.body;
            
            if (!body) {
              console.warn('Content script: No body element found');
              sendResponse({ error: 'Page body not available' });
              return;
            }
            
            let content = body.innerText || body.textContent || '';
            
            // Clean up the content
            content = content
              .replace(/\s+/g, ' ')
              .replace(/\n\s*\n/g, '\n')
              .trim();
            
            const pageData = {
              title: title,
              content: content,
              url: window.location.href,
              timestamp: Date.now()
            };
            

            
            // Send the scraped content back to the popup
            sendResponse(pageData);
            
          } catch (error) {
            console.error('Content script: Error during scraping:', error);
            sendResponse({ error: 'Failed to scrape page content: ' + error.message });
          }
        }, 100); // Small delay to ensure page is ready
        
      } catch (error) {
        console.error('Content script: Error in message handler:', error);
        sendResponse({ error: 'Failed to handle scraping request: ' + error.message });
      }
      
      // Return true to indicate we will send a response asynchronously
      return true;
    }
  });
  

}
