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
      
      const sendScanMessage = () => {
        chrome.tabs.sendMessage(activeTab.id, { action: 'scanPage' }, (response) => {
          if (chrome.runtime.lastError) {
            const errMsg = chrome.runtime.lastError.message || '';
            console.log('Content script not ready:', chrome.runtime.lastError);

            // if the receiving end doesnt exist, try to inject the content script and retry once
            if (errMsg.includes('Receiving end does not exist')) {
              console.log('Attempting to inject content script and retry scan...');
              if (chrome.scripting && chrome.scripting.executeScript) {
                chrome.scripting.executeScript({
                  target: { tabId: activeTab.id },
                  files: ['aiLoader.js', 'contentScript.js']
                }, () => {
                  if (chrome.runtime.lastError) {
                    console.error('Failed to inject content script:', chrome.runtime.lastError);
                    setPageData({ buttons: [], forms: 0, headings: [], inputs: 0, summary: 'Could not inject content script' });
                    return;
                  }

                  // allow the content script a short time to initialize then retry
                  setTimeout(() => {
                    chrome.tabs.sendMessage(activeTab.id, { action: 'scanPage' }, (response2) => {
                      if (chrome.runtime.lastError) {
                        console.error('Scan retry failed:', chrome.runtime.lastError);
                        setPageData({ buttons: [], forms: 0, headings: [], inputs: 0, summary: 'Scan retry failed' });
                        return;
                      }
                      console.log('scanPage retry response received:', response2);
                      if (response2 && response2.data) {
                        const data = response2.data;
                        data.buttons = data.buttons || [];
                        data.links = data.links || [];
                        data.headings = data.headings || [];
                        data.forms = data.forms || 0;
                        data.inputs = data.inputs || 0;
                        data.summary = data.summary || '';
                        setPageData(data);
                      } else {
                        setPageData({ buttons: [], forms: 0, headings: [], inputs: 0, links: [], summary: 'No page data received' });
                      }
                    });
                  }, 500);
                });
                return;
              } else {
                console.warn('chrome.scripting not available in this environment');
                setPageData({ buttons: [], forms: 0, headings: [], inputs: 0, summary: 'Please refresh the page and try again' });
                return;
              }
            }

            // other runtime errors: show fallback
            setPageData({ 
              buttons: [], 
              forms: 0, 
              headings: [], 
              inputs: 0,
              summary: "Please refresh the page and try again" 
            });
            return;
          }

          console.log('scanPage response received:', response);

          if (response && response.data) {
            // defensive: ensure arrays exist
            const data = response.data;
            data.buttons = data.buttons || [];
            data.links = data.links || [];
            data.headings = data.headings || [];
            data.forms = data.forms || 0;
            data.inputs = data.inputs || 0;
            data.summary = data.summary || '';

            setPageData(data);
          } else {
            // handle case where response exists but no data
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
      };

      sendScanMessage();
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

  // render summary as array of bullet points
  const renderSummaryAsBullets = (summary) => {
    if (!summary) return null;

    // split into paragraphs/lines
    const parts = summary.split(/\n\n|\n/).map(p => p.trim()).filter(p => p.length > 0);

    return (
      <ul className="summary-bullets">
        {parts.map((part, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        ))}
      </ul>
    );
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
              <div className="summary-text">{renderSummaryAsBullets(getSummary())}</div>
            </div>
            
            {getButtons().length > 0 ? (
              <div className="actions-preview">
                <h4>🎯 Top Actions Found:</h4>
                {getButtons().slice(0, 5).map((btn, index) => (
                  <button
                    key={index}
                    className="action-item navvra-action-btn"
                    onClick={() => clickElement(btn.id)}
                    title={`Click to trigger: ${btn.text}`}
                    aria-label={`Trigger action: ${btn.text || 'Unlabeled button'}`}
                  >
                    <span className="action-text">{btn.text || 'Unlabeled button'}</span>
                    <span className="score">({btn.score || 0})</span>
                  </button>
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