// eslint-disable-next-line
/**
 * Improved Drone-like FlyControls for A-Frame in React
 * 
 * Implements intuitive drone flight controls for the hoverbike
 * Fixed for proper mouse movement handling
 */

// Import THREE.js
import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';

const AFRAME = AFRAME_EXPORT;

export default function initializeFlyControls(): void {
  if (!AFRAME.components['fly-controls']) {
    AFRAME.registerComponent('fly-controls', {
      schema: {
        enabled: { type: 'boolean', default: true },
        movementSpeed: { type: 'number', default: 25 },
        lookSensitivity: { type: 'number', default: 0.1 },
        rollSpeed: { type: 'number', default: 0.05 },
        pitchSpeed: { type: 'number', default: 0.1 },
        yawSpeed: { type: 'number', default: 0.1 },
        dragToLook: { type: 'boolean', default: false },
        autoForward: { type: 'boolean', default: false }
      },
      
      init: function() {
        console.log('Initializing fly controls...');
        
        // Store element references
        this.playerEl = this.el;
        this.cameraEl = document.querySelector('#camera');
        this.cameraRigEl = document.querySelector('#camera-rig');
        this.jetbikeEl = document.querySelector('#jetbike');
        
        // Ensure we have the necessary elements
        if (!this.playerEl || !this.cameraEl) {
          console.error('Missing required elements for fly controls');
          return;
        }
        
        // Store Three.js objects
        this.playerObj = this.playerEl.object3D;
        this.cameraObj = this.cameraEl.object3D;
        
        // Initialize vectors and quaternions
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.rotationQuaternion = new THREE.Quaternion();
        this.yawQuaternion = new THREE.Quaternion();
        this.flatForward = new THREE.Vector3();
        this.flatRight = new THREE.Vector3();
        this.upVector = new THREE.Vector3(0, 1, 0);
        this.flatMoveDelta = new THREE.Vector3();
        
        // Movement and rotation state
        this.moveVector = new THREE.Vector3();
        this.rotationVector = new THREE.Vector3();
        
        // Movement state
        this.moveState = {
          up: 0,
          down: 0,
          left: 0,
          right: 0,
          forward: 0,
          back: 0,
          pitchUp: 0,
          pitchDown: 0,
          yawLeft: 0,
          yawRight: 0,
          rollLeft: 0,
          rollRight: 0
        };
        
        // Speed multiplier for sprint
        this.speedMultiplier = 1;
        
        // Mouse tracking
        this.mouseEnabled = true;
        this.mouseLocked = false;
        
        // Bind event handlers
        this.bindEvents();
        
        // Set initial position for camera
        if (this.cameraRigEl) {
          this.cameraRigEl.setAttribute('position', {x: 0, y: 3, z: 8});
        }
        
        console.log('Fly controls initialized');
      },
      
      bindEvents: function() {
        console.log('Binding fly controls events');
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
        
        // Add event listeners to document (not window)
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('pointerlockchange', this.handlePointerLockChange);
        
        console.log('Fly controls events bound');
      },
      
      handlePointerLockChange: function() {
        this.mouseLocked = document.pointerLockElement === document.body;
        if ((!this.mouseLocked && !this.data.dragToLook)) this.clearInput();
        console.log('Pointer lock changed:', this.mouseLocked ? 'locked' : 'unlocked');
      },
      
      handleKeyDown: function(event) {
        if (!this.data.enabled || !this.el.sceneEl.isPlaying || (!this.mouseLocked && !this.data.dragToLook)) return;
        
        switch (event.code) {
          case 'KeyW': this.moveState.forward = 1; break;
          case 'KeyS': this.moveState.back = 1; break;
          case 'KeyA': this.moveState.left = 1; break;
          case 'KeyD': this.moveState.right = 1; break;
          case 'KeyQ': this.moveState.down = 1; break;
          case 'KeyE': this.moveState.up = 1; break;
          case 'ShiftLeft': case 'ShiftRight': this.speedMultiplier = 2; break;
          
          // Arrow keys for manual rotation
          case 'ArrowUp': this.moveState.pitchUp = 1; break;
          case 'ArrowDown': this.moveState.pitchDown = 1; break;
          case 'ArrowLeft': this.moveState.yawLeft = 1; break;
          case 'ArrowRight': this.moveState.yawRight = 1; break;
          case 'KeyZ': this.moveState.rollLeft = 1; break;
          case 'KeyX': this.moveState.rollRight = 1; break;
        }
        
        this.updateMovementVector();
        this.updateRotationVector();
      },
      
      handleKeyUp: function(event) {
        if (!this.data.enabled) return;
        
        switch (event.code) {
          case 'KeyW': this.moveState.forward = 0; break;
          case 'KeyS': this.moveState.back = 0; break;
          case 'KeyA': this.moveState.left = 0; break;
          case 'KeyD': this.moveState.right = 0; break;
          case 'KeyQ': this.moveState.down = 0; break;
          case 'KeyE': this.moveState.up = 0; break;
          case 'ShiftLeft': case 'ShiftRight': this.speedMultiplier = 1; break;
          
          // Arrow keys for manual rotation
          case 'ArrowUp': this.moveState.pitchUp = 0; break;
          case 'ArrowDown': this.moveState.pitchDown = 0; break;
          case 'ArrowLeft': this.moveState.yawLeft = 0; break;
          case 'ArrowRight': this.moveState.yawRight = 0; break;
          case 'KeyZ': this.moveState.rollLeft = 0; break;
          case 'KeyX': this.moveState.rollRight = 0; break;
        }
        
        this.updateMovementVector();
        this.updateRotationVector();
      },
      
      handleMouseMove: function(event) {
        if (!this.data.enabled || !this.el.sceneEl.isPlaying || (!this.mouseLocked && !this.data.dragToLook) || !this.mouseEnabled) return;
        
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        

        
        // Apply mouse movement directly to rotation
        const sensitivity = this.data.lookSensitivity;
        this.rotation.y -= movementX * sensitivity * 0.002;
        this.rotation.x -= movementY * sensitivity * 0.002;
        
        // Limit pitch to avoid flipping
        this.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotation.x));
        
        // Update quaternion
        this.rotationQuaternion.setFromEuler(this.rotation);
        this.playerObj.quaternion.copy(this.rotationQuaternion);
      },
      
      handleMouseDown: function(event) {
        if (!this.data.enabled || !this.el.sceneEl.isPlaying || (!this.mouseLocked && !this.data.dragToLook)) return;
        this.mouseEnabled = true;
      },
      
      handleMouseUp: function(event) {
        if (!this.data.enabled || !this.el.sceneEl.isPlaying || (!this.mouseLocked && !this.data.dragToLook)) return;
      },
      
      updateMovementVector: function() {
        const moveState = this.moveState;
        
        this.moveVector.x = (-moveState.left + moveState.right);
        this.moveVector.y = (-moveState.down + moveState.up);
        this.moveVector.z = (-moveState.forward + moveState.back);
      },
      
      updateRotationVector: function() {
        const moveState = this.moveState;
        
        this.rotationVector.x = (-moveState.pitchDown + moveState.pitchUp);
        this.rotationVector.y = (-moveState.yawRight + moveState.yawLeft);
        this.rotationVector.z = (-moveState.rollRight + moveState.rollLeft);
      },
      
      tick: function(time, delta) {
        if (!this.data.enabled || !this.el.sceneEl.isPlaying || (!this.mouseLocked && !this.data.dragToLook)) return;
        
        // Calculate time factor for smooth movement
        const dt = Math.min(delta / 1000, 0.1); // Cap at 0.1 to avoid large jumps
        
        // Apply keyboard rotation
        if (this.rotationVector.lengthSq() > 0) {
          const rotAmount = {
            x: this.rotationVector.x * dt * this.data.pitchSpeed,
            y: this.rotationVector.y * dt * this.data.yawSpeed,
            z: this.rotationVector.z * dt * this.data.rollSpeed
          };
          
          // Apply keyboard rotation
          this.rotation.x += rotAmount.x;
          this.rotation.y += rotAmount.y;
          this.rotation.z += rotAmount.z;
          
          // Limit pitch to avoid flipping
          this.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotation.x));
          
          // Update quaternion
          this.rotationQuaternion.setFromEuler(this.rotation);
          this.playerObj.quaternion.copy(this.rotationQuaternion);
        }
        
        this.velocity.set(0, 0, 0);
        // Apply movement if any direction keys are pressed
        if (this.moveVector.lengthSq() > 0) {
          // Create a normalized movement direction
          const moveDir = this.moveVector.clone().normalize();
          
          // Transform direction to player's local space
          const speed = this.data.movementSpeed * this.speedMultiplier * dt;
          
          // Use yaw-only movement so looking up does not make W climb.
          this.yawQuaternion ||= new THREE.Quaternion();
          this.upVector ||= new THREE.Vector3(0, 1, 0);
          this.flatForward ||= new THREE.Vector3();
          this.flatRight ||= new THREE.Vector3();
          this.flatMoveDelta ||= new THREE.Vector3();
          this.yawQuaternion.setFromAxisAngle(this.upVector, this.rotation.y);
          const forward = this.flatForward.set(0, 0, -1).applyQuaternion(this.yawQuaternion).normalize();
          const right = this.flatRight.set(1, 0, 0).applyQuaternion(this.yawQuaternion).normalize();
          
          // Calculate movement delta
          const moveDelta = this.flatMoveDelta.set(0, 0, 0)
            .addScaledVector(forward, -moveDir.z * speed)
            .addScaledVector(right, moveDir.x * speed)
            .addScaledVector(this.upVector, moveDir.y * speed);
          
          // Apply movement inside the performance arena.
          this.playerObj.position.add(moveDelta);
          this.playerObj.position.x = Math.max(-38, Math.min(38, this.playerObj.position.x));
          this.playerObj.position.y = Math.max(1.8, Math.min(26, this.playerObj.position.y));
          this.playerObj.position.z = Math.max(-48, Math.min(28, this.playerObj.position.z));
          this.velocity.copy(moveDelta).divideScalar(dt || 0.016);
          const player = this.el.components['player-component'];
          if (player) { player.velocity.copy(this.velocity); player.isSprinting = this.speedMultiplier > 1; }
          
          // Emit movement event for other components
          this.el.emit('move', {
            position: this.playerObj.position,
            quaternion: this.playerObj.quaternion,
            moveDelta: moveDelta
          });
        }
        
        // Update camera to follow player
        this.updateCamera(dt);
      },
      
      updateCamera: function(dt) {
        if (!this.cameraRigEl) return;
        
        // The camera rig is a child of the player: its position is local.
        this.cameraRigEl.object3D.position.set(0, 2, 8);
      },

      clearInput: function() {
        for (const key in this.moveState) this.moveState[key] = 0;
        this.speedMultiplier = 1;
        this.moveVector.set(0, 0, 0);
        this.rotationVector.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
      },

      pause: function() { this.clearInput(); },

      remove: function() {
        console.log('Removing fly controls');
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
        
        console.log('Fly controls removed');
      }
    });
  }
}

// Initialize the component
initializeFlyControls();
