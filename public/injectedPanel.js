// injected panel functionality
console.log('Navvra panel loaded!');

// handle panel close
document.getElementById('navvra-close').addEventListener('click', () => {
    const panel = document.getElementById('navvra-panel');
    panel.style.display = 'none';
});

// handle mode switching
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // remove active class from all buttons
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        // add active class to clicked button
        e.target.classList.add('active');
        
        const mode = e.target.dataset.mode;
        switchMode(mode);
    });
});

function switchMode(mode) {
    // TODO: implement mode switching logic
    console.log('Switching to mode:', mode);
    
    // send message to content script about mode change
    window.postMessage({
        type: 'NAVVRA_MODE_CHANGE',
        mode: mode
    }, '*');
}

// listen for messages from content script
window.addEventListener('message', (event) => {
    if (event.data.type === 'NAVVRA_UPDATE_DATA') {
        updatePanelData(event.data.payload);
    }
});

function updatePanelData(data) {
    console.log('Updating panel with AI-enhanced data:', data);
    
    // update navigation section with categorized headings
    const navContainer = document.getElementById('navvra-navigation');
    const contentHeadings = data.headings?.filter(h => h.category === 'content') || [];
    
    if (contentHeadings.length > 0) {
        navContainer.innerHTML = contentHeadings.slice(0, 5).map(heading => 
        `<button class="navvra-button" onclick="scrollToHeading('${heading.id}')">
            📍 ${heading.text} ${heading.confidence > 0.9 ? '⭐' : ''}
        </button>`
        ).join('');
    } else if (data.headings?.length > 0) {
        navContainer.innerHTML = data.headings.slice(0, 5).map(heading => 
        `<button class="navvra-button" onclick="scrollToHeading('${heading.id}')">
            📍 ${heading.text}
        </button>`
        ).join('');
    } else {
        navContainer.innerHTML = '<div style="color: #999; font-size: 12px;">No headings found</div>';
    }
    
    // update actions section with categorized buttons
    const actionsContainer = document.getElementById('navvra-actions');
    const primaryActions = data.actions?.filter(action => 
        action.category === 'primary-action' || action.priority >= 8
    ) || [];
    
    const otherActions = data.actions?.filter(action => 
        !primaryActions.includes(action)
    ) || [];
    
    const allActions = [...primaryActions, ...otherActions].slice(0, 8);
    
    if (allActions.length > 0) {
        actionsContainer.innerHTML = allActions.map(action => {
        let icon = '🔘';
        if (action.category === 'primary-action') icon = '🎯';
        else if (action.type === 'link') icon = '🔗';
        else if (action.text.toLowerCase().includes('login') || action.text.toLowerCase().includes('sign in')) icon = '🔑';
        else if (action.text.toLowerCase().includes('buy') || action.text.toLowerCase().includes('cart') || action.text.toLowerCase().includes('checkout')) icon = '🛒';
        else if (action.text.toLowerCase().includes('search')) icon = '🔍';
        else if (action.text.toLowerCase().includes('submit')) icon = '📤';
        else if (action.category === 'navigation') icon = '🧭';
        
        const priorityBadge = action.priority >= 8 ? ' 💎' : '';
        
        return `<button class="navvra-button" onclick="triggerAction('${action.id}')" 
                    title="${action.category || 'action'} (confidence: ${(action.confidence * 100).toFixed(0)}%)">
            ${icon} ${action.text}${priorityBadge}
        </button>`;
        }).join('');
    } else {
        actionsContainer.innerHTML = '<div style="color: #999; font-size: 12px;">No actions found</div>';
    }
    
    // update summary with AI insights
    const summaryContainer = document.getElementById('navvra-summary');
    if (data.summary) {
        summaryContainer.innerHTML = `
        <div style="margin-bottom: 8px;">${data.summary}</div>
        ${data.classified ? '<div style="font-size: 12px; color: #60a5fa;">🤖 AI-Powered Analysis</div>' : ''}
        `;
    }
}

// functions to be called from buttons - THESE NOW CLICK ACTUAL ELEMENTS!!
window.scrollToHeading = function(headingId) {
    console.log('Scrolling to heading:', headingId);
    window.postMessage({
        type: 'NAVVRA_SCROLL_TO',
        elementId: headingId
    }, '*');
};

window.triggerAction = function(actionId) {
    console.log('Triggering action:', actionId);
    window.postMessage({
        type: 'NAVVRA_TRIGGER_ACTION',
        elementId: actionId
    }, '*');
};