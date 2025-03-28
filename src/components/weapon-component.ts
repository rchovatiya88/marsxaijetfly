/**
 * Hover Bike Weapon Component for A-Frame in React
 * 
 * Handles the hover bike model, flying animations, particle effects,
 * weapon functionality, shooting, and hit detection
 */

// Import THREE.js - A-Frame is imported globally in App.js
import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';

const AFRAME = AFRAME_EXPORT;

// Extending Window interface to add HITBOX_REGISTRY
declare global {
    interface Window {
        HITBOX_REGISTRY?: any[];
    }
}

// Interface for hitbox components
interface HitboxComponent {
    isEnemy?: boolean;
    hitboxMesh?: any;
}

// Interface for the hover bike weapon component schema
interface WeaponComponentSchema {
  damage: number;
  cooldown: number;
  range: number;
  clipSize: number;
  reloadTime: number;
  automatic: boolean;
  accuracy: number;
  hoverHeight: number;
  hoverSpeed: number;
  hoverAmount: number;
  thrusterParticles: boolean;
}

export default function initializeWeaponComponent(): void {
    // Only register if not already registered
    if (!AFRAME.components['weapon-component']) {
        AFRAME.registerComponent('weapon-component', {
        schema: {
            damage: { type: 'number', default: 25 }, // 25 damage = 4 hits to kill a 100 HP enemy
            cooldown: { type: 'number', default: 0.5 },
            range: { type: 'number', default: 100 },
            clipSize: { type: 'number', default: 30 },
            reloadTime: { type: 'number', default: 2 },
            automatic: { type: 'boolean', default: true },
            accuracy: { type: 'number', default: 0.98 }, // High accuracy for better hit detection
            hoverHeight: { type: 'number', default: 0.05 }, // How much the bike hovers up and down
            hoverSpeed: { type: 'number', default: 2 }, // Speed of hover animation
            hoverAmount: { type: 'number', default: 0.05 }, // Intensity of hover effect
            thrusterParticles: { type: 'boolean', default: true } // Whether to show thruster particles
        },
        init: function(this: any): void {
            try {
                this.lastShot = 0;
                this.isReloading = false;
                this.ammoInClip = this.data.clipSize;
                this.reloadTimer = null;
                this.raycaster = new THREE.Raycaster();
                this.hoverTime = 0; // For hover animation
                this.thrusterParticles = []; // Store thruster particle entities
                this.createHoverBikeModel();
                this.setupEventListeners();
                this.updateAmmoDisplay();
                this.mouseDown = false;
                this.fireLoopId = null;
                
                // Setup hover animation
                if (this.el.object3D) {
                    this.initialPosition = new THREE.Vector3();
                    this.initialPosition.copy(this.el.object3D.position);
                }
                
                // Create thruster particles if enabled
                if (this.data.thrusterParticles) {
                    this.createThrusterParticles();
                }
            } catch (error) {
                console.error('Error initializing hover bike component:', error);
            }
        },
        createHoverBikeModel: function(this: any): void {
            try {
                // Remove any existing model
                if (this.el.getObject3D('mesh')) {
                    this.el.removeObject3D('mesh');
                }

                // Create a new entity for the hover bike model
                const bikeEntity = document.createElement('a-entity');
                bikeEntity.setAttribute('gltf-model', '/models/jetbickavi.glb');
                bikeEntity.setAttribute('position', '0 -0.5 -0.8'); // Position the bike in front of camera
                bikeEntity.setAttribute('rotation', '0 180 0'); // Rotate to face forward
                bikeEntity.setAttribute('scale', '0.4 0.4 0.4'); // Scale appropriately for first-person view
                bikeEntity.setAttribute('id', 'hover-bike-model');
                this.el.appendChild(bikeEntity);
                this.bikeEntity = bikeEntity;
                
                // Set up hover animation instead of recoil
                this.el.setAttribute('animation__hover', {
                    property: 'position.y',
                    from: `-0.5`,
                    to: `-0.5 + ${this.data.hoverHeight}`,
                    dir: 'alternate',
                    dur: 1000 / this.data.hoverSpeed,
                    loop: true,
                    easing: 'easeInOutSine'
                });
                
                // Add slight rotation animation for additional effect
                this.el.setAttribute('animation__tilt', {
                    property: 'rotation.z',
                    from: '-1',
                    to: '1',
                    dir: 'alternate',
                    dur: 1500 / this.data.hoverSpeed,
                    loop: true,
                    easing: 'easeInOutSine'
                });
            } catch (error) {
                console.error('Error creating hover bike model:', error);
            }
        },
        setupEventListeners: function(this: any): void {
            try {
                this.onMouseDown = this.onMouseDown.bind(this);
                this.onMouseUp = this.onMouseUp.bind(this);
                document.addEventListener('mousedown', this.onMouseDown);
                document.addEventListener('mouseup', this.onMouseUp);
            } catch (error) {
                console.error('Error setting up event listeners:', error);
            }
        },
        onMouseDown: function(this: any, event: MouseEvent): void {
            try {
                if (!document.pointerLockElement) return;
                if (event.button !== 0) return;
                this.mouseDown = true;
                if (this.data.automatic) {
                    this.startFiring();
                } else {
                    this.shoot();
                }
            } catch (error) {
                console.error('Error on mouse down:', error);
            }
        },
        onMouseUp: function(this: any, event: MouseEvent): void {
            try {
                if (event.button !== 0) return;
                this.mouseDown = false;
                if (this.data.automatic) {
                    this.stopFiring();
                }
            } catch (error) {
                console.error('Error on mouse up:', error);
            }
        },
        startFiring: function(this: any): void {
            try {
                if (this.fireLoopId !== null) {
                    clearInterval(this.fireLoopId);
                }
                this.shoot();
                this.fireLoopId = setInterval(() => {
                    if (!this.mouseDown) {
                        this.stopFiring();
                        return;
                    }
                    this.shoot();
                }, this.data.cooldown * 1000);
            } catch (error) {
                console.error('Error starting automatic fire:', error);
            }
        },
        stopFiring: function(this: any): void {
            try {
                if (this.fireLoopId !== null) {
                    clearInterval(this.fireLoopId);
                    this.fireLoopId = null;
                }
            } catch (error) {
                console.error('Error stopping automatic fire:', error);
            }
        },
        updateAmmoDisplay: function(this: any): void {
            try {
                const ammoDisplay = document.getElementById('ammo-display');
                if (ammoDisplay) {
                    if (this.isReloading) {
                        ammoDisplay.textContent = 'RELOADING...';
                    } else {
                        ammoDisplay.textContent = `${this.ammoInClip} / ∞`;
                    }
                }
            } catch (error) {
                console.error('Error updating ammo display:', error);
            }
        },
        reload: function(this: any): void {
            try {
                if (this.isReloading) return;
                if (this.ammoInClip === this.data.clipSize) return;
                this.isReloading = true;
                this.updateAmmoDisplay();
                console.log('Reloading...');
                
                // Reload start
                
                this.reloadTimer = setTimeout(() => {
                    this.ammoInClip = this.data.clipSize;
                    this.isReloading = false;
                    this.updateAmmoDisplay();
                    
                    // Reload complete
                    
                    console.log('Reload complete.');
                }, this.data.reloadTime * 1000);
            } catch (error) {
                console.error('Error reloading weapon:', error);
            }
        },
        createThrusterParticles: function(this: any): void {
            try {
                // Create thruster light effects at the back of the bike instead of particles
                const leftThruster = document.createElement('a-entity');
                leftThruster.setAttribute('position', '-0.15 -0.5 -0.6');
                leftThruster.setAttribute('light', {
                    type: 'point',
                    color: '#00f',
                    intensity: 1.0,
                    distance: 0.5
                });
                
                const rightThruster = document.createElement('a-entity');
                rightThruster.setAttribute('position', '0.15 -0.5 -0.6');
                rightThruster.setAttribute('light', {
                    type: 'point',
                    color: '#00f',
                    intensity: 1.0,
                    distance: 0.5
                });
                
                this.el.appendChild(leftThruster);
                this.el.appendChild(rightThruster);
                
                this.thrusterParticles.push(leftThruster, rightThruster);
            } catch (error) {
                console.error('Error creating thruster lights:', error);
            }
        },
        
        applyWeaponFeedback: function(this: any): void {
            try {
                // Flash effect for bike weapons instead of recoil
                const flashDuration = 100; // milliseconds
                
                // Create temporary muzzle flash at weapon points
                const leftMuzzle = document.createElement('a-entity');
                leftMuzzle.setAttribute('position', '-0.3 -0.4 -1.0');
                leftMuzzle.setAttribute('light', {
                    type: 'point',
                    color: '#ff0',
                    intensity: 2,
                    distance: 0.5
                });
                
                const rightMuzzle = document.createElement('a-entity');
                rightMuzzle.setAttribute('position', '0.3 -0.4 -1.0');
                rightMuzzle.setAttribute('light', {
                    type: 'point',
                    color: '#ff0',
                    intensity: 2,
                    distance: 0.5
                });
                
                this.el.appendChild(leftMuzzle);
                this.el.appendChild(rightMuzzle);
                
                // Remove after a short duration
                setTimeout(() => {
                    if (leftMuzzle.parentNode) leftMuzzle.parentNode.removeChild(leftMuzzle);
                    if (rightMuzzle.parentNode) rightMuzzle.parentNode.removeChild(rightMuzzle);
                }, flashDuration);
            } catch (error) {
                console.error('Error applying weapon feedback:', error);
            }
        },
        createMuzzleFlash: function(this: any): void {
            try {
                const flash = document.createElement('a-entity');
                const worldPosition = new THREE.Vector3();
                this.el.object3D.getWorldPosition(worldPosition);
                
                // Get camera with proper null check
                const cameraEl = document.querySelector('#camera');
                if (!cameraEl || !cameraEl.object3D) {
                    console.warn('Camera element not found, skipping muzzle flash');
                    return;
                }
                
                const camera = cameraEl.object3D;
                const direction = new THREE.Vector3(0, 0, -1);
                direction.applyQuaternion(camera.quaternion);
                const position = new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z)
                    .add(direction.multiplyScalar(0.4));
                flash.setAttribute('position', position);
                flash.setAttribute('light', {
                    type: 'point',
                    color: '#ff0',
                    intensity: 2.0,
                    distance: 2.0,
                    decay: 10
                });
                
                // Add the flash to the scene with null check
                const sceneEl = document.querySelector('a-scene');
                if (!sceneEl) {
                    console.warn('Scene element not found, skipping muzzle flash');
                    return;
                }
                
                sceneEl.appendChild(flash);
                setTimeout(() => {
                    if (flash.parentNode) {
                        flash.parentNode.removeChild(flash);
                    }
                }, 100);
            } catch (error) {
                console.error('Error creating muzzle flash:', error);
            }
        },
        createTracer: function(this: any, start: THREE.Vector3, end: THREE.Vector3, color: string = '#0ff'): void {
            try {
                const sceneEl = document.querySelector('a-scene');
                if (!sceneEl || !sceneEl.object3D) {
                    console.warn('Scene element not found, skipping tracer');
                    return;
                }
                const scene = sceneEl.object3D;
                
                const material = new THREE.LineBasicMaterial({ 
                    color: new THREE.Color(color), 
                    transparent: true, 
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    linewidth: 2 // Note: Line width only works in WebGLRenderer for now
                });
                const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
                const line = new THREE.Line(geometry, material);
                scene.add(line);
                setTimeout(() => {
                    scene.remove(line);
                    line.geometry.dispose();
                    line.material.dispose();
                }, 100);
            } catch (error) {
                console.error('Error creating tracer:', error);
            }
        },
        createHitEffect: function(this: any, position: THREE.Vector3): void {
            try {
                const hitEffect = document.createElement('a-entity');
                hitEffect.setAttribute('position', position);
                hitEffect.setAttribute('light', {
                    type: 'point',
                    color: '#0ff',
                    intensity: 2.0,
                    distance: 2.0,
                    decay: 10
                });
                
                // Add a small sphere to represent the hit
                const sphere = document.createElement('a-sphere');
                sphere.setAttribute('radius', 0.1);
                sphere.setAttribute('color', '#0ff');
                sphere.setAttribute('material', 'emissive: #0ff; emissiveIntensity: 1.0');
                sphere.setAttribute('opacity', 0.7);
                hitEffect.appendChild(sphere);
                
                // Add the hit effect to the scene with null check
                const sceneEl = document.querySelector('a-scene');
                if (!sceneEl) {
                    console.warn('Scene element not found, skipping hit effect');
                    return;
                }
                
                sceneEl.appendChild(hitEffect);
                setTimeout(() => {
                    if (hitEffect.parentNode) {
                        hitEffect.parentNode.removeChild(hitEffect);
                    }
                }, 300);
            } catch (error) {
                console.error('Error creating hit effect:', error);
            }
        },
        createImpactEffect: function(this: any, position: THREE.Vector3, normal: THREE.Vector3): void {
            try {
                const impactEffect = document.createElement('a-entity');
                impactEffect.setAttribute('position', position);
                const orientationQuaternion = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    normal
                );
                const orientationEuler = new THREE.Euler().setFromQuaternion(orientationQuaternion);
                const rotation = {
                    x: THREE.MathUtils.radToDeg(orientationEuler.x),
                    y: THREE.MathUtils.radToDeg(orientationEuler.y),
                    z: THREE.MathUtils.radToDeg(orientationEuler.z)
                };
                impactEffect.setAttribute('rotation', rotation);
                
                // Create a disc to represent the impact
                const disc = document.createElement('a-circle');
                disc.setAttribute('radius', 0.1);
                disc.setAttribute('color', '#888');
                disc.setAttribute('material', 'emissive: #888; emissiveIntensity: 0.5');
                impactEffect.appendChild(disc);
                
                // Add a light to the impact point
                impactEffect.setAttribute('light', {
                    type: 'point',
                    color: '#888',
                    intensity: 1.0,
                    distance: 1.0,
                    decay: 10
                });
                
                // Add to scene with null check
                const sceneEl = document.querySelector('a-scene');
                if (!sceneEl) {
                    console.warn('Scene element not found, skipping impact effect');
                    return;
                }
                
                sceneEl.appendChild(impactEffect);
                setTimeout(() => {
                    if (impactEffect.parentNode) {
                        impactEffect.parentNode.removeChild(impactEffect);
                    }
                }, 300);
            } catch (error) {
                console.error('Error creating impact effect:', error);
            }
        },
        shoot: function(this: any): void {
            try {
                const now = performance.now();
                if (this.isReloading || this.ammoInClip <= 0 || now - this.lastShot < this.data.cooldown * 1000) {
                    if (this.ammoInClip <= 0) this.reload();
                    return;
                }
                
                this.lastShot = now;
                this.ammoInClip--;
                this.updateAmmoDisplay();
                
                // Play low ammo warning sound when ammo is getting low
                if (this.ammoInClip <= 5 && this.ammoInClip > 0) {
                    // Low ammo warning (visual only)
                    this.showHitMarker();
                }
                
                this.applyWeaponFeedback();
                this.createMuzzleFlash();
                
                // Weapon firing effect
                
                // Get camera for direction and jetbike position for origin
                const cameraEl = document.querySelector('#camera');
                if (!cameraEl || !cameraEl.object3D) {
                    console.warn('Camera element not found, skipping shoot action');
                    return;
                }
                const camera = cameraEl.object3D;
                const weaponPosition = new THREE.Vector3();
                this.el.object3D.getWorldPosition(weaponPosition);
                
                // Add slight randomization based on accuracy parameter
                const accuracy = this.data.accuracy; // 1.0 = perfect accuracy, lower values = more spread
                const spread = 1.0 - accuracy;
                
                // Create base direction from camera direction
                const direction = new THREE.Vector3(0, 0, -1);
                direction.applyQuaternion(camera.quaternion);
                
                // Add randomized spread based on accuracy - use smaller values for more precision
                if (spread > 0) {
                    direction.x += (Math.random() - 0.5) * spread * 0.05; // Reduced spread
                    direction.y += (Math.random() - 0.5) * spread * 0.05; // Reduced spread
                    direction.z += (Math.random() - 0.5) * spread * 0.005; // Minimal spread in forward direction
                    direction.normalize(); // Ensure it's still a unit vector
                }
                
                // Set raycaster with weapon position and direction
                this.raycaster.set(weaponPosition, direction);
                this.raycaster.far = this.data.range; // Explicitly set maximum range
                
                console.log('Firing weapon - Direction:', direction);
                
                // Collect all hittable targets
                const allTargets: THREE.Object3D[] = [];
                
                // Get enemies using multiple methods for redundancy
                let enemies: Element[] = [];
                
                // Method 1: Direct selector
                const enemyElements = document.querySelectorAll('[enemy-component]');
                enemyElements.forEach((enemy: Element) => {
                    if ((enemy as any).object3D) {
                        allTargets.push((enemy as any).object3D);
                        enemies.push(enemy);
                    }
                });
                
                // Method 2: Get entities with hitbox component marked as enemies
                const hitboxElements = document.querySelectorAll('.hitbox-mesh[data-hitbox-type="enemy"]');
                hitboxElements.forEach((hitbox: Element) => {
                    if ((hitbox as any).object3D) {
                        allTargets.push((hitbox as any).object3D);
                    }
                });
                
                // Method 3: Use registry if available
                try {
                    if (window.HITBOX_REGISTRY) {
                        window.HITBOX_REGISTRY.forEach((hitboxComponent: any) => {
                            if (hitboxComponent && hitboxComponent.isEnemy && hitboxComponent.hitboxMesh) {
                                const hitboxObject = (hitboxComponent.hitboxMesh as any).object3D;
                                if (hitboxObject) {
                                    allTargets.push(hitboxObject);
                                }
                            }
                        });
                    }
                } catch (err) {
                    console.warn('Error accessing hitbox registry:', err);
                }
                
                // Log enemy count for debugging
                console.log(`Found ${enemies.length} potential enemy targets and ${allTargets.length} total targets`);
                
                const obstacles = document.querySelectorAll('.obstacle, [ground]');
                obstacles.forEach((obstacle: Element) => {
                    if ((obstacle as any).object3D) allTargets.push((obstacle as any).object3D);
                });
                
                // Perform multiple raycasts with slight variations for more forgiving hit detection
                // Center ray
                const intersects = this.raycaster.intersectObjects(allTargets, true);
                
                // Extra rays with slight variations if the main ray missed
                let allRayIntersects: THREE.Intersection[] = [];
                if (intersects.length > 0) {
                    allRayIntersects = intersects;
                } else {
                    // Try additional rays with small offsets if main ray missed
                    const offsetAmount = 0.1;
                    const offsets = [
                        new THREE.Vector3(offsetAmount, 0, 0),
                        new THREE.Vector3(-offsetAmount, 0, 0),
                        new THREE.Vector3(0, offsetAmount, 0),
                        new THREE.Vector3(0, -offsetAmount, 0)
                    ];
                    
                    for (const offset of offsets) {
                        const offsetDirection = direction.clone().add(offset).normalize();
                        this.raycaster.set(weaponPosition, offsetDirection);
                        const offsetIntersects = this.raycaster.intersectObjects(allTargets, true);
                        if (offsetIntersects.length > 0) {
                            allRayIntersects = offsetIntersects;
                            console.log('Hit detected with offset ray');
                            break;
                        }
                    }
                }
                
                if (allRayIntersects.length > 0) {
                    const closestHit = allRayIntersects[0];
                    const hitPoint = closestHit.point;
                    let hitEntity = null;
                    let currentObj = closestHit.object;
                    
                    // Debug info for hit object
                    console.log('Hit object:', currentObj);
                    
                    // Check if this is a hitbox mesh via userData
                    if (currentObj.userData && currentObj.userData.ownerEntity) {
                        console.log('Direct hitbox reference found! Owner:', currentObj.userData.ownerEntity.id || 'unnamed');
                        hitEntity = currentObj.userData.ownerEntity;
                    } 
                    // Check if this is a hitbox via class or attributes
                    else if ((currentObj as any).el && (
                        (currentObj as any).el.classList.contains('hitbox-mesh') ||
                        (currentObj as any).el.classList.contains('enemy-hitbox') ||
                        (currentObj as any).el.getAttribute('data-hitbox-type') === 'enemy'
                    )) {
                        // Get owner ID from data attribute
                        const ownerId = (currentObj as any).el.getAttribute('data-hitbox-owner');
                        console.log('Hitbox detected by class/attribute. Owner ID:', ownerId);
                        
                        // Try to find the owner entity
                        if (ownerId) {
                            const ownerEntity = document.getElementById(ownerId);
                            if (ownerEntity) {
                                hitEntity = ownerEntity;
                                console.log('Found owner entity by ID');
                            }
                        }
                        
                        // If we couldn't find the owner, use the direct parent
                        if (!hitEntity && (currentObj as any).el.parentNode) {
                            let parent = (currentObj as any).el.parentNode;
                            while (parent && !parent.hasAttribute('enemy-component')) {
                                parent = parent.parentNode;
                                if (!parent) break;
                            }
                            
                            if (parent && parent.hasAttribute('enemy-component')) {
                                hitEntity = parent;
                                console.log('Found owner entity by walking up DOM');
                            }
                        }
                    }
                    // Traditional walk up the parent chain to find the entity
                    else while (currentObj && !hitEntity) {
                        if ((currentObj as any).el) {
                            hitEntity = (currentObj as any).el;
                            console.log('Found entity via object3D.el reference');
                            break;
                        }
                        if (!currentObj.parent) break;
                        currentObj = currentObj.parent;
                    }
                    
                    // Enhanced hit detection
                    if (hitEntity && closestHit.distance <= this.data.range) {
                        console.log('Hit entity:', (hitEntity as any).id || 'unknown', 'Distance:', closestHit.distance.toFixed(2));
                        
                        // Check for enemy component directly
                        let enemyComponent = null;
                        if ((hitEntity as any).hasAttribute('enemy-component')) {
                            enemyComponent = (hitEntity as any).components['enemy-component'];
                        }
                        // Check if we hit a hitbox with a parent that has enemy-component
                        else if (currentObj.userData && currentObj.userData.isEnemyHitbox) {
                            console.log('Hit enemy via hitbox userData');
                            const ownerEntity = currentObj.userData.ownerEntity;
                            if (ownerEntity && ownerEntity.components && ownerEntity.components['enemy-component']) {
                                enemyComponent = ownerEntity.components['enemy-component'];
                            }
                        }
                        // Check parent nodes for enemy component
                        else {
                            let parent = hitEntity;
                            let attempts = 0;
                            while (parent && !enemyComponent && attempts < 3) {
                                if ((parent as any).components && (parent as any).components['enemy-component']) {
                                    enemyComponent = (parent as any).components['enemy-component'];
                                    console.log('Found enemy component by traversing parents');
                                }
                                parent = (parent as any).parentNode;
                                attempts++;
                            }
                        }
                        
                        // Apply damage if we found an enemy component
                        if (enemyComponent) {
                            console.log('HIT ENEMY - Applying damage:', this.data.damage);
                            try {
                                // Hit an enemy - pass hit position for effects
                                enemyComponent.takeDamage(this.data.damage, hitPoint);
                                this.createHitEffect(hitPoint);
                                // Add hit sound
                                this.playHitSound();
                                // Add screen hit marker (crosshair flash)
                                this.showHitMarker();
                            } catch (error) {
                                console.error('Error applying damage to enemy:', error);
                            }
                        } else {
                            // Hit an obstacle or environment
                            console.log('Hit environment at distance:', closestHit.distance.toFixed(2));
                            this.createImpactEffect(hitPoint, closestHit.face!.normal);
                        }
                    } else {
                        console.log('Hit outside of range or no entity');
                    }
                    
                    this.createTracer(weaponPosition, hitPoint);
                } else {
                    console.log('No hit detected');
                    // Create end points for tracers - offset for left and right guns
                    const leftStart = new THREE.Vector3(weaponPosition.x - 0.6, weaponPosition.y + 0.2, weaponPosition.z + 0.5);
                const rightStart = new THREE.Vector3(weaponPosition.x + 0.6, weaponPosition.y + 0.2, weaponPosition.z + 0.5);
                const tracerLength = 50;
                const endPoint = direction.clone().multiplyScalar(tracerLength).add(weaponPosition);
                
                // Create laser tracers
                this.createTracer(leftStart, endPoint, '#0ff');
                this.createTracer(rightStart, endPoint, '#0ff');
                }
                
                this.el.emit('weapon-shot', { damage: this.data.damage });
                if (this.ammoInClip <= 0) this.reload();
            } catch (error) {
                console.error('Error shooting weapon:', error);
            }
        },
        
        playHitSound: function(this: any): void {
            try {
                // Visual feedback instead of sound
                this.showHitMarker();
            } catch (error) {
                console.error('Error playing hit effect:', error);
            }
        },
        
        showHitMarker: function(this: any): void {
            try {
                // Flash the crosshair in red to indicate a hit
                const crosshair = document.getElementById('crosshair');
                if (crosshair) {
                    const originalColor = crosshair.style.color || 'white';
                    crosshair.style.color = 'red';
                    crosshair.style.fontSize = '24px'; // Make it slightly larger
                    
                    // Reset after a short delay
                    setTimeout(() => {
                        crosshair.style.color = originalColor;
                        crosshair.style.fontSize = '20px';
                    }, 100);
                }
            } catch (error) {
                console.error('Error showing hit marker:', error);
            }
        },
        tick: function(this: any, time: number, delta: number): void {
            // Hover bike animations and updates
            const dt = delta / 1000; // Convert to seconds
            this.hoverTime += dt;
            
            // Update thruster light intensity based on movement
            if (this.thrusterParticles.length > 0) {
                // Get player component to check if moving
                const playerEl = document.querySelector('#player');
                if (playerEl && playerEl.components['player-component']) {
                    const playerComponent = playerEl.components['player-component'];
                    const isMoving = playerComponent.isMoving && playerComponent.isMoving();
                    const isSprinting = playerComponent.isSprinting;
                    
                    // Adjust thruster lights based on movement and sprint state
                    this.thrusterParticles.forEach(thruster => {
                        const light = thruster.getAttribute('light');
                        if (light) {
                            let intensity;
                            let distance;
                            
                            if (isSprinting && isMoving) {
                                // Sprinting - maximum thrust
                                intensity = 2.0;
                                distance = 1.0;
                            } else if (isMoving) {
                                // Normal movement
                                intensity = 1.5;
                                distance = 0.8;
                            } else {
                                // Idle
                                intensity = 1.0;
                                distance = 0.5;
                            }
                            
                            thruster.setAttribute('light', {
                                ...light,
                                intensity: intensity,
                                distance: distance
                            });
                        }
                    });
                    
                    // Update thruster effects based on movement
                }
            }
            
            // Check for 'R' key press to reload
            if (this.ammoInClip < this.data.clipSize && !this.isReloading && document.pointerLockElement) {
                if (document.activeElement === document.body && (document.querySelector('r:active') || document.querySelector('R:active'))) {
                    this.reload();
                }
            }
        },
        remove: function(this: any): void {
            try {
                document.removeEventListener('mousedown', this.onMouseDown);
                document.removeEventListener('mouseup', this.onMouseUp);
                if (this.reloadTimer) {
                    clearTimeout(this.reloadTimer);
                }
                if (this.fireLoopId) {
                    clearInterval(this.fireLoopId);
                }
                
                // Clean up any effects when component is removed
            } catch (error) {
                console.error('Error removing weapon component:', error);
            }
        }
    });
    }
}

// Initialize the component
initializeWeaponComponent();
