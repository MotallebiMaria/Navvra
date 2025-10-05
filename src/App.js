import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [pageData, setPageData] = useState(null);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    scanCurrentPage();
  }, []);

  const scanCurrentPage = () => {
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
        } else {
          // handle case where response exists
          setPageData({ 
            buttons: [], 
            forms: 0, 
            headings: [], 
            inputs: 0,
            links: [],
            summary: "No page data received" 
          });
        }
      });
    });
  };

  const activatePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, { action: 'activatePanel' }, (response) => {
        if (response && response.success) {
          setIsActive(true);
        }
      });
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

  // safe data access functions
  const getButtons = () => {
    return pageData?.buttons || [];
  };

  const getHeadings = () => {
    return pageData?.headings || [];
  };

  const getFormsCount = () => {
    return pageData?.forms || 0;
  };

  const getInputsCount = () => {
    return pageData?.inputs || 0;
  };

  const getSummary = () => {
    return pageData?.summary || "Analyzing page...";
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🧭 Navvra</h1>
        <p>AI-powered accessibility assistant</p>
        
        <div className="controls">
          <button onClick={activatePanel} disabled={isActive}>
            {isActive ? 'Panel Active' : 'Activate Floating Panel'}
          </button>
          <button onClick={scanCurrentPage}>
            Rescan Page
          </button>
        </div>

        {pageData ? (
          <div className="status">
            <h3>📊 Page Analysis</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-number">{getButtons().length}</span>
                <span className="stat-label">Key Actions</span>
              </div>
              <div className="stat">
                <span className="stat-number">{getFormsCount()}</span>
                <span className="stat-label">Forms</span>
              </div>
              <div className="stat">
                <span className="stat-number">{getHeadings().length}</span>
                <span className="stat-label">Headings</span>
              </div>
              <div className="stat">
                <span className="stat-number">{getInputsCount()}</span>
                <span className="stat-label">Inputs</span>
              </div>
            </div>

            <div className="summary-section">
              <h4>📝 Summary</h4>
              <div className="summary-text">{getSummary()}</div>
            </div>
            
            {getButtons().length > 0 ? (
              <div className="actions-preview">
                <h4>🎯 Top Actions Found:</h4>
                {getButtons().slice(0, 5).map((btn, index) => (
                  <div 
                    key={index} 
                    className="action-item clickable"
                    onClick={() => clickElement(btn.id)}
                    title={`Click to trigger: ${btn.text}`}
                  >
                    <span>{btn.text || 'Unlabeled button'}</span> 
                    <span className="score">({btn.score || 0})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-actions">
                <p>No interactive elements found on this page.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="status">
            <h3>📊 Page Analysis</h3>
            <div className="loading">
              <p>Scanning page...</p>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;