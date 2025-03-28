// This file provides access to AFRAME through window
// Note: A-Frame is loaded in index.html

// Make sure we have a fallback if AFRAME isn't available
let AFRAME_EXPORT: any;

if (typeof window !== 'undefined') {
  // Try to get AFRAME from window
  AFRAME_EXPORT = (window as any).AFRAME;
  
  // If AFRAME isn't available yet, create a basic placeholder
  if (!AFRAME_EXPORT) {
    console.warn('AFRAME not found in window. Creating a placeholder.');
    AFRAME_EXPORT = {
      components: {},
      registerComponent: function(name: string, component: any) {
        console.log(`Registering component ${name} to placeholder AFRAME`);
        this.components[name] = component;
      }
    };
    
    // Set up a function to update with the real AFRAME once it's available
    const checkForAframe = () => {
      if ((window as any).AFRAME) {
        // Real AFRAME is now available
        console.log('Real AFRAME now available, updating components');
        
        // Register all components that were registered with our placeholder
        Object.keys(AFRAME_EXPORT.components).forEach(name => {
          if (!(window as any).AFRAME.components[name]) {
            (window as any).AFRAME.registerComponent(name, AFRAME_EXPORT.components[name]);
          }
        });
        
        // Update our export to use the real AFRAME
        AFRAME_EXPORT = (window as any).AFRAME;
        
        // No need to keep checking
        if (interval) {
      clearInterval(interval);
    }
      }
    };
    
    // Check for AFRAME every 100ms
    const interval = setInterval(checkForAframe, 100);
  }
}

export default AFRAME_EXPORT;