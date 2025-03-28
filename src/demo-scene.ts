/**
 * Demo Scene for ReactFPS
 * 
 * This sets up a simple scene to showcase particle effects and audio
 */

import './components/sound-manager';
import './components/sprite-particles-component';
import './components/particle-demo';

// Import other necessary components
import * as THREE from 'three';
import AFRAME_EXPORT from './components/aframe-export';
import { soundManager } from './components/sound-manager';

const AFRAME = AFRAME_EXPORT;

// Wait for document to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Create demo scene
  createDemoScene();
  
  // Initialize audio as soon as possible (requires user interaction)
  document.addEventListener('click', () => {
    soundManager.start().catch(err => {
      console.error('Error starting sound system:', err);
    });
  }, { once: true });
});

// Create a simple demo scene
function createDemoScene(): void {
  // Get scene or create it if needed
  let scene = document.querySelector('a-scene');
  if (!scene) {
    scene = document.createElement('a-scene');
    scene.setAttribute('background', { color: '#060818' });
    document.body.appendChild(scene);
  }
  
  // Add lighting
  const light = document.createElement('a-light');
  light.setAttribute('type', 'ambient');
  light.setAttribute('color', '#bbbbff');
  light.setAttribute('intensity', '0.5');
  scene.appendChild(light);
  
  const directionalLight = document.createElement('a-light');
  directionalLight.setAttribute('type', 'directional');
  directionalLight.setAttribute('color', '#ffffff');
  directionalLight.setAttribute('intensity', '0.8');
  directionalLight.setAttribute('position', '1 1 1');
  scene.appendChild(directionalLight);
  
  // Add camera rig with controls
  const cameraRig = document.createElement('a-entity');
  cameraRig.setAttribute('position', '0 1.6 0');
  
  // Add camera
  const camera = document.createElement('a-camera');
  camera.setAttribute('look-controls', { pointerLockEnabled: false });
  camera.setAttribute('wasd-controls', { acceleration: 20 });
  cameraRig.appendChild(camera);
  
  // Add sound-manager to camera for initialization
  camera.setAttribute('sound-manager', { autoStart: true });
  
  // Add particle demo component
  camera.setAttribute('particle-demo', { enabled: true });
  
  scene.appendChild(cameraRig);
  
  // Add environment
  createEnvironment(scene);
}

// Create a simple environment for the demo
function createEnvironment(scene: HTMLElement): void {
  // Add floor
  const floor = document.createElement('a-entity');
  floor.setAttribute('geometry', { primitive: 'plane', width: 30, height: 30 });
  floor.setAttribute('rotation', '-90 0 0');
  floor.setAttribute('material', { 
    src: '/images/grass.jpg',
    repeat: '10 10',
    roughness: 1,
    metalness: 0
  });
  scene.appendChild(floor);
  
  // Add sky
  const sky = document.createElement('a-sky');
  sky.setAttribute('radius', '300');
  sky.setAttribute('material', {
    src: '/images/earth-sphere.jpg', 
    fog: false
  });
  scene.appendChild(sky);
  
  // Add some decorative elements
  
  // Create some boxes
  for (let i = 0; i < 5; i++) {
    const box = document.createElement('a-box');
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;
    box.setAttribute('position', `${x} 0.5 ${z}`);
    box.setAttribute('material', {
      src: '/images/crate.jpg',
      roughness: 0.8,
      metalness: 0.2
    });
    box.setAttribute('shadow', '');
    scene.appendChild(box);
  }
  
  // Add continuous particle effect for ambient atmosphere
  const dustEffect = document.createElement('a-entity');
  dustEffect.setAttribute('particle-system', {
    preset: 'dust',
    particleCount: 20,
    position: '0 1 0',
    spawnRadius: 10,
    lifeTime: 8
  });
  scene.appendChild(dustEffect);
  
  // Add a directional pointer to show where effects will appear
  const pointer = document.createElement('a-entity');
  pointer.setAttribute('position', '0 2 -3');
  
  // Add a small particle emitter to the pointer
  pointer.setAttribute('particle-system', {
    preset: 'thruster',
    particleSize: 0.02,
    spawnRate: 5,
    color: '#fff',
    opacity: '0.3,0'
  });
  
  scene.appendChild(pointer);
}
