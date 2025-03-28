// This file provides shims for Three.js addons that are missing in the newer version
// Import THREE so we can use it in our shims
import * as THREE from 'three';

// Define shims for Three.js loaders
window.ColladaLoader = function() {
  console.log('ColladaLoader shim created');
  return {
    load: function(url, onLoad) {
      console.log('ColladaLoader shim called with:', url);
      // Create empty object that can be returned
      const object = new THREE.Object3D();
      if (onLoad) onLoad({ scene: object });
      return object;
    }
  };
};

window.FBXLoader = function() {
  console.log('FBXLoader shim created');
  return {
    load: function(url, onLoad) {
      console.log('FBXLoader shim called with:', url);
      // Create empty object that can be returned
      const object = new THREE.Group();
      if (onLoad) onLoad(object);
      return object;
    }
  };
};

// Export for module system compatibility
export const ColladaLoader = window.ColladaLoader;
export const FBXLoader = window.FBXLoader;
