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

    // scan page & update panel with initial data
    scanPageAndUpdatePanel();
  })
  .catch(error => {
    console.error('Failed to inject Navvra panel:', error);
  })
}

// enhanced DOM scanning WITH AI CLASSIFICATION for important elements
async function scanImportantElements() {
  try {
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

    // generate summary
    let summary;
    if (aiService && typeof aiService.generateSummary === 'function') {
      try {
        summary = await aiService.generateSummary(headingElements);
      } catch (error) {
        console.warn('AI summary failed:', error);
        summary = generateContentSummary(headingElements);
      }
    } else {
      summary = generateContentSummary(headingElements);
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
      classified: !!aiService
    };

    console.log('Final scan result:', result);
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

// simple content summary
function generateContentSummary(headings) {
  if (!headings || headings.length === 0) {
    return "No significant content detected.";
  }
  
  const h1 = headings.find(h => h.level === 'H1');
  const mainHeading = h1 ? h1.text : headings[0].text;
  
  return `Page appears to be about "${mainHeading}". Found ${headings.length} sections and key headings.`;
}

// scan page and update the panel - FIXED async handling
async function scanPageAndUpdatePanel() {
  try {
    const pageData = await scanImportantElements();
    currentPageData = pageData;
    
    // prep data for panel - FIXED data structure
    const panelData = {
      headings: pageData.headings || [],
      actions: [
        ...(pageData.buttons || []).map(btn => ({
          id: btn.id,
          text: btn.text || 'Unlabeled button',
          score: btn.score || 0,
          priority: btn.priority || 3,
          category: btn.category || 'other',
          confidence: btn.confidence || 0.8,
          type: 'button'
        })),
        ...(pageData.links || []).map(link => ({
          id: link.id,
          text: link.text,
          priority: link.priority || 2,
          category: link.category || 'navigation',
          confidence: link.confidence || 0.8,
          type: 'link'
        }))
      ],
      summary: pageData.summary || "No summary available",
      classified: pageData.classified || false
    };
    
    console.log('Sending data to panel:', panelData);
    
    // send data to panel
    window.postMessage({
      type: 'NAVVRA_UPDATE_DATA',
      payload: panelData
    }, '*');
  } catch (error) {
    console.error('Error in scanPageAndUpdatePanel:', error);
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
      sendResponse({ data: data });
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