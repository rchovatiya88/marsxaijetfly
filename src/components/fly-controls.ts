// eslint-disable-next-line
/**
 * Improved Drone-like FlyControls for A-Frame in React
 * 
 * Implements intuitive drone flight controls for the hoverbike
 * Fixed for proper mouse movement handling
 */

// Import THREE.js
import { moveInWorld, moveBikeBody, rotateBikeBody, traceWorld } from '../arena-world';
import { createBrowserFlightInputAdapter } from '../flight-input';
import * as THREE from 'three';
import AFRAME_EXPORT from './aframe-export';

const AFRAME = AFRAME_EXPORT;
const DEFAULT_MAX_CURSOR_DELTA = 48;
const DEFAULT_MAX_LOCKED_DELTA = 80;
const CURSOR_JUMP_FACTOR = 4;

export function boundedMouseDelta(value: number, maxDelta: number): number {
  if (!Number.isFinite(value)) return 0;
  const limit = Number.isFinite(maxDelta) && maxDelta > 0 ? maxDelta : DEFAULT_MAX_CURSOR_DELTA;
  return Math.max(-limit, Math.min(limit, value));
}

// The sweep is centred on the rig, so include the complete near plane relative
// to that pivot, including any camera child offset and inherited scale. The
// projection inverse also handles zoom/aspect changes and asymmetric frusta.
// Shipped A-Frame near=0.005/FOV=80 fits inside the existing 0.25 m minimum.
export function cameraNearPlaneRadius(camera: THREE.Camera | undefined, rigCenter: THREE.Vector3, corner: THREE.Vector3): number {
  if (!camera?.projectionMatrixInverse || !camera.matrixWorld) return 0.25;
  let radiusSquared = 0.25 * 0.25;
  for (let x = -1; x <= 1; x += 2) for (let y = -1; y <= 1; y += 2) {
    corner.set(x, y, -1).applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);
    const distanceSquared = corner.distanceToSquared(rigCenter);
    if (Number.isFinite(distanceSquared)) radiusSquared = Math.max(radiusSquared, distanceSquared);
  }
  return Math.sqrt(radiusSquared);
}

export default function initializeFlyControls(): void {
  if (!AFRAME.components['fly-controls']) {
    AFRAME.registerComponent('fly-controls', {
      schema: {
        enabled: { type: 'boolean', default: true },
        movementSpeed: { type: 'number', default: 25 },
        lookSensitivity: { type: 'number', default: 0.1 },
        rollSpeed: { type: 'number', default: 0.05 },
        pitchSpeed: { type: 'number', default: 1.2 },
        yawSpeed: { type: 'number', default: 1.8 },
        invertY: { type: 'boolean', default: false },
        dragToLook: { type: 'boolean', default: false },
        mousePitchScale: { type: 'number', default: 0.55 },
        maxCursorDelta: { type: 'number', default: DEFAULT_MAX_CURSOR_DELTA },
        maxLockedDelta: { type: 'number', default: DEFAULT_MAX_LOCKED_DELTA },
        gamepad: { type: 'boolean', default: true },
        gamepadLookSpeed: { type: 'number', default: 2.4 },
        cameraHeight: { type: 'number', default: 2 },
        cameraDistance: { type: 'number', default: 8 },
        cameraShoulder: { type: 'number', default: 0 },
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
        this.combinedMoveVector = new THREE.Vector3();
        this.gamepadMoveVector = new THREE.Vector3();
        this.flightInput = createBrowserFlightInputAdapter(typeof window !== 'undefined' ? window : globalThis);
        
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
        this.boostKeys = new Set<string>();
        
        // Mouse tracking
        this.mouseEnabled = true;
        this.mouseLocked = false;
        this.cursorDragging = false;
        this.cursorPosition = null;
        
        // Bind event handlers
        this.bindEvents();
        
        // Match the authored boom on the first playable frame. Hard-coded
        // defaults here caused Bridgehead to jump from 0/2/8 to 0/1.45/5.4
        // only after its first camera update/reset.
        if (this.cameraRigEl) {
          this.cameraRigEl.setAttribute('position', {x: this.data.cameraShoulder || 0, y: this.data.cameraHeight, z: this.data.cameraDistance});
        }
        this.applyLookRotation();
        
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
        this.handleMouseOut = this.handleMouseOut.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        
        // Add event listeners to document (not window)
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('pointerlockchange', this.handlePointerLockChange);
        document.addEventListener('mouseout', this.handleMouseOut);
        document.addEventListener('contextmenu', this.handleContextMenu);
        
        console.log('Fly controls events bound');
      },
      
      handlePointerLockChange: function() {
        this.mouseLocked = document.pointerLockElement === document.body || document.pointerLockElement === this.el.sceneEl.canvas;
        this.cursorDragging = false;
        this.cursorPosition = null;
        if ((!this.mouseLocked && !this.data.dragToLook)) this.clearInput();
        console.log('Pointer lock changed:', this.mouseLocked ? 'locked' : 'unlocked');
      },
      
      handleKeyDown: function(event) {
        if (!this.data.enabled || !this.el.sceneEl.isPlaying || (!this.mouseLocked && !this.data.dragToLook)) return;
        if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
        
        switch (event.code) {
          case 'KeyW': this.moveState.forward = 1; break;
          case 'KeyS': this.moveState.back = 1; break;
          case 'KeyA': this.moveState.left = 1; break;
          case 'KeyD': this.moveState.right = 1; break;
          case 'KeyQ': this.moveState.down = 1; break;
          case 'KeyE': this.moveState.up = 1; break;
          case 'ShiftLeft': case 'ShiftRight':
            (this.boostKeys ||= new Set<string>()).add(event.code);
            this.speedMultiplier = 2; break;
          
          // Arrow keys for manual rotation
          case 'ArrowUp': this.moveState.pitchUp = 1; break;
          case 'ArrowDown': this.moveState.pitchDown = 1; break;
          case 'ArrowLeft': this.moveState.yawLeft = 1; break;
          case 'ArrowRight': this.moveState.yawRight = 1; break;
          default: return;
        }
        event.preventDefault?.();
        
        this.updateMovementVector();
        this.updateRotationVector();
      },
      
      handleKeyUp: function(event) {
        // Releases must be accepted while disabled, paused, or after focus loss.
        switch (event.code) {
          case 'KeyW': this.moveState.forward = 0; break;
          case 'KeyS': this.moveState.back = 0; break;
          case 'KeyA': this.moveState.left = 0; break;
          case 'KeyD': this.moveState.right = 0; break;
          case 'KeyQ': this.moveState.down = 0; break;
          case 'KeyE': this.moveState.up = 0; break;
          case 'ShiftLeft': case 'ShiftRight':
            this.boostKeys?.delete(event.code);
            this.speedMultiplier = this.boostKeys?.size ? 2 : 1; break;
          
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
        let movementX: number, movementY: number, maxDelta: number;
        if (this.mouseLocked) {
          movementX = event.movementX ?? event.mozMovementX ?? event.webkitMovementX ?? 0;
          movementY = event.movementY ?? event.mozMovementY ?? event.webkitMovementY ?? 0;
          maxDelta = this.data.maxLockedDelta;
        } else {
          // Unlocked movementX varies by browser/display scaling. Use CSS-pixel
          // deltas only during a drag begun on the game canvas. Release to recenter.
          // Very large deltas usually mean the cursor crossed an edge or the
          // browser resumed after focus/layout work; re-anchor instead of
          // slamming pitch into its clamp.
          if (event.target !== this.el.sceneEl.canvas || !this.cursorDragging || !(event.buttons & 3)) {
            this.cursorPosition = null;
            if (!(event.buttons & 3)) this.cursorDragging = false;
            return;
          }
          const previous = this.cursorPosition;
          this.cursorPosition = {x:event.clientX,y:event.clientY};
          if (!previous) return;
          movementX = event.clientX - previous.x;
          movementY = event.clientY - previous.y;
          maxDelta = this.data.maxCursorDelta;
          if (Math.abs(movementX) > maxDelta * CURSOR_JUMP_FACTOR || Math.abs(movementY) > maxDelta * CURSOR_JUMP_FACTOR) {
            this.cursorPosition = null;
            return;
          }
        }
        if (!Number.isFinite(movementX) || !Number.isFinite(movementY)) return;
        movementX = boundedMouseDelta(movementX, maxDelta);
        movementY = boundedMouseDelta(movementY, maxDelta);
        // Direct relative motion has no trailing smoothing drift after release,
        // with a calmer vertical gain so mouse Y cannot dominate the chase view.
        const sensitivity = this.data.lookSensitivity;
        const pitchScale = Number.isFinite(this.data.mousePitchScale) ? Math.max(0.1, Math.min(1, this.data.mousePitchScale)) : 0.55;
        this.rotation.y -= movementX * sensitivity * 0.004;
        this.rotation.x -= movementY * sensitivity * 0.004 * pitchScale * (this.data.invertY ? -1 : 1);
        this.applyLookRotation();
      },

      applyLookRotation: function() {
        // Track yaw delta for smooth banking kinematics
        const prevYaw = this.lastYawRotation ?? this.rotation.y;
        this.lastYawDelta = this.rotation.y - prevYaw;
        this.lastYawRotation = this.rotation.y;

        // The bike/boom own yaw only. Pitch belongs to the camera at the end of
        // the boom: aiming must not orbit the camera through terrain or roll the horizon.
        this.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.rotation.x));
        this.rotation.z = 0;
        if (this.el?.sceneEl?.components?.['bridgehead-run']) {
          this.rotation.y = rotateBikeBody(this.playerObj.position, this.playerObj.rotation.y, this.rotation.y);
        }
        this.playerObj.rotation.set(0, this.rotation.y, 0, 'YXZ');
        if (this.cameraRigEl) this.cameraRigEl.object3D.quaternion.identity();
        if (this.cameraObj) this.cameraObj.rotation.set(this.rotation.x, 0, 0, 'YXZ');
      },
      
      handleMouseDown: function(event) {
        if (!this.data.enabled || !this.el.sceneEl.isPlaying || (!this.mouseLocked && !this.data.dragToLook)) return;
        if (!this.mouseLocked) {
          if (event.target !== this.el.sceneEl.canvas || (event.button !== 0 && event.button !== 2)) return;
          this.cursorDragging = true;
          this.cursorPosition = {x:event.clientX,y:event.clientY};
          event.preventDefault?.();
        }
        this.mouseEnabled = true;
      },
      
      handleMouseUp: function(event) {
        if (!(event.buttons & 3)) { this.cursorDragging = false; this.cursorPosition = null; }
      },

      handleMouseOut: function(event) {
        if (event.target === this.el.sceneEl.canvas) this.cursorPosition = null;
      },

      handleContextMenu: function(event) {
        if (event.target === this.el.sceneEl.canvas && this.data.enabled && this.el.sceneEl.isPlaying && this.data.dragToLook) event.preventDefault();
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
        this.rotationVector.z = 0;
      },
      
      tick: function(time, delta) {
        if (!this.data.enabled || !this.el.sceneEl.isPlaying || !Number.isFinite(delta) || delta <= 0) return;
        
        // Calculate time factor for smooth movement
        const dt = Math.min(delta / 1000, 0.1); // Cap at 0.1 to avoid large jumps
        const pad = this.data.gamepad ? this.flightInput?.sampleGamepad?.() : null;
        if (!this.mouseLocked && !this.data.dragToLook && !pad?.active) return;
        
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
        }
        this.applyLookRotation();
        
        this.velocity.set(0, 0, 0);
        if (pad?.active) {
          this.rotation.y -= pad.look.x * this.data.gamepadLookSpeed * dt;
          this.rotation.x -= pad.look.y * this.data.gamepadLookSpeed * dt * (this.data.invertY ? -1 : 1);
          this.applyLookRotation();
        }
        this.gamepadMoveVector ||= new THREE.Vector3();
        this.combinedMoveVector ||= new THREE.Vector3();
        this.gamepadMoveVector.set(pad?.move?.x || 0, pad?.move?.y || 0, pad?.move?.z || 0);
        this.combinedMoveVector.copy(this.moveVector).add(this.gamepadMoveVector);
        if (this.combinedMoveVector.lengthSq() > 1) this.combinedMoveVector.normalize();
        const activeSpeedMultiplier = Math.max(Number.isFinite(this.speedMultiplier) ? this.speedMultiplier : 1, pad?.boost ? 2 : 1);
        // Apply movement if any direction source is active
        if (this.combinedMoveVector.lengthSq() > 0) {
          // Create a normalized movement direction
          const moveDir = this.combinedMoveVector;
          
          // Transform direction to player's local space
          const speed = this.data.movementSpeed * activeSpeedMultiplier * dt;
          
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
          const before = this.playerObj.position.clone();
          if (this.el?.sceneEl?.components?.['bridgehead-run']) moveBikeBody(this.playerObj.position, moveDelta, this.rotation.y);
          else moveInWorld(this.playerObj.position, moveDelta);
          this.velocity.copy(this.playerObj.position).sub(before).divideScalar(dt || 0.016);
          const player = this.el.components['player-component'];
          if (player) { player.velocity.copy(this.velocity); player.isSprinting = activeSpeedMultiplier > 1; }
          
          // Emit movement event for other components
          this.el.emit('move', {
            position: this.playerObj.position,
            quaternion: this.playerObj.quaternion,
            moveDelta: moveDelta
          });
        }
        
        const player = this.el.components['player-component'];
        if (player) { player.velocity.copy(this.velocity); player.isSprinting = activeSpeedMultiplier > 1 && this.velocity.lengthSq() > 0; }
        
        // Dynamic vehicle roll/banking into turns and strafes (authentic arcade flight kinematics)
        this.jetbikeEl ||= (typeof document !== 'undefined' ? document.querySelector?.('#jetbike') : null);
        if (this.jetbikeEl?.object3D) {
          const strafeRoll = -this.moveVector.x * 0.30;
          const yawRoll = THREE.MathUtils.clamp((this.lastYawDelta || 0) * 7.5, -0.35, 0.35);
          const targetRoll = THREE.MathUtils.clamp(strafeRoll + yawRoll, -0.42, 0.42);
          this.currentJetbikeRoll = THREE.MathUtils.lerp(this.currentJetbikeRoll || 0, targetRoll, Math.min(1, dt * 8));
          this.jetbikeEl.object3D.rotation.z = this.currentJetbikeRoll;
          this.lastYawDelta = (this.lastYawDelta || 0) * 0.4;
        }

        // Update camera to follow player
        this.updateCamera(dt, activeSpeedMultiplier);
      },
      
      updateCamera: function(dt, activeSpeedMultiplier = 1) {
        if (!this.cameraRigEl) return;
        
        // The camera rig is a child of the player: its position is local.
        this.playerObj.updateMatrixWorld(true);
        const anchor = this.playerObj.localToWorld(new THREE.Vector3(0, 0.5, 0));
        // Dynamic lateral banking swing: camera gently sways during turns for clear dogfighting sightlines
        const bankSwing = (this.currentJetbikeRoll || 0) * 0.35;
        const desired = this.playerObj.localToWorld(new THREE.Vector3((this.data.cameraShoulder || 0) + bankSwing, this.data.cameraHeight, this.data.cameraDistance));
        const sceneComponents = this.el?.sceneEl?.components;
        if (!sceneComponents?.['world-stream']?.ownsWorld && !sceneComponents?.['bridgehead-run']) desired.y = Math.max(0.6, desired.y);
        const delta = desired.clone().sub(anchor);
        const camera = this.cameraEl?.getObject3D?.('camera') || this.cameraEl?.components?.camera?.camera;
        this.cameraSweepCenter ||= new THREE.Vector3();
        this.cameraSweepCorner ||= new THREE.Vector3();
        this.cameraRigEl.object3D.getWorldPosition(this.cameraSweepCenter);
        const radius = cameraNearPlaneRadius(camera, this.cameraSweepCenter, this.cameraSweepCorner);
        const hit = traceWorld(anchor, delta, radius);
        const safe = anchor.addScaledVector(delta, hit ? Math.max(0, hit.t - 0.04) : 1);
        const targetLocal = this.playerObj.worldToLocal(safe);
        this.cameraRigEl.object3D.position.copy(targetLocal);

        // Speed-tunnel FOV expansion during boost (research-backed Wipeout/Chorus feel)
        if (camera && 'fov' in camera && typeof camera.fov === 'number' && dt > 0 && this.boostKeys?.size) {
          const targetFov = activeSpeedMultiplier > 1 ? 90 : 80;
          if (Math.abs(camera.fov - targetFov) > 0.1) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(1, dt * 5));
            camera.updateProjectionMatrix();
          }
        }
      },

      clearInput: function() {
        this.cursorDragging = false;
        this.cursorPosition = null;
        for (const key in this.moveState) this.moveState[key] = 0;
        this.speedMultiplier = 1;
        this.boostKeys?.clear();
        this.moveVector.set(0, 0, 0);
        this.rotationVector.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        if (this.jetbikeEl?.object3D) {
          this.jetbikeEl.object3D.rotation.z = 0;
          this.currentJetbikeRoll = 0;
        }
        this.lastYawDelta = 0;
        const player = this.el?.components?.['player-component'];
        if (player) { player.velocity?.set(0, 0, 0); player.isSprinting = false; }
      },

      resetMission: function() {
        this.clearInput();
        this.rotation.set(0, 0, 0, 'YXZ');
        this.rotationQuaternion.identity();
        this.playerObj.position.set(0, 3, 12);
        this.playerObj.quaternion.identity();
        this.cameraRigEl.object3D.position.set(this.data.cameraShoulder || 0, this.data.cameraHeight, this.data.cameraDistance);
        if (this.jetbikeEl?.object3D) {
          this.jetbikeEl.object3D.rotation.z = 0;
          this.currentJetbikeRoll = 0;
        }
        this.lastYawDelta = 0;
        this.lastYawRotation = 0;
        this.cameraRigEl.object3D.quaternion.identity();
        this.cameraObj.quaternion.identity();
        this.applyLookRotation();
        this.updateCamera(0);
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
        document.removeEventListener('mouseout', this.handleMouseOut);
        document.removeEventListener('contextmenu', this.handleContextMenu);
        
        console.log('Fly controls removed');
      }
    });
  }
}

// Initialize the component
initializeFlyControls();
