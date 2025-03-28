/**
 * Game Manager Component for A-Frame in React
 * 
 * Handles game lifecycle, enemy spawning, scoring, and level progression
 */

// Import THREE.js and YUKA - A-Frame is imported globally in App.js
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
                this.el.addEventListener('player-died', this.onPlayerDied.bind(this));
                
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
        startGame: function(this: any): void {
            try {
                if (this.gameStarted) return;
                this.gameStarted = true;
                this.showMessage(`Get ready!`, 2000);
                setTimeout(() => {
                    this.startLevel();
                }, 2000);
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
                if (this.spawnTimer) {
                    clearInterval(this.spawnTimer);
                }
                const spawnRate = Math.max(500, this.data.enemySpawnInterval / this.level);
                this.spawnTimer = setInterval(() => {
                    if (this.gameOver) {
                        clearInterval(this.spawnTimer);
                        return;
                    }
                    if (this.activeEnemiesCount < this.data.maxActiveEnemies && this.enemiesRemaining > 0) {
                        this.spawnEnemy();
                        this.enemiesRemaining--;
                        
                        const enemiesValueEl = document.getElementById('enemies-value');
                        if (enemiesValueEl) enemiesValueEl.textContent = String(this.enemiesRemaining);
                    } else if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0 && this.levelInProgress) {
                        this.completeLevel();
                    }
                }, spawnRate);
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
                if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0 && this.levelInProgress) {
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
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    const distToPlayer = new THREE.Vector3(x - playerPos.x, 0, z - playerPos.z).length();
                    
                    if (distToPlayer >= minDistanceFromPlayer) {
                        const obstacles = document.querySelectorAll('.obstacle');
                        let validPosition = true;
                        
                        for (let i = 0; i < obstacles.length; i++) {
                            const obstacle = obstacles[i];
                            const obstaclePos = obstacle.getAttribute('position');
                            const obstacleWidth = obstacle.getAttribute('width') || 1;
                            const distToObstacle = new THREE.Vector3(
                                x - obstaclePos.x, 
                                0, 
                                z - obstaclePos.z
                            ).length();
                            
                            if (distToObstacle < obstacleWidth + 1) {
                                validPosition = false;
                                break;
                            }
                        }
                        
                        if (validPosition) {
                            return { x, z };
                        }
                    }
                }
                
                // If all attempts fail, return a position at a random angle
                const angle = Math.random() * Math.PI * 2;
                return { 
                    x: Math.cos(angle) * this.data.spawnRadius, 
                    z: Math.sin(angle) * this.data.spawnRadius 
                };
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
                enemy.setAttribute('simple-navmesh-constraint', 'navmesh: #navmesh; fall: 10; height: 1.6');
                
                // Randomly select enemy type (normal, fast, tank, sniper)
                const enemyTypes = ['normal', 'fast', 'tank', 'sniper'];
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
                    health: health,
                    speed: speed,
                    attackPower: attackPower,
                    attackRate: attackRate,
                    weaponDamage: weaponDamage,
                    weaponRange: weaponRange,
                    weaponAccuracy: weaponAccuracy,
                    enemyType: randomType,
                    enemyColor: color
                });
                
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
                const basePoints = 10;
                const levelMultiplier = this.level;
                const pointsGained = basePoints * levelMultiplier;
                this.score += pointsGained;
                
                const scoreValueEl = document.getElementById('score-value');
                if (scoreValueEl) scoreValueEl.textContent = String(this.score);
                
                const position = enemy.el.getAttribute('position');
                this.showPointsGained(pointsGained, position);
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
                this.level++;
                
                setTimeout(() => {
                    if (!this.gameOver) {
                        this.startLevel();
                    }
                }, 5000);
            } catch (error) {
                console.error('Error completing level:', error);
            }
        },
        onPlayerDied: function(this: any): void {
            try {
                if (this.gameOver) return;
                this.gameOver = true;
                this.levelInProgress = false;
                console.log('Game over!');
                
                if (this.spawnTimer) {
                    clearInterval(this.spawnTimer);
                }
                
                this.showMessage(`Game Over!<br>Final Score: ${this.score}<br><br>Click to restart`, 0);
                
                const restartListener = (event: Event) => {
                    document.removeEventListener('click', restartListener);
                    window.location.reload();
                };
                
                setTimeout(() => {
                    document.addEventListener('click', restartListener);
                }, 2000);
            } catch (error) {
                console.error('Error handling player death:', error);
            }
        },
        showMessage: function(this: any, text: string, duration: number): void {
            try {
                const gameMessage = document.getElementById('game-message');
                if (gameMessage) {
                    gameMessage.innerHTML = text;
                    gameMessage.style.display = 'block';
                    
                    if (duration > 0) {
                        setTimeout(() => {
                            if (gameMessage) {
                                gameMessage.style.display = 'none';
                            }
                        }, duration);
                    }
                }
            } catch (error) {
                console.error('Error showing message:', error);
            }
        },
        tick: function(this: any, time: number, delta: number): void {
            try {
                const dt = delta / 1000;
                this.entityManager.update(dt);
                
                if (this.levelInProgress) {
                    if (this.enemiesRemaining === 0 && this.activeEnemiesCount === 0) {
                        this.completeLevel();
                    }
                }
            } catch (error) {
                console.error('Error in game manager tick:', error);
            }
        },
        remove: function(this: any): void {
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