/**
 * Hitbox Component for A-Frame in React
 * 
 * This component creates a dedicated hitbox for raycasting detection.
 * It improves hit detection reliability by creating a simplified collision
 * volume that's easier for raycasters to hit than complex or nested objects.
 */

// Import THREE.js and AFRAME from our export utility
import * as THREE from 'three';
import AFRAME from './aframe-export';

// Interface for the hitbox component schema
interface HitboxComponentSchema {
  width: number;
  height: number;
  depth: number;
  offset: {
    x: number;
    y: number;
    z: number;
  };
  debug: boolean;
}

// Add to global registry type
declare global {
  interface Window {
    HITBOX_REGISTRY?: any[];
  }
}

export default function initializeHitboxComponent(): void {
    // Only register if the component hasn't been registered already
    if (!AFRAME.components['hitbox']) {
        AFRAME.registerComponent('hitbox', {
        schema: {
            width: { type: 'number', default: 1 },
            height: { type: 'number', default: 1 },
            depth: { type: 'number', default: 1 },
            offset: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
            debug: { type: 'boolean', default: false }
        },
        
        init: function(this: any): void {
            try {
                // Create the hitbox entity
                this.createHitbox();
                
                // Store initial position for updates
                this.lastPosition = new THREE.Vector3();
                this.lastPosition.copy(this.el.object3D.position);
                
                // Track if entity has enemy component
                this.isEnemy = this.el.hasAttribute('enemy-component');
                
                // Register with entity registry
                if (window.HITBOX_REGISTRY === undefined) {
                    window.HITBOX_REGISTRY = [];
                }
                window.HITBOX_REGISTRY.push(this);
                
                console.log('Hitbox initialized for:', this.el.id || 'unnamed entity');
            } catch (error) {
                console.error('Error initializing hitbox:', error);
            }
        },
        
        createHitbox: function(this: any): void {
            try {
                // Create a hitbox primitive
                const hitboxEntity = document.createElement('a-entity');
                hitboxEntity.classList.add('hitbox');
                
                // Position the hitbox
                const position = `${this.data.offset.x} ${this.data.offset.y + this.data.height/2} ${this.data.offset.z}`;
                hitboxEntity.setAttribute('position', position);
                
                // Add a simple box geometry
                const hitboxMesh = document.createElement('a-box');
                hitboxMesh.setAttribute('width', this.data.width);
                hitboxMesh.setAttribute('height', this.data.height);
                hitboxMesh.setAttribute('depth', this.data.depth);
                hitboxMesh.setAttribute('opacity', this.data.debug ? 0.2 : 0);
                hitboxMesh.setAttribute('color', this.isEnemy ? '#ff0000' : '#00ff00');
                hitboxMesh.setAttribute('class', 'hitbox-mesh');
                
                // Add data attributes for ray detection
                hitboxMesh.setAttribute('data-hitbox-owner', this.el.id || 'unnamed');
                hitboxMesh.setAttribute('data-hitbox-type', this.isEnemy ? 'enemy' : 'object');
                
                // Store direct reference to owner entity in THREE.js userData
                // This will be accessible during raycasting
                hitboxMesh.addEventListener('loaded', () => {
                    if ((hitboxMesh as any).object3D) {
                        (hitboxMesh as any).object3D.userData.ownerEntity = this.el;
                        (hitboxMesh as any).object3D.userData.isEnemyHitbox = this.isEnemy;
                        console.log('Hitbox mesh loaded with owner reference:', this.el.id || 'unnamed entity');
                    }
                });
                
                // Add a specific class for easier selection
                if (this.isEnemy) {
                    hitboxMesh.classList.add('enemy-hitbox');
                }
                
                // Add to entity
                hitboxEntity.appendChild(hitboxMesh);
                this.el.appendChild(hitboxEntity);
                
                // Store reference to hitbox
                this.hitboxEntity = hitboxEntity;
                this.hitboxMesh = hitboxMesh;
            } catch (error) {
                console.error('Error creating hitbox:', error);
            }
        },
        
        update: function(this: any): void {
            try {
                if (!this.hitboxMesh) return;
                
                // Update hitbox dimensions and visibility
                this.hitboxMesh.setAttribute('width', this.data.width);
                this.hitboxMesh.setAttribute('height', this.data.height);
                this.hitboxMesh.setAttribute('depth', this.data.depth);
                this.hitboxMesh.setAttribute('opacity', this.data.debug ? 0.2 : 0);
                
                // Update position
                const position = `${this.data.offset.x} ${this.data.offset.y + this.data.height/2} ${this.data.offset.z}`;
                this.hitboxEntity.setAttribute('position', position);
            } catch (error) {
                console.error('Error updating hitbox:', error);
            }
        },
        
        tick: function(this: any): void {
            try {
                // Update hitbox visibility based on entity state
                if (this.isEnemy && this.el.components['enemy-component']) {
                    const enemyComponent = this.el.components['enemy-component'];
                    if (enemyComponent.isDead && this.hitboxMesh) {
                        this.hitboxMesh.setAttribute('visible', false);
                    }
                }
            } catch (error) {
                console.error('Error in hitbox tick:', error);
            }
        },
        
        remove: function(this: any): void {
            try {
                // Remove from registry
                if (window.HITBOX_REGISTRY) {
                    const index = window.HITBOX_REGISTRY.indexOf(this);
                    if (index !== -1) {
                        window.HITBOX_REGISTRY.splice(index, 1);
                    }
                }
                
                // Clean up
                if (this.hitboxEntity && this.hitboxEntity.parentNode) {
                    this.hitboxEntity.parentNode.removeChild(this.hitboxEntity);
                }
            } catch (error) {
                console.error('Error removing hitbox:', error);
            }
        }
    });
    }
}

// Initialize the component
initializeHitboxComponent();