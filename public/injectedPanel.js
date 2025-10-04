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
                ${heading.text}
            </button>`
        ).join('');
    }
    
    // update actions section
    const actionsContainer = document.getElementById('navvra-actions');
    if (data.actions && data.actions.length > 0) {
        actionsContainer.innerHTML = data.actions.slice(0, 5).map(action => 
            `<button class="navvra-button" onclick="triggerAction('${action.id}')">
                ${action.text}
            </button>`
        ).join('');
    }
    
    // update summary
    const summaryContainer = document.getElementById('navvra-summary');
    if (data.summary) {
        summaryContainer.textContent = data.summary;
    }
}

// functions to be called from buttons
window.scrollToHeading = function(headingId) {
    window.postMessage({
        type: 'NAVVRA_SCROLL_TO',
        elementId: headingId
    }, '*');
};

window.triggerAction = function(actionId) {
    window.postMessage({
        type: 'NAVVRA_TRIGGER_ACTION',
        elementId: actionId
    }, '*');
};