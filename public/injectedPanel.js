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
    console.log('Updating panel with data:', data);
    
    // update navigation section
    const navContainer = document.getElementById('navvra-navigation');
    if (data.headings && data.headings.length > 0) {
        navContainer.innerHTML = data.headings.slice(0, 5).map(heading => 
            `<button class="navvra-button" onclick="scrollToHeading('${heading.id}')">
                📍 ${heading.text}
            </button>`
        ).join('');
    } else {
        navContainer.innerHTML = '<div style="color: #999; font-size: 12px;">No headings found</div>';
    }
    
    // update actions section
    const actionsContainer = document.getElementById('navvra-actions');
    if (data.actions && data.actions.length > 0) {
        actionsContainer.innerHTML = data.actions.map(action => {
            let icon = '🔘';
            if (action.type === 'link') icon = '🔗';
            if (action.text.toLowerCase().includes('login') || action.text.toLowerCase().includes('sign in')) icon = '🔑';
            if (action.text.toLowerCase().includes('buy') || action.text.toLowerCase().includes('cart') || action.text.toLowerCase().includes('checkout')) icon = '🛒';
            if (action.text.toLowerCase().includes('search')) icon = '🔍';
            if (action.text.toLowerCase().includes('submit')) icon = '📤';
            
            return `<button class="navvra-button" onclick="triggerAction('${action.id}')">
                ${icon} ${action.text}
            </button>`;
        }).join('');
    } else {
        actionsContainer.innerHTML = '<div style="color: #999; font-size: 12px;">No actions found</div>';
    }
    
    // update summary
    const summaryContainer = document.getElementById('navvra-summary');
    if (data.summary) {
        summaryContainer.textContent = data.summary;
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