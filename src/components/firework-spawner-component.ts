/**
 * Firework Spawner Component for A-Frame in React
 * 
 * Randomly spawns fireworks in the scene
 */

import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';

// Constants
const AFRAME = AFRAME_EXPORT;

// Interfaces
interface FireworkSpawnerSchema {
  enabled: boolean;
  frequency: number;
  maxFireworks: number;
  radius: number;
  angle: number;
  angleSpread: number;
  minHeight: number;
  maxHeight: number;
  minRiseTime: number;
  maxRiseTime: number;
}

/**
 * Initialize firework spawner component for A-Frame
 */
export default function initializeFireworkSpawnerComponent(): void {
  if (!AFRAME.components['firework-spawner']) {
    AFRAME.registerComponent('firework-spawner', {
      schema: {
        enabled: { type: 'boolean', default: true },
        frequency: { type: 'number', default: 1.5 }, // fireworks per second
        maxFireworks: { type: 'number', default: 10 }, // max simultaneous fireworks
        radius: { type: 'number', default: 20 }, // spawn radius
        angle: { type: 'number', default: 270 }, // angle in degrees
        angleSpread: { type: 'number', default: 90 }, // angle spread in degrees
        minHeight: { type: 'number', default: 4 },
        maxHeight: { type: 'number', default: 10 },
        minRiseTime: { type: 'number', default: 2 },
        maxRiseTime: { type: 'number', default: 3 }
      },

      init: function(this: any) {
        this.elapsedTime = 0;
        this.fireworkCount = 0;
        this.sceneEl = this.el.sceneEl || document.querySelector('a-scene');
        
        // Check if THREE.Math.degToRad is available, otherwise use MathUtils
        this.degToRad = THREE.Math?.degToRad || THREE.MathUtils.degToRad;
      },

      tick: function(this: any, time: number, deltaTime: number) {
        if (!this.data.enabled) return;
        if (this.fireworkCount >= this.data.maxFireworks) return;
        
        const deltaSeconds = deltaTime / 1000;
        this.elapsedTime += deltaSeconds;
        
        // Random chance to spawn a firework based on frequency
        const spawnChance = this.data.frequency * deltaSeconds;
        if (Math.random() < spawnChance) {
          this.spawnFirework();
        }
      },

      spawnFirework: function(this: any) {
        const { randomNormal } = window.GAME_UTILS;
        
        // Calculate spawn position
        const angle = this.data.angle;
        const angleSpread = this.data.angleSpread;
        const angleRadians = this.degToRad(angle + randomNormal(-angleSpread, angleSpread));
        const radius = this.data.radius;
        
        const x = radius * Math.cos(angleRadians);
        const y = 0;
        const z = radius * Math.sin(angleRadians);
        
        // Create firework entity
        const firework = document.createElement('a-entity');
        firework.setAttribute('firework', '');
        firework.setAttribute('position', { x, y, z });
        
        // Set random flight parameters
        const maxHeight = randomNormal(this.data.minHeight, this.data.maxHeight);
        firework.setAttribute('firework', 'maxHeight', maxHeight);
        
        const riseTime = randomNormal(this.data.minRiseTime, this.data.maxRiseTime);
        firework.setAttribute('firework', 'riseTime', riseTime);
        
        // Add firework to scene
        this.sceneEl.appendChild(firework);
        this.fireworkCount++;
        
        // Track firework removal for limiting max count
        const onRemove = () => {
          this.fireworkCount--;
          firework.removeEventListener('removed', onRemove);
        };
        
        firework.addEventListener('removed', onRemove);
        
        // Chance of multi-firework (cluster)
        // 0.15 = 15% chance of double, 2.25% chance of triple, etc.
        const multiChance = 0.15;
        while (Math.random() < multiChance && this.fireworkCount < this.data.maxFireworks) {
          const fireworkExtra = document.createElement('a-entity');
          fireworkExtra.setAttribute('firework', '');
          
          // Synchronize position, height, time to explosion
          fireworkExtra.setAttribute('position', { x, y, z });
          fireworkExtra.setAttribute('firework', 'maxHeight', maxHeight);
          fireworkExtra.setAttribute('firework', 'riseTime', riseTime);
          
          // Add to scene and track removal
          this.sceneEl.appendChild(fireworkExtra);
          this.fireworkCount++;
          
          const onExtraRemove = () => {
            this.fireworkCount--;
            fireworkExtra.removeEventListener('removed', onExtraRemove);
          };
          
          fireworkExtra.addEventListener('removed', onExtraRemove);
        }
      },

      remove: function() {
        // Clean up any resources or event listeners if needed
      }
    });
  }
}

// Initialize the component
initializeFireworkSpawnerComponent();
