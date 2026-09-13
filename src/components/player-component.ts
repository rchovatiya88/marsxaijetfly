/**
 * Space Jetbike Player Component for A-Frame in React
 * 
 * Handles player movement, flying controls, physics and health
 * Modified to support high-speed space jetbike mechanics
 * Removed audio code and improved third-person camera
 */

// Import THREE.js - A-Frame is imported globally in App.js
import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';
import { gameAudio } from '../game-audio';

const AFRAME = AFRAME_EXPORT;

// Interface for the player component schema
interface PlayerComponentSchema {
  speed: number;
  sprintMultiplier: number;
  jumpForce: number;
  health: number;
  gravity: number;
  height: number;
  flyingEnabled: boolean;
  flyingSpeed: number;
  maxFlyingHeight: number;
  minFlyingHeight: number;
  cameraDistance: number; // Distance behind the jetbike
  cameraHeight: number;   // Height above the jetbike
}

// Interface for keyboard state
interface KeyState {
  KeyW: boolean;
  KeyA: boolean;
  KeyS: boolean;
  KeyD: boolean;
  KeyQ: boolean; // Down
  KeyE: boolean; // Up
  Space: boolean;
  ShiftLeft: boolean;
  [key: string]: boolean;
}

// Interface for boundaries
interface Boundaries {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export default function initializePlayerComponent(): void {
    // Only register if not already registered
    if (!AFRAME.components['player-component']) {
        AFRAME.registerComponent('player-component', {
        schema: {
            speed: { type: 'number', default: 5 },
            sprintMultiplier: { type: 'number', default: 1.5 },
            jumpForce: { type: 'number', default: 15 },
            health: { type: 'number', default: 100 },
            gravity: { type: 'number', default: 30 },
            height: { type: 'number', default: 1.6 },
            flyingEnabled: { type: 'boolean', default: true }, // Enable hover bike flying
            flyingSpeed: { type: 'number', default: 15 }, // Vertical flying speed
            maxFlyingHeight: { type: 'number', default: 50 }, // Maximum flying height
            minFlyingHeight: { type: 'number', default: 1.6 }, // Minimum flying height (ground level)
            cameraDistance: { type: 'number', default: 8 }, // Distance behind the jetbike
            cameraHeight: { type: 'number', default: 3 }  // Height above the jetbike
        },
        init: function(this: any): void {
            try {
                this.camera = this.el.querySelector('#camera');
                this.velocity = new THREE.Vector3(0, 0, 0);
                this.direction = new THREE.Vector3();
                this.verticalDirection = new THREE.Vector3(0, 0, 0); // For up/down flying movement
                this.isOnGround = true;
                this.isSprinting = false;
                this.isFlying = false; // Track if currently flying
                this.flyingHeight = this.data.height; // Current flying height
                this.health = this.data.health;
                this.maxHealth = this.data.health;
                this.isDead = false;
                this.lastDamageTime = 0;
                this.collisionRadius = 0.5;
                this.oldPosition = new THREE.Vector3();
                this.newPosition = new THREE.Vector3();
                this.groundRaycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 2);
                
                // Setup orbit camera controls
                this.setupThirdPersonCamera();
                
                this.setupControls();
                this.updateHealthUI();
                this.footstepTime = 0;
                this.footstepInterval = 0.5;
            } catch (error) {
                console.error('Error initializing player component:', error);
            }
        },
        updateHealthUI: function(this: any): void {
            try {
                const healthBar = document.getElementById('health-bar');
                if (healthBar) {
                    const healthPercent = (this.health / this.maxHealth) * 100;
                    healthBar.style.width = `${healthPercent}%`;
                    if (healthPercent <= 25) {
                        healthBar.style.backgroundColor = '#f00';
                    } else if (healthPercent <= 50) {
                        healthBar.style.backgroundColor = '#ff0';
                    } else {
                        healthBar.style.backgroundColor = '#0f0';
                    }
                }
            } catch (error) {
                console.error('Error updating health UI:', error);
            }
        },
        setupControls: function(this: any): void {
            try {
                this.keys = { 
                    KeyW: false, 
                    KeyA: false, 
                    KeyS: false, 
                    KeyD: false, 
                    KeyQ: false, // Down
                    KeyE: false, // Up
                    Space: false, 
                    ShiftLeft: false 
                } as KeyState;
                this.onKeyDown = this.onKeyDown.bind(this);
                this.onKeyUp = this.onKeyUp.bind(this);
                document.addEventListener('keydown', this.onKeyDown);
                document.addEventListener('keyup', this.onKeyUp);
                

            } catch (error) {
                console.error('Error setting up controls:', error);
            }
        },
        setupThirdPersonCamera: function(this: any): void {
            try {
                // Create camera rig entity for third-person view
                let cameraRig = this.el.querySelector('#camera-rig');
                if (!cameraRig) {
                    cameraRig = document.createElement('a-entity');
                    cameraRig.id = 'camera-rig';
                    this.el.appendChild(cameraRig);
                    
                    // Move camera from player to camera rig if needed
                    const camera = this.el.querySelector('#camera');
                    if (camera) {
                        cameraRig.appendChild(camera);
                    }
                }
                
                // Don't call updateCameraPosition here, it will be called in tick
                // when this.keys has been initialized
            } catch (error) {
                console.error('Error setting up third-person camera:', error);
            }
        },
        onKeyDown: function(this: any, event: KeyboardEvent): void {
            if (this.keys.hasOwnProperty(event.code)) {
                this.keys[event.code] = true;
                if (event.code === 'ShiftLeft') {
                    this.isSprinting = true;
                    this.footstepInterval = 0.3;
                }
            }
        },
        onKeyUp: function(this: any, event: KeyboardEvent): void {
            if (this.keys.hasOwnProperty(event.code)) {
                this.keys[event.code] = false;
                if (event.code === 'ShiftLeft') {
                    this.isSprinting = false;
                    this.footstepInterval = 0.5;
                }
            }
        },
        updateMovement: function(this: any, dt: number): void {
            try {
                if (this.isDead) return;
                if (!this.el.sceneEl.isPlaying) return;
                
                const { speed, jumpForce, gravity, sprintMultiplier, flyingEnabled, flyingSpeed, maxFlyingHeight, minFlyingHeight } = this.data as PlayerComponentSchema;
                
                // Store current position for velocity calculation
                this.oldPosition.copy(this.el.object3D.position);
                
                // Always flying in space - set isFlying to true
                this.isFlying = true;
                
                // Enforcing height limits if needed
                if (flyingEnabled) {
                    if (this.el.object3D.position.y > maxFlyingHeight) {
                        this.el.object3D.position.y = maxFlyingHeight;
                    }
                    
                    if (this.el.object3D.position.y < minFlyingHeight) {
                        this.el.object3D.position.y = minFlyingHeight;
                    }
                }
                
                // Check boundaries
                this.checkBoundaries();
                
                // Store new position and calculate velocity for UI elements
                this.newPosition.copy(this.el.object3D.position);
                const positionDelta = this.newPosition.clone().sub(this.oldPosition);
                // Velocity is owned by fly-controls.
                // this.velocity.copy(positionDelta.divideScalar(dt || 0.016)); // Calculate velocity for UI displays
                
                // Update camera position
                this.updateCameraPosition(dt);
                
                // Handle movement effects
                if (this.isMoving()) {
                    this.footstepTime += dt;
                    if (this.footstepTime >= this.footstepInterval) {
                        this.footstepTime = 0;
                        // Movement tracking logic (no sound)
                    }
                }
            } catch (error) {
                console.error('Error updating movement:', error);
            }
        },
        isMoving: function(this: any): boolean {
            // Check if the velocity magnitude is significant
            const minSpeed = 0.1; // Minimum speed to consider as moving
            return this.velocity && this.velocity.lengthSq() > minSpeed * minSpeed;
        },
        updateCameraPosition: function(this: any, dt: number): void {
            try {
                // NOTE: Camera positioning is now handled by fly-controls component
                // This function remains as a backup and for compatibility
                
                // Make sure player exists and is initialized
                if (!this.el || !this.el.object3D) {
                    console.log('Player object not found for camera update');
                    return;
                }
                
                // No need to update camera position as it's handled by fly-controls
            } catch (error) {
                console.error('Error updating camera position:', error);
            }
        },
        checkBoundaries: function(this: any): void {
            try {
                // Wider boundaries for space flight
                const boundaries: Boundaries = { minX: -500, maxX: 500, minZ: -500, maxZ: 500 };
                const pos = this.el.object3D.position;
                if (pos.x < boundaries.minX) pos.x = boundaries.minX;
                if (pos.x > boundaries.maxX) pos.x = boundaries.maxX;
                if (pos.z < boundaries.minZ) pos.z = boundaries.minZ;
                if (pos.z > boundaries.maxZ) pos.z = boundaries.maxZ;
            } catch (error) {
                console.error('Error checking boundaries:', error);
            }
        },
        takeDamage: function(this: any, amount: number): void {
            try {
                if (this.isDead) return;
                const now = this.el.sceneEl.components['game-manager'].elapsed;
                const absorbed = Math.min(this.shield || 0, amount);
                this.shield = (this.shield || 0) - absorbed;
                this.health -= amount - absorbed;
                gameAudio.pulse('damage');
                this.createDamageEffect();
                if (this.health <= 0) {
                    this.health = 0;
                    this.die();
                }
                this.updateHealthUI();
                this.lastDamageTime = now;
            } catch (error) {
                console.error('Error taking damage:', error);
            }
        },
        createDamageEffect: function(this: any): void {
            try {
                const damageOverlay = document.getElementById('damage-overlay');
                if (damageOverlay) {
                    damageOverlay.style.backgroundColor = 'rgba(0, 255, 255, 0.3)'; // Cyan for space theme
                    clearTimeout(this.damageTimer);
                    this.damageTimer = setTimeout(() => {
                        damageOverlay.style.backgroundColor = 'rgba(0, 255, 255, 0)';
                    }, 100);
                }
            } catch (error) {
                console.error('Error creating damage effect:', error);
            }
        },
        die: function(this: any): void {
            try {
                if (this.isDead) return;
                this.isDead = true;
                console.log('Player died');
                
                // The result overlay owns defeat feedback. Do not allocate a particle cloud
                // that can never finish once mission-ended pauses the scene.
                // Hide the jetbike
                const jetbike = document.querySelector('#jetbike');
                if (jetbike) {
                    jetbike.setAttribute('visible', 'false');
                }
                
                this.el.emit('player-died', {});
            } catch (error) {
                console.error('Error handling player death:', error);
            }
        },
        resetMission: function(this: any): void {
            clearTimeout(this.damageTimer);
            this.health = this.maxHealth;
            this.shield = 0;
            this.isDead = false;
            this.lastDamageTime = 0;
            this.velocity.set(0, 0, 0);
            this.isSprinting = false;
            this.footstepTime = 0;
            this.footstepInterval = 0.5;
            Object.keys(this.keys).forEach(key => { this.keys[key] = false; });
            this.el.querySelector('#jetbike')?.setAttribute('visible', true);
            const overlay = document.getElementById('damage-overlay');
            if (overlay) overlay.style.backgroundColor = 'transparent';
            this.updateHealthUI();
        },
        tick: function(this: any, time: number, delta: number): void {
            try {
                const dt = delta / 1000;
                if (this.el.sceneEl.isPlaying) {
                    this.updateMovement(dt);
                    const now = this.el.sceneEl.components['game-manager'].elapsed;
                    if (this.health < this.maxHealth && now - this.lastDamageTime > 5000) {
                        this.health += 5 * dt;
                        if (this.health > this.maxHealth) {
                            this.health = this.maxHealth;
                        }
                        this.updateHealthUI();
                    }
                }
            } catch (error) {
                console.error('Error in player tick:', error);
            }
        },
        remove: function(this: any): void {
            try {
                clearTimeout(this.damageTimer);
                document.removeEventListener('keydown', this.onKeyDown);
                document.removeEventListener('keyup', this.onKeyUp);
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            } catch (error) {
                console.error('Error removing player component:', error);
            }
        }
    });
    }
}

// Initialize the component
initializePlayerComponent();
