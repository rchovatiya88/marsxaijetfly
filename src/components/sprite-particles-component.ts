/**
 * Sprite Particles Component for A-Frame in React
 * 
 * A wrapper for the aframe-sprite-particles-component library to provide standardized
 * presets and integration with the ReactFPS game.
 */

import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';

const AFRAME = AFRAME_EXPORT;

// Define the presets for common particle effects
const PARTICLE_PRESETS = {
  // Thruster presets
  thruster: {
    texture: '/images/particles/particle-spark.png',
    color: '#00f,#0ff,#09f',
    particleSize: 0.05,
    spawnRate: 20,
    lifeTime: 0.5,
    direction: 'backward',
    velocity: '.1 .1 .3..0.1 .1 0.5',
    scale: '1,0.1',
    opacity: '0.7,0',
    blending: 'additive',
    radialType: 'circle'
  },
  thrusterFast: {
    texture: '/images/particles/sparkle.png',
    color: '#00f,#0ff,#09f',
    particleSize: 0.1,
    spawnRate: 40,
    lifeTime: 0.6,
    direction: 'backward',
    velocity: '.1 .1 1..0.1 .1 2',
    scale: '1.5,0.1',
    opacity: '0.9,0',
    blending: 'additive',
    radialType: 'circle'
  },
  
  // Weapon effects
  muzzleFlash: {
    texture: '/images/particles/sparkle.png',
    color: '#ff0,#ff8,#f80',
    particleSize: 0.1,
    spawnRate: 30,
    spawnType: 'burst',
    lifeTime: 0.15,
    velocity: '.1 .1 .5..0.2 .2 0.8',
    radialVelocity: '0.3..0.8',
    scale: '1.5,0.1',
    opacity: '1,0',
    blending: 'additive'
  },
  
  // Impact effects
  impact: {
    texture: '/images/particles/circle.png',
    color: '#888,#aaa,#ccc',
    particleSize: 0.03,
    spawnRate: 20,
    spawnType: 'burst',
    lifeTime: 0.5,
    velocity: '.05 .05 .05..0.2 0.2 0.2',
    radialVelocity: '0.2..0.5',
    scale: '1,0.1',
    opacity: '0.8,0',
    blending: 'normal'
  },
  
  // Hit effects for enemies
  enemyHit: {
    texture: '/images/particles/sparkle.png',
    color: '#0ff,#00f,#fff',
    particleSize: 0.15,
    spawnRate: 25,
    spawnType: 'burst',
    lifeTime: 0.3,
    velocity: '.1 .1 .1..0.3 0.3 0.3',
    radialVelocity: '0.3..1.0',
    scale: '1,0.1',
    opacity: '0.8,0',
    blending: 'additive'
  },
  
  // Explosion effect
  explosion: {
    texture: '/images/particles/circle-gradient.png',
    particleSize: 2.0,
    spawnRate: 30,
    spawnType: 'burst', 
    lifeTime: 1.0,
    radialVelocity: '1..3',
    scale: '3,6,2',
    opacity: '0.9,1,0',
    blending: 'additive',
    rotation: '0..360'
  },
  
  // Dust effect
  dust: {
    texture: '/images/particles/fog.png',
    color: '#fff8e0,#f0e8d0',
    particleSize: 0.3,
    spawnRate: 5,
    lifeTime: 1.5,
    velocity: '-.1 .05 -.1 .. .1 .2 .1',
    scale: '1,3,0',
    opacity: '0.3,0.5,0',
    rotation: '0..360'
  }
};

// Presets as standard dust, fire, smoke, etc. for compatibility
const COMPATIBILITY_PRESETS = {
  dust: PARTICLE_PRESETS.dust,
  fire: {
    texture: '/images/particles/sparkle.png',
    color: '#ff0,#f80,#f00,#800',
    particleSize: 0.2,
    spawnRate: 15,
    lifeTime: 1.0,
    velocity: '-.05 .3 -.05 .. .05 .6 .05',
    scale: '1,1.5,0.2',
    opacity: '0.7,0.9,0',
    blending: 'additive',
    radialType: 'sphere',
    radialPosition: '0.1'
  },
  smoke: {
    texture: '/images/particles/fog-256.png',
    color: '#888,#aaa,#ccc',
    particleSize: 0.5,
    spawnRate: 5,
    lifeTime: 2.0,
    velocity: '-.05 .05 -.05 .. .05 .15 .05',
    scale: '1,4,5',
    opacity: '0,0.4,0',
    rotation: '0..360',
    drag: '0.1'
  },
  rain: {
    texture: '/images/particles/drop.png',
    color: '#8af,#acf',
    particleSize: 0.1,
    spawnRate: 100,
    lifeTime: 1.0,
    velocity: '0 -5 0',
    position: '-10 5 -10..10 8 10',
    opacity: '0.3,0.5',
    scale: '1,1',
    blending: 'normal'
  }
};

// Interface for preset names
interface ParticlePresetsMap {
  [key: string]: any;
}

// Combine both preset maps
const ALL_PRESETS: ParticlePresetsMap = {
  ...PARTICLE_PRESETS,
  ...COMPATIBILITY_PRESETS
};

export default function initializeSpriteParticlesComponent(): void {
  // Don't register if already registered
  if (!AFRAME.components['particle-system']) {
    AFRAME.registerComponent('particle-system', {
      schema: {
        preset: { type: 'string', default: '' },
        texture: { type: 'string', default: '/textures/particles/blob.svg' },
        textureFrame: { type: 'string', default: '' },
        color: { type: 'string', default: '#fff' },
        size: { type: 'number', default: 0.1 },
        particleSize: { type: 'number', default: 0.1 },
        particleCount: { type: 'number', default: 20 },
        spawnRate: { type: 'number', default: 20 },
        lifeTime: { type: 'number', default: 1.0 },
        duration: { type: 'number', default: -1 },
        velocity: { type: 'string', default: '0 1 0' },
        acceleration: { type: 'string', default: '0 0 0' },
        radialVelocity: { type: 'string', default: '' },
        radialAcceleration: { type: 'string', default: '' },
        direction: { type: 'string', default: 'forward' },
        blending: { type: 'string', default: 'normal' },
        rotation: { type: 'string', default: '0' },
        opacity: { type: 'string', default: '1' },
        scale: { type: 'string', default: '1' },
        color2: { type: 'string', default: '' },
        position: { type: 'string', default: '0 0 0' },
        positionSpread: { type: 'string', default: '' },
        radialType: { type: 'string', default: '' },
        radialPosition: { type: 'string', default: '' },
        spawnType: { type: 'string', default: 'continuous' },
        drag: { type: 'number', default: 0 }
      },

      init: function(this: any) {
        // Log initialization
        console.log('Initializing particle-system wrapper component');
        
        // Create a new entity for the sprite-particles
        const particlesEntity = document.createElement('a-entity');
        this.particlesEntity = particlesEntity;
        
        // Apply preset if provided
        if (this.data.preset && ALL_PRESETS[this.data.preset]) {
          const preset = ALL_PRESETS[this.data.preset];
          // Apply preset properties to the entity
          this.applyPresetToEntity(particlesEntity, preset);
        } else {
          // Apply manual configuration
          this.applyConfigToEntity(particlesEntity, this.data);
        }
        
        // Add particles entity as a child
        this.el.appendChild(particlesEntity);
      },
      
      applyPresetToEntity: function(this: any, entity: Element, preset: any) {
        // Convert preset object to sprite-particles attribute string
        const spriteParticlesAttrs: Record<string, any> = { ...preset };
        
        // Update texture paths to use the new images folder
        if (spriteParticlesAttrs.texture && spriteParticlesAttrs.texture.startsWith('/textures/particles/')) {
          // Replace texture path with new images path
          const fileName = spriteParticlesAttrs.texture.split('/').pop();
          const fileNameWithoutExt = fileName.split('.')[0];
          // Look for matching file name in images/particles
          const possibleReplacements = [
            `/images/particles/${fileNameWithoutExt}.png`,
            `/images/particles/${fileNameWithoutExt}.svg`,
          ];
          // Use the first replacement as default
          spriteParticlesAttrs.texture = possibleReplacements[0];
        }
        
        // Handle specific property translations
        if (preset.particleSize && !preset.particleCount) {
          spriteParticlesAttrs.particleSize = preset.particleSize;
        }
        
        if (preset.particleCount && !preset.spawnRate) {
          // Estimate spawn rate from particle count
          spriteParticlesAttrs.spawnRate = preset.particleCount / preset.lifeTime;
        }
        
        // Handle size to particleSize conversion
        if (preset.size && !preset.particleSize) {
          spriteParticlesAttrs.particleSize = preset.size * 100; // Convert scale
        }
        
        // Apply all attributes to the sprite-particles component
        entity.setAttribute('sprite-particles', spriteParticlesAttrs);
      },
      
      applyConfigToEntity: function(this: any, entity: Element, config: any) {
        // Convert config to sprite-particles attributes
        const attrs: Record<string, any> = {};
        
        // Map texture property with path adjustment
        if (config.texture) {
          // Check if the texture path needs to be updated
          if (config.texture.startsWith('/textures/particles/')) {
            // Replace texture path with new images path
            const fileName = config.texture.split('/').pop();
            const fileNameWithoutExt = fileName.split('.')[0];
            // Look for matching file name in images/particles
            attrs.texture = `/images/particles/${fileNameWithoutExt}.png`;
          } else {
            attrs.texture = config.texture;
          }
        }
        
        if (config.textureFrame) {
          attrs.textureFrame = config.textureFrame;
        }
        
        attrs.color = config.color;
        
        // Convert if only color2 is provided
        if (config.color2 && config.color) {
          attrs.color = `${config.color},${config.color2}`;
        }
        
        // Handle particleSize
        if (config.particleSize) {
          attrs.particleSize = config.particleSize * 100; // Convert to appropriate scale
        } else if (config.size) {
          attrs.particleSize = config.size * 100;
        }
        
        // Handle spawn rate and lifetime
        attrs.spawnRate = config.spawnRate || config.particleCount || 20;
        attrs.lifeTime = config.lifeTime || 1.0;
        
        if (config.duration && config.duration > 0) {
          attrs.duration = config.duration;
        }
        
        // Movement properties
        if (config.velocity) attrs.velocity = config.velocity;
        if (config.acceleration) attrs.acceleration = config.acceleration;
        if (config.radialVelocity) attrs.radialVelocity = config.radialVelocity;
        if (config.radialAcceleration) attrs.radialAcceleration = config.radialAcceleration;
        
        // Appearance properties
        if (config.direction) attrs.direction = config.direction;
        if (config.blending) attrs.blending = config.blending === 'additive' ? 'additive' : 'normal';
        if (config.rotation) attrs.rotation = config.rotation;
        if (config.opacity) attrs.opacity = config.opacity;
        if (config.scale) attrs.scale = config.scale;
        
        // Position and distribution
        if (config.position) attrs.position = config.position;
        if (config.positionSpread) attrs.position = config.positionSpread; // Convert to position range
        if (config.radialType) attrs.radialType = config.radialType;
        if (config.radialPosition) attrs.radialPosition = config.radialPosition;
        
        // Spawn type
        if (config.spawnType) attrs.spawnType = config.spawnType;
        
        // Drag
        if (config.drag) attrs.drag = config.drag;
        
        // Apply all attributes to the sprite-particles component
        entity.setAttribute('sprite-particles', attrs);
      },
      
      update: function(this: any, oldData: any) {
        // Handle updates to the component's data
        if (this.particlesEntity) {
          if (this.data.preset && this.data.preset !== oldData.preset && ALL_PRESETS[this.data.preset]) {
            // Preset changed - apply new preset
            this.applyPresetToEntity(this.particlesEntity, ALL_PRESETS[this.data.preset]);
          } else {
            // Manual config changed
            this.applyConfigToEntity(this.particlesEntity, this.data);
          }
        }
      },
      
      remove: function(this: any) {
        // Clean up when component is removed
        if (this.particlesEntity && this.particlesEntity.parentNode) {
          this.particlesEntity.parentNode.removeChild(this.particlesEntity);
        }
      }
    });
  }
}

// Export presets for direct access by other components
export { PARTICLE_PRESETS, COMPATIBILITY_PRESETS, ALL_PRESETS };
