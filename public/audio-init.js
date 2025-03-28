/**
 * Audio context initialization helper
 * This script helps initialize the audio context after user interaction
 * to avoid the "AudioContext was not allowed to start" error
 */

(function() {
  // Check if we need to add an audio start button
  let hasAddedButton = false;
  let audioStarted = false;
  
  // Function to create and add the audio start button
  function addAudioStartButton() {
    if (hasAddedButton || audioStarted) return;
    
    // Create button
    const button = document.createElement('button');
    button.id = 'audio-start-button';
    button.textContent = 'Enable Sound';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#2196F3';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    button.style.fontFamily = 'Arial, sans-serif';
    button.style.fontSize = '16px';
    
    // Add hover style
    button.onmouseover = function() {
      button.style.backgroundColor = '#0D8AF0';
    };
    
    button.onmouseout = function() {
      button.style.backgroundColor = '#2196F3';
    };
    
    // Add click handler
    button.addEventListener('click', function() {
      startAudioContext();
      // Remove button after click
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
    });
    
    // Add to page
    document.body.appendChild(button);
    hasAddedButton = true;
  }
  
  // Function to start audio context
  function startAudioContext() {
    if (audioStarted) return;
    
    try {
      // Create a simple AudioContext
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const context = new AudioContext();
        // Create and connect a silent oscillator to activate the context
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = 440;
        oscillator.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.001);
        
        audioStarted = true;
        console.log('Simple audio context started successfully');
        
        // Dispatch event that audio is ready
        const event = new CustomEvent('audio-context-started');
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Failed to create audio context:', error);
    }
  }
  
  // Listen for user interaction
  function setupInteractionListeners() {
    const interactions = ['click', 'keydown', 'touchstart'];
    
    const handleInteraction = function() {
      startAudioContext();
      // Remove listeners after successful start
      if (audioStarted) {
        interactions.forEach(event => {
          document.removeEventListener(event, handleInteraction);
        });
      }
    };
    
    // Add listeners
    interactions.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true });
    });
  }
  
  // Listen for errors related to audio context
  function listenForErrors() {
    // Listen for console errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      originalConsoleError.apply(console, args);
      
      // Check if error message is related to AudioContext
      const errorString = args.join(' ');
      if (errorString.includes('AudioContext') && 
          (errorString.includes('not allowed') || 
           errorString.includes('user gesture')) && 
          !hasAddedButton) {
        // Add the button if we detect AudioContext errors
        addAudioStartButton();
      }
    };
  }
  
  // Initialize when document is loaded
  function init() {
    // Setup interaction listeners
    setupInteractionListeners();
    
    // Listen for errors
    listenForErrors();
    
    // If Tone.js exists but isn't started, add button
    if (window.Tone && window.Tone.context && window.Tone.context.state !== 'running') {
      addAudioStartButton();
    }
  }
  
  // Wait for document to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
