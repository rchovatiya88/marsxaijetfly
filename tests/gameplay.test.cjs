const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(file, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports,require,...globals});
  return exports;
}
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
      if (id === '../arena-world') return loadModule('src/arena-world.ts');
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
  flight.cameraRigEl = { object3D: new THREE.Object3D() };
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
  weapon.el = { object3D: new THREE.Object3D(), sceneEl: { isPlaying: true }, emit() {} };
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
  weapon.el = { object3D: new THREE.Object3D(), sceneEl: { isPlaying: true, components: { 'game-manager': { activeEnemies: [enemy] } } }, emit() {} };
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


test('swept cover collision blocks boost and upward tunneling, slides tangentially', () => {
  const {moveInWorld} = loadModule('src/arena-world.ts');
  const p={x:-9,y:2,z:-8};moveInWorld(p,{x:0,y:0,z:-100});assert.ok(p.z>-14.71 && p.z<-14.6);
  const q={x:0,y:2,z:-16};moveInWorld(q,{x:0,y:30,z:0});assert.ok(q.y<2.91 && q.y>2.8);
  const r={x:-9,y:2,z:-8};moveInWorld(r,{x:4,y:0,z:-30});assert.ok(r.x>-5.1 && r.z>-15);
});
test('cover occludes symmetrically, altitude clears cover, spawn remains inside arena', () => {
  const {traceWorld,clearSpawn}=loadModule('src/arena-world.ts');
  assert.ok(traceWorld({x:-12,y:1,z:3},{x:0,y:0,z:-10}));
  assert.ok(traceWorld({x:-12,y:1,z:-7},{x:0,y:0,z:10}));
  assert.equal(traceWorld({x:-12,y:5,z:3},{x:0,y:0,z:-10}),null);
  assert.equal(clearSpawn(-12,-2),false);assert.equal(clearSpawn(30,0),false);assert.equal(clearSpawn(0,0),true);
});
test('settings tolerate denied storage and reject malformed values', () => {
  const denied=loadModule('src/settings.ts',{localStorage:{getItem(){throw Error('denied')},setItem(){throw Error('denied')}}});
  assert.equal(denied.readSettings().volume,0.7);assert.doesNotThrow(()=>denied.saveSettings({}));
  const malformed=loadModule('src/settings.ts',{localStorage:{getItem:()=>'{"sensitivity":900,"volume":"loud","invertY":true}'}});
  assert.equal(malformed.readSettings().sensitivity,1.5);assert.equal(malformed.readSettings().volume,0.7);assert.equal(malformed.readSettings().invertY,true);
});

test('enemy projectile damages a stationary player once and uses 3D range', () => {
  const THREE=require('three');
  const {instance:enemy}=component('src/components/enemy-component.ts','enemy-component');
  const player=new THREE.Object3D();player.position.set(0,1.2,12);
  let damage=0;
  enemy.el={object3D:new THREE.Object3D(),sceneEl:{components:{'game-manager':{elapsed:10000}}}};
  enemy.playerEntity={object3D:player,components:{'player-component':{takeDamage:amount=>damage+=amount}}};
  Object.assign(enemy,{lastEnemyShot:-10000,chargeRemaining:0,boltRemaining:0,attackOrigin:new THREE.Vector3(),attackTarget:new THREE.Vector3(),attackDirection:new THREE.Vector3(),enemyBolt:new THREE.Object3D(),enemyHalo:{material:{color:new THREE.Color()}}});
  enemy.flashThreatWarning=()=>{};
  assert.equal(enemy.enemyShoot(),true);assert.equal(damage,0);
  for(let i=0;i<40;i++)enemy.updateAttack(100);
  assert.equal(damage,enemy.data.weaponDamage);
  player.position.set(0,100,1);enemy.lastEnemyShot=-10000;
  assert.equal(enemy.enemyShoot(),false);
});
test('star field shares one geometry, is frame-rate independent and disposes resources', () => {
  const {instance:stars}=component('src/components/star-field-component.ts','star-field');
  let object;stars.el={setObject3D:(name,value)=>object=value,removeObject3D(){}};
  stars.data.starCount=180;stars.init();
  assert.equal(object.isPoints,true);assert.equal(stars.geometry.attributes.position.count,180);
  const before=stars.geometry.attributes.position.getZ(0);stars.tick(16,16);
  let distance=stars.geometry.attributes.position.getZ(0)-before;
  if(distance<0)distance+=stars.data.depth;
  assert.ok(Math.abs(distance-stars.data.speed*0.96)<0.0001);
  let disposed=0;stars.geometry.addEventListener('dispose',()=>disposed++);stars.material.addEventListener('dispose',()=>disposed++);stars.remove();assert.equal(disposed,2);
});
test('chase camera shortens before entering solid cover', () => {
  const THREE=require('three');const {instance:flight}=component('src/components/fly-controls.ts','fly-controls');
  flight.playerObj=new THREE.Object3D();flight.playerObj.position.set(-9,2,-20);
  flight.cameraRigEl={object3D:new THREE.Object3D()};flight.playerObj.add(flight.cameraRigEl.object3D);
  flight.updateCamera(0.016);
  assert.ok(flight.cameraRigEl.object3D.position.z<3.2);
  flight.playerObj.position.set(0,3,12);flight.updateCamera(0.016);
  assert.equal(flight.cameraRigEl.object3D.position.z,8);
});
