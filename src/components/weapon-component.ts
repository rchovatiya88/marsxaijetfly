/**
 * Hover Bike Weapon Component for A-Frame in React
 * 
 * Handles the hover bike model, flying animations, particle effects,
 * weapon functionality, shooting, and hit detection
 */

// Import THREE.js - A-Frame is imported globally in App.js
import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';
import { gameAudio } from '../game-audio';

const AFRAME = AFRAME_EXPORT;

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
                this.levelRaycaster = new THREE.Raycaster();
                this.rayHitPoint = new THREE.Vector3();
                this.rayTemp = new THREE.Vector3();
                this.rayBox = new THREE.Box3();
                this.tracerResources = [];
                this.boltCleanupTimers = [];
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

                // The original jetbike GLB contains a corrupt embedded PNG.
                // Use a small geometry-built bike so the playable slice is self-contained.
                const bikeEntity = document.createElement('a-entity');
                bikeEntity.id = 'hover-bike-model';
                const group = new THREE.Group();
                this.bikeResources = [];
                const part = (geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, emissive = false) => {
                    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.5,
                        emissive: emissive ? color : '#000000', emissiveIntensity: emissive ? 2 : 0 });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.set(x, y, z);
                    group.add(mesh);
                    this.bikeResources.push(geometry, material);
                    return mesh;
                };
                part(new THREE.BoxGeometry(0.7, 0.35, 2.4), '#ed7851', 0, 0, 0);
                part(new THREE.BoxGeometry(0.48, 0.3, 0.8), '#162c38', 0, 0.3, -0.4);
                for (const x of [-0.72, 0.72]) {
                    part(new THREE.BoxGeometry(0.3, 0.3, 1.7), '#343642', x, -0.1, 0.3);
                    part(new THREE.BoxGeometry(0.22, 0.18, 0.16), '#78ffe1', x, -0.1, 1.18, true);
                    part(new THREE.BoxGeometry(0.1, 0.1, 1.4), '#a8b9bc', x, 0, -1.0);
                }
                part(new THREE.BoxGeometry(1.7, 0.09, 0.5), '#b75038', 0, -0.1, 0.3);
                bikeEntity.setObject3D('mesh', group);
                this.el.appendChild(bikeEntity);
                this.bikeEntity = bikeEntity;

                // Set up hover animation instead of recoil
                this.el.setAttribute('animation__hover', {
                    property: 'position.y',
                    from: `-0.5`,
                    to: -0.5 + this.data.hoverHeight,
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
                this.onReloadKey = (event: KeyboardEvent) => {
                    if (event.code === 'KeyR' && this.el.sceneEl.isPlaying) this.reload();
                };
                document.addEventListener('keydown', this.onReloadKey);
            } catch (error) {
                console.error('Error setting up event listeners:', error);
            }
        },
        onMouseDown: function(this: any, event: MouseEvent): void {
            try {
                if (!this.el.sceneEl.isPlaying) return;
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
                gameAudio.pulse('reload');
                
                // Reload start
                
                this.reloadRemaining = this.data.reloadTime * 1000;
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
                direction.applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
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
                if (!this.el.sceneEl.isPlaying) return;
                const now = performance.now();
                if (this.isReloading || this.ammoInClip <= 0 || now - this.lastShot < this.data.cooldown * 1000) {
                    if (this.ammoInClip <= 0) this.reload();
                    return;
                }

                this.lastShot = now;
                this.ammoInClip--;
                this.updateAmmoDisplay();
                this.applyWeaponFeedback();
                this.createHudBolt();
                gameAudio.pulse('shot');

                const cameraEl = document.querySelector('#camera');
                if (!cameraEl || !cameraEl.object3D) return;

                const camera = cameraEl.object3D;
                const weaponPosition = new THREE.Vector3();
                camera.getWorldPosition(weaponPosition);

                const direction = new THREE.Vector3(0, 0, -1);
                direction.applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));

                const spread = 1.0 - this.data.accuracy;
                if (spread > 0) {
                    direction.x += (Math.random() - 0.5) * spread * 0.05;
                    direction.y += (Math.random() - 0.5) * spread * 0.05;
                    direction.z += (Math.random() - 0.5) * spread * 0.005;
                    direction.normalize();
                }

                this.raycaster.set(weaponPosition, direction);
                this.raycaster.far = this.data.range;

                const enemyHit = this.findEnemyHit(weaponPosition, direction);
                const environmentHit = this.findEnvironmentHit(weaponPosition, direction);
                const tracerEnd = enemyHit?.point || environmentHit?.point || weaponPosition.clone().addScaledVector(direction, Math.min(this.data.range, 42));
                this.createWeaponBolts(tracerEnd, direction, enemyHit ? '#fff0a0' : '#78ffe1');

                if (enemyHit && (!environmentHit || enemyHit.distance <= environmentHit.distance + 1.5)) {
                    enemyHit.enemy.takeDamage(this.data.damage, enemyHit.point);
                    gameAudio.pulse('hit');
                    this.showHitMarker();
                } else if (environmentHit) {
                    this.createImpactEffect(environmentHit.point, environmentHit.normal);
                }

                this.el.emit('weapon-shot', { damage: this.data.damage });
                if (this.ammoInClip <= 0) this.reload();
            } catch (error) {
                console.error('Error shooting weapon:', error);
            }
        },
        createWeaponBolts: function(this: any, end: THREE.Vector3, direction: THREE.Vector3, color = '#78ffe1'): void {
            const muzzleOffsets = [
                new THREE.Vector3(-0.72, -0.55, -1.6),
                new THREE.Vector3(0.72, -0.55, -1.6)
            ];
            for (const offset of muzzleOffsets) {
                const start = this.el.object3D.localToWorld(offset.clone());
                const visualEnd = end.clone();
                if (visualEnd.distanceTo(start) < 2) visualEnd.copy(start).addScaledVector(direction, 10);
                this.createBolt(start, visualEnd, color);
            }
        },
        createHudBolt: function(): void {
            const getByClass = (document as Document & { getElementsByClassName?: (className: string) => HTMLCollectionOf<Element> }).getElementsByClassName;
            const hud = typeof getByClass === 'function' ? getByClass.call(document, 'hud')[0] : null;
            if (!hud) return;
            for (const side of ['left', 'right']) {
                const streak = document.createElement('div');
                streak.className = `shot-streak shot-streak-${side}`;
                hud.appendChild(streak);
                setTimeout(() => streak.remove(), 150);
            }
        },
        createBolt: function(this: any, start: THREE.Vector3, end: THREE.Vector3, color = '#78ffe1'): void {
            const sceneEl = document.querySelector('a-scene');
            if (!sceneEl?.object3D) return;
            const midpoint = start.clone().lerp(end, 0.5);
            const direction = end.clone().sub(start);
            const length = Math.max(0.6, Math.min(36, direction.length()));
            direction.normalize();
            const geometry = new THREE.CylinderGeometry(0.11, 0.04, length, 10, 1, true);
            const glowGeometry = new THREE.CylinderGeometry(0.32, 0.12, length, 12, 1, true);
            const flareGeometry = new THREE.SphereGeometry(0.28, 12, 8);
            const material = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            });
            const glowMaterial = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.22,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false
            });
            const bolt = new THREE.Mesh(geometry, material);
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            const flare = new THREE.Mesh(flareGeometry, material);
            const group = new THREE.Group();
            group.add(glow, bolt);
            group.position.copy(midpoint);
            group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            flare.position.copy(start);
            const light = new THREE.PointLight(new THREE.Color(color), 1.5, 9, 2);
            light.position.copy(start);
            sceneEl.object3D.add(group, flare, light);
            this.tracerResources.push(geometry, glowGeometry, flareGeometry, material, glowMaterial);
            const cleanup = setTimeout(() => {
                sceneEl.object3D.remove(group, flare, light);
                geometry.dispose();
                glowGeometry.dispose();
                flareGeometry.dispose();
                material.dispose();
                glowMaterial.dispose();
                this.tracerResources = this.tracerResources.filter((resource: any) =>
                    resource !== geometry && resource !== glowGeometry && resource !== flareGeometry && resource !== material && resource !== glowMaterial
                );
                this.boltCleanupTimers = this.boltCleanupTimers.filter((timer: any) => timer !== cleanup);
            }, 320);
            this.boltCleanupTimers.push(cleanup);
        },
        findEnemyHit: function(this: any, origin: THREE.Vector3, direction: THREE.Vector3): { enemy: any; point: THREE.Vector3; distance: number } | null {
            const manager = this.el.sceneEl?.components?.['game-manager'];
            const registeredEnemies = manager?.activeEnemies || [];
            const fallbackEnemies = registeredEnemies.length ? [] : Array.from(document.querySelectorAll('[enemy-component]'))
                .map((enemy: any) => enemy.components?.['enemy-component'])
                .filter(Boolean);
            const enemies = registeredEnemies.length ? registeredEnemies : fallbackEnemies;
            let best: { enemy: any; point: THREE.Vector3; distance: number } | null = null;

            for (const enemy of enemies) {
                if (!enemy || enemy.isDead || !enemy.el?.object3D) continue;
                const pos = enemy.el.object3D.position;
                const width = Math.max(1.4, enemy.hitboxSize?.width || 1.2);
                const height = Math.max(2.0, enemy.hitboxSize?.height || 1.8);
                const depth = Math.max(1.4, enemy.hitboxSize?.depth || 1.2);
                this.rayBox.min.set(pos.x - width * 0.5, pos.y, pos.z - depth * 0.5);
                this.rayBox.max.set(pos.x + width * 0.5, pos.y + height, pos.z + depth * 0.5);
                const directPoint = this.raycaster.ray.intersectBox(this.rayBox, this.rayHitPoint);

                let distance: number | null = null;
                let hitPoint: THREE.Vector3 | null = null;
                if (directPoint) {
                    distance = origin.distanceTo(directPoint);
                    hitPoint = directPoint.clone();
                } else {
                    const center = this.rayTemp.set(pos.x, pos.y + height * 0.55, pos.z);
                    const toCenter = center.clone().sub(origin);
                    const alongRay = toCenter.dot(direction);
                    if (alongRay <= 0 || alongRay > this.data.range) continue;
                    const closestPoint = origin.clone().addScaledVector(direction, alongRay);
                    const aimAssistRadius = Math.min(4.0, Math.max(width, depth) * 0.7 + alongRay * 0.055);
                    if (closestPoint.distanceTo(center) > aimAssistRadius) continue;
                    distance = alongRay;
                    hitPoint = closestPoint;
                }

                if (distance <= this.data.range && (!best || distance < best.distance)) {
                    best = { enemy, point: hitPoint, distance };
                }
            }

            return best;
        },
        findEnvironmentHit: function(this: any, origin: THREE.Vector3, direction: THREE.Vector3): { point: THREE.Vector3; normal: THREE.Vector3; distance: number } | null {
            const level = document.getElementById('level') as any;
            if (!level?.object3D) return null;
            this.levelRaycaster.set(origin, direction);
            this.levelRaycaster.far = this.data.range;
            const hits = this.levelRaycaster.intersectObject(level.object3D, true);
            if (!hits.length) return null;
            const hit = hits[0];
            return {
                point: hit.point,
                normal: hit.face?.normal || new THREE.Vector3(0, 1, 0),
                distance: hit.distance
            };
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
                    crosshair.classList.add('hit');
                    crosshair.style.color = '#fff0a0';
                    crosshair.style.fontSize = '28px';
                    
                    // Reset after a short delay
                    setTimeout(() => {
                        crosshair.classList.remove('hit');
                        crosshair.style.color = originalColor;
                        crosshair.style.fontSize = '24px';
                    }, 100);
                }
            } catch (error) {
                console.error('Error showing hit marker:', error);
            }
        },
        tick: function(this: any, time: number, delta: number): void {
            if (this.isReloading) {
                this.reloadRemaining -= Math.min(delta, 100);
                if (this.reloadRemaining <= 0) {
                    this.ammoInClip = this.data.clipSize;
                    this.isReloading = false;
                    this.updateAmmoDisplay();
                }
            }
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
            
        },
        pause: function(this: any): void {
            this.mouseDown = false;
            this.stopFiring();
        },
        remove: function(this: any): void {
            try {
                document.removeEventListener('mousedown', this.onMouseDown);
                document.removeEventListener('mouseup', this.onMouseUp);
                document.removeEventListener('keydown', this.onReloadKey);
                if (this.reloadTimer) {
                    clearTimeout(this.reloadTimer);
                }
                if (this.fireLoopId) {
                    clearInterval(this.fireLoopId);
                }
                if (this.boltCleanupTimers) {
                    this.boltCleanupTimers.forEach((timer: any) => clearTimeout(timer));
                    this.boltCleanupTimers = [];
                }
                
                if (this.bikeResources) this.bikeResources.forEach((resource: any) => resource.dispose());
                if (this.tracerResources) this.tracerResources.forEach((resource: any) => resource.dispose?.());
                this.bikeEntity?.remove();
            } catch (error) {
                console.error('Error removing weapon component:', error);
            }
        }
    });
    }
}

// Initialize the component
initializeWeaponComponent();
