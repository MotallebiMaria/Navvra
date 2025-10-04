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
        if (response && response.data) {
          setPageData(response.data);
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
            
            {pageData.buttons.length > 0 && (
              <div className="actions-preview">
                <h4>🎯 Top Actions Found:</h4>
                {pageData.buttons.slice(0, 3).map((btn, index) => (
                  <div key={index} className="action-item">
                    {btn.text || 'Unlabeled button'} 
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