// Fix for aframe-sprite-particles-component.js THREE.Math deprecation
(function() {
  // Create a compatibility layer for THREE.Math if it doesn't exist
  // Try applying fix immediately
  applyFix();
  
  // Also handle the case where THREE loads after this script
  window.addEventListener('load', function() {
    setTimeout(applyFix, 100); // Apply again after a slight delay
  });
  
  function applyFix() {
    if (typeof THREE !== 'undefined') {
      if (!THREE.Math && THREE.MathUtils) {
        THREE.Math = {
          degToRad: THREE.MathUtils.degToRad,
          radToDeg: THREE.MathUtils.radToDeg,
          clamp: THREE.MathUtils.clamp,
          lerp: THREE.MathUtils.lerp,
          randFloat: THREE.MathUtils.randFloat,
          randFloatSpread: THREE.MathUtils.randFloatSpread
        };
        console.log('Applied compatibility fix for THREE.Math in sprite-particles component');
      }
    }
  }
})();
