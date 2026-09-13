const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function component(file, name) {
  const definitions = {};
  const aframe = { components: definitions, registerComponent: (key, value) => definitions[key] = value };
  const elements = new Map();
  const document = {
    getElementById: id => { if (!elements.has(id)) elements.set(id, { textContent: '' }); return elements.get(id); },
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}
  };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, {
    exports: {}, require: id => {
      if (id === './aframe-export') return { default: aframe };
      if (id === '../game-audio') return { gameAudio: { resume() {}, startAmbient() {}, stopAmbient() {}, pulse() {} } };
      return require(id);
    },
    console, document, window: {}, localStorage: { getItem: () => null, setItem() {} },
    setTimeout, clearTimeout, setInterval, clearInterval, performance
  });
  const definition = definitions[name];
  const instance = Object.assign({}, definition, { data: Object.fromEntries(Object.entries(definition.schema).map(([key, value]) => [key, value.default])) });
  return { instance, document, elements };
}
function manager() {
  const loaded = component('src/components/game-manager.ts', 'game-manager');
  const events = [];
  loaded.instance.el = { isPlaying: true, addEventListener() {}, removeEventListener() {}, emit: (type, detail) => events.push({ type, detail }) };
  loaded.instance.init();
  loaded.instance.showPointsGained = () => {};
  return { ...loaded, events };
}

test('mission clock and spawns stop while paused', () => {
  const { instance: game } = manager();
  let spawned = 0;
  game.spawnEnemy = () => { spawned++; game.activeEnemiesCount++; };
  game.startGame();
  game.el.isPlaying = false;
  for (let i = 0; i < 100; i++) game.tick(i * 100, 100);
  assert.equal(game.elapsed, 0);
  assert.equal(spawned, 0);
  game.el.isPlaying = true;
  for (let i = 0; i < 45; i++) game.tick(i * 100, 100);
  assert.equal(spawned, 1);
});

test('kills chain, expire and cap at five', () => {
  const { instance: game } = manager();
  const enemy = { el: { getAttribute: () => ({ x: 0, y: 0, z: 0 }) } };
  game.enemyKilled(enemy);
  assert.equal(game.score, 100);
  game.elapsed += 500;
  game.enemyKilled(enemy);
  assert.equal(game.score, 300);
  for (let i = 0; i < 8; i++) game.enemyKilled(enemy);
  assert.equal(game.combo, 5);
  game.elapsed += 6001;
  game.enemyKilled(enemy);
  assert.equal(game.combo, 1);
});

test('third wave wins exactly once, without scheduling wave four', () => {
  const { instance: game, events } = manager();
  game.level = 3;
  game.levelInProgress = true;
  game.completeLevel();
  game.completeLevel();
  assert.equal(game.gameOver, true);
  assert.equal(game.nextLevelIn, null);
  const results = events.filter(event => event.type === 'mission-ended');
  assert.equal(results.length, 1);
  assert.equal(results[0].detail.won, true);
  assert.equal(results[0].detail.score, 300);
});

test('death emits a failure result and stops progress', () => {
  const { instance: game, events } = manager();
  game.onPlayerDied();
  assert.equal(events[0].detail.won, false);
  assert.equal(game.gameOver, true);
});

test('reload uses gameplay ticks and pause stops automatic fire', () => {
  const { instance: weapon } = component('src/components/weapon-component.ts', 'weapon-component');
  weapon.ammoInClip = 5;
  weapon.thrusterParticles = [];
  weapon.hoverTime = 0;
  weapon.reload();
  assert.equal(weapon.ammoInClip, 5);
  for (let i = 0; i < 19; i++) weapon.tick(i * 100, 100);
  assert.equal(weapon.isReloading, true);
  weapon.tick(2000, 100);
  assert.equal(weapon.ammoInClip, 30);
  assert.equal(weapon.isReloading, false);
  let stopped = false;
  weapon.stopFiring = () => { stopped = true; };
  weapon.pause();
  assert.equal(stopped, true);
  assert.equal(weapon.mouseDown, false);
});

test('flight pause clears held input and velocity', () => {
  const { instance: flight } = component('src/components/fly-controls.ts', 'fly-controls');
  const THREE = require('three');
  flight.moveState = { forward: 1, up: 1 };
  flight.speedMultiplier = 2;
  flight.moveVector = new THREE.Vector3(1, 1, 1);
  flight.rotationVector = new THREE.Vector3(1, 1, 1);
  flight.velocity = new THREE.Vector3(25, 0, 0);
  flight.pause();
  assert.equal(flight.moveState.forward, 0);
  assert.equal(flight.speedMultiplier, 1);
  assert.equal(flight.velocity.length(), 0);
});

