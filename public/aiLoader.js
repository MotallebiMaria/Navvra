// simple in-memory AI service for content script
const AIService = {
  classifyElements(elements) {
    console.log('AI Service: Classifying', elements.length, 'elements');
    
    return elements.map(element => {
      const text = (element.text || '').toLowerCase();
      const tag = element.tagName?.toLowerCase();
      let category = 'other';
      let confidence = 0.8;
      let priority = 2;

      // enhanced classification logic
      if (/(login|signin|register|signup|buy|purchase|add to cart|checkout|submit|apply|download|order|pay)/i.test(text)) {
        category = 'primary-action';
        confidence = 0.95;
        priority = 10;
      }
      else if (/(nav|menu|home|about|contact|products|services)/i.test(text) || element.isNavigation) {
        category = 'navigation';
        confidence = 0.9;
        priority = 3;
      }
      else if (tag?.startsWith('h') || element.elementType === 'heading') {
        category = 'content';
        confidence = 0.85;
        priority = element.isMainTitle ? 8 : 6;
      }
      else if (/(learn more|read more|view|see all|explore|click here)/i.test(text)) {
        category = 'secondary-action';
        confidence = 0.7;
        priority = 4;
      }
      else if (/(search|find|email|password|input|form)/i.test(text)) {
        category = 'form';
        confidence = 0.9;
        priority = 8;
      }
      else if (/(ad|advertisement|sponsored|promo|banner|popup)/i.test(text)) {
        category = 'noise';
        confidence = 0.8;
        priority = 1;
      }

      // boost priority for visible/large elements
      if (element.dimensions && element.dimensions.width > 100 && element.dimensions.height > 30) {
        priority += 2;
      }
      if (element.isVisible) {
        priority += 1;
      }

      return {
        ...element,
        category,
        confidence,
        priority
      };
    });
  },

  generateSummary(headings) {
    console.log('AI Service: Generating summary for', headings?.length, 'headings');
    
    if (!headings || headings.length === 0) {
      return "No significant content detected.";
    }
    
    const h1 = headings.find(h => h.level === 'H1' || h.isMainTitle);
    const mainHeading = h1 ? h1.text : headings[0].text;
    const totalSections = headings.length;
    
    const keyTopics = headings
      .filter(h => h.level === 'H2' || h.level === 'H3')
      .slice(0, 3)
      .map(h => h.text)
      .filter(Boolean);
    
    if (keyTopics.length > 0) {
      return `🤖 This page is about "${mainHeading}". Key sections include: ${keyTopics.join(', ')}.`;
    } else {
      return `🤖 This page appears to be about "${mainHeading}" with ${totalSections} main sections.`;
    }
  }
};

// make available globally
window.NavvraAIService = AIService;
console.log('Navvra AI Service loaded and ready!');