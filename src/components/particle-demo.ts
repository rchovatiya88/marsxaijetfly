/**
 * Particle Demo Component for A-Frame
 * 
 * This component demonstrates various particle effects and corresponding sounds
 * using the new audio and image assets
 */

import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';
import { soundManager, SoundCategory } from './sound-manager';
import { ALL_PRESETS } from './sprite-particles-component';

const AFRAME = AFRAME_EXPORT;

// Define the component
export default function initializeParticleDemoComponent(): void {
  if (!AFRAME.components['particle-demo']) {
    AFRAME.registerComponent('particle-demo', {
      schema: {
        enabled: { type: 'boolean', default: true }
      },
      
      init: function(this: any) {
        console.log('Initializing particle-demo component');
        
        // Set up references
        this.demoContainer = null;
        this.effectButtons = [];
        this.currentDemo = null;
        
        // Setup demo if enabled
        if (this.data.enabled) {
          this.setupDemo();
        }
      },
      
      // Create UI for particle demo
      setupDemo: function(this: any) {
        // Create a container for the demo UI
        this.demoContainer = document.createElement('div');
        this.demoContainer.className = 'particle-demo-ui';
        this.demoContainer.style.position = 'absolute';
        this.demoContainer.style.bottom = '20px';
        this.demoContainer.style.left = '20px';
        this.demoContainer.style.zIndex = '1000';
        this.demoContainer.style.display = 'flex';
        this.demoContainer.style.flexDirection = 'column';
        this.demoContainer.style.gap = '10px';
        this.demoContainer.style.padding = '15px';
        this.demoContainer.style.background = 'rgba(0, 0, 0, 0.7)';
        this.demoContainer.style.borderRadius = '8px';
        this.demoContainer.style.fontFamily = 'Arial, sans-serif';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Particle & Sound Effects';
        title.style.margin = '0 0 10px 0';
        title.style.color = '#fff';
        this.demoContainer.appendChild(title);
        
        // Create buttons for different effects
        this.createEffectButton('Firework Small', () => this.playFirework('small'));
        this.createEffectButton('Firework Medium', () => this.playFirework('medium'));  
        this.createEffectButton('Firework Large', () => this.playFirework('large'));
        this.createEffectButton('Thruster', () => this.playEffect('thruster', 2000));
        this.createEffectButton('Fire', () => this.playEffect('fire', 3000));
        this.createEffectButton('Explosion', () => this.playEffect('explosion'));
        this.createEffectButton('Weapon', () => this.playWeaponEffect());
        this.createEffectButton('Rain', () => this.playEffect('rain', 4000));
        this.createEffectButton('Smoke', () => this.playEffect('smoke', 3000));
        
        // Add to DOM
        document.body.appendChild(this.demoContainer);
      },
      
      // Create a button for a specific effect
      createEffectButton: function(this: any, label: string, callback: () => void) {
        const button = document.createElement('button');
        button.textContent = label;
        button.style.padding = '8px 12px';
        button.style.backgroundColor = '#4a5eff';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.fontWeight = 'bold';
        button.style.transition = 'background-color 0.2s';
        
        // Hover styles
        button.addEventListener('mouseover', () => {
          button.style.backgroundColor = '#3a4aee';
        });
        
        button.addEventListener('mouseout', () => {
          button.style.backgroundColor = '#4a5eff';
        });
        
        // Click handler
        button.addEventListener('click', () => {
          // Disable button momentarily to prevent rapid clicking
          button.disabled = true;
          button.style.backgroundColor = '#2a3add';
          
          // Call the effect
          callback();
          
          // Re-enable after a short delay
          setTimeout(() => {
            button.disabled = false;
            button.style.backgroundColor = '#4a5eff';
          }, 1000);
        });
        
        this.demoContainer.appendChild(button);
        this.effectButtons.push(button);
      },
      
      // Play a firework effect with corresponding sound
      playFirework: function(this: any, size: 'small' | 'medium' | 'large' = 'medium') {
        // Clean up any existing demo
        this.cleanupCurrentDemo();
        
        // Create container entity
        const demoEntity = document.createElement('a-entity');
        demoEntity.setAttribute('position', '0 2 -3');
        demoEntity.setAttribute('id', 'firework-demo');
        
        // Launch effect
        const launchEntity = document.createElement('a-entity');
        launchEntity.setAttribute('position', '0 0 0');
        launchEntity.setAttribute('particle-system', {
          preset: 'thruster',
          spawnType: 'burst',
          particleCount: 10,
          lifeTime: 0.8,
          color: '#ff9,#fc7,#f95'
        });
        demoEntity.appendChild(launchEntity);
        
        // Play launch sound
        soundManager.playFireworkLaunchSound();
        
        // Create burst after a delay
        setTimeout(() => {
          // Create burst effect at a higher position
          const burstEntity = document.createElement('a-entity');
          burstEntity.setAttribute('position', '0 2 0');
          
          // Different settings based on size
          let particleCount = 20;
          let scale = '1,2,0';
          
          if (size === 'medium') {
            particleCount = 30;
            scale = '1,3,0';
          } else if (size === 'large') {
            particleCount = 50;
            scale = '1,4,0';
          }
          
          // Set particle attributes based on size
          burstEntity.setAttribute('particle-system', {
            preset: 'explosion',
            particleCount,
            scale,
            color: this.getRandomFireworkColor()
          });
          
          demoEntity.appendChild(burstEntity);
          
          // Play burst sound
          soundManager.playFireworkBurstSound(size);
          
          // Clean up after effect completes
          setTimeout(() => {
            this.cleanupCurrentDemo();
          }, 2000);
        }, 800);
        
        // Add to scene
        this.el.sceneEl.appendChild(demoEntity);
        this.currentDemo = demoEntity;
      },
      
      // Play a general particle effect
      playEffect: function(this: any, preset: string, duration: number = 1500) {
        // Clean up any existing demo
        this.cleanupCurrentDemo();
        
        // Create new effect entity
        const demoEntity = document.createElement('a-entity');
        demoEntity.setAttribute('position', '0 1.6 -3');
        demoEntity.setAttribute('id', 'effect-demo');
        
        // Set particle attributes
        demoEntity.setAttribute('particle-system', {
          preset,
          spawnRate: 30
        });
        
        // Add to scene
        this.el.sceneEl.appendChild(demoEntity);
        this.currentDemo = demoEntity;
        
        // Play appropriate sound based on effect type
        if (preset === 'fire' || preset === 'explosion') {
          soundManager.playFireworkBurstSound('small');
        } else if (preset === 'thruster') {
          soundManager.updateThrusterSound(true, true);
          
          // Stop thruster sound when demo ends
          setTimeout(() => {
            soundManager.stopThrusterSound();
          }, duration - 200);
        }
        
        // Clean up after duration
        setTimeout(() => {
          this.cleanupCurrentDemo();
        }, duration);
      },
      
      // Play weapon effect with sound
      playWeaponEffect: function(this: any) {
        // Clean up any existing demo
        this.cleanupCurrentDemo();
        
        // Create container entity
        const demoEntity = document.createElement('a-entity');
        demoEntity.setAttribute('position', '0 1.6 -3');
        demoEntity.setAttribute('id', 'weapon-demo');
        
        // Create muzzle flash
        const muzzleEntity = document.createElement('a-entity');
        muzzleEntity.setAttribute('particle-system', {
          preset: 'muzzleFlash'
        });
        demoEntity.appendChild(muzzleEntity);
        
        // Play weapon sound
        soundManager.playWeaponSound();
        
        // Create impact effect after a delay
        setTimeout(() => {
          // Create impact at a forward position
          const impactEntity = document.createElement('a-entity');
          impactEntity.setAttribute('position', '0 0 -2');
          impactEntity.setAttribute('particle-system', {
            preset: 'impact'
          });
          demoEntity.appendChild(impactEntity);
          
          // Play hit sound
          soundManager.playHitSound();
        }, 300);
        
        // Add to scene
        this.el.sceneEl.appendChild(demoEntity);
        this.currentDemo = demoEntity;
        
        // Clean up after effect completes
        setTimeout(() => {
          this.cleanupCurrentDemo();
        }, 2000);
      },
      
      // Get a random color for fireworks
      getRandomFireworkColor: function(this: any) {
        const colors = [
          '#ff0,#f80,#f00', // Red-yellow
          '#0ff,#08f,#00f', // Blue
          '#0f0,#0f8,#0ff', // Green-cyan
          '#f0f,#f08,#80f', // Purple-pink
          '#fff,#0ff,#ff0', // White-multi
          '#f80,#f00,#800'  // Deep red
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
      },
      
      // Clean up current demo entity
      cleanupCurrentDemo: function(this: any) {
        if (this.currentDemo && this.currentDemo.parentNode) {
          this.currentDemo.parentNode.removeChild(this.currentDemo);
          this.currentDemo = null;
        }
      },
      
      // Remove component and clean up
      remove: function(this: any) {
        // Clean up any running demos
        this.cleanupCurrentDemo();
        
        // Remove UI
        if (this.demoContainer && this.demoContainer.parentNode) {
          this.demoContainer.parentNode.removeChild(this.demoContainer);
        }
        
        // Clear references
        this.effectButtons = [];
        this.demoContainer = null;
      }
    });
  }
}

// Initialize the component
initializeParticleDemoComponent();