test('forward flight stays level while looking up', () => {
  const { instance: flight } = component('src/components/fly-controls.ts', 'fly-controls');
  const THREE = require('three');
  const playerObj = new THREE.Object3D();
  playerObj.position.set(0, 6, 0);
  flight.el = { sceneEl: { isPlaying: true }, components: {}, emit() {} };
  flight.playerObj = playerObj;
  flight.cameraRigEl = { object3D: { position: { set() {} } } };
  flight.mouseLocked = true;
  flight.rotation = new THREE.Euler(-Math.PI / 3, 0, 0, 'YXZ');
  flight.rotationVector = new THREE.Vector3();
  flight.moveVector = new THREE.Vector3(0, 0, -1);
  flight.velocity = new THREE.Vector3();
  flight.speedMultiplier = 1;
  flight.tick(0, 100);
  assert.equal(playerObj.position.y, 6);
  assert.ok(playerObj.position.z < 0);
});

test('keyup clears altitude input even while paused', () => {
  const { instance: flight } = component('src/components/fly-controls.ts', 'fly-controls');
  const THREE = require('three');
  flight.el = { sceneEl: { isPlaying: false } };
  flight.moveState = { up: 1, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0, rollLeft: 0, rollRight: 0 };
  flight.moveVector = new THREE.Vector3(0, 1, 0);
  flight.rotationVector = new THREE.Vector3();
  flight.handleKeyUp({ code: 'KeyE' });
  assert.equal(flight.moveState.up, 0);
  assert.equal(flight.moveVector.y, 0);
});

test('weapon ray follows camera world transform under a rotated player', () => {
  const { instance: weapon, document } = component('src/components/weapon-component.ts', 'weapon-component');
  const THREE = require('three');
  const player = new THREE.Object3D();
  player.position.set(10, 3, 5);
  player.rotation.y = Math.PI / 2;
  const camera = new THREE.Object3D();
  camera.position.set(0, 2, 8);
  player.add(camera);
  player.updateMatrixWorld(true);
  document.querySelector = selector => selector === '#camera' ? { object3D: camera } : null;
  let ray;
  weapon.raycaster = {
    set: (origin, direction) => { ray = { origin: origin.clone(), direction: direction.clone() }; },
    intersectObjects: () => []
  };
  weapon.el = { sceneEl: { isPlaying: true }, emit() {} };
  weapon.ammoInClip = 30;
  weapon.lastShot = -10000;
  weapon.data.accuracy = 1;
  weapon.applyWeaponFeedback = weapon.createMuzzleFlash = weapon.createTracer = weapon.createWeaponBolts = () => {};
  weapon.shoot();
  assert.ok(ray);
  assert.ok(ray.direction.distanceTo(new THREE.Vector3(-1, 0, 0)) < 1e-6);
  assert.ok(ray.origin.distanceTo(new THREE.Vector3(18, 5, 5)) < 1e-6);
  assert.equal(weapon.ammoInClip, 29);
});

test('weapon damages active enemy through forgiving combat hit volume', () => {
  const { instance: weapon, document } = component('src/components/weapon-component.ts', 'weapon-component');
  const THREE = require('three');
  const camera = new THREE.Object3D();
  camera.position.set(0, 2, 8);
  camera.updateMatrixWorld(true);
  const enemyObject = new THREE.Object3D();
  enemyObject.position.set(0.7, 0, -18);
  let damage = 0;
  const enemy = {
    el: { object3D: enemyObject },
    hitboxSize: { width: 1.2, height: 1.8, depth: 1.2 },
    takeDamage: amount => { damage += amount; }
  };
  document.querySelector = selector => selector === '#camera' ? { object3D: camera } : null;
  document.getElementById = id => id === 'level' ? null : { textContent: '', style: {} };
  weapon.el = { sceneEl: { isPlaying: true, components: { 'game-manager': { activeEnemies: [enemy] } } }, emit() {} };
  weapon.raycaster = new THREE.Raycaster();
  weapon.levelRaycaster = new THREE.Raycaster();
  weapon.rayHitPoint = new THREE.Vector3();
  weapon.rayTemp = new THREE.Vector3();
  weapon.rayBox = new THREE.Box3();
  weapon.ammoInClip = 30;
  weapon.lastShot = -10000;
  weapon.data.accuracy = 1;
  weapon.applyWeaponFeedback = weapon.createImpactEffect = weapon.showHitMarker = weapon.createWeaponBolts = () => {};
  weapon.shoot();
  assert.equal(damage, 25);
  assert.equal(weapon.ammoInClip, 29);
});

test('weapon visual bolts originate from both bike muzzles', () => {
  const { instance: weapon } = component('src/components/weapon-component.ts', 'weapon-component');
  const THREE = require('three');
  const jetbike = new THREE.Object3D();
  jetbike.position.set(10, 2, 4);
  jetbike.updateMatrixWorld(true);
  const starts = [];
  weapon.el = { object3D: jetbike };
  weapon.createBolt = start => starts.push(start.clone());
  weapon.createWeaponBolts(new THREE.Vector3(10, 2, -20), new THREE.Vector3(0, 0, -1), '#fff');
  assert.equal(starts.length, 2);
  assert.ok(starts[0].distanceTo(new THREE.Vector3(9.28, 1.45, 2.4)) < 1e-6);
  assert.ok(starts[1].distanceTo(new THREE.Vector3(10.72, 1.45, 2.4)) < 1e-6);
});
