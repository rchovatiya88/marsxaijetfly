// This file ensures all A-Frame components are properly initialized

// Import all component initializers
import initializeUtils from './components/utils';
import initializeHitboxComponent from './components/hitbox-component';
import initializePlayerComponent from './components/player-component';
import initializeWeaponComponent from './components/weapon-component';
import initializeEnemyComponent from './components/enemy-component';
import initializeGameManager from './components/game-manager';
import initializeNavMeshConstraint from './components/simple-navmesh-constraint';
import initializeSpritesheetAnimationComponent from './components/spritesheet-animation-component';
import initializeSpriteParticlesComponent from './components/sprite-particles-component';
import initializeFlyControls from './components/fly-controls';

// Add global interfaces
declare global {
  interface Window {
    AFRAME_INITIALIZED?: boolean;
  }
}

// Create an initialization function that ensures proper order
export function initializeAFrame(): void {
  console.log('Initializing A-Frame components...');
  
  // Check if initialization has already happened
  if (window.AFRAME_INITIALIZED) {
    console.log('A-Frame components already initialized');
    return;
  }
  
  // Initialize in dependency order
  initializeUtils();
  initializeHitboxComponent();
  initializeSpritesheetAnimationComponent(); // Initialize spritesheet animations
  initializeSpriteParticlesComponent(); // Initialize sprite particles
  initializeFlyControls(); // Initialize fly controls before player
  initializePlayerComponent();
  initializeWeaponComponent();
  initializeEnemyComponent();
  initializeGameManager();
  initializeNavMeshConstraint();
  
  // Mark as initialized
  window.AFRAME_INITIALIZED = true;
  
  console.log('A-Frame components initialized successfully');
}

// Initialize A-Frame components immediately
initializeAFrame();
