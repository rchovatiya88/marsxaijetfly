/**
 * Star Field Component for A-Frame in React
 * 
 * Creates a starry night sky background with moving stars
 */

import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';

// Constants
const AFRAME = AFRAME_EXPORT;

// Interfaces
interface StarFieldSchema {
  starCount: number;
  starSize: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  speed: number;
}

/**
 * Initialize star field component for A-Frame
 */
export default function initializeStarFieldComponent(): void {
  if (!AFRAME.components['star-field']) {
    AFRAME.registerComponent('star-field', {
      schema: {
        starCount: { type: 'number', default: 200 },
        starSize: { type: 'number', default: 0.2 },
        width: { type: 'number', default: 500 },
        height: { type: 'number', default: 50 },
        depth: { type: 'number', default: 200 },
        color: { type: 'string', default: '#FFFFFF' },
        speed: { type: 'number', default: 0.05 }
      },

      init: function(this: any) {
        // Create an array to store all the stars
        this.stars = [];
        this.createStars();
      },

      createStars: function(this: any) {
        // Create stars across the defined dimensions
        for (let z = -this.data.depth / 2; z < this.data.depth / 2; z += this.data.depth / this.data.starCount * 2) {
          // Create a star as an A-Frame entity with a THREE.js mesh
          const entityEl = document.createElement('a-entity');
          
          // Create a sphere geometry for the star
          const geometry = new THREE.SphereGeometry(this.data.starSize, 8, 8);
          const material = new THREE.MeshBasicMaterial({ color: this.data.color });
          const star = new THREE.Mesh(geometry, material);

          // Position the star randomly within the defined field dimensions
          star.position.x = Math.random() * this.data.width - this.data.width / 2;
          star.position.y = Math.random() * this.data.height - this.data.height / 2;
          star.position.z = z;

          // Add the 3D object to the entity
          entityEl.setObject3D('mesh', star);
          
          // Add the entity to the component's entity
          this.el.appendChild(entityEl);
          
          // Store reference to the star in our array
          this.stars.push(star);
        }
      },

      animateStars: function(this: any) {
        for (let i = 0; i < this.stars.length; i++) {
          const star = this.stars[i];
          
          // Move the star along the z-axis
          star.position.z += this.data.speed;
          
          // If the star has moved beyond the visible area, loop it back to the far end
          const halfDepth = this.data.depth / 2;
          if (star.position.z > halfDepth) {
            star.position.z -= this.data.depth;
          }
        }
      },

      tick: function(this: any) {
        this.animateStars();
      },

      remove: function(this: any) {
        // Clean up all stars when component is removed
        this.stars.forEach((star: THREE.Mesh) => {
          if (star.geometry) star.geometry.dispose();
          if (star.material) {
            if (Array.isArray(star.material)) {
              star.material.forEach(material => material.dispose());
            } else {
              star.material.dispose();
            }
          }
        });
        
        // Remove all child entities
        while (this.el.firstChild) {
          this.el.removeChild(this.el.firstChild);
        }
        
        this.stars = [];
      }
    });
  }
}

// Initialize the component
initializeStarFieldComponent();
