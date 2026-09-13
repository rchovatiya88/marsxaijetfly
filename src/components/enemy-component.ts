/**
 * Enemy Component for A-Frame in React
 * 
 * Handles enemy AI, behavior, combat, and state management
 */

// Import THREE.js and YUKA - A-Frame is imported globally in App.js
import { traceWorld } from '../arena-world';
import * as THREE from 'three';
import * as YUKA from 'yuka';
import AFRAME_EXPORT from './aframe-export';
import { gameAudio } from '../game-audio';

const AFRAME = AFRAME_EXPORT;

// Interface for the enemy component schema
interface EnemyComponentSchema {
  health: number;
  speed: number;
  attackPower: number;
  attackRate: number;
  detectionRange: number;
  attackRange: number;
  weaponDamage: number;
  weaponCooldown: number;
  weaponAccuracy: number;
  weaponRange: number;
  enemyType: string;
  enemyColor: string;
}

// Interface for the hitbox size
interface HitboxSize {
  width: number;
  height: number;
  depth: number;
}

// Interface for nearby enemy information
interface NearbyEnemy {
  enemy: Element;
  distance: number;
}

export default function initializeEnemyComponent(): void {
    // Only register if not already registered
    if (!AFRAME.components['enemy-component']) {
        AFRAME.registerComponent('enemy-component', {
            schema: {
                health: { type: 'number', default: 100 },
                speed: { type: 'number', default: 2 },
                attackPower: { type: 'number', default: 10 },
                attackRate: { type: 'number', default: 1 },
                detectionRange: { type: 'number', default: 20 },
                attackRange: { type: 'number', default: 2 },
                weaponDamage: { type: 'number', default: 15 },
                weaponCooldown: { type: 'number', default: 2 },
                weaponAccuracy: { type: 'number', default: 0.7 },
                weaponRange: { type: 'number', default: 50 },
                enemyType: { type: 'string', default: 'normal' },
                enemyColor: { type: 'string', default: 'red' }
            },
            init: function(this: any): void {
                try {
                    this.lastEnemyShot = -2000;
                    this.chargeRemaining = 0;
                    this.boltRemaining = 0;
                    this.attackOrigin = new THREE.Vector3();
                    this.attackTarget = new THREE.Vector3();
                    this.attackDirection = new THREE.Vector3();
                    this.enemyBolt = new THREE.Mesh(new THREE.SphereGeometry(0.24,8,6),new THREE.MeshBasicMaterial({color:'#ff684c'}));
                    this.enemyBolt.visible = false;
                    this.el.sceneEl.object3D.add(this.enemyBolt);
                    this.weaponRaycaster = new THREE.Raycaster();

                    this.health = this.data.health;
                    this.maxHealth = this.data.health;
                    this.isDead = false;
                    this.lastAttack = 0;
                    this.currentState = 'idle';
                    this.playerEntity = document.getElementById('player');
                    this.obstacleCheckInterval = 100;
                    this.lastObstacleCheck = 0;
                    this.stuckTime = 0;
                    this.stuckThreshold = 2000;
                    this.lastPosition = new THREE.Vector3();

                    this.minSeparationDistance = 2.0;
                    this.separationForce = 5.0;
                    this.nearbyEnemies = [] as NearbyEnemy[];

                    this.hitboxSize = { width: 1.2, height: 1.8, depth: 1.2 } as HitboxSize;

                    this.createEnemyModel();
                    this.createHealthBar();
                    this.setupYukaAI();
                    this.lastDamageTime = 0;
                    const gameManager = document.querySelector('[game-manager]');
                    if (gameManager && (gameManager as any).components['game-manager']) {
                        (gameManager as any).components['game-manager'].registerEnemy(this);
                    }

                    this.hitbox = new THREE.Box3();
                    this.updateHitbox();
                } catch (error) {
                    console.error('Error initializing enemy component:', error);
                }
            },
            getDistanceTo: function(this: any, otherEnemy: Element): number {
                const myPos = this.el.object3D.position;
                const otherPos = (otherEnemy as any).object3D.position;
                return new THREE.Vector3()
                    .subVectors(myPos, otherPos)
                    .length();
            },
            updateCollisionAvoidance: function(this: any): void {
                try {
                    const enemies = document.querySelectorAll('[enemy-component]');
                    this.nearbyEnemies = [];

                    enemies.forEach((enemy: Element) => {
                        if (enemy !== this.el) {
                            const distance = this.getDistanceTo(enemy);
                            if (distance < this.minSeparationDistance) {
                                this.nearbyEnemies.push({ enemy, distance });
                            }
                        }
                    });

                    this.nearbyEnemies.forEach(({ enemy, distance }: NearbyEnemy) => {
                        const enemyPos = (enemy as any).object3D.position;
                        const myPos = this.el.object3D.position;

                        const pushDirection = new THREE.Vector3()
                            .subVectors(myPos, enemyPos)
                            .normalize();

                        const pushMagnitude = (this.minSeparationDistance - distance) * this.separationForce;

                        this.vehicle.position.x += pushDirection.x * pushMagnitude * 0.1;
                        this.vehicle.position.z += pushDirection.z * pushMagnitude * 0.1;
                    });
                } catch (error) {
                    console.error('Error in collision avoidance:', error);
                }
            },
            enemyShoot: function(this: any): boolean {
                const now = this.el.sceneEl.components['game-manager'].elapsed;
                if (this.chargeRemaining > 0 || this.boltRemaining > 0 || now-this.lastEnemyShot < this.data.weaponCooldown*1000) return false;
                this.attackOrigin.copy(this.el.object3D.position); this.attackOrigin.y += 1.2;
                this.attackTarget.copy(this.playerEntity.object3D.position);
                const delta = this.attackTarget.clone().sub(this.attackOrigin);
                if (delta.length() > this.data.weaponRange || traceWorld(this.attackOrigin,delta)) return false;
                this.chargeRemaining = 850;
                this.lastEnemyShot = now;
                this.flashThreatWarning();
                return true;
            },
            updateAttack: function(this: any, delta: number): void {
                if (this.isDead) return;
                const ms = Math.min(delta,100);
                if (this.chargeRemaining > 0) {
                    this.chargeRemaining -= ms;
                    this.enemyHalo.material.color.set('#fff0a0');
                    if (this.chargeRemaining <= 0) {
                        // Lock aim at charge start: movement during the warning dodges the shot.
                        this.attackOrigin.copy(this.el.object3D.position); this.attackOrigin.y += 1.2;
                        this.attackDirection.copy(this.attackTarget).sub(this.attackOrigin).normalize();
                        this.enemyBolt.position.copy(this.attackOrigin);
                        this.enemyBolt.visible = true;
                        this.boltRemaining = 3000;
                    }
                } else this.enemyHalo.material.color.set(this.data.enemyColor);
                if (this.boltRemaining > 0) {
                    const start = this.enemyBolt.position;
                    const step = this.attackDirection.clone().multiplyScalar(18*ms/1000);
                    const cover = traceWorld(start,step);
                    const toPlayer = this.playerEntity.object3D.position.clone().sub(start);
                    const t = Math.max(0,Math.min(1,toPlayer.dot(step)/(step.lengthSq() || 1)));
                    const near = start.clone().addScaledVector(step,t);
                    const hit = near.distanceTo(this.playerEntity.object3D.position) < 0.9;
                    if (hit && (!cover || t < cover.t)) {
                        this.playerEntity.components['player-component'].takeDamage(this.data.weaponDamage);
                        this.boltRemaining = 0;
                    } else if (cover) this.boltRemaining = 0;
                    else { start.add(step); this.boltRemaining -= ms; }
                    this.enemyBolt.visible = this.boltRemaining > 0;
                }
            },
            flashThreatWarning: function(): void {
                const warning = document.getElementById('threat-warning');
                if (!warning) return;
                warning.classList.remove('active');
                void warning.offsetWidth;
                warning.classList.add('active');
            },
            playEnemyShootSound: function(this: any): void {
                // Sound function removed
            },
            updateAI: function(this: any, dt: number): void {
                if (this.isDead || !this.playerEntity?.object3D) return;
                const playerPos = this.playerEntity.object3D.position;
                const enemyPos = this.el.object3D.position;
                const distance = enemyPos.distanceTo(playerPos);
                const horizontal = Math.hypot(playerPos.x-enemyPos.x,playerPos.z-enemyPos.z);
                const origin = enemyPos.clone(); origin.y += 1.2;
                const blocked = traceWorld(origin,playerPos.clone().sub(origin));
                this.enemyShoot();
                this.setState(this.chargeRemaining > 0 ? 'attack' : 'chase');
                this.seekBehavior.active = horizontal > 10 || !!blocked;
                this.separationBehavior.active = false;
                if (this.seekBehavior.active) {
                    this.seekBehavior.target.set(playerPos.x,0,playerPos.z);
                    if (blocked) {
                        // A short tangent detour keeps simple cover from trapping the pursuer.
                        this.seekBehavior.target.set(enemyPos.x+(playerPos.z-enemyPos.z)*0.5,0,enemyPos.z-(playerPos.x-enemyPos.x)*0.5);
                    }
                } else this.vehicle.velocity.set(0,0,0);
                const step = new THREE.Vector3(this.vehicle.position.x-enemyPos.x,0,this.vehicle.position.z-enemyPos.z);
                const collision = traceWorld(origin,step,0.65);
                if (collision) {
                    this.vehicle.position.x = enemyPos.x; this.vehicle.position.z = enemyPos.z;
                    this.vehicle.velocity.set(0,0,0);
                }
                enemyPos.x = Math.max(-23,Math.min(23,this.vehicle.position.x));
                enemyPos.z = Math.max(-45,Math.min(22,this.vehicle.position.z));
                this.vehicle.position.x = enemyPos.x; this.vehicle.position.z = enemyPos.z;
                if (distance > 0.1) this.el.object3D.lookAt(new THREE.Vector3(playerPos.x,enemyPos.y,playerPos.z));
            },
            createEnemyModel: function(this: any): void {
                try {
                    const enemyEntity = document.createElement('a-entity');
                    enemyEntity.setAttribute('class', 'enemy-body');
                    enemyEntity.setAttribute('position', `0 ${this.hitboxSize.height / 2} 0`);

                    const colorMap: Record<string, string> = {
                        red: '#ff4f45',
                        blue: '#54b9ff',
                        purple: '#b072ff',
                        green: '#7dff9b'
                    };
                    const color = colorMap[this.data.enemyColor] || this.data.enemyColor || '#ff4f45';
                    const group = new THREE.Group();
                    group.userData.heroFallback = true;
                    const bodyMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5), roughness: 0.62, metalness: 0.4 });
                    const darkMaterial = new THREE.MeshStandardMaterial({ color: '#26171a', roughness: 0.75, metalness: 0.12 });
                    const glowMaterial = new THREE.MeshStandardMaterial({ color: '#273443', emissive: color, emissiveIntensity: 0.85 });
                    const dangerMaterial = new THREE.MeshBasicMaterial({
                        color,
                        transparent: true,
                        opacity: 0.38,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.45, 0.75), bodyMaterial);
                    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.62, 0.08), darkMaterial);
                    chestPlate.position.set(0, 0.08, -0.43);
                    const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.45, 0.62), bodyMaterial);
                    head.position.y = 0.95;
                    const core = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.08), glowMaterial);
                    core.position.set(0, 0.25, -0.48);
                    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 0.38), bodyMaterial);
                    shoulder.position.y = 0.35;
                    const leftFin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.95, 4), darkMaterial);
                    leftFin.position.set(-0.58, 0.88, 0.08);
                    leftFin.rotation.z = -0.55;
                    const rightFin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.95, 4), darkMaterial);
                    rightFin.position.set(0.58, 0.88, 0.08);
                    rightFin.rotation.z = 0.55;
                    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.08), glowMaterial);
                    visor.position.set(0, 1.02, -0.39);
                    const halo = new THREE.Mesh(
                        new THREE.TorusGeometry(0.69, 0.025, 6, 28),
                        new THREE.MeshBasicMaterial({
                            color,
                            transparent: true,
                            opacity: 0.55,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false
                        })
                    );
                    halo.position.y = 1.24;
                    halo.rotation.x = Math.PI / 2;
                    const groundRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.023, 6, 32), dangerMaterial);
                    groundRing.position.y = -0.62;
                    groundRing.rotation.x = Math.PI / 2;
                    const targetSpine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.25, 0.08), dangerMaterial);
                    targetSpine.position.set(0, 0.45, 0.48);
                    group.add(groundRing, body, chestPlate, head, core, shoulder, leftFin, rightFin, visor, halo, targetSpine);
                    for (const mat of [bodyMaterial,darkMaterial,glowMaterial,dangerMaterial,halo.material]) {
                        mat.color.convertSRGBToLinear();
                        if ('emissive' in mat) (mat as THREE.MeshStandardMaterial).emissive.convertSRGBToLinear();
                    }
                    this.enemyGroup = group;
                    this.enemyHalo = halo;
                    this.enemyGroundRing = groundRing;
                    this.enemyCore = core;
                    enemyEntity.setObject3D('mesh', group);
                    this.enemyResources = [
                        body.geometry,
                        chestPlate.geometry,
                        head.geometry,
                        core.geometry,
                        shoulder.geometry,
                        leftFin.geometry,
                        rightFin.geometry,
                        visor.geometry,
                        halo.geometry,
                        groundRing.geometry,
                        targetSpine.geometry,
                        bodyMaterial,
                        darkMaterial,
                        glowMaterial,
                        halo.material,
                        dangerMaterial
                    ];
                    this.el.appendChild(enemyEntity);

                    const hitboxHelper = document.createElement('a-box');
                    hitboxHelper.setAttribute('width', this.hitboxSize.width);
                    hitboxHelper.setAttribute('height', this.hitboxSize.height);
                    hitboxHelper.setAttribute('depth', this.hitboxSize.depth);
                    hitboxHelper.setAttribute('position', `0 ${this.hitboxSize.height / 2} 0`);
                    hitboxHelper.setAttribute('opacity', '0');
                    hitboxHelper.setAttribute('material', 'visible: false');
                    hitboxHelper.setAttribute('class', 'hitbox-helper');
                    this.el.appendChild(hitboxHelper);
                } catch (error) {
                    console.error('Error creating enemy model:', error);
                }
            },
            setupYukaAI: function(this: any): void {
                try {
                    this.vehicle = new YUKA.Vehicle();
                    const position = this.el.getAttribute('position');
                    this.vehicle.position.set(position.x, position.y, position.z);
                    this.lastPosition.copy(this.vehicle.position);
                    this.vehicle.maxSpeed = this.data.speed;
                    this.vehicle.maxForce = 10;
                    this.vehicle.mass = 1;
                    this.seekBehavior = new YUKA.SeekBehavior();
                    this.seekBehavior.active = false;
                    this.vehicle.steering.add(this.seekBehavior);
                    this.separationBehavior = new YUKA.SeparationBehavior();
                    this.separationBehavior.active = false;
                    this.vehicle.steering.add(this.separationBehavior);
                    const gameManager = document.querySelector('[game-manager]');
                    if (gameManager && (gameManager as any).components['game-manager']) {
                        (gameManager as any).components['game-manager'].entityManager.add(this.vehicle);
                    }
                } catch (error) {
                    console.error('Error setting up Yuka AI:', error);
                }
            },
            setState: function(this: any, state: string): void {
                try {
                    if (this.currentState === state) return;
                    this.currentState = state;

                    // We don't change the color of the model since we're using a GLTF model
                    // Instead we could add a visual effect or animation here if desired
                } catch (error) {
                    console.error('Error setting state:', error);
                }
            },
            createHealthBar: function(this: any): void {
                try {
                    const healthBarContainer = document.createElement('a-entity');
                    healthBarContainer.setAttribute('position', '0 2.3 0');
                    healthBarContainer.setAttribute('class', 'enemy-health-container');

                    const healthBarBg = document.createElement('a-plane');
                    healthBarBg.setAttribute('width', '1');
                    healthBarBg.setAttribute('height', '0.1');
                    healthBarBg.setAttribute('color', '#333');
                    healthBarBg.setAttribute('opacity', '0.7');
                    healthBarContainer.appendChild(healthBarBg);

                    const healthBar = document.createElement('a-plane');
                    healthBar.setAttribute('width', '0.98');
                    healthBar.setAttribute('height', '0.08');
                    healthBar.setAttribute('color', '#00FF00');
                    healthBar.setAttribute('position', '0 0 0.001');
                    healthBar.setAttribute('class', 'enemy-health-fill');
                    healthBarContainer.appendChild(healthBar);

                    healthBarContainer.object3D.lookAt(this.playerEntity.object3D.position);

                    this.el.appendChild(healthBarContainer);
                } catch (error) {
                    console.error('Error creating health bar:', error);
                }
            },
            updateHealthBar: function(this: any): void {
                try {
                    const healthBar = this.el.querySelector('.enemy-health-fill');
                    if (!healthBar) return;

                    const healthPercent = Math.max(0, this.health / this.maxHealth);
                    const width = 0.98 * healthPercent;

                    healthBar.object3D.scale.x = healthPercent;
                    healthBar.object3D.position.x = (width - 0.98) / 2;

                    if (healthPercent <= 0.25) {
                        healthBar.setAttribute('color', '#FF0000');
                    } else if (healthPercent <= 0.5) {
                        healthBar.setAttribute('color', '#FFFF00');
                    } else {
                        healthBar.setAttribute('color', '#00FF00');
                    }
                } catch (error) {
                    console.error('Error updating health bar:', error);
                }
            },
            takeDamage: function(this: any, amount: number, hitPosition?: THREE.Vector3): void {
                try {
                    if (this.isDead) return;

                    this.health = Math.max(0, this.health - amount);
                    this.lastDamageTime = performance.now();

                    if (hitPosition) {
                        this.createHitEffect(hitPosition);

                    }

                    this.updateHealthBar();

                    const flashIntensity = amount > 20 ? 200 : 100;
                    this.flashColor('white', this.currentState === 'idle' ? 'red' : 'orange', flashIntensity);

                    if (this.playerEntity && this.playerEntity.object3D && !this.isDead) {
                        const playerPos = this.playerEntity.object3D.position;
                        const enemyPos = this.el.object3D.position;
                        const direction = new THREE.Vector3()
                            .subVectors(enemyPos, playerPos)
                            .normalize();

                        const pushForce = 0.3 * (amount / 25);
                        this.vehicle.position.x += direction.x * pushForce;
                        this.vehicle.position.z += direction.z * pushForce;
                    }

                    if (this.health <= 0) {
                        this.die();
                        return;
                    } else {
                        this.setState('chase');
                        if (this.playerEntity && this.playerEntity.object3D) {
                            const playerPos = this.playerEntity.object3D.position;
                            this.seekBehavior.target.copy(new YUKA.Vector3(playerPos.x, 0, playerPos.z));
                            this.seekBehavior.active = true;
                            this.separationBehavior.active = true;
                        }
                    }
                } catch (error) {
                    console.error('Error taking damage:', error);
                }
            },
            showDamageNumber: function(this: any, amount: number, position: THREE.Vector3): void {
                try {
                    const damageText = document.createElement('a-text');
                    damageText.setAttribute('value', amount.toString());
                    damageText.setAttribute('color', '#FF0000');
                    damageText.setAttribute('position', position);
                    damageText.setAttribute('align', 'center');
                    damageText.setAttribute('scale', '0.5 0.5 0.5');
                    damageText.setAttribute('look-at', '[camera]');

                    damageText.setAttribute('animation__position', {
                        property: 'position.y',
                        to: position.y + 1,
                        dur: 720,
                        easing: 'easeOutQuad'
                    });

                    damageText.setAttribute('animation__opacity', {
                        property: 'opacity',
                        from: 1,
                        to: 0,
                        dur: 1000,
                        easing: 'easeInQuad'
                    });

                    document.querySelector('a-scene')!.appendChild(damageText);

                    setTimeout(() => {
                        if (damageText.parentNode) {
                            damageText.parentNode.removeChild(damageText);
                        }
                    }, 1000);
                } catch (error) {
                    console.error('Error showing damage number:', error);
                }
            },
            createHitEffect: function(this: any, position: THREE.Vector3): void {
                try {
                    const hitEffect = document.createElement('a-entity');
                    hitEffect.setAttribute('position', position);
                    const mainSphere = document.createElement('a-sphere');
                    mainSphere.setAttribute('radius', 0.22);
                    mainSphere.setAttribute('color', '#ffebe0');
                    mainSphere.setAttribute('material', 'emissive: #ff4f45; emissiveIntensity: 1.2');
                    mainSphere.setAttribute('opacity', 0.8);
                    mainSphere.setAttribute('animation__scale', {
                        property: 'scale',
                        from: '1 1 1',
                        to: '0 0 0',
                        dur: 180,
                        easing: 'easeOutQuad'
                    });
                    hitEffect.appendChild(mainSphere);
                    document.querySelector('a-scene')!.appendChild(hitEffect);

                    const sparkRing = document.createElement('a-ring');
                    sparkRing.setAttribute('radius-inner', 0.18);
                    sparkRing.setAttribute('radius-outer', 0.25);
                    sparkRing.setAttribute('material', 'shader: flat; color: #fff0a0; opacity: 0.8; transparent: true; side: double');
                    sparkRing.setAttribute('look-at', '[camera]');
                    sparkRing.setAttribute('animation__scale', { property: 'scale', from: '0.4 0.4 0.4', to: '2.2 2.2 2.2', dur: 220, easing: 'easeOutQuad' });
                    sparkRing.setAttribute('animation__fade', { property: 'opacity', from: 0.8, to: 0, dur: 220, easing: 'easeOutQuad' });
                    hitEffect.appendChild(sparkRing);

                    setTimeout(() => {
                        if (hitEffect.parentNode) {
                            hitEffect.parentNode.removeChild(hitEffect);
                        }
                    }, 240);
                } catch (error) {
                    console.error('Error creating hit effect:', error);
                }
            },
            flashColor: function(this: any, flashColor: string, returnColor: string, duration: number): void {
                try {
                    const enemyModel = this.el.querySelector('.enemy-body');
                    if (!enemyModel) return;

                    // Quick visibility toggle for visual feedback
                    enemyModel.setAttribute('visible', false);
                    setTimeout(() => {
                        if (!this.isDead && enemyModel.parentNode) {
                            enemyModel.setAttribute('visible', true);
                        }
                    }, 50); // Very quick flash
                } catch (error) {
                    console.error('Error flashing color:', error);
                }
            },
            die: function(this: any): void {
                try {
                    if (this.isDead) return;
                    this.isDead = true;
                    const healthBar = this.el.querySelector('.enemy-health-container');
                    if (healthBar) healthBar.setAttribute('visible', false);

                    const enemyModel = this.el.querySelector('.enemy-body');
                    const hitboxHelper = this.el.querySelector('.hitbox-helper');

                    if (enemyModel) enemyModel.setAttribute('visible', false);
                    if (hitboxHelper) hitboxHelper.setAttribute('visible', false);

                    if (this.seekBehavior) this.seekBehavior.active = false;
                    if (this.separationBehavior) this.separationBehavior.active = false;

                    const gameManager = document.querySelector('[game-manager]');
                    if (gameManager && (gameManager as any).components['game-manager']) {
                        (gameManager as any).components['game-manager'].entityManager.remove(this.vehicle);
                        (gameManager as any).components['game-manager'].enemyKilled(this);
                        (gameManager as any).components['game-manager'].unregisterEnemy(this);
                    }
                    gameAudio.pulse('kill');

                    const position = this.el.object3D.position;
                    const deathEffect = document.createElement('a-entity');
                    deathEffect.setAttribute('position', position);
                    
                    // Add an explosion-like effect with spheres
                    const core = document.createElement('a-sphere');
                    core.setAttribute('radius', 0.4);
                    core.setAttribute('color', '#fff0a0');
                    core.setAttribute('material', 'shader: flat; color: #fff0a0; opacity: 0.95; transparent: true');
                    core.setAttribute('opacity', 0.9);
                    core.setAttribute('animation__scale', {
                        property: 'scale',
                        from: '1 1 1',
                        to: '2.2 2.2 2.2',
                        dur: 520,
                        easing: 'easeOutQuad'
                    });
                    deathEffect.appendChild(core);
                    
                    // Add expanding ring
                    const ring = document.createElement('a-ring');
                    ring.setAttribute('radius-inner', 0.3);
                    ring.setAttribute('radius-outer', 0.35);
                    ring.setAttribute('color', '#ff8b62');
                    ring.setAttribute('material', 'shader: flat; color: #ff8b62; opacity: 0.8; transparent: true; side: double');
                    ring.setAttribute('opacity', 0.7);
                    ring.setAttribute('animation__scale', {
                        property: 'scale',
                        from: '1 1 1',
                        to: '7 7 7',
                        dur: 720,
                        easing: 'easeOutQuad'
                    });
                    ring.setAttribute('animation__fade', {
                        property: 'opacity',
                        from: 0.7,
                        to: 0,
                        dur: 1000,
                        easing: 'easeOutQuad'
                    });
                    deathEffect.appendChild(ring);
                    
                    document.querySelector('a-scene')!.appendChild(deathEffect);
                    
                    // Remove the effect after animation completes
                    setTimeout(() => {
                        if (deathEffect.parentNode) {
                            deathEffect.parentNode.removeChild(deathEffect);
                        }
                    }, 1200);

                    if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
                } catch (error) {
                    console.error('Error handling enemy death:', error);
                }
            },
            tick: function(this: any, time: number, delta: number): void {
                try {
                    const dt = Math.min(delta,100) / 1000;
                    this.updateAI(dt);
                    this.updateAttack(delta);
                    this.updateHitbox();

                    if (this.enemyHalo && this.enemyGroundRing) {
                        const pulse = 1 + Math.sin(time * 0.006) * 0.08;
                        this.enemyHalo.rotation.z += dt * (this.currentState === 'attack' ? 2.8 : 1.2);
                        this.enemyHalo.scale.setScalar(this.currentState === 'attack' ? 1.18 * pulse : pulse);
                        this.enemyGroundRing.scale.setScalar(this.currentState === 'attack' ? 1.35 + Math.sin(time * 0.01) * 0.12 : 1);
                        const material = this.enemyGroundRing.material as THREE.MeshBasicMaterial;
                        material.opacity = this.currentState === 'attack' ? 0.62 : this.currentState === 'chase' ? 0.42 : 0.24;
                    }

                    const healthBarContainer = this.el.querySelector('.enemy-health-container');
                    if (healthBarContainer) {
                        healthBarContainer.object3D.lookAt(this.playerEntity.object3D.position);
                    }
                } catch (error) {
                    console.error('Error in enemy tick:', error);
                }
            },
            updateHitbox: function(this: any): void {
                try {
                    const pos = this.el.object3D.position;
                    const halfWidth = this.hitboxSize.width / 2;
                    const halfDepth = this.hitboxSize.depth / 2;
                    const height = this.hitboxSize.height;

                    this.hitbox.min.set(
                        pos.x - halfWidth,
                        pos.y,
                        pos.z - halfDepth
                    );
                    this.hitbox.max.set(
                        pos.x + halfWidth,
                        pos.y + height,
                        pos.z + halfDepth
                    );

                    const hitboxHelper = this.el.querySelector('.hitbox-helper');
                    if (hitboxHelper) {
                        hitboxHelper.setAttribute('width', this.hitboxSize.width);
                        hitboxHelper.setAttribute('height', this.hitboxSize.height);
                        hitboxHelper.setAttribute('depth', this.hitboxSize.depth);
                        hitboxHelper.setAttribute('position', `0 ${this.hitboxSize.height/2} 0`);

                        if (!hitboxHelper.hasAttribute('raycast-target')) {
                            hitboxHelper.setAttribute('raycast-target', 'false');
                        }
                    }
                } catch (error) {
                    console.error('Error updating hitbox:', error);
                }
            },
            remove: function(this: any): void {
                try {
                    const gameManager = document.querySelector('[game-manager]');
                    if (gameManager && (gameManager as any).components['game-manager'] && this.vehicle) {
                        (gameManager as any).components['game-manager'].entityManager.remove(this.vehicle);
                        (gameManager as any).components['game-manager'].unregisterEnemy(this);
                    }
                    if (this.enemyBolt) { this.enemyBolt.removeFromParent(); this.enemyBolt.geometry.dispose(); this.enemyBolt.material.dispose(); }
                    if (this.enemyResources) this.enemyResources.forEach((resource: any) => resource.dispose?.());
                } catch (error) {
                    console.error('Error removing enemy component:', error);
                }
            }
        });
    }
}

// Initialize the component
initializeEnemyComponent();
