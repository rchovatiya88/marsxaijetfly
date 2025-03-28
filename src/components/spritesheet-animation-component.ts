/**
 * Spritesheet Animation Component for A-Frame in React
 * 
 * Animates images using a spritesheet
 */

import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';

// Constants
const AFRAME = AFRAME_EXPORT;

// Interfaces
interface SpritesheetAnimationSchema {
  rows: number;
  columns: number;
  frameDuration: number;
  loop: boolean;
  currentFrame: number;
  stopAtEnd: boolean;
  playOnce: boolean;
}

/**
 * Initialize spritesheet animation component for A-Frame
 */
export default function initializeSpritesheetAnimationComponent(): void {
  if (!AFRAME.components['spritesheet-animation']) {
    AFRAME.registerComponent('spritesheet-animation', {
      schema: {
        rows: { type: 'number', default: 1 },
        columns: { type: 'number', default: 1 },
        frameDuration: { type: 'number', default: 0.1 },
        loop: { type: 'boolean', default: true },
        currentFrame: { type: 'number', default: 0 },
        stopAtEnd: { type: 'boolean', default: false },
        playOnce: { type: 'boolean', default: false }
      },

      init: function(this: any) {
        this.currentFrame = 0;
        this.totalFrames = this.data.rows * this.data.columns;
        this.timeElapsed = 0;
        this.donePlaying = false;
        this.material = null;

        // Event listeners for control
        this.el.addEventListener('animationStart', this.start.bind(this));
        this.el.addEventListener('animationStop', this.stop.bind(this));
        this.el.addEventListener('animationReset', this.reset.bind(this));
      },

      update: function(this: any, oldData: any) {
        // Calculate total frames if rows or columns changed
        if (oldData.rows !== this.data.rows || oldData.columns !== this.data.columns) {
          this.totalFrames = this.data.rows * this.data.columns;
        }

        // If current frame was updated externally
        if (oldData.currentFrame !== this.data.currentFrame) {
          this.currentFrame = this.data.currentFrame;
          this.updateUVs();
        }

        // Reset if previously done playing but now loop is true
        if (oldData.loop === false && this.data.loop === true && this.donePlaying) {
          this.donePlaying = false;
        }
      },

      // On component removal
      remove: function(this: any) {
        this.el.removeEventListener('animationStart', this.start);
        this.el.removeEventListener('animationStop', this.stop);
        this.el.removeEventListener('animationReset', this.reset);
      },

      tick: function(this: any, time: number, deltaTime: number) {
        if (!this.material || this.donePlaying) return;

        this.timeElapsed += deltaTime / 1000;
        
        // Time to update the frame?
        if (this.timeElapsed >= this.data.frameDuration) {
          this.timeElapsed = 0;
          this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
          
          // Handle loop and single play options
          if (this.currentFrame === 0) {
            if (!this.data.loop) {
              this.donePlaying = true;
              this.currentFrame = this.totalFrames - 1;
            }
            if (this.data.playOnce) {
              this.donePlaying = true;
              this.el.emit('animationComplete');
            }
          }
          
          // Handle stop at end option
          if (this.data.stopAtEnd && this.currentFrame === this.totalFrames - 1) {
            this.donePlaying = true;
            this.el.emit('animationComplete');
          }
          
          this.updateUVs();
        }
      },

      // Update the UV coordinates of the material to show the current frame
      updateUVs: function(this: any) {
        if (!this.material) {
          const mesh = this.el.getObject3D('mesh');
          if (mesh) {
            this.material = mesh.material;
          }
          if (!this.material) return;
        }
        
        // Make sure the material has a map (texture)
        if (!this.material.map) return;
        
        const row = Math.floor(this.currentFrame / this.data.columns);
        const column = this.currentFrame % this.data.columns;
        
        const frameWidth = 1 / this.data.columns;
        const frameHeight = 1 / this.data.rows;
        
        // Calculate UV coordinates
        this.material.map.offset.x = column * frameWidth;
        
        // Calculate offset.y separately
        const calculatedOffsetY = 1 - (row + 1) * frameHeight;
        this.material.map.offset.y = calculatedOffsetY;

        this.material.map.repeat.x = frameWidth;
        this.material.map.repeat.y = frameHeight;
        
        // Set material properties for sprites
        this.material.map.needsUpdate = true;
      },

      // Control methods
      start: function(this: any) {
        this.donePlaying = false;
      },

      stop: function(this: any) {
        this.donePlaying = true;
      },

      reset: function(this: any) {
        this.currentFrame = 0;
        this.timeElapsed = 0;
        this.donePlaying = false;
        this.updateUVs();
      },

      play: function(this: any) {
        this.donePlaying = false;
      },

      pause: function(this: any) {
        this.donePlaying = true;
      }
    });
  }
}

// Initialize the component
initializeSpritesheetAnimationComponent();
