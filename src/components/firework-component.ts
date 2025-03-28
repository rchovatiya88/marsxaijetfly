/**
 * Firework Component for A-Frame in React
 * 
 * Creates beautiful firework effects with particle trails and bursts
 */

import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';
import { soundManager } from './sound-manager';

// Constants
const AFRAME = AFRAME_EXPORT;

// Interfaces
interface FireworkComponentSchema {
  color: string;
  maxHeight: number;
  riseTime: number;
}

/**
 * Initialize firework component for A-Frame
 */
export default function initializeFireworkComponent(): void {
  if (!AFRAME.components['firework']) {
    AFRAME.registerComponent('firework', {
      schema: {
        color: { type: 'string', default: '' },
        maxHeight: { type: 'number', default: 4.5 },
        riseTime: { type: 'number', default: 2.5 } // time to reach maxHeight
      },

      init: function(this: any) {
        // Set a random color if none specified
        if (this.data.color === '') {
          this.data.color = this.randomColor();
        }

        // Set up movement animation for rising effect
        const p = this.el.object3D.position;
        this.el.setAttribute('animation__position', 'property', 'position');
        this.el.setAttribute('animation__position', 'from', {
          x: p.x,
          y: p.y,
          z: p.z
        });
        this.el.setAttribute('animation__position', 'to', {
          x: p.x,
          y: p.y + this.data.maxHeight,
          z: p.z
        });
        this.el.setAttribute(
          'animation__position',
          'dur',
          this.data.riseTime * 1000
        );
        this.el.setAttribute('animation__position', 'easing', 'easeOutQuad'); // fast at start, then slower

        // Create particle trail effect
        this.createParticleTrail();
        
        // Create particle burst effect
        this.createParticleBurst();

        // Initialize timers and states
        this.elapsedTime = 0;
        this.burstStart = false;

        // Play launch sound
        this.playLaunchSound();
      },

      // Helper to generate random colors
      randomColor: function() {
        const colorList = [
          'red',
          'orange',
          'gold',
          'green',
          'cyan',
          '#0088FF',
          'violet'
        ];
        const colorIndex = Math.floor(colorList.length * Math.random());
        return colorList[colorIndex];
      },

      // Create the rising particle trail
      createParticleTrail: function(this: any) {
        this.particleTrail = document.createElement('a-image');
        this.particleTrail.setAttribute('position', '0 -0.1 0');
        this.particleTrail.setAttribute('width', '0.5');
        this.particleTrail.setAttribute('height', '0.5');
        this.particleTrail.setAttribute('scale', '1 1 1');
        this.particleTrail.setAttribute('src', '#fireballSheet');
        
        // Add spritesheet animation if a compatible component exists
        if (AFRAME.components['spritesheet-animation']) {
          this.particleTrail.setAttribute(
            'spritesheet-animation',
            'rows: 1; columns: 8; frameDuration: 0.08; loop: true;'
          );
        }

        // Configure material properties
        this.particleTrail.setAttribute(
          'material',
          'blending: additive; transparent: true; opacity: 1;'
        );

        // Add fade animation
        this.particleTrail.setAttribute('animation__fade', 'property', 'material.opacity');
        this.particleTrail.setAttribute('animation__fade', 'from', 1.0);
        this.particleTrail.setAttribute('animation__fade', 'to', 0.2);
        this.particleTrail.setAttribute('animation__fade', 'dur', this.data.riseTime * 1000);
        this.particleTrail.setAttribute('animation__fade', 'easing', 'easeOutQuad');

        // Add shrink animation
        this.particleTrail.setAttribute('animation__shrink', 'property', 'scale');
        this.particleTrail.setAttribute('animation__shrink', 'from', '1 1 1');
        this.particleTrail.setAttribute('animation__shrink', 'to', '0.25 0.25 0.25');
        this.particleTrail.setAttribute('animation__shrink', 'dur', this.data.riseTime * 1000);
        this.particleTrail.setAttribute('animation__shrink', 'easing', 'easeOutQuad');

        // Add to firework entity
        this.el.appendChild(this.particleTrail);
      },

      // Create the burst particle effect
      createParticleBurst: function(this: any) {
        // Check if we have the spe-particles component available
        if (!AFRAME.components['spe-particles']) {
          console.warn('spe-particles component not found, using sprite-particles instead');
          return this.createFallbackBurst();
        }

        this.particleBurst = document.createElement('a-entity');
        this.particleBurst.setAttribute('spe-particles', '');
        this.particleBurst.setAttribute('spe-particles', 'texture', '/images/particles/sparkle.png');
        this.particleBurst.setAttribute('spe-particles', 'blending', 'additive');
        this.particleBurst.setAttribute('spe-particles', 'distribution', 'sphere');
        this.particleBurst.setAttribute('spe-particles', 'radius', 0.01);

        // Opacity and size over particle lifetime
        this.particleBurst.setAttribute('spe-particles', 'opacity', [1, 1, 1, 0]);

        // Randomize particle count (100-999)
        const { randomUniform } = window.GAME_UTILS;
        const particleCount = Math.floor(randomUniform(100, 999));
        this.particleBurst.setAttribute('spe-particles', 'particleCount', particleCount);

        // Random chance of particle burst vs stream
        if (Math.random() < 0.1) {
          this.particleBurst.setAttribute('spe-particles', 'activeMultiplier', particleCount);
        } else {
          this.particleBurst.setAttribute('spe-particles', 'activeMultiplier', particleCount / 100);
        }

        // Configure velocity for burst
        const baseVelocity = randomUniform(1, 2);
        this.particleBurst.setAttribute('spe-particles', 'velocity', {
          x: baseVelocity,
          y: 0,
          z: 0
        });
        this.particleBurst.setAttribute('spe-particles', 'velocitySpread', {
          x: 0.5,
          y: 0,
          z: 0
        });
        this.particleBurst.setAttribute('spe-particles', 'drag', 1.0);
        this.particleBurst.setAttribute('spe-particles', 'randomizeVelocity', true);

        // Add a bit of gravity
        this.particleBurst.setAttribute('spe-particles', 'accelerationDistribution', 'box');
        this.particleBurst.setAttribute('spe-particles', 'acceleration', {
          x: 0,
          y: -0.2,
          z: 0
        });
        this.particleBurst.setAttribute('spe-particles', 'accelerationSpread', {
          x: 0,
          y: 0.2,
          z: 0
        });

        // Configure burst duration
        this.burstDuration = randomUniform(1.0, 3.0);
        this.particleBurst.setAttribute('spe-particles', 'maxAge', this.burstDuration);
        this.particleBurst.setAttribute('spe-particles', 'maxAgeSpread', this.burstDuration / 4);
        this.particleBurst.setAttribute('spe-particles', 'duration', 0.5);

        // Set color with possible transition
        let colorArray = [
          'white',
          this.data.color,
          this.data.color,
          this.data.color
        ];
        
        // Random chance of color shifting
        if (Math.random() < 0.25) {
          let color2 = this.data.color;
          // Make sure second color is different from first
          while (color2 == this.data.color) {
            color2 = this.randomColor();
          }
          colorArray = ['white', this.data.color, color2, color2];
        }
        this.particleBurst.setAttribute('spe-particles', 'color', colorArray);

        // Disable burst effect until max height is reached
        this.particleBurst.setAttribute('spe-particles', 'enabled', false);

        // Add to firework entity
        this.el.appendChild(this.particleBurst);
      },

      // Creates a fallback burst using sprite-particles if SPE isn't available
      createFallbackBurst: function(this: any) {
        this.particleBurst = document.createElement('a-entity');
        
        // Store configuration for later use
        this.burstDuration = window.GAME_UTILS.randomUniform(1.0, 3.0);
        const particleCount = Math.floor(window.GAME_UTILS.randomUniform(50, 150));
        
        this.particleBurst.setAttribute('sprite-particles', {
          texture: '/images/particles/sparkle.svg',
          color: this.data.color,
          particleCount: particleCount,
          spawnRate: particleCount,
          spawnType: 'burst',
          lifeTime: this.burstDuration,
          radialType: 'sphere',
          radialVelocity: '0.5..1.5',
          radialAcceleration: '-0.2',
          direction: 'random',
          opacity: '1,0.8,0',
          scale: '1,0.5,0',
          rotation: '0..360',
          blending: 'additive',
          enabled: false
        });
        
        // Add to firework entity
        this.el.appendChild(this.particleBurst);
      },

      // Play the launch sound
      playLaunchSound: function(this: any) {
        soundManager.playFireworkLaunchSound();
      },

      // Play the burst sound based on duration and size
      playBurstSound: function(this: any) {
        let burstSize = 'small';
        
        if (this.burstDuration > 2.0) {
          burstSize = 'large';
        } else if (this.burstDuration > 1.5) {
          burstSize = 'medium';
        }
        
        soundManager.playFireworkBurstSound(burstSize as any);
      },

      tick: function(this: any, time: number, deltaTime: number) {
        this.elapsedTime += deltaTime / 1000;

        // Firework has reached max height, start burst effect
        if (this.elapsedTime > this.data.riseTime && this.burstStart == false) {
          this.burstStart = true;
          
          // Get the correct burst component and enable it
          if (this.particleBurst) {
            if (this.particleBurst.hasAttribute('spe-particles')) {
              this.particleBurst.setAttribute('spe-particles', 'enabled', true);
            } else if (this.particleBurst.hasAttribute('sprite-particles')) {
              this.particleBurst.setAttribute('sprite-particles', 'enabled', true);
            }
          }

          // Remove trail
          if (this.particleTrail && this.particleTrail.parentNode) {
            this.el.removeChild(this.particleTrail);
          }

          // Play burst sound
          this.playBurstSound();
        }

        // Firework finished; remove from scene
        // Need to account for particle age variation (1.25 factor)
        if (this.elapsedTime > this.data.riseTime + this.burstDuration * 1.25) {
          if (this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
          }
        }
      },

      remove: function(this: any) {
        // Clean up any resources if needed
        if (this.particleTrail && this.particleTrail.parentNode) {
          this.particleTrail.parentNode.removeChild(this.particleTrail);
        }
        if (this.particleBurst && this.particleBurst.parentNode) {
          this.particleBurst.parentNode.removeChild(this.particleBurst);
        }
      }
    });
  }
}

// Initialize the firework component
initializeFireworkComponent();
