/* eslint-disable @typescript-eslint/no-explicit-any */
AFRAME.registerComponent('custom-fly-controls', {
  schema: {
    lookSpeed: { type: 'number', default: 0.5 },
    maxPitchAngle: { type: 'number', default: Math.PI / 2 },
  },

  init: function() {
    this.pitchObject = this.el.object3D;
    this.yawObject = this.el.sceneEl.camera.el.object3D;
    
    this.enabled = false;
    this.mouseDown = false;
    
    this.bindMethods();
    this.addEventListeners();
  },

  bindMethods: function() {
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onPointerLockError = this.onPointerLockError.bind(this);
  },

  addEventListeners: function() {
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
  },

  onPointerLockChange: function() {
    this.enabled = !!document.pointerLockElement;
    console.log('Pointer Lock Change:', this.enabled);
  },

  onPointerLockError: function(event) {
    console.error('Pointer Lock Error:', event);
    this.enabled = false;
  },

  onMouseMove: function(event) {
    if (!this.enabled) return;

    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    // Horizontal rotation (yaw)
    this.yawObject.rotation.y -= movementX * this.data.lookSpeed * 0.002;

    // Vertical rotation (pitch)
    this.pitchObject.rotation.x -= movementY * this.data.lookSpeed * 0.002;
    
    // Clamp pitch to prevent over-rotation
    this.pitchObject.rotation.x = Math.max(
      -this.data.maxPitchAngle, 
      Math.min(this.data.maxPitchAngle, this.pitchObject.rotation.x)
    );

    console.log('Mouse Move:', { movementX, movementY });
  },

  play: function() {
    document.addEventListener('mousemove', this.onMouseMove);
  },

  pause: function() {
    document.removeEventListener('mousemove', this.onMouseMove);
  },

  remove: function() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);
  }
});
