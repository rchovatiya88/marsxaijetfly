/**
 * Game Manager Component for A-Frame in React
 * 
 * Handles game lifecycle, enemy spawning, scoring, and level progression
 */

// Import THREE.js and YUKA - A-Frame is imported globally in App.js
import { clearSpawn } from '../arena-world';
import * as THREE from 'three';
import * as YUKA from 'yuka';
import AFRAME_EXPORT from './aframe-export';

const AFRAME = AFRAME_EXPORT;

// Interface for the game manager schema
interface GameManagerSchema {
  enemyCount: number;
  level: number;
  spawnRadius: number;
  enemySpawnInterval: number;
  maxActiveEnemies: number;
  gameStartDelay: number;
}

// Interface for spawn position
interface SpawnPosition {
  x: number;
  z: number;
}

export default function initializeGameManager(): void {
    // Only register if not already registered
    if (!AFRAME.components['game-manager']) {
        AFRAME.registerComponent('game-manager', {
        schema: {
            enemyCount: { type: 'number', default: 10 },
            level: { type: 'number', default: 1 },
            spawnRadius: { type: 'number', default: 20 },
            enemySpawnInterval: { type: 'number', default: 2000 },
            maxActiveEnemies: { type: 'number', default: 15 },
            gameStartDelay: { type: 'number', default: 2000 }
        },
        init: function(this: any): void {
            try {
                this.score = 0;
                this.level = this.data.level;
                this.enemiesRemaining = this.data.enemyCount * this.level;
                this.activeEnemies = [] as any[];
                this.activeEnemiesCount = 0;
                this.gameOver = false;
                this.levelInProgress = false;
                this.gameStarted = false;
                this.maxSpawnAttempts = 10;
                this.entityManager = new YUKA.EntityManager();
                this.spawnTimer = null as any;
                this.onPlayerDied = this.onPlayerDied.bind(this);
                this.el.addEventListener('player-died', this.onPlayerDied);
                this.elapsed = 0;
                this.lastKillTime = -10000;
                this.combo = 0;
                this.nextLevelIn = null;
                this.spawnElapsed = 0;
                
                const levelValueEl = document.getElementById('level-value');
                const scoreValueEl = document.getElementById('score-value');
                const enemiesValueEl = document.getElementById('enemies-value');
                
                if (levelValueEl) levelValueEl.textContent = String(this.level);
                if (scoreValueEl) scoreValueEl.textContent = String(this.score);
                if (enemiesValueEl) enemiesValueEl.textContent = String(this.enemiesRemaining);
            } catch (error) {
                console.error('Error initializing game manager:', error);
            }
        },
        resetMission: function(this: any): void {
            this.el.pause();
            if (this.spawnTimer) clearInterval(this.spawnTimer);
            this.spawnTimer = null;
            // Include pending entities which have not registered their component yet.
            this.el.querySelectorAll('[enemy-component], [data-mission-effect]').forEach((el: any) => el.remove());
            this.activeEnemies = [];
            this.activeEnemiesCount = 0;
            this.entityManager.clear();
            this.score = 0;
            this.level = this.data.level;
            this.enemiesRemaining = this.data.enemyCount * this.level;
            this.gameOver = false;
            this.levelInProgress = false;
            this.gameStarted = false;
            this.elapsed = 0;
            this.lastKillTime = -10000;
            this.combo = 0;
            this.nextLevelIn = null;
            this.spawnElapsed = 0;
            const player = this.el.querySelector('#player');
            player?.components['player-component']?.resetMission();
            player?.components['fly-controls']?.resetMission();
            this.el.querySelector('#jetbike')?.components['weapon-component']?.resetMission();
            this.el.components?.['ridge-run']?.resetMission();
            this.el.components?.['bridgehead-run']?.resetMission();
            for (const [id, value] of Object.entries({ 'level-value': this.level, 'score-value': 0, 'enemies-value': this.enemiesRemaining, 'combo-value': 'CHAIN ×1' })) {
                const node = document.getElementById(id);
                if (node) node.textContent = String(value);
            }
            this.showMessage('', 0);
            document.getElementById('threat-warning')?.classList.remove('active');
            this.el.emit('mission-reset', {});
        },
        startGame: function(this: any): void {
            try {
                if (this.gameStarted) return;
                this.gameStarted = true;
                if (this.el.components?.['world-stream']) {
                    this.enemiesRemaining = 0;
                    this.el.components['world-stream'].start();
                    this.el.components?.['bridgehead-run']?.start();
                    return;
                }
                if (this.el.components?.['ridge-run']) {
                    this.enemiesRemaining = 0;
                    this.el.components['ridge-run'].start();
                    return;
                }
                this.showMessage(`Get ready!`, 2000);
                this.nextLevelIn = this.data.gameStartDelay;
            } catch (error) {
                console.error('Error starting game:', error);
            }
        },
        startLevel: function(this: any): void {
            try {
                if (this.gameOver) return;
                this.levelInProgress = true;
                console.log(`Starting level ${this.level}`);
                
                const levelValueEl = document.getElementById('level-value');
                if (levelValueEl) levelValueEl.textContent = String(this.level);
                
                this.enemiesRemaining = this.data.enemyCount * this.level;
                
                const enemiesValueEl = document.getElementById('enemies-value');
                if (enemiesValueEl) enemiesValueEl.textContent = String(this.enemiesRemaining);
                
                this.showMessage(`Level ${this.level}`, 3000);
                this.startSpawningEnemies();
            } catch (error) {
                console.error('Error starting level:', error);
            }
        },
        startSpawningEnemies: function(this: any): void {
            try {
                this.spawnElapsed = 0;
            } catch (error) {
                console.error('Error starting enemy spawning:', error);
            }
        },
        registerEnemy: function(this: any, enemy: any): void {
            try {
                this.activeEnemies.push(enemy);
                this.activeEnemiesCount++;
            } catch (error) {
                console.error('Error registering enemy:', error);
            }
        },
        unregisterEnemy: function(this: any, enemy: any): void {
            try {
                const index = this.activeEnemies.indexOf(enemy);
                if (index !== -1) {
                    this.activeEnemies.splice(index, 1);
                    this.activeEnemiesCount--;
                }
                if (this.el.isPlaying && this.enemiesRemaining === 0 && this.activeEnemiesCount === 0 && this.levelInProgress) {
                    this.completeLevel();
                }
            } catch (error) {
                console.error('Error unregistering enemy:', error);
            }
        },
        findValidSpawnPosition: function(this: any): SpawnPosition {
            try {
                const playerEl = document.getElementById('player');
                if (!playerEl) return { x: 0, z: -10 };
                
                const playerPos = (playerEl as any).object3D.position;
                const minDistanceFromPlayer = 10;
                
                for (let attempt = 0; attempt < this.maxSpawnAttempts; attempt++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = this.data.spawnRadius * (0.5 + Math.random() * 0.5);
                    const x = playerPos.x + Math.cos(angle) * radius;
                    const z = playerPos.z + Math.sin(angle) * radius;
                    const distToPlayer = new THREE.Vector3(x - playerPos.x, 0, z - playerPos.z).length();
                    
                    if (distToPlayer >= minDistanceFromPlayer) {
                        if (clearSpawn(x,z)) return {x,z};
                    }
                }
                
                // Deterministic safe fallback stays inside the playable arena.
                for (const z of [-40, -10, 18]) for (const x of [-20, 0, 20]) {
                    if (clearSpawn(x,z) && Math.hypot(x-playerPos.x,z-playerPos.z) >= 10) return {x,z};
                }
                return {x:0,z:-40};
            } catch (error) {
                console.error('Error finding valid spawn position:', error);
                return { x: 0, z: -10 };
            }
        },
        spawnEnemy: function(this: any): void {
            try {
                if (this.gameOver) return;
                const position = this.findValidSpawnPosition();
                const enemy = document.createElement('a-entity');
                enemy.setAttribute('position', `${position.x} 0 ${position.z}`);
                
                // Randomly select enemy type (normal, fast, tank, sniper)
                const enemyTypes = this.level === 1 ? ['normal'] : this.level === 2 ? ['normal', 'fast'] : ['normal', 'fast', 'tank'];
                const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                
                // Base multipliers affected by level
                const levelSpeedMult = 1 + (this.level * 0.1);
                const levelHealthMult = 1 + (this.level * 0.2);
                const levelAttackMult = 1 + (this.level * 0.15);
                
                // Enemy type specific attributes
                let health: number, 
                    speed: number, 
                    attackPower: number, 
                    attackRate: number, 
                    color: string, 
                    weaponDamage: number, 
                    weaponRange: number, 
                    weaponAccuracy: number;
                
                switch(randomType) {
                    case 'fast':
                        health = 70 * levelHealthMult;
                        speed = 3.5 * levelSpeedMult;
                        attackPower = 8 * levelAttackMult;
                        attackRate = Math.max(0.3, 0.8 - (this.level * 0.05));
                        color = 'blue';
                        weaponDamage = 10 * levelAttackMult;
                        weaponRange = 30;
                        weaponAccuracy = 0.6;
                        break;
                        
                    case 'tank':
                        health = 200 * levelHealthMult;
                        speed = 1.5 * levelSpeedMult;
                        attackPower = 15 * levelAttackMult;
                        attackRate = Math.max(0.8, 1.2 - (this.level * 0.05));
                        color = 'purple';
                        weaponDamage = 20 * levelAttackMult;
                        weaponRange = 40;
                        weaponAccuracy = 0.7;
                        break;
                        
                    case 'sniper':
                        health = 80 * levelHealthMult;
                        speed = 1.8 * levelSpeedMult;
                        attackPower = 5 * levelAttackMult;
                        attackRate = Math.max(1.0, 1.5 - (this.level * 0.05));
                        color = 'green';
                        weaponDamage = 30 * levelAttackMult;
                        weaponRange = 70;
                        weaponAccuracy = 0.9;
                        break;
                        
                    default: // normal enemy
                        health = 100 * levelHealthMult;
                        speed = 2 * levelSpeedMult;
                        attackPower = 10 * levelAttackMult;
                        attackRate = Math.max(0.5, 1 - (this.level * 0.05));
                        color = 'red';
                        weaponDamage = 15 * levelAttackMult;
                        weaponRange = 50;
                        weaponAccuracy = 0.7;
                }
                
                enemy.setAttribute('enemy-component', {
                    health: health * 0.6,
                    speed: speed,
                    attackPower: attackPower,
                    attackRate: attackRate,
                    weaponDamage: weaponDamage * 0.5,
                    weaponRange: weaponRange,
                    weaponAccuracy: weaponAccuracy,
                    enemyType: randomType,
                    enemyColor: color
                });

                // Wave-three tanks get the authored animated pilot when it loads.
                // The procedural enemy remains the hitbox-safe fallback.
                if (this.level >= 3 && randomType === 'tank') {
                    enemy.setAttribute('hero-model', {
                        src: 'url(models/enemy.glb)',
                        targetHeight: 2.15
                    });
                }
                
                // Add hitbox component for improved hit detection
                enemy.setAttribute('hitbox', {
                    width: 1.2,
                    height: 1.8,
                    depth: 1.2,
                    offset: { x: 0, y: 0, z: 0 },
                    debug: false  // Set to true to see hitboxes during development
                });
                
                this.el.appendChild(enemy);
            } catch (error) {
                console.error('Error spawning enemy:', error);
            }
        },
        enemyKilled: function(this: any, enemy: any): void {
            try {
                this.combo = this.elapsed - this.lastKillTime <= 6000 ? Math.min(5, this.combo + 1) : 1;
                this.lastKillTime = this.elapsed;
                const comboEl = document.getElementById('combo-value');
                if (comboEl) comboEl.textContent = `CHAIN ×${this.combo}`;
                const basePoints = 100 * this.combo;
                const levelMultiplier = this.level;
                const pointsGained = basePoints * levelMultiplier;
                this.score += pointsGained;
                
                const scoreValueEl = document.getElementById('score-value');
                if (scoreValueEl) scoreValueEl.textContent = String(this.score);
                
                const position = enemy.el.getAttribute('position');
                this.showMessage(`+${pointsGained} · CHAIN ×${this.combo}`, 900);
            } catch (error) {
                console.error('Error handling enemy killed:', error);
            }
        },
        showPointsGained: function(this: any, points: number, position: { x: number, y: number, z: number }): void {
            try {
                const pointsEl = document.createElement('a-text');
                pointsEl.setAttribute('value', `+${points}`);
                pointsEl.setAttribute('color', 'yellow');
                pointsEl.setAttribute('position', `${position.x} ${position.y + 2} ${position.z}`);
                pointsEl.setAttribute('align', 'center');
                pointsEl.setAttribute('scale', '1.5 1.5 1.5');
                pointsEl.setAttribute('look-at', '[camera]');
                pointsEl.setAttribute('animation__float', { 
                    property: 'position', 
                    to: `${position.x} ${position.y + 4} ${position.z}`, 
                    dur: 1500, 
                    easing: 'easeOutQuad' 
                });
                pointsEl.setAttribute('animation__fade', { 
                    property: 'opacity', 
                    from: '1', 
                    to: '0', 
                    dur: 1500, 
                    easing: 'easeInQuad' 
                });
                
                this.el.appendChild(pointsEl);
                
                setTimeout(() => {
                    if (pointsEl.parentNode) {
                        pointsEl.parentNode.removeChild(pointsEl);
                    }
                }, 1500);
            } catch (error) {
                console.error('Error showing points gained:', error);
            }
        },
        completeLevel: function(this: any): void {
            try {
                if (!this.levelInProgress || this.gameOver) return;
                this.levelInProgress = false;
                console.log(`Level ${this.level} complete!`);
                
                if (this.spawnTimer) {
                    clearInterval(this.spawnTimer);
                }
                
                const levelBonus = 100 * this.level;
                this.score += levelBonus;
                
                const scoreValueEl = document.getElementById('score-value');
                if (scoreValueEl) scoreValueEl.textContent = String(this.score);
                
                this.showMessage(`Level ${this.level} Complete!<br>+${levelBonus} bonus points`, 3000);
                if (this.level >= 3) {
                    this.finishMission(true);
                } else {
                    this.level++;
                    this.nextLevelIn = 3000;
                }
            } catch (error) {
                console.error('Error completing level:', error);
            }
        },
        finishMission: function(this: any, won: boolean): void {
            if (this.gameOver) return;
            this.gameOver = true;
            this.levelInProgress = false;
            this.nextLevelIn = null;
            let best = this.score;
            try {
                const ridge = this.el.components?.['ridge-run'];
                const bridgehead = this.el.components?.['bridgehead-run'];
                const qa = this.el.hasAttribute?.('data-playtest');
                const key = bridgehead ? (qa ? 'mars-bridgehead-qa-best-v1' : 'mars-bridgehead-best-v1') : ridge ? (qa ? 'mars-ridge-qa-best-v1' : 'mars-ridge-best-v1') : (qa ? 'mars-qa-best-v1' : 'mars-best-v1');
                best = Math.max(this.score, Number(localStorage.getItem(key)) || 0);
                localStorage.setItem(key, String(best));
            } catch { /* Storage can be unavailable; the mission still ends. */ }
            const ridge = this.el.components?.['ridge-run'];
            const bridgehead = this.el.components?.['bridgehead-run'];
            const player = this.el.querySelector?.('#player')?.components?.['player-component'];
            const weapon = this.el.querySelector?.('#jetbike')?.components?.['weapon-component'];
            this.el.emit('mission-ended', {
                score: this.score,
                level: this.level,
                won,
                best,
                mode: bridgehead ? 'bridgehead-run' : ridge ? 'ridge-run' : 'waves',
                route: bridgehead?.route || ridge?.route,
                seconds: Math.round(this.elapsed / 1000),
                shots: weapon?.shotsFired || 0,
                chargesSpent: weapon?.chargesSpent || 0,
                hullLost: Math.max(0, (player?.maxHealth || 0) - (player?.health || 0)),
                shieldLeft: player?.shield || 0
            });
        },
        onPlayerDied: function(this: any): void {
            this.finishMission(false);
        },
        showMessage: function(this: any, text: string, duration: number): void {
            this.el.emit('mission-message', { text: text.replace(/<br>/g, '\n'), duration });
        },
        tick: function(this: any, time: number, delta: number): void {
            if (!this.gameStarted || this.gameOver || !this.el.isPlaying) return;
            const elapsed = Math.min(delta, 100);
            this.elapsed += elapsed;
            this.entityManager.update(elapsed / 1000);
            if (this.el.components?.['ridge-run'] || this.el.components?.['bridgehead-run']) {
                const count = document.getElementById('enemies-value');
                if (count) count.textContent = String(this.activeEnemiesCount);
                return;
            }
            if (this.nextLevelIn !== null) {
                this.nextLevelIn -= elapsed;
                if (this.nextLevelIn <= 0) {
                    this.nextLevelIn = null;
                    this.startLevel();
                }
            }
            if (this.levelInProgress) {
                this.spawnElapsed += elapsed;
                const spawnRate = Math.max(700, this.data.enemySpawnInterval / this.level);
                if (this.spawnElapsed >= spawnRate && this.activeEnemiesCount < this.data.maxActiveEnemies && this.enemiesRemaining > 0) {
                    this.spawnElapsed = 0;
                    this.spawnEnemy();
                    this.enemiesRemaining--;
                }
                if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0) this.completeLevel();
            }
            const count = document.getElementById('enemies-value');
            if (count) count.textContent = String(this.enemiesRemaining + this.activeEnemiesCount);
            if (this.elapsed - this.lastKillTime > 6000) {
                this.combo = 0;
                const combo = document.getElementById('combo-value');
                if (combo) combo.textContent = 'CHAIN ×1';
            }
        },
        remove: function(this: any): void {
            this.el.removeEventListener('player-died', this.onPlayerDied);
            try {
                if (this.spawnTimer) {
                    clearInterval(this.spawnTimer);
                }
            } catch (error) {
                console.error('Error removing game manager:', error);
            }
        }
    });
    }
}

// Initialize the component
initializeGameManager();
