/**
 * Hover Bike Weapon Component for A-Frame in React
 * 
 * Handles the hover bike model, flying animations, particle effects,
 * weapon functionality, shooting, and hit detection
 */

// Import THREE.js - A-Frame is imported globally in App.js
import { traceWorld } from '../arena-world';
import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';
import { gameAudio } from '../game-audio';
import { PLAYER_MUZZLE_OFFSETS } from '../mission/player-rig';

const AFRAME = AFRAME_EXPORT;

function isTouchStageActive(): boolean {
    const querySelector = (document as Document & { querySelector?: (selectors: string) => Element | null }).querySelector;
    return typeof querySelector === 'function' && !!querySelector.call(document, '.is-touch-stage');
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
                this.lastShot = -10000;
                this.shotClock = 0;
                this.chargedShots = 0;
                this.shotsFired = 0;
                this.chargesSpent = 0;
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
        resetMission: function(this: any): void {
            this.pause();
            clearTimeout(this.reloadTimer);
            this.isReloading = false;
            this.reloadRemaining = 0;
            this.ammoInClip = this.data.clipSize;
            this.lastShot = -10000;
            this.shotClock = 0;
            this.chargedShots = 0;
            this.shotsFired = 0;
            this.chargesSpent = 0;
            this.hoverTime = 0;
            this.boltIndex = 0;
            this.boltPool?.forEach((item: any) => { item.remaining = 0; item.mesh.visible = false; });
            document.querySelectorAll('.shot-streak').forEach(el => el.remove());
            this.updateAmmoDisplay();
        },
        createHoverBikeModel: function(this: any): void {
            try {
                // Remove any existing model
                if (this.el.getObject3D('mesh')) {
                    this.el.removeObject3D('mesh');
                }

                // This resident fallback survives a missing hero GLB. Its
                // chassis stays inside the same authored body envelope.
                const bikeEntity = document.createElement('a-entity');
                bikeEntity.id = 'hover-bike-model';
                const group = new THREE.Group();
                group.userData.heroFallback = true;
                const chassis = new THREE.Group();chassis.scale.x=.5;chassis.position.y=.4;group.add(chassis);
                this.bikeResources = [];
                const part = (geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, emissive = false, socket = false) => {
                    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).convertSRGBToLinear(), roughness: 0.45, metalness: 0.5,
                        emissive: new THREE.Color(emissive ? color : '#000000').convertSRGBToLinear(), emissiveIntensity: emissive ? 1.2 : 0 });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.set(x, y, z);
                    (socket?group:chassis).add(mesh);
                    this.bikeResources.push(geometry, material);
                    return mesh;
                };
                const hull = new THREE.BufferGeometry();
                hull.setAttribute('position', new THREE.Float32BufferAttribute([
                    -.46,-.18,1.05, .46,-.18,1.05, -.46,.28,1.05, .46,.28,1.05,
                    -.12,-.12,-1.85, .12,-.12,-1.85, -.12,.08,-1.85, .12,.08,-1.85
                ],3));
                hull.setIndex([0,1,2,1,3,2,4,6,5,5,6,7,0,2,4,4,2,6,1,5,3,5,7,3,2,3,6,3,7,6,0,4,1,1,4,5]);
                hull.computeVertexNormals();
                part(hull,'#c06a43',0,0,0);
                const canopy=part(new THREE.SphereGeometry(.4,12,8),'#142b3e',0,.3,-.05);
                canopy.scale.set(.8,.65,1.6);
                (canopy.material as THREE.MeshStandardMaterial).roughness=.16;
                part(new THREE.BoxGeometry(.32,.13,.6),'#202630',0,.28,.65);
                this.enginePlumes=[];
                for (const x of [-0.72, 0.72]) {
                    const pod=part(new THREE.CylinderGeometry(.21,.26,1.7,10),'#34404b',x,-.1,.28);
                    pod.rotation.x=Math.PI/2;
                    const collar=part(new THREE.CylinderGeometry(.28,.28,.2,10),'#a5a49a',x,-.1,1.06);
                    collar.rotation.x=Math.PI/2;
                    const nozzle=part(new THREE.CylinderGeometry(.19,.19,.05,10),'#63d8ed',x,-.1,1.18,true);
                    nozzle.rotation.x=Math.PI/2;
                    const plume=part(new THREE.ConeGeometry(.16,.75,10),'#62d9ef',x,-.1,1.58,true);
                    plume.rotation.x=Math.PI/2;this.enginePlumes.push(plume);
                    const cannon=part(new THREE.CylinderGeometry(.07,.1,1.16,8),'#9aa8aa',x<0?-.1:.1,.62,-1.78,false,true);
                    cannon.rotation.x=Math.PI/2;
                    const fin=part(new THREE.BoxGeometry(.08,.46,.75),'#b9623d',x*1.24,.15,.72);
                    fin.rotation.z=x>0?-.28:.28;
                }
                part(new THREE.BoxGeometry(1.65,.08,.38),'#27343f',0,-.1,.3);
                part(new THREE.BoxGeometry(.12,.025,1.0),'#ecdab1',0,.17,-.95);
                bikeEntity.setObject3D('mesh', group);
                this.el.appendChild(bikeEntity);
                this.bikeEntity = bikeEntity;

                // The normalized assembly base is the player origin used by
                // Blender clearance studies. Do not translate/roll the GLB away
                // from that body and weapon-socket contract with legacy bobbing.
                this.el.removeAttribute('animation__hover');
                this.el.removeAttribute('animation__tilt');
                this.el.object3D.position.y = 0;
                this.el.object3D.rotation.z = 0;
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
                const canvas = this.el.sceneEl.canvas;
                const locked = document.pointerLockElement === document.body || (canvas && document.pointerLockElement === canvas);
                if (!locked && event.target !== canvas) return;
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
        startFiring: function(this: any): void { this.shoot(); },
        stopFiring: function(this: any): void { this.mouseDown = false; },
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
            // Pooled emissive bolts supply muzzle feedback without adding/removing lights.
        },
        createMuzzleFlash: function(this: any): void {
            try {
                const flash = document.createElement('a-entity');
                flash.setAttribute('data-mission-effect', '');
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
                hitEffect.setAttribute('data-mission-effect', '');
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
                impactEffect.setAttribute('data-mission-effect', '');
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
                const now = this.shotClock || 0;
                if (this.isReloading || this.ammoInClip <= 0 || now - this.lastShot < this.data.cooldown * 1000) {
                    if (this.ammoInClip <= 0) this.reload();
                    return;
                }

                this.lastShot = now;
                this.ammoInClip--;
                this.shotsFired = (this.shotsFired || 0) + 1;
                const charged = this.chargedShots > 0;
                const damage = this.data.damage * (charged ? 2 : 1);
                if (charged) { this.chargedShots--; this.chargesSpent = (this.chargesSpent || 0) + 1; }
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
                const touchStageAssist = isTouchStageActive();
                const visibleHit = enemyHit && (touchStageAssist || !environmentHit || enemyHit.distance < environmentHit.distance) ? enemyHit : null;
                const tracerEnd = visibleHit?.point || environmentHit?.point || weaponPosition.clone().addScaledVector(direction, Math.min(this.data.range, 42));
                // Each visible barrel owns its cover trace and half of the shot.
                // A clear center ray cannot draw a side bolt through a wall.
                const muzzlePaths = this.getMuzzlePaths(tracerEnd);
                const clearMuzzles = touchStageAssist && visibleHit ? muzzlePaths.length : muzzlePaths.filter((path:any)=>!path.blocked).length;
                this.createWeaponBolts(tracerEnd, direction, visibleHit ? '#fff0a0' : '#78ffe1', muzzlePaths);

                if (visibleHit && clearMuzzles > 0) {
                    const applied=enemyHit.enemy.takeDamage(damage * clearMuzzles / muzzlePaths.length, enemyHit.point);
                    if (applied!==0) {gameAudio.pulse('hit');this.showHitMarker();}
                } else if (environmentHit) {
                    this.createImpactEffect(environmentHit.point, environmentHit.normal);
                }

                this.el.emit('weapon-shot', { damage });
                if (this.ammoInClip <= 0) this.reload();
            } catch (error) {
                console.error('Error shooting weapon:', error);
            }
        },
        getMuzzlePaths: function(this:any, end:THREE.Vector3): any[] {
            return PLAYER_MUZZLE_OFFSETS.map(offset=>{
                const start=this.el.object3D.localToWorld(new THREE.Vector3(offset.x,offset.y,offset.z));
                const delta=end.clone().sub(start), hit=traceWorld(start,delta);
                return {start,end:hit?start.clone().addScaledVector(delta,hit.t):end.clone(),blocked:!!hit,hit};
            });
        },
        createWeaponBolts: function(this: any, end: THREE.Vector3, direction: THREE.Vector3, color = '#78ffe1', paths?:any[]): void {
            for (const path of paths || this.getMuzzlePaths(end)) {
                this.createBolt(path.start, path.end, path.blocked ? '#78ffe1' : color);
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
            const scene = this.el.sceneEl.object3D;
            if (!this.boltPool) {
                this.boltGeometry = new THREE.CylinderGeometry(0.07, 0.04, 1, 6);
                this.boltPool = Array.from({length: 12}, () => {
                    const material = new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.9, depthWrite:false});
                    const mesh = new THREE.Mesh(this.boltGeometry, material);
                    mesh.visible = false; scene.add(mesh);
                    return {mesh, remaining:0};
                });
                this.boltIndex = 0;
            }
            const item = this.boltPool[this.boltIndex++ % this.boltPool.length];
            const direction = end.clone().sub(start);
            item.mesh.position.copy(start).lerp(end, 0.5);
            item.mesh.scale.set(1,Math.max(0.01,direction.length()),1);
            item.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
            item.mesh.material.color.set(color);
            item.mesh.visible = true;
            item.remaining = 100;
        },
        findEnemyHit: function(this: any, origin: THREE.Vector3, direction: THREE.Vector3): { enemy: any; point: THREE.Vector3; distance: number } | null {
            const manager = this.el.sceneEl?.components?.['game-manager'];
            const registeredEnemies = manager?.activeEnemies || [];
            const fallbackEnemies = registeredEnemies.length ? [] : Array.from(document.querySelectorAll('[enemy-component]'))
                .map((enemy: any) => enemy.components?.['enemy-component'])
                .filter(Boolean);
            const enemies = registeredEnemies.length ? registeredEnemies : fallbackEnemies;
            let best: { enemy: any; point: THREE.Vector3; distance: number } | null = null;
            let touchFallback: { enemy: any; point: THREE.Vector3; distance: number } | null = null;
            const touchStageAssist = isTouchStageActive();

            for (const enemy of enemies) {
                if (!enemy || enemy.isDead || !enemy.el?.object3D) continue;
                const pos = enemy.el.object3D.position;
                const width = Math.max(1.4, enemy.hitboxSize?.width || 1.2);
                const height = Math.max(2.0, enemy.hitboxSize?.height || 1.8);
                const depth = Math.max(1.4, enemy.hitboxSize?.depth || 1.2);
                if (touchStageAssist) {
                    const targetCenter = new THREE.Vector3(pos.x, pos.y + height * 0.55, pos.z);
                    const targetDistance = origin.distanceTo(targetCenter);
                    if (targetDistance <= Math.min(this.data.range, 55) && (!touchFallback || targetDistance < touchFallback.distance)) {
                        touchFallback = { enemy, point: targetCenter, distance: targetDistance };
                    }
                }
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
                    const aimAssistRadius = touchStageAssist
                        ? Math.min(24, Math.max(width, depth) * 2.4 + alongRay * 0.55)
                        : enemy.data?.guardDamageMultiplier < 1
                        ? Math.min(.7,Math.max(width,depth)*.3+alongRay*.008)
                        : Math.min(4.0, Math.max(width, depth) * 0.7 + alongRay * 0.055);
                    if (closestPoint.distanceTo(center) > aimAssistRadius) continue;
                    distance = alongRay;
                    hitPoint = closestPoint;
                }

                if (distance <= this.data.range && (!best || distance < best.distance)) {
                    best = { enemy, point: hitPoint, distance };
                }
            }

            return best || touchFallback;
        },
        findEnvironmentHit: function(this: any, origin: THREE.Vector3, direction: THREE.Vector3): { point: THREE.Vector3; normal: THREE.Vector3; distance: number } | null {
            const delta = direction.clone().multiplyScalar(this.data.range);
            const hit = traceWorld(origin, delta);
            return hit ? {point:origin.clone().addScaledVector(delta,hit.t),normal:new THREE.Vector3(hit.normal.x,hit.normal.y,hit.normal.z),distance:hit.t*this.data.range} : null;
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
            this.shotClock = (this.shotClock || 0) + Math.min(delta,100);
            if (this.mouseDown && this.data.automatic) this.shoot();
            this.boltPool?.forEach((item: any) => { item.remaining -= Math.min(delta,100); item.mesh.visible = item.remaining > 0; });
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
            const flight = this.el?.parentEl?.components?.['fly-controls'];
            const thrust = Math.min(1,(flight?.velocity?.length() || 0)/50);
            this.enginePlumes?.forEach((plume:any) => { plume.scale.y = .7+thrust*.9+Math.sin(this.hoverTime*24)*.06; });
            
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
                this.boltPool?.forEach((item: any) => { item.mesh.removeFromParent(); item.mesh.material.dispose(); });
                this.boltGeometry?.dispose();
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
