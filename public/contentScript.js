// Content script that will be injected into every page
console.log("Navvra content script loaded!");

// TODO: This will eventually handle:
// - DOM scanning and analysis
// - Injecting the floating panel
// - Communication with background scripts

// Basic DOM scanning for important elements
function scanImportantElements() {
  const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'));
  const forms = Array.from(document.querySelectorAll('form'));
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  
  return {
    buttons: buttons.map(el => ({
      text: el.textContent?.trim() || el.value || '',
      tagName: el.tagName,
      type: el.type || 'button'
    })),
    forms: forms.length,
    headings: headings.map(h => ({
      text: h.textContent?.trim(),
      level: h.tagName
    }))
  };
}

// Initial scan
const pageStructure = scanImportantElements();
console.log('Navvra found:', pageStructure);