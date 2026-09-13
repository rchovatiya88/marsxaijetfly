const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');
const YUKA = require('yuka');

// All components share one arena-world module, as they do in the browser.
// This exercises key handlers, movement sweeps and mission guards. It is a
// deterministic input simulation; it does not certify human/browser controls.
function harness({streaming = true} = {}) {
  const definitions = {}, modules = new Map(), events = [], actors = [];
  const aframe = {components: definitions, registerComponent(name, definition) { definitions[name] = definition; }};
  const scene = {isPlaying: true, components: {'world-stream': {ownsWorld: streaming, status: streaming ? 'ready' : 'fallback'}}, emit(type, detail) {events.push({type, detail});},
    querySelectorAll() {return [];}, appendChild(actor) {actor.parentNode = scene; actors.push(actor);}};
  const player = {object3D: new THREE.Object3D(), components: {}, sceneEl: scene, emit() {}};
  const cameraRig = {object3D: new THREE.Object3D(), setAttribute(name, value) {if (name === 'position') this.object3D.position.set(value.x,value.y,value.z);}};
  const camera = {object3D: new THREE.Object3D()};
  player.object3D.add(cameraRig.object3D); cameraRig.object3D.add(camera.object3D);
  const health = {health: 100, shield: 0, velocity: new THREE.Vector3(), isSprinting: false};
  player.components['player-component'] = health;
  const weapon = {chargedShots: 0};
  const bike = {components: {'weapon-component': weapon}};
  const nodes = {'#player': player, '#camera-rig': cameraRig, '#camera': camera, '#jetbike': bike};
  scene.querySelector = selector => nodes[selector] || {setAttribute() {}};
  const document = {querySelector: selector => nodes[selector] || null, querySelectorAll: () => [],
    getElementById: id => nodes[`#${id}`] || {textContent: ''}, addEventListener() {}, removeEventListener() {},
    createElement() {return {components: {}, object3D: new THREE.Object3D(),
      setAttribute(name, value) {
        if (name === 'enemy-component') this.components[name] = {isDead: false, health: Number(/health: ([\d.]+)/.exec(value)[1])};
      }, remove() {this.parentNode = null;}};}};
  function load(file) {
    const absolute = path.resolve(file);
    if (modules.has(absolute)) return modules.get(absolute);
    const exports = {}; modules.set(absolute, exports);
    const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
    vm.runInNewContext(source, {exports, console: {log() {}, error: console.error}, document, window: {}, performance,
      setTimeout, clearTimeout, setInterval, clearInterval,
      require(id) {
        if (id === './aframe-export') return {default: aframe};
        if (id === '../game-audio') return {gameAudio: {pulse() {}}};
        return id.startsWith('.') ? load(path.resolve(path.dirname(absolute), `${id}.ts`)) : require(id);
      }});
    return exports;
  }
  function component(name, file = `src/components/${name}.ts`) {
    load(file);
    const definition = definitions[name];
    return Object.assign({}, definition, {data: Object.fromEntries(Object.entries(definition.schema).map(([key, value]) => [key, value.default]))});
  }
  Object.assign(health, component('player-component'), {el: player, oldPosition: new THREE.Vector3(),
    newPosition: new THREE.Vector3(), footstepTime: 0, footstepInterval: .5});
  const flight = component('fly-controls');
  flight.data.movementSpeed = 10; flight.data.dragToLook = true;
  flight.data.cameraHeight = 1.45; flight.data.cameraDistance = 5.4;
  flight.el = player; player.components['fly-controls'] = flight; flight.init();
  const manager = {gameStarted: true, gameOver: false, elapsed: 0, score: 0, results: [], showMessage() {},
    finishMission(won) {if (!this.gameOver) this.results.push(won); this.gameOver = true;}};
  scene.components['game-manager'] = manager;
  const mission = component('bridgehead-run'); mission.el = scene;
  scene.components['bridgehead-run'] = mission; mission.init(); mission.start();
  const data = load('src/mission/bridgehead-run.ts'), world = load('src/arena-world.ts');
  flight.data.movementSpeed=data.BRIDGEHEAD_SPEED;
  function step(keys, frames = 1) {
    flight.clearInput();
    for (const code of keys) flight.handleKeyDown({code, preventDefault() {}});
    for (let i = 0; i < frames; i++) {flight.tick(manager.elapsed, 16); health.updateMovement(.016); mission.tick(manager.elapsed, 16); manager.elapsed += 16;}
    for (const code of keys) flight.handleKeyUp({code});
  }
  function navigate(destination, boost = false) {
    const from=player.object3D.position.clone(),length=Math.hypot(destination.x-from.x,destination.z-from.z);
    for (let frame = 0; frame < 1800; frame++) {
      const pos = player.object3D.position, dx = destination.x-pos.x, dy = destination.y-pos.y, dz = destination.z-pos.z;
      if (Math.hypot(dx,dy,dz) < .3) {flight.clearInput(); return;}
      const keys = [];
      const horizontal=Math.hypot(dx,dz),angle=Math.atan2(-dx,-dz)-flight.rotation.y,yawError=Math.atan2(Math.sin(angle),Math.cos(angle));
      if(horizontal>.2 && Math.abs(yawError)>.025) keys.push(yawError>0?'ArrowLeft':'ArrowRight');
      if(horizontal>.2 && Math.abs(yawError)<.18) keys.push('KeyW');
      const fraction=length>.2?Math.min(1,Math.max(0,((pos.x-from.x)*(destination.x-from.x)+(pos.z-from.z)*(destination.z-from.z))/(length*length)+.35/length)):1;
      const altitudeError=from.y+(destination.y-from.y)*fraction-pos.y;
      if (Math.abs(altitudeError) > .1) keys.push(altitudeError > 0 ? 'KeyE' : 'KeyQ');
      if (boost) keys.push('ShiftLeft');
      step(keys);
    }
    assert.fail(`Input path trapped at ${player.object3D.position.toArray()} toward ${JSON.stringify(destination)}`);
  }
  return {scene, player, camera, flight, health, weapon, mission, manager, world, data, events, actors, component, step, navigate};
}

for (const route of ['high', 'low']) test(`Bridgehead ${route} route reaches combat using key input integration without position injection`, () => {
  const h = harness(), {data, navigate, mission} = h;
  const gate=data.BRIDGEHEAD_GATES.find(g=>g.id===route).position,exit=data.BRIDGEHEAD_EXITS.find(g=>g.id===route).position;
  for(const point of data.BRIDGEHEAD_ROUTE_PATHS[route].slice(1)) {
    const crossing=point.x===gate.x&&point.z===gate.z || point.x===exit.x&&point.z===exit.z;
    navigate(crossing?{...point,x:point.x+1}:point,route==='high'&&crossing);
    if(point.x===exit.x&&point.z===exit.z){assert.equal(mission.stage,'approach');assert.equal(mission.warden,null);}
  }
  assert.equal(mission.route, route);
  assert.equal(mission.stage, 'warden');
  assert.equal(h.actors.length, 1);
  assert.equal(h.weapon.chargedShots, route === 'high' ? 3 : 0);
  assert.equal(h.health.shield, route === 'low' ? 30 : 0);
});

test('Bridgehead route cover is reciprocal, high arrival is exposed and pad is a real swept solid', () => {
  const {world, data} = harness();
  const origin = {...data.BRIDGEHEAD_WARDEN, y: data.BRIDGEHEAD_WARDEN.y+1.2};
  const delta = (from,to) => ({x:to.x-from.x,y:to.y-from.y,z:to.z-from.z});
  const low = data.BRIDGEHEAD_APPROACHES[1].position, high = data.BRIDGEHEAD_APPROACHES[0].position;
  assert.ok(world.traceWorld(origin, delta(origin,low)));
  assert.ok(world.traceWorld(low, delta(low,origin)));
  assert.equal(world.traceWorld(origin, delta(origin,high)), null);
  const pos = {...data.BRIDGEHEAD_EXTRACTION};
  world.moveInWorld(pos, {x:0,y:-12,z:0});
  const pad=data.BRIDGEHEAD_WORLD.boxes.find(box=>box.id==='extraction-pad');
  const support=pad.center.y+pad.size.y/2+.7;
  assert.ok(pos.y >= support && pos.y < support+.01, `pad support was ${pos.y}`);
});

test('failed visual streaming still permits the low lane with actual player height clamps and restores limits on removal', () => {
  const h = harness({streaming: false}), {data, navigate, mission, health} = h;
  assert.equal(health.data.minFlyingHeight,data.BRIDGEHEAD_WORLD.bounds.minY);
  assert.equal(health.data.maxFlyingHeight,data.BRIDGEHEAD_WORLD.bounds.maxY);
  navigate(data.BRIDGEHEAD_ROUTE_PATHS.low[1]);
  assert.ok(h.player.object3D.position.y < -1.9);
  assert.ok(h.camera.object3D.getWorldPosition(new THREE.Vector3()).y < 0,'fallback camera keeps the local boom below the old arena ground plane');
  for (const point of data.BRIDGEHEAD_ROUTE_PATHS.low.slice(2)) navigate({...point,x:point.x===data.BRIDGEHEAD_GATES[1].position.x||point.x===data.BRIDGEHEAD_EXITS[1].position.x?point.x+1:point.x});
  assert.equal(mission.stage,'warden'); assert.equal(health.shield,30);
  mission.resetMission(); mission.start(); mission.remove();
  assert.equal(health.data.minFlyingHeight,1.6); assert.equal(health.data.maxFlyingHeight,50);
});

test('missing Warden recovers remaining health on simulation time and never grants a kill', () => {
  const h = harness(), {mission, scene} = h;
  mission.chooseRoute('high'); mission.spawnWarden();
  mission.warden.components['enemy-component'].health = 97;
  mission.tick(0,16); const old = mission.warden; old.parentNode = null;
  scene.isPlaying = false;
  for (let i=0;i<30;i++) mission.tick(0,100);
  assert.equal(mission.warden,old);
  scene.isPlaying = true;
  for (let i=0;i<12;i++) mission.tick(0,100);
  assert.notEqual(mission.warden,old);
  assert.equal(mission.warden.components['enemy-component'].health,97);
  assert.equal(mission.stage,'warden'); assert.equal(h.manager.score,0);
  assert.equal(h.weapon.chargedShots,3);
  for (let failure=0;failure<2;failure++) {
    mission.warden.parentNode = null;
    for (let i=0;i<12;i++) mission.tick(0,100);
  }
  assert.equal(mission.stage,'interrupted'); assert.deepEqual(h.manager.results,[false]);
});

test('ordered course cannot be skipped and sideways boost does not qualify for the high gate',()=>{
  const h=harness(),{mission,data,player,flight}=h,gate=data.BRIDGEHEAD_GATES[0].position;
  const cross=()=>{mission.previous={...gate,x:gate.x-1};player.object3D.position.set(gate.x+1,gate.y,gate.z);mission.tick(0,16);};
  flight.speedMultiplier=2;flight.velocity.set(16,0,0);cross();assert.equal(mission.stage,'choice');
  for(const point of data.BRIDGEHEAD_ROUTE_PATHS.high.slice(1,7)){mission.previous={...point};player.object3D.position.copy(point);mission.tick(0,16);}
  flight.velocity.set(2,0,16);cross();assert.equal(mission.stage,'choice');assert.equal(h.weapon.chargedShots,0);
  flight.velocity.set(16,0,0);cross();assert.equal(mission.stage,'traverse');assert.equal(h.weapon.chargedShots,3);
});

test('both Shift keys maintain boost until both release; disabled release and pause clear stale movement', () => {
  const {flight, health} = harness(); let prevented=0;
  for (const code of ['ShiftLeft','ShiftRight','ArrowUp','KeyW']) flight.handleKeyDown({code,preventDefault(){prevented++;}});
  assert.equal(prevented,4);
  flight.handleKeyUp({code:'ShiftLeft'}); assert.equal(flight.speedMultiplier,2);
  flight.handleKeyUp({code:'ShiftRight'}); assert.equal(flight.speedMultiplier,1);
  flight.data.enabled = false; flight.handleKeyUp({code:'KeyW'});
  assert.equal(flight.moveState.forward,0);
  health.velocity.set(1,2,3); health.isSprinting=true; flight.pause();
  assert.equal(health.velocity.lengthSq(),0); assert.equal(health.isSprinting,false);
});

test('authored stationary Warden neither receives old arena clamps nor loses its telegraph when hit', () => {
  const h=harness(), enemy=h.component('enemy-component');
  const obj=new THREE.Object3D(); obj.position.set(32,0,-10);
  Object.assign(enemy,{el:{object3D:obj}, data:{...enemy.data,speed:0}, health:280,isDead:false,
    playerEntity:{object3D:h.player.object3D}, vehicle:new YUKA.Vehicle(),
    seekBehavior:new YUKA.SeekBehavior(),separationBehavior:new YUKA.SeparationBehavior(),
    chargeRemaining:850,recoveryRemaining:0,enemyShoot(){},setState(state){this.currentState=state;},
    updateHealthBar(){},flashColor(){}});
  enemy.vehicle.position.set(50,0,-10);
  enemy.updateAI(.016);
  assert.equal(obj.position.x,32); assert.equal(enemy.vehicle.position.x,32);
  assert.equal(enemy.currentState,'attack'); assert.equal(enemy.seekBehavior.active,false);
  enemy.takeDamage(25);
  assert.equal(enemy.health,255); assert.equal(enemy.currentState,'attack');
  assert.equal(enemy.vehicle.position.x,32); assert.equal(enemy.seekBehavior.active,false);
  enemy.chargeRemaining=0; enemy.updateAI(.016); assert.equal(enemy.currentState,'idle');
});
