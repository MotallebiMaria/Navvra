import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [pageData, setPageData] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    scanCurrentPage();
  }, []);

  const scanCurrentPage = () => {
    setError(null);
    console.log('Scanning current page...');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, { action: 'scanPage' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not ready:', chrome.runtime.lastError);
          setPageData({ 
            buttons: [], 
            forms: 0, 
            headings: [], 
            inputs: 0,
            summary: "Please refresh the page and try again" 
          });
          return;
        }
        if (response && response.data) {
          setPageData(response.data);
        }
      });
    });
  };

  const activatePanel = () => {
    setError(null);
    console.log('Activating panel...');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        console.log('Sending activate message to tab:', tabs[0].id);
        
        chrome.tabs.sendMessage(tabs[0].id, { action: 'activatePanel' }, (response) => {
          console.log('Activate response:', response);
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            setError('Content script not loaded. Try refreshing the page.');
          } else if (response && response.success) {
            setIsActive(true);
            // Close the popup after activation
            setTimeout(() => window.close(), 500);
          } else {
            setError('Failed to activate panel');
          }
        });
      }
    });
  };

  const clickElement = (elementId) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      
      // send message to content script to click the actual element
      chrome.tabs.sendMessage(activeTab.id, { 
        action: 'clickElement',
        elementId: elementId
      }, (response) => {
        if (response && response.success) {
          console.log('Successfully clicked element:', elementId);
          // close the popup after clicking
          window.close();
        }
      });
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🧭 Navvra</h1>
        <p>AI-powered accessibility assistant</p>
        

        {error && (
          <div className="error-message">
            ⚠️ {error}
            <br />
            <small>Try refreshing the page and try again</small>
          </div>
        )}

        <div className="controls">
          <button onClick={activatePanel} disabled={isActive}>
            {isActive ? 'Panel Active' : 'Activate Floating Panel'}
          </button>
          <button onClick={scanCurrentPage}>
            Rescan Page
          </button>
        </div>

        {pageData && (
          <div className="status">
            <h3>📊 Page Analysis</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-number">{pageData.buttons.length}</span>
                <span className="stat-label">Key Actions</span>
              </div>
              <div className="stat">
                <span className="stat-number">{pageData.forms}</span>
                <span className="stat-label">Forms</span>
              </div>
              <div className="stat">
                <span className="stat-number">{pageData.headings.length}</span>
                <span className="stat-label">Headings</span>
              </div>
              <div className="stat">
                <span className="stat-number">{pageData.inputs}</span>
                <span className="stat-label">Inputs</span>
              </div>
            </div>
            
            {pageData.buttons && pageData.buttons.length > 0 && (
              <div className="actions-preview">
                <h4>🎯 Top Actions Found:</h4>
                {pageData.buttons.slice(0, 5).map((btn, index) => (
                  <div 
                    key={index} 
                    className="action-item clickable"
                    onClick={() => clickElement(btn.id)}
                    title={`Click to trigger: ${btn.text}`}
                  >
                    <span>{btn.text || 'Unlabeled button'}</span> 
                    <span className="score">({btn.score})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;