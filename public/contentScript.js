// Content script that will be injected into every page
console.log("Navvra content script loaded!");

let isPanelInjected = false;
let currentPageData = {};
let aiService = null;

// load AI service pls work I'm begging you
function loadAIService() {
  if (typeof window.NavvraAIService !== 'undefined') {
    aiService = window.NavvraAIService;
    console.log('AI service loaded successfully');
  } else {
    console.log('AI service not available, using rule-based only');
  }
}

loadAIService();

// Simple drag and resize variables
let isDragging = false;
let isResizing = false;

// store mapping between our button IDs and actual DOM elements
const elementMap = new Map();

function injectFloatingPanel() {
  if (isPanelInjected) {
    console.log('Panel already injected');
    return;
  }

  // make container for panel
  const panelContainer = document.createElement('div');
  panelContainer.id = 'navvra-panel-container';

  // fetch & inject panel html
  const panelUrl = chrome.runtime.getURL('injectedPanel.html');
  fetch(panelUrl).then(response => response.text()).then(html => {
    panelContainer.innerHTML = html;
    document.body.appendChild(panelContainer);
    isPanelInjected = true;
    console.log('Navvra panel injected successfully');

    // Add simple drag, resize, and close functionality
    setupPanelInteractions();
    
    // scan page & update panel with initial data
    scanPageAndUpdatePanel();
  })
  .catch(error => {
    console.error('Failed to inject Navvra panel:', error);
  })
}

console.log('Content script: Checking if panel injection worked...');

// Test function to manually trigger panel update
window.testPanelUpdate = function() {
  console.log('Manual test: triggering panel update');
  scanPageAndUpdatePanel();
};

// Simple panel interactions
// Simple panel interactions - COMPLETELY REWRITTEN
function setupPanelInteractions() {
  console.log('Setting up panel interactions...');
  
  const panel = document.getElementById('navvra-panel');
  const header = document.getElementById('navvra-header');
  const closeBtn = document.getElementById('navvra-close');
  const resizeHandle = document.getElementById('resize-handle');
  const content = document.getElementById('navvra-content');

  if (!panel || !header) {
    console.error('Panel elements not found!');
    return;
  }

  console.log('Panel elements found, setting up interactions...');

  let isDragging = false;
  let isResizing = false;
  let startX, startY, startWidth, startHeight, startLeft, startTop;

  // Close panel
  closeBtn.addEventListener('click', () => {
    console.log('Closing panel...');
    panel.remove();
    isPanelInjected = false;
  });

  // Dragging functionality
  header.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);

  function startDrag(e) {
    if (e.target.classList.contains('navvra-close')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = panel.offsetLeft;
    startTop = panel.offsetTop;
    panel.classList.add('dragging');
  }

  function onDrag(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = (startLeft + dx) + 'px';
    panel.style.top = (startTop + dy) + 'px';
  }

  function stopDrag() {
    isDragging = false;
    panel.classList.remove('dragging');
  }

  // Resizing functionality
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', startResize);
    
    function startResize(e) {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(document.defaultView.getComputedStyle(panel).width, 10);
      startHeight = parseInt(document.defaultView.getComputedStyle(panel).height, 10);
      panel.classList.add('resizing');
      
      document.addEventListener('mousemove', onResize);
      document.addEventListener('mouseup', stopResize);
    }

    function onResize(e) {
      if (!isResizing) return;
      const width = startWidth + (e.clientX - startX);
      const height = startHeight + (e.clientY - startY);
      panel.style.width = Math.max(350, width) + 'px';
      panel.style.height = Math.max(400, height) + 'px';
    }

    function stopResize() {
      isResizing = false;
      panel.classList.remove('resizing');
      document.removeEventListener('mousemove', onResize);
      document.removeEventListener('mouseup', stopResize);
    }
  }

  // Listen for panel updates and handle them in content script
  window.addEventListener('message', function panelMessageHandler(event) {
    console.log('Panel message handler received:', event.data);
    
    if (event.data.type === 'NAVVRA_UPDATE_PANEL_DATA') {
      console.log('Updating panel content from content script...');
      updatePanelContent(event.data.payload);
    }
  });

  // Function to update panel content
  function updatePanelContent(data) {
    console.log('Content script: Updating panel with data:', data);
    
    const buttons = data.buttons || [];
    const headings = data.headings || [];
    const forms = data.forms || 0;
    const inputs = data.inputs || 0;
    const summary = data.summary || 'No summary available';
    
    // Render summary as bullet points
    const renderSummaryAsBullets = (summaryText) => {
      if (!summaryText) return '<div class="loading">No summary available</div>';
      const parts = summaryText.split(/\n\n|\n/).map(p => p.trim()).filter(p => p.length > 0);
      return `
        <ul class="summary-bullets">
          ${parts.map((part, idx) => 
            `<li>${part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`
          ).join('')}
        </ul>
      `;
    };
    
    // Build the panel content
    content.innerHTML = `
      ${data.error ? `
        <div class="error-message">
          ⚠️ ${data.error}
          <br />
          <small>Try refreshing the page and try again</small>
        </div>
      ` : ''}
      
      <div class="controls">
        <button class="panel-rescan-btn">
          Rescan Page
        </button>
      </div>
      
      <div class="status">
        <h3>📊 Page Analysis</h3>
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-number">${buttons.length}</span>
            <span class="stat-label">Key Actions</span>
          </div>
          <div class="stat">
            <span class="stat-number">${forms}</span>
            <span class="stat-label">Forms</span>
          </div>
          <div class="stat">
            <span class="stat-number">${headings.length}</span>
            <span class="stat-label">Headings</span>
          </div>
          <div class="stat">
            <span class="stat-number">${inputs}</span>
            <span class="stat-label">Inputs</span>
          </div>
        </div>
        
        <div class="summary-section">
          <h4>📝 Summary</h4>
          <div class="summary-text">${renderSummaryAsBullets(summary)}</div>
        </div>
        
        ${buttons.length > 0 ? `
          <div class="actions-preview">
            <h4>🎯 Top Actions Found:</h4>
            ${buttons.slice(0, 5).map((btn, index) => `
              <button 
                class="navvra-action-btn" 
                data-element-id="${btn.id}"
                title="Click to trigger: ${btn.text}"
              >
                <span class="action-text">${btn.text || 'Unlabeled button'}</span>
                <span class="score">(${btn.score || 0})</span>
              </button>
            `).join('')}
          </div>
        ` : `
          <div class="no-actions">
            <p>No interactive elements found on this page.</p>
          </div>
        `}
      </div>
    `;
    
    // Add click handlers to action buttons
    content.querySelectorAll('.navvra-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const elementId = e.currentTarget.getAttribute('data-element-id');
        console.log('Panel: Clicking element:', elementId);
        // Use the existing click function from content script
        clickActualElement(elementId);
      });
    });
    
    // Add click handler to rescan button
    const rescanBtn = content.querySelector('.panel-rescan-btn');
    if (rescanBtn) {
      rescanBtn.addEventListener('click', () => {
        console.log('Panel: Requesting rescan...');
        scanPageAndUpdatePanel();
      });
    }

    console.log('Panel content updated successfully!');
  }

  // Force an initial data load
  setTimeout(() => {
    console.log('Forcing initial panel data load...');
    scanPageAndUpdatePanel();
  }, 100);
}

// enhanced DOM scanning WITH AI CLASSIFICATION for important elements
async function scanImportantElements() {
  try {
    // re-attempt loading AI service in case aiLoader.js was injected dynamically
    try { loadAIService(); } catch (e) { console.warn('loadAIService failed during scan:', e); }
    
    console.log('Navvra: starting full page scan...');
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"], a.btn, a.button'));
    const forms = Array.from(document.querySelectorAll('form'));
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, select'));
    const links = Array.from(document.querySelectorAll('a[href]'));
    const images = Array.from(document.querySelectorAll('img[alt], img[title]'));

    console.log(`Found ${buttons.length} buttons, ${headings.length} headings, ${links.length} links`);

    // clear prev element map
    elementMap.clear();

    // better button analysis
    const buttonElements = buttons.map((el, index) => {
      const text = el.textContent?.trim() || el.value || el.placeholder || el.title || el.getAttribute('aria-label') || '';
      const buttonId = `navvra-btn-${Date.now()}-${index}`;
      elementMap.set(buttonId, el);

      return {
        element: el,
        text: text || 'Click Me',
        id: buttonId,
        tagName: el.tagName,
        type: el.type || 'button',
        classes: el.className,
        isVisible: el.checkVisibility ? el.checkVisibility() : true,
        dimensions: { width: el.offsetWidth, height: el.offsetHeight },
        elementType: 'button'
      };
    });

    // better heading analysis
    const headingElements = headings.map((heading, index) => {
      const headingId = heading.id || `navvra-heading-${Date.now()}-${index}`;
      elementMap.set(headingId, heading);
      
      return {
        element: heading,
        text: heading.textContent?.trim() || 'Untitled heading',
        id: headingId,
        level: heading.tagName,
        isMainTitle: heading.tagName === 'H1' && index === 0,
        elementType: 'heading'
      };
    });

    // better link analysis
    const linkElements = links
      .filter(link => {
        const text = link.textContent?.trim();
        return text && text.length > 0 && text.length < 200;
      })
      .map((link, index) => {
        const linkId = `navvra-link-${Date.now()}-${index}`;
        elementMap.set(linkId, link);
        
        return {
          element: link,
          text: link.textContent?.trim(),
          id: linkId,
          href: link.href,
          type: 'link',
          isNavigation: /(\/|\?|#|home|about|contact|products|services)/i.test(link.href),
          elementType: 'link'
        };
      })
      .slice(0, 10);

    // EXTRACT FULL PAGE CONTENT for AI analysis
    const fullPageContent = extractFullPageContent();
    
    // combine all elements for classification
    const allElements = [...buttonElements, ...headingElements, ...linkElements];

    console.log('Total elements found:', allElements.length);

    // classify elements
    let classifiedElements = allElements;
    if (aiService && typeof aiService.classifyElements === 'function') {
      try {
        console.log('Using AI classification');
        classifiedElements = aiService.classifyElements(allElements);
        console.log('AI classification completed');
      } catch (error) {
        console.warn('AI classification failed, using rule-based fallback:', error);
      }
    } else {
      console.log('Using rule-based classification (AI service not available)');
      // basic scoring for rule-based
      classifiedElements = allElements.map(element => {
        const text = element.text?.toLowerCase() || '';
        let score = 0;
        
        if (/(login|signin|register|signup|buy|purchase|add to cart|checkout|submit|apply|download|order|pay)/i.test(text)) score += 4;
        if (/(search|find)/i.test(text)) score += 1;
        if (/(save|confirm|apply)/i.test(text)) score += 2;
        
        return {
          ...element,
          score: score,
          priority: score > 0 ? 8 : 3
        };
      });
    }

    // generate summary - NOW WITH FULL PAGE CONTENT
    let summary;
    if (aiService && typeof aiService.generateSummary === 'function') {
      try {
        summary = await aiService.generateSummary(
          headingElements, 
          buttonElements, 
          linkElements,
          forms.length,
          fullPageContent // pass full page content to AI
        );
      } catch (error) {
        console.warn('AI summary failed:', error);
        summary = generateContentSummary(headingElements, buttonElements, linkElements, forms.length, fullPageContent);
      }
    } else {
      summary = generateContentSummary(headingElements, buttonElements, linkElements, forms.length, fullPageContent);
    }
    
    const result = {
      elements: classifiedElements.sort((a, b) => (b.priority || 0) - (a.priority || 0)),
      buttons: classifiedElements.filter(el => el.elementType === 'button'),
      links: classifiedElements.filter(el => el.elementType === 'link'),
      headings: classifiedElements.filter(el => el.elementType === 'heading'),
      forms: forms.length,
      inputs: inputs.length,
      images: images.length,
      summary: summary,
      classified: !!aiService,
      fullPageContent: fullPageContent
    };

    console.log('Final scan result:', result);
    console.log('Navvra: full page scan complete');
    return result;

  } catch (error) {
    console.error('Error in scanImportantElements:', error);
    // return safe fallback data
    return {
      elements: [],
      buttons: [],
      links: [],
      headings: [],
      forms: 0,
      inputs: 0,
      images: 0,
      summary: "Error scanning page",
      classified: false
    };
  }
}

// extract comprehensive page content for AI analysis
function extractFullPageContent() {
  try {
    // get main content areas (prioritize these)
    const mainContentSelectors = [
      'main', '[role="main"]', '.content', '.main', '#content', '#main',
      'article', '.article', '[role="article"]', '.post', '.blog-post',
      '.page-content', '.main-content', '.body-content'
    ];
    
    let mainContent = '';
    
    // try to find main content areas first
    for (const selector of mainContentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = extractTextFromElement(element);
        if (mainContent.length > 100) break; // that's probably substancial
      }
    }
    
    // if no main content found, use body but exclude common noise
    if (mainContent.length < 100) {
      const body = document.body.cloneNode(true);
      
      // remove common noisy elements
      const noiseSelectors = [
        'script', 'style', 'nav', 'header', 'footer', 'aside',
        '.ad', '.advertisement', '.banner', '.popup', '.modal',
        '.sidebar', '.menu', '.navigation', '.cookie-banner'
      ];
      
      noiseSelectors.forEach(selector => {
        body.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      mainContent = extractTextFromElement(body);
    }
    
    // get page metadata
    const pageTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
    
    // get all headings for structure
    const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => ({ level: h.tagName, text: h.textContent?.trim() }))
      .filter(h => h.text && h.text.length > 0);
    
    // get key interactive elements
    const keyButtons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
      .map(el => el.textContent?.trim() || el.value || el.placeholder || '')
      .filter(text => text.length > 0)
      .slice(0, 10);
    
    const keyLinks = Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.textContent?.trim())
      .filter(text => text && text.length > 0 && text.length < 50)
      .slice(0, 10);
    
    return {
      title: pageTitle,
      description: metaDescription,
      keywords: metaKeywords,
      mainContent: mainContent.substring(0, 4000), // limit to avoid token limits
      headings: allHeadings,
      buttons: keyButtons,
      links: keyLinks,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error extracting full page content:', error);
    return {
      title: document.title,
      mainContent: document.body.textContent?.substring(0, 2000) || '',
      url: window.location.href
    };
  }
}

// helper to extract clean text from element
function extractTextFromElement(element) {
  return element.textContent
    ?.replace(/\s+/g, ' ')
    ?.trim()
    ?.substring(0, 5000) || ''; // Limit length
}

// enhanced content summary with full page analysis
function generateContentSummary(headings, buttons, links, formCount, fullPageContent) {
  // if we have full page content, use enhanced analysis
  if (fullPageContent && fullPageContent.mainContent) {
    const aiService = window.NavvraAIService;
    if (aiService && aiService.generateEnhancedLocalSummary) {
      return aiService.generateEnhancedLocalSummary(headings, buttons, links, formCount, fullPageContent);
    }
  }
  
  // fallback to basic summary
  const h1 = headings.find(h => h.level === 'H1');
  const mainHeading = h1 ? h1.text : headings[0]?.text || 'This page';
  
  return `🧭 **${mainHeading}**\n\nThis page contains ${buttons.length} interactive elements and ${headings.length} content sections. Use the navigation panel to explore the page.`;
}

// scan page and update the panel - FIXED VERSION
async function scanPageAndUpdatePanel() {
  try {
    console.log('Navvra: scanning page to update injected panel...');
    const pageData = await scanImportantElements();
    currentPageData = pageData;
    
    // Sanitize data - remove any DOM elements and ensure only simple data types
    const sanitizeElement = (element) => {
      // Remove any DOM element references and keep only simple data
      const sanitized = { ...element };
      
      // Remove the actual DOM element reference
      delete sanitized.element;
      
      // Ensure all values are simple data types
      Object.keys(sanitized).forEach(key => {
        const value = sanitized[key];
        if (value instanceof HTMLElement || value instanceof Node) {
          delete sanitized[key];
        } else if (typeof value === 'object' && value !== null) {
          // Recursively sanitize nested objects
          sanitized[key] = JSON.parse(JSON.stringify(value));
        }
      });
      
      return sanitized;
    };
    
    // Prepare data for panel (EXACT SAME STRUCTURE as popup) - COMPLETELY SANITIZED
    const panelData = {
      buttons: (pageData.buttons || []).map(btn => ({
        id: btn.id || '',
        text: (btn.text || 'Unlabeled button').substring(0, 100), // Limit length
        score: btn.score || 0,
        priority: btn.priority || 3,
        category: btn.category || 'other',
        confidence: btn.confidence || 0.8,
        tagName: String(btn.tagName || ''),
        type: String(btn.type || 'button'),
        classes: String(btn.classes || ''),
        isVisible: Boolean(btn.isVisible),
        dimensions: btn.dimensions ? {
          width: Number(btn.dimensions.width) || 0,
          height: Number(btn.dimensions.height) || 0
        } : { width: 0, height: 0 },
        elementType: String(btn.elementType || 'button')
      })),
      
      headings: (pageData.headings || []).map(heading => ({
        id: heading.id || '',
        text: (heading.text || 'Untitled heading').substring(0, 100),
        level: String(heading.level || ''),
        isMainTitle: Boolean(heading.isMainTitle),
        elementType: String(heading.elementType || 'heading')
      })),
      
      forms: Number(pageData.forms) || 0,
      inputs: Number(pageData.inputs) || 0,
      images: Number(pageData.images) || 0,
      summary: String(pageData.summary || "No summary available"),
      classified: Boolean(pageData.classified)
    };
    
    console.log('Sending SANITIZED data to panel:', panelData);
    
    // Send data to panel using the new message type
    window.postMessage({
      type: 'NAVVRA_UPDATE_PANEL_DATA',
      payload: panelData
    }, '*');
    
  } catch (error) {
    console.error('Error in scanPageAndUpdatePanel:', error);
    
    // Send safe error data to panel
    const errorData = {
      error: "Failed to scan page",
      buttons: [],
      headings: [],
      forms: 0,
      inputs: 0,
      summary: "Scan failed - please try again",
      classified: false
    };
    
    window.postMessage({
      type: 'NAVVRA_UPDATE_PANEL_DATA',
      payload: errorData
    }, '*');
  }
}

// click actual DOM elements
function clickActualElement(elementId) {
  const actualElement = elementMap.get(elementId);
  if (actualElement) {
    console.log('Clicking actual element:', actualElement);
    
    // scroll element into view first
    actualElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // highlight element briefly so user can see what was clicked
    const originalOutline = actualElement.style.outline;
    actualElement.style.outline = '3px solid #2563eb';
    setTimeout(() => {
      actualElement.style.outline = originalOutline || '';
    }, 1000);
    
    // trigger actual click event
    actualElement.click();
    
    // for form submissions, also try to submit the form
    if (actualElement.type === 'submit' || actualElement.getAttribute('type') === 'submit') {
      const form = actualElement.closest('form');
      if (form) {
        form.submit();
      }
    }
    
    return true;
  }
  return false;
}

// scroll to actual elements
function scrollToActualElement(elementId) {
  const actualElement = elementMap.get(elementId);
  if (actualElement) {
    actualElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // highlight element
    const originalBackground = actualElement.style.backgroundColor;
    actualElement.style.backgroundColor = '#ffeb3b';
    setTimeout(() => {
      actualElement.style.backgroundColor = originalBackground || '';
    }, 2000);
    
    return true;
  }
  return false;
}

// listen for messages from panel
window.addEventListener('message', (event) => {
  console.log('Content script received message:', event.data);
  
  if (event.data.type === 'NAVVRA_SCROLL_TO') {
    const success = scrollToActualElement(event.data.elementId);
    if (!success) {
      console.warn('Could not find element to scroll to:', event.data.elementId);
    }
  }
  
  if (event.data.type === 'NAVVRA_TRIGGER_ACTION') {
    const success = clickActualElement(event.data.elementId);
    if (!success) {
      console.warn('Could not find element to click:', event.data.elementId);
    }
  }
  
  if (event.data.type === 'NAVVRA_MODE_CHANGE') {
    applyMode(event.data.mode);
  }

  if (event.data.type === 'NAVVRA_REQUEST_RESCAN') {
      console.log('Content script: Received rescan request from panel');
      scanPageAndUpdatePanel();
  }
});

// apply different view modes
function applyMode(mode) {
  console.log('Applying mode:', mode);
  
  // remove any mode classes that already exist
  document.body.classList.remove('navvra-focus-mode', 'navvra-task-mode', 'navvra-content-mode');
  
  switch (mode) {
    case 'focus':
      document.body.classList.add('navvra-focus-mode');
      // simple focus mode (hides some distracting elements)
      document.querySelectorAll('aside, footer, .ad, .advertisement, [class*="banner"]').forEach(el => {
        el.style.opacity = '0.3';
      });
      break;
    case 'task':
      document.body.classList.add('navvra-task-mode');
      // highlight interactive elements
      document.querySelectorAll('button, input, [role="button"]').forEach(el => {
        el.style.outline = '2px solid #2563eb';
      });
      break;
    case 'content':
      document.body.classList.add('navvra-content-mode');
      // reset any modifications
      document.querySelectorAll('*').forEach(el => {
        el.style.opacity = '';
        el.style.outline = '';
      });
      break;
  }
}

// listen for messages from popup - FIXED async handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'activatePanel') {
    injectFloatingPanel();
    sendResponse({ success: true });
  }
  
  if (request.action === 'scanPage') {
    // Handle async scan
    scanImportantElements().then(data => {
      // sanitize data before sending to popup (remove actual DOM element references)
      const sanitize = (raw) => {
        return {
          buttons: (raw.buttons || []).map(btn => ({
            id: btn.id,
            text: btn.text,
            score: btn.score,
            priority: btn.priority,
            category: btn.category,
            confidence: btn.confidence,
            tagName: btn.tagName,
            type: btn.type,
            classes: btn.classes,
            isVisible: !!btn.isVisible,
            dimensions: btn.dimensions,
            elementType: btn.elementType
          })),
          links: (raw.links || []).map(l => ({
            id: l.id,
            text: l.text,
            href: l.href,
            priority: l.priority,
            category: l.category,
            confidence: l.confidence,
            isNavigation: l.isNavigation,
            elementType: l.elementType
          })),
          headings: (raw.headings || []).map(h => ({
            id: h.id,
            text: h.text,
            level: h.level,
            isMainTitle: h.isMainTitle,
            elementType: h.elementType
          })),
          forms: raw.forms || 0,
          inputs: raw.inputs || 0,
          images: raw.images || 0,
          summary: raw.summary || '',
          classified: !!raw.classified,
          fullPageContent: raw.fullPageContent || {}
        };
      };

      try {
        const safe = sanitize(data);
        sendResponse({ data: safe });
      } catch (e) {
        console.error('Error sanitizing scan data:', e);
        sendResponse({ data: { buttons: [], forms: 0, headings: [], inputs: 0, summary: 'Scan failed' } });
      }
    }).catch(error => {
      console.error('Scan error:', error);
      sendResponse({ data: { 
        buttons: [], 
        forms: 0, 
        headings: [], 
        inputs: 0,
        summary: "Scan failed" 
      }});
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'clickElement') {
    const success = clickActualElement(request.elementId);
    sendResponse({ success: success });
  }
});

// Initial scan - FIXED async
setTimeout(() => {
  scanImportantElements().then(data => {
    console.log('Navvra initial scan completed:', data);
  }).catch(error => {
    console.error('Initial scan failed:', error);
  });
}, 1000);