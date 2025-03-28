/**
 * Debug console for ReactFPS
 * This script provides a simple debug console to help diagnose issues with the game
 */

(function() {
  // Create debug console element
  const debugContainer = document.createElement('div');
  debugContainer.id = 'debug-console';
  debugContainer.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    width: 300px;
    height: 200px;
    background-color: rgba(0, 0, 0, 0.7);
    color: #00ff00;
    font-family: monospace;
    font-size: 12px;
    padding: 10px;
    overflow-y: auto;
    z-index: 10000;
    border: 1px solid #00ff00;
    display: none;
  `;
  
  // Create log container
  const logContainer = document.createElement('div');
  logContainer.id = 'debug-log';
  debugContainer.appendChild(logContainer);
  
  // Add to document
  document.addEventListener('DOMContentLoaded', function() {
    document.body.appendChild(debugContainer);
    
    // Override console methods to capture logs
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };
    
    // Override console.log
    console.log = function() {
      // Call the original function
      originalConsole.log.apply(console, arguments);
      
      // Add to debug console
      addLogEntry('log', arguments);
    };
    
    // Override console.warn
    console.warn = function() {
      // Call the original function
      originalConsole.warn.apply(console, arguments);
      
      // Add to debug console
      addLogEntry('warn', arguments);
    };
    
    // Override console.error
    console.error = function() {
      // Call the original function
      originalConsole.error.apply(console, arguments);
      
      // Add to debug console
      addLogEntry('error', arguments);
    };
    
    // Add keyboard toggle
    document.addEventListener('keydown', function(e) {
      // Press ` key to toggle debug console
      if (e.key === '`') {
        debugContainer.style.display = debugContainer.style.display === 'none' ? 'block' : 'none';
      }
    });
    
    // Check for errors and show console if any are detected
    window.addEventListener('error', function(e) {
      debugContainer.style.display = 'block';
      addLogEntry('error', [`UNCAUGHT ERROR: ${e.message}`, `at ${e.filename}:${e.lineno}:${e.colno}`]);
    });
  });
  
  // Add log entry to debug console
  function addLogEntry(type, args) {
    const logEntry = document.createElement('div');
    logEntry.className = `debug-${type}`;
    
    // Style based on type
    switch (type) {
      case 'warn':
        logEntry.style.color = '#ffff00';
        break;
      case 'error':
        logEntry.style.color = '#ff0000';
        break;
      default:
        logEntry.style.color = '#00ff00';
    }
    
    // Convert args to string
    let message = '';
    for (let i = 0; i < args.length; i++) {
      try {
        if (typeof args[i] === 'object') {
          message += JSON.stringify(args[i]) + ' ';
        } else {
          message += args[i] + ' ';
        }
      } catch (e) {
        message += '[Object] ';
      }
    }
    
    // Add timestamp and message
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    // Add to container
    const logContainer = document.getElementById('debug-log');
    if (logContainer) {
      logContainer.appendChild(logEntry);
      
      // Auto-scroll to bottom
      const debugConsole = document.getElementById('debug-console');
      if (debugConsole) {
        debugConsole.scrollTop = debugConsole.scrollHeight;
      }
      
      // Limit number of entries
      while (logContainer.childNodes.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
      }
    }
  }
})();
