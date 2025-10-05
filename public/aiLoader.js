// enhanced AI service with FULL PAGE ANALYSIS
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

  async generateSummary(headings, buttons, links, formCount, fullPageContent) {
    console.log('AI Service: Generating FULL PAGE analysis summary');
    
    // if we have full page content, use external AI for deep analysis
    if (fullPageContent && this.hasExternalAI()) {
      try {
        return await this.generateExternalAISummary(fullPageContent);
      } catch (error) {
        console.warn('External AI failed, using enhanced local analysis:', error);
      }
    }
    
    // fallback to enhanced local analysis
    return this.generateEnhancedLocalSummary(headings, buttons, links, formCount, fullPageContent);
  },

  // check if external AI is available
  hasExternalAI() {
    return false;
  },

  // integrate with actual Gemini API
  async generateExternalAISummary(fullPageContent) {
    return "🔧 External AI integration pending - using enhanced analysis";
  },

  generateEnhancedLocalSummary(headings, buttons, links, formCount, fullPageContent) {
    console.log('Using enhanced local page analysis');
    
    if (!fullPageContent) {
      return this.generateBasicSummary(headings, buttons, links, formCount);
    }

    const { title, mainContent, headings: allHeadings, buttons: allButtons, links: allLinks } = fullPageContent;
    
    // analyze page purpose and content
    const pageAnalysis = this.analyzePageContent(title, mainContent, allHeadings, allButtons, allLinks, formCount);
    const userActions = this.extractUserActions(allButtons, allLinks, formCount);
    const contentInsights = this.analyzeContentInsights(mainContent, allHeadings);
    
    return this.formatComprehensiveSummary(title, pageAnalysis, userActions, contentInsights);
  },

  analyzePageContent(title, mainContent, headings, buttons, links, formCount) {
    const allText = mainContent.toLowerCase();
    const buttonTexts = buttons.join(' ').toLowerCase();
    const linkTexts = links.join(' ').toLowerCase();
    
    let pageType = "Informational Website";
    let purpose = "Browse content and information";
    let complexity = "Moderate";
    
    // determine page type
    if (/(login|sign in|register|sign up|log in)/i.test(allText + buttonTexts)) {
      pageType = "Authentication Portal";
      purpose = "Sign in or create an account";
    } 
    else if (/(buy|purchase|add to cart|checkout|order|shop|cart|price|€|£|¥|₹)/i.test(allText + buttonTexts)) {
      pageType = "E-commerce Store";
      purpose = "Browse and purchase products";
    }
    else if (/(search|find|explore|discover)/i.test(allText) && formCount > 0) {
      pageType = "Search Platform";
      purpose = "Find specific content or products";
    }
    else if (/(contact|support|help|email|phone|call)/i.test(allText + linkTexts)) {
      pageType = "Contact/Support Page";
      purpose = "Get assistance or contact the organization";
    }
    else if (/(blog|article|news|post|read|journal)/i.test(allText)) {
      pageType = "Content Publication";
      purpose = "Read articles and blog posts";
    }
    else if (/(dashboard|account|profile|settings|my)/i.test(allText)) {
      pageType = "User Dashboard";
      purpose = "Manage your account and preferences";
    }
    else if (/(home|welcome|main)/i.test(title.toLowerCase())) {
      pageType = "Homepage";
      purpose = "Navigate to different sections of the website";
    }
    
    // assess complexity
    const totalElements = headings.length + buttons.length + links.length;
    if (totalElements > 30) complexity = "Complex";
    if (totalElements < 10) complexity = "Simple";
    
    return { pageType, purpose, complexity };
  },

  extractUserActions(buttons, links, formCount) {
    const actions = new Set();
    
    // categorize actions by priority
    const highPriority = [
      'login', 'sign in', 'register', 'sign up', 'buy now', 'purchase',
      'add to cart', 'checkout', 'download', 'get started', 'try now',
      'submit', 'apply', 'order', 'shop now', 'pay'
    ];
    
    const mediumPriority = [
      'search', 'find', 'contact', 'support', 'help', 'learn more',
      'read more', 'view', 'see all', 'explore', 'click here'
    ];
    
    const allActionTexts = [...buttons, ...links];
    
    // add high priority actions
    highPriority.forEach(keyword => {
      const action = allActionTexts.find(text => 
        text && text.toLowerCase().includes(keyword)
      );
      if (action) actions.add(this.formatActionText(action));
    });
    
    // add medium priority if we need more
    if (actions.size < 3) {
      mediumPriority.forEach(keyword => {
        const action = allActionTexts.find(text => 
          text && text.toLowerCase().includes(keyword)
        );
        if (action) actions.add(this.formatActionText(action));
      });
    }
    
    // add form-related actions
    if (formCount > 0 && actions.size < 5) {
      actions.add('Fill out forms');
    }
    
    return Array.from(actions).slice(0, 6);
  },

  formatActionText(action) {
    // clean up action text
    return action
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 30);
  },

  analyzeContentInsights(mainContent, headings) {
    const insights = [];
    
    // analyze content length
    const contentLength = mainContent.length;
    if (contentLength < 500) insights.push('Brief content');
    else if (contentLength > 2000) insights.push('Detailed content');
    
    // analyze structure
    const h1Count = headings.filter(h => h.level === 'H1').length;
    const h2Count = headings.filter(h => h.level === 'H2').length;
    
    if (h2Count > 5) insights.push('Well-structured with multiple sections');
    else if (h2Count > 0) insights.push('Organized content');
    
    // aook for key content indicators
    if (/(sign up|register|subscribe)/i.test(mainContent)) insights.push('Encourages user registration');
    if (/(sale|discount|promo|offer)/i.test(mainContent)) insights.push('Contains promotional content');
    if (/(contact|email|phone|address)/i.test(mainContent)) insights.push('Provides contact information');
    
    return insights.length > 0 ? insights : ['General informational content'];
  },

  formatComprehensiveSummary(title, pageAnalysis, userActions, contentInsights) {
    const { pageType, purpose, complexity } = pageAnalysis;
    
    let summary = `🌐 **${title}**\n\n`;
    summary += `📋 **Page Type**: ${pageType}\n`;
    summary += `🎯 **Primary Purpose**: ${purpose}\n`;
    summary += `⚡ **Complexity**: ${complexity}\n\n`;
    
    if (userActions.length > 0) {
      summary += `🛠️ **Available Actions**: ${userActions.join(', ')}\n\n`;
    }
    
    summary += `📊 **Content Insights**: ${contentInsights.join(' • ')}`;
    
    return summary;
  },

  generateBasicSummary(headings, buttons, links, formCount) {
    // fallback basic summary
    const h1 = headings.find(h => h.level === 'H1');
    const mainHeading = h1 ? h1.text : headings[0]?.text || 'This page';
    
    return `🧭 **${mainHeading}**\n\nThis appears to be a web page with ${buttons.length} interactive elements and ${headings.length} content sections. Use the panel above to navigate and take action.`;
  }
};

// make available globally
window.NavvraAIService = AIService;
console.log('Navvra Enhanced AI Service loaded and ready!');