import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Navvra</h1>
        <p>AI-powered accessibility assistant</p>
        
        <div className="controls">
          <button onClick={() => alert('This will activate the floating panel')}>
            Activate Floating Panel
          </button>
          <button onClick={() => alert('This will simplify the current page')}>
            Simplify This Page
          </button>
        </div>

        <div className="status">
          <h3>Page Analysis</h3>
          <p>Buttons found: <span id="buttonCount">-</span></p>
          <p>Forms found: <span id="formCount">-</span></p>
        </div>
      </header>
    </div>
  );
}

export default App;