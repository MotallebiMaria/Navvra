// Content script that will be injected into every page
console.log("Navvra content script loaded!");
// TODO: This will eventually handle:
// - DOM scanning and analysis
// - Injecting the floating panel
// - Communication with background scripts

let isPanelInjected = false;
let currentPageData = {};

// Simple drag and resize variables
let isDragging = false;
let isResizing = false;

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

// Simple panel interactions
function setupPanelInteractions() {
  const panel = document.getElementById('navvra-panel');
  const header = document.getElementById('navvra-header');
  const closeBtn = document.getElementById('navvra-close');
  const resizeHandle = document.getElementById('resize-handle');

  if (!panel || !header) return;

  // Close panel
  closeBtn.addEventListener('click', () => {
    panel.remove();
    isPanelInjected = false;
  });

  // Simple dragging
  header.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', stopDrag);

  function startDrag(e) {
    if (e.target.classList.contains('navvra-close')) return;
    isDragging = true;
  }

  function onDragMove(e) {
    if (!isDragging) return;
    panel.style.left = e.clientX - 150 + 'px'; // Center panel on cursor
    panel.style.top = e.clientY - 20 + 'px';
  }

  function stopDrag() {
    isDragging = false;
  }

  // Simple resizing
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', startResize);
    
    function startResize(e) {
      isResizing = true;
      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', stopResize);
    }

    function onResizeMove(e) {
      if (!isResizing) return;
      panel.style.width = Math.max(250, e.clientX - panel.offsetLeft) + 'px';
      panel.style.height = Math.max(200, e.clientY - panel.offsetTop) + 'px';
    }

    function stopResize() {
      isResizing = false;
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', stopResize);
    }
  }
}

// Basic DOM scanning for important elements
function scanImportantElements() {
  const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"], a.btn, a.button'));
  const forms = Array.from(document.querySelectorAll('form'));
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea'));
  
  // filter & based on text context
  const importantButtons = buttons.map((el, index) => {
    const text = el.textContent?.trim() || el.value || el.placeholder || el.title || '';
    let score = 0;
    
    // score based on text content
    if (/(login|signin|sign in|log in)/i.test(text)) score += 3;
    if (/(submit|send|go|next|continue)/i.test(text)) score += 2;
    if (/(buy|purchase|add to cart|checkout)/i.test(text)) score += 4;
    if (/(search|find)/i.test(text)) score += 1;
    if (/(save|confirm|apply)/i.test(text)) score += 2;
    
    // score based on element type & attributes
    if (el.tagName === 'BUTTON') score += 1;
    if (el.getAttribute('type') === 'submit') score += 2;
    if (el.offsetWidth > 100 && el.offsetHeight > 30) score += 1; // Larger buttons are more important
    
    return {
      element: el,
      text: text,
      id: `navvra-btn-${index}`,
      score: score,
      tagName: el.tagName,
      type: el.type || 'button'
    };
  })
  .filter(btn => btn.score > 0) // only include buttons with some importance
  .sort((a, b) => b.score - a.score) // sort by score descending
  .slice(0, 10); // take top 10

  // process headings
  const importantHeadings = headings.map((heading, index) => ({
    element: heading,
    text: heading.textContent?.trim().substring(0, 30) + (heading.textContent?.trim().length > 30 ? '...' : ''),
    id: heading.id || `navvra-heading-${index}`,
    level: heading.tagName
  })).slice(0, 10);

  return {
    buttons: importantButtons,
    forms: forms.length,
    headings: importantHeadings,
    inputs: inputs.length,
    summary: generateContentSummary(headings)
  };
}

// simple content summary
function generateContentSummary(headings) {
  if (headings.length === 0) {
      return "No significant content detected.";
  }
  
  const h1 = headings.find(h => h.tagName === 'H1');
  const mainHeading = h1 ? h1.textContent : headings[0].textContent;
  
  return `Page appears to be about "${mainHeading}". Found ${headings.length} sections and key headings.`;
}

// scan page and update the panel
function scanPageAndUpdatePanel() {
  const pageData = scanImportantElements();
  currentPageData = pageData;
  
  // prep data for panel
  const panelData = {
    headings: pageData.headings,
    actions: pageData.buttons.map(btn => ({
      id: btn.id,
      text: btn.text || 'Unlabeled button',
      score: btn.score
    })),
    summary: pageData.summary
  };
  
  // send data to panel
  window.postMessage({
    type: 'NAVVRA_UPDATE_DATA',
    payload: panelData
  }, '*');
}

// listen for messages from panel
window.addEventListener('message', (event) => {
  if (event.data.type === 'NAVVRA_SCROLL_TO') {
    const element = currentPageData.headings.find(h => h.id === event.data.elementId)?.element;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  if (event.data.type === 'NAVVRA_TRIGGER_ACTION') {
    const button = currentPageData.buttons.find(b => b.id === event.data.elementId)?.element;
    if (button) {
      button.click();
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

// listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'activatePanel') {
    injectFloatingPanel();
    sendResponse({ success: true });
  }
  
  if (request.action === 'scanPage') {
    const data = scanImportantElements();
    sendResponse({ data: data });
  }
});

// Initial scan
setTimeout(() => {
    const initialData = scanImportantElements();
    console.log('Navvra initial scan:', initialData);
}, 1000);