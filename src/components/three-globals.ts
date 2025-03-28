// This file ensures Three.js is available globally for A-Frame
import * as THREE from 'three';

// Extend window interface for global THREE
declare global {
  interface Window {
    THREE: typeof THREE;
  }
}

// Export THREE to make it available globally
window.THREE = THREE;

export default THREE;