// AI service for element classification & summarization
class AIService {
  constructor() {
    this.geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
    this.openRouterKey = process.env.REACT_APP_OPENROUTER_API_KEY;
  }

  // classify page elements using rules + potential AI
  async classifyElements(elements) {
    // first use rule-based classification
    const ruleBasedResults = this.ruleBasedClassification(elements);
    
    // if we have AI keys, enhance with AI classification
    if (this.geminiApiKey) {
      try {
        const aiEnhanced = await this.aiClassification(elements);
        return this.mergeClassifications(ruleBasedResults, aiEnhanced);
      } catch (error) {
        console.warn('AI classification failed, using rule-based:', error);
        return ruleBasedResults;
      }
    }
    
    return ruleBasedResults;
  }

  // rule-based classification (primary method for now??)
  ruleBasedClassification(elements) {
    return elements.map(element => {
      const text = element.text?.toLowerCase() || '';
      const tag = element.tagName?.toLowerCase();
      let category = 'other';
      let confidence = 0.8;

      // navigation elements
      if (/(nav|menu|home|about|contact|products|services)/i.test(text) || 
          tag === 'nav' || 
          element.role === 'navigation') {
        category = 'navigation';
        confidence = 0.9;
      }
      // primary actions
      else if (/(login|signin|register|signup|buy|purchase|add to cart|checkout|submit|apply|download)/i.test(text)) {
        category = 'primary-action';
        confidence = 0.95;
      }
      // secondary actions
      else if (/(learn more|read more|view|see all|explore|click here)/i.test(text)) {
        category = 'secondary-action';
        confidence = 0.7;
      }
      // content sections
      else if (tag?.startsWith('h') || /(article|section|main|content|blog|post)/i.test(text)) {
        category = 'content';
        confidence = 0.85;
      }
      // forms & inputs
      else if (tag === 'input' || tag === 'textarea' || tag === 'select' || /(form|search|email|password)/i.test(text)) {
        category = 'form';
        confidence = 0.9;
      }
      // ads & noise
      else if (/(ad|advertisement|sponsored|promo|banner|popup|promo|promotion)/i.test(text) ||
        element.className?.toLowerCase().includes('ad')) {
        category = 'noise';
        confidence = 0.8;
      }

      return {
        ...element,
        category,
        confidence,
        priority: this.calculatePriority(category, element)
      };
    });
  }

  // AI-enhanced classification
  async aiClassification(elements) {
    if (!this.geminiApiKey) return elements;

    const prompt = {
      contents: [{
        parts: [{
          text: `Classify these web elements into categories: navigation, primary-action, secondary-action, content, form, noise, other.
          
          Elements: ${JSON.stringify(elements.slice(0, 10))}
          
          Return JSON array with: id, category, confidence(0-1), reason`
        }]
      }]
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prompt)
    });

    const data = await response.json();
    return this.parseAIResponse(data);
  }

  calculatePriority(category, element) {
    const priorityMap = {
      'primary-action': 10,
      'form': 8,
      'content': 6,
      'secondary-action': 4,
      'navigation': 3,
      'other': 2,
      'noise': 1
    };
    
    let priority = priorityMap[category] || 2;
    
    // boost priority for visible or large or important looking elements
    if (element.offsetWidth > 100 && element.offsetHeight > 30) priority += 2;
    if (element.checkVisibility && element.checkVisibility()) priority += 1;
    
    return priority;
  }

  mergeClassifications(ruleBased, aiEnhanced) {
    // simple merge (implement smarter merging later??)
    return ruleBased;
  }

  parseAIResponse(data) {
    // parse Gemini API response
    try {
      const text = data.candidates[0].content.parts[0].text;
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }
    return [];
  }

  // generate content summary
  async generateSummary(headings, mainContent) {
    if (!this.openRouterKey) {
      return this.generateSimpleSummary(headings);
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-flash-1.5',
          messages: [{
            role: 'user',
            content: `Summarize this webpage content in 2-3 sentences: ${JSON.stringify(headings)}`
          }]
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.warn('AI summary failed, using simple summary:', error);
      return this.generateSimpleSummary(headings);
    }
  }

  generateSimpleSummary(headings) {
    if (headings.length === 0) return "No significant content detected.";
    
    const h1 = headings.find(h => h.level === 'H1');
    const mainHeading = h1 ? h1.text : headings[0].text;
    const totalSections = headings.length;
    
    return `This page appears to be about "${mainHeading}". It contains ${totalSections} main sections including ${headings.slice(1, 3).map(h => h.text).join(', ')}.`;
  }
}

export default new AIService();