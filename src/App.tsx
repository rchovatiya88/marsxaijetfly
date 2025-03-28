
import React, { useEffect, useState, useRef } from 'react';
// Import custom fly controls
import './components/custom-fly-controls';
import './App.css';
// Import Three.js shims first
import './three-addons-shim.js';
// Note: A-Frame and aframe-extras are now loaded in index.html
import './aframe-init';

// Extend Window interface for browser compatibility
declare global {
    interface Window {
        AFRAME?: any;
    }

    namespace JSX {
        interface IntrinsicElements {
            'a-scene': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'a-entity': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'a-camera': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'a-sky': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'a-light': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

function App(): JSX.Element {
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const [gamePaused, setGamePaused] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const gameSceneRef = useRef<HTMLElement | null>(null);

    // Check if AFRAME is available and setup scene  
    useEffect(() => {
        const checkAFrame = () => {
            if (window.AFRAME) {
                console.log('AFRAME is ready, initializing game');
                setLoading(false);
                return true;
            }
            return false;
        };

        // Check immediately
        if (checkAFrame()) return;

        // Set up interval to check for AFRAME
        const intervalId = setInterval(() => {
            if (checkAFrame()) {
                clearInterval(intervalId);
            }
        }, 100);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        // Initialize game and handle pointer lock events
        const handlePointerLockChange = (): void => {
            if (document.pointerLockElement === document.body) {
                console.log('Pointer locked in App.tsx');
                setGamePaused(false);
            } else {
                console.log('Pointer unlocked in App.tsx');
                if (gameStarted) {
                    setGamePaused(true);
                }
            }
        };

        const handlePointerLockError = (event: Event): void => {
            console.error('Pointer lock error:', event);
            setGamePaused(true);
        };

        document.addEventListener('pointerlockchange', handlePointerLockChange);
        document.addEventListener('pointerlockerror', handlePointerLockError);

        // Set up altitude and speed display
        const updateDisplays = () => {
            if (gameStarted && !gamePaused) {
                // Get player element and component
                const playerEl = document.querySelector('#player');
                if (playerEl && (playerEl as any).object3D && (playerEl as any).components) {
                    const playerComponent = (playerEl as any).components['player-component'];

                    // Update altitude display
                    const altitude = Math.max(0, (playerEl as any).object3D.position.y - 1.6).toFixed(1);
                    const altitudeDisplay = document.getElementById('altitude-value');
                    const altitudeBar = document.getElementById('altitude-bar');
                    if (altitudeDisplay) {
                        altitudeDisplay.textContent = altitude;
                    }
                    if (altitudeBar) {
                        // Calculate percentage of max height (100 units)
                        const maxHeight = 100;
                        const percentage = Math.min(100, (parseFloat(altitude) / maxHeight) * 100);
                        altitudeBar.style.width = `${percentage}%`;
                    }

                    // Update speed display
                    if (playerComponent) {
                        const velocity = playerComponent.velocity;
                        if (velocity) {
                            const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z).toFixed(1);
                            const speedDisplay = document.getElementById('speed-value');
                            const speedBar = document.getElementById('speed-bar');
                            if (speedDisplay) {
                                speedDisplay.textContent = speed;
                            }
                            if (speedBar) {
                                // Calculate percentage of max speed (50 units)
                                const maxSpeed = 50;
                                const percentage = Math.min(100, (parseFloat(speed) / maxSpeed) * 100);
                                speedBar.style.width = `${percentage}%`;
                            }

                            // Update motion blur effect for high speed
                            const motionBlur = document.getElementById('motion-blur');
                            if (motionBlur) {
                                // Add motion blur effect when sprinting
                                if (playerComponent.isSprinting && parseFloat(speed) > 20) {
                                    motionBlur.classList.add('active');
                                } else {
                                    motionBlur.classList.remove('active');
                                }
                            }
                        }
                    }
                }
            }
            requestAnimationFrame(updateDisplays);
        };

        updateDisplays();

        return () => {
            document.removeEventListener('pointerlockchange', handlePointerLockChange);
            document.removeEventListener('pointerlockerror', handlePointerLockError);
        };
    }, [gameStarted, gamePaused]);

    const startGame = (): void => {
        console.log('Starting game and requesting pointer lock');
        // Use the extended Document interface from lib.dom.d.ts
        (document.body as any).requestPointerLock = 
            document.body.requestPointerLock || 
            (document.body as any).mozRequestPointerLock ||
            (document.body as any).webkitRequestPointerLock;

        // First set up the game components
        const playerEl = document.querySelector('#player');
        if (playerEl) {
            // Disable the WASD controls from the camera to prevent conflicts
            const cameraEl = playerEl.querySelector('#camera');
            if (cameraEl) {
                cameraEl.setAttribute('wasd-controls', 'enabled: false');
                cameraEl.setAttribute('look-controls', 'enabled: false'); // Disable default look controls
                console.log('Default camera controls disabled');
            }

            // Remove any existing controls first
            playerEl.removeAttribute('custom-fly-controls');
            
            // Enable custom fly controls with proper settings
            playerEl.setAttribute('custom-fly-controls', 'lookSpeed: 0.5; maxPitchAngle: 1.57');

            // Keep existing fly controls enabled for movement
            playerEl.setAttribute('fly-controls', 'enabled: true');
            console.log('Fly controls explicitly enabled and configured');
        }

        // Get game manager and start game
        const gameManagerEl = document.querySelector('[game-manager]');
        const gameManager = gameManagerEl ? (gameManagerEl as any).components['game-manager'] : null;

        if (gameManager && gameManager.startGame) {
            gameManager.startGame();
            setGameStarted(true);
            setGamePaused(false);
        }

        // Then request pointer lock
        document.body.requestPointerLock();
    };

    const resumeGame = (): void => {
        console.log('Resuming game and re-enabling pointer lock');

        // Re-enable controls
        const playerEl = document.querySelector('#player');
        if (playerEl) {
            playerEl.setAttribute('fly-controls', 'enabled: true');
            playerEl.setAttribute('custom-fly-controls', 'lookSpeed: 0.5; maxPitchAngle: 1.57');
            console.log('Fly controls re-enabled on resume');
        }

        document.body.requestPointerLock();
        setGamePaused(false);
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <h2>Loading Game...</h2>
                <p>Please wait while the game resources are loading.</p>
            </div>
        );
    }

    return (
        <div className="App">
            {/* Motion blur effect for high speed */}
            <div id="motion-blur"></div>

            <div id="crosshair">+</div>
            <div id="health-display">
                <div id="health-bar"></div>
            </div>
            <div id="ammo-display">30/∞</div>
            <div id="score-ui">
                <div>Level: <span id="level-value">1</span></div>
                <div>Score: <span id="score-value">0</span></div>
                <div>Enemies: <span id="enemies-value">5</span></div>
            </div>
            <div id="damage-overlay"></div>

            {/* Game Message Overlay */}
            {!gameStarted && (
                <div id="game-message">
                    Welcome to FPS Claude!<br />
                    WASD to move, Mouse to aim, Click to shoot<br /><br />
                    <button id="start-button" onClick={startGame}>Start Game</button>
                </div>
            )}

            {gameStarted && gamePaused && (
                <div id="pause-menu">
                    <h2>Game Paused</h2>
                    <button onClick={resumeGame}>Resume Game</button>
                </div>
            )}

            {/* A-Frame Scene */}
            <a-scene 
                ref={gameSceneRef}
                game-manager="enemyCount: 5; level: 1; spawnRadius: 15"
                vr-mode-ui="enabled: false"
                renderer="antialias: true; gammaOutput: true">

                {/* Environment & Level */}
                <a-entity 
                    id="level"
                    gltf-model="/models/level1.glb"
                    position="0 5.9 -20"
                    scale="1 1 1"></a-entity>

                <a-entity 
                    id="navmesh"
                    gltf-model="/models/level1_navmesh.glb"
                    position="0 5.9 -20"
                    scale="1 1 1"
                    visible="false"></a-entity>

                <a-entity
                    id="player"
                    position="0 1.6 0"
                    player-component
                    custom-fly-controls="lookSpeed: 0.5; maxPitchAngle: 1.57"
                    visible="true">
                    
                    <a-entity
                        id="player-collision"
                        geometry="primitive: box; width: 0.5; height: 1.6; depth: 0.5"
                        material="color: red; opacity: 0.5"
                        position="0 0.8 0"
                        visible="false"></a-entity>
                    
                    <a-entity
                        id="player-hitbox"
                        geometry="primitive: box; width: 0.5; height: 1.6; depth: 0.5"
                        material="color: red; opacity: 0.5"
                        position="0 0.8 0"
                        visible="false"></a-entity>
                    
                    <a-camera
                        id="camera"
                        position="0 1.6 0"
                        look-controls="reverseMouseDrag: false; touchEnabled: true; pointerLockEnabled: true; magicWindowTrackingEnabled: false"
                        wasd-controls="enabled: false"></a-camera>
                </a-entity>

                {/* Sky */}
                <a-sky color="black"></a-sky>

                {/* Lights */}
                <a-light 
                    type="ambient"
                    color="#BBB"
                    intensity="3.5"></a-light>
                    
                <a-light 
                    type="directional"
                    color="#FFF"
                    intensity="0.5"
                    position="-1 1 1"></a-light>
            </a-scene>
        </div>
    );
}

export default App;
