const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');

function load(file, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports,require,...globals});
  return exports;
}
function fixture(boxes = []) {
  const world = load('src/arena-world.ts');
  world.setWorld({bounds:{minX:-100,maxX:100,minY:-100,maxY:100,minZ:-100,maxZ:100},boxes});
  return world;
}
const v = (x,y,z) => ({x,y,z});
const close = (actual, expected, tolerance=.0003) => assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
function centers(world, position, yaw) {
  return world.BIKE_BODY.map(sphere => ({radius:sphere.radius,
    x:position.x+sphere.center.x*Math.cos(yaw)+sphere.center.z*Math.sin(yaw),
    y:position.y+sphere.center.y,
    z:position.z-sphere.center.x*Math.sin(yaw)+sphere.center.z*Math.cos(yaw)}));
}

test('compact body spheres cover the complete measured hero envelope, including seams and corners', () => {
  const world = fixture(), {min,max} = world.BIKE_BODY_ENVELOPE;
  assert.equal(world.BIKE_BODY.length,18);
  assert.ok(world.BIKE_BODY.every(sphere => sphere.radius < .75));
  for (let x=0;x<=4;x++) for (let y=0;y<=18;y++) for (let z=0;z<=36;z++) {
    const point = v(min.x+(max.x-min.x)*x/4,min.y+(max.y-min.y)*y/18,min.z+(max.z-min.z)*z/36);
    assert.ok(world.BIKE_BODY.some(sphere => Math.hypot(point.x-sphere.center.x,point.y-sphere.center.y,point.z-sphere.center.z)<=sphere.radius+1e-10),`Uncovered ${JSON.stringify(point)}`);
  }
});

test('continuous sweeps stop the nose and tail at a thin triangle wall even for a 100m boost delta', () => {
  const world = fixture(), {TriangleCollider} = load('src/triangle-collider.ts');
  world.setTerrainSurface(new TriangleCollider([-20,-20,0,20,-20,0,20,20,0,-20,-20,0,20,20,0,-20,20,0]));
  const extent = Math.max(...world.BIKE_BODY.map(sphere => Math.abs(sphere.center.z)+sphere.radius));
  for (const side of [-1,1]) {
    const position = v(0,0,side*8);
    world.moveBikeBody(position,v(0,0,-side*100),0);
    close(position.z,side*(extent+.0001));
    assert.ok(side*position.z>2.38,'The entire nose/tail must stay beyond the wall');
  }
});

test('yaw changes the protected length; side contacts slide and a 1.6m corridor still passes', () => {
  const wall = {id:'side',center:v(0,0,0),size:v(.1,50,100)}, world=fixture([wall]);
  const side = v(4,0,0); world.moveBikeBody(side,v(-20,0,8),0);
  close(side.x,.05+world.BIKE_BODY[0].radius); close(side.z,8);
  const nose = v(8,0,0); world.moveBikeBody(nose,v(-100,0,0),Math.PI/2);
  assert.ok(nose.x>2.7);
  world.setWorld({bounds:{minX:-100,maxX:100,minY:-100,maxY:100,minZ:-100,maxZ:100},boxes:[
    {id:'left',center:v(-1.3,0,0),size:v(1,20,100)}, {id:'right',center:v(1.3,0,0),size:v(1,20,100)}]});
  const corridor=v(0,0,20); world.moveBikeBody(corridor,v(0,0,-40),0); close(corridor.z,-20);
});

test('a yaw sweep cannot pass through a wall between clear endpoints, and can rotate back out of contact', () => {
  const world=fixture([{id:'side',center:v(2.1,0,0),size:v(.1,50,100)}]), position=v(0,0,0);
  const yaw=world.rotateBikeBody(position,0,Math.PI);
  assert.ok(yaw>.2 && yaw<Math.PI/2,`Blocked yaw was ${yaw}`);
  for(const sphere of centers(world,position,yaw)) assert.ok(sphere.x+sphere.radius<2.0501);
  const escape=world.rotateBikeBody(position,yaw,0); close(escape,0);
  // A full revolution has matching endpoints and still needs the intervening sweep.
  const full=world.rotateBikeBody(position,0,Math.PI*8); assert.ok(full<Math.PI/2);
  const free=fixture(); close(free.rotateBikeBody(position,0,Math.PI*8),Math.PI*8);
});

test('sphere contact at an AABB allows tangential/outward escape while refusing deeper overlap', () => {
  const world=fixture([{id:'wall',center:v(0,0,0),size:v(1,20,20)}]);
  assert.equal(world.traceWorld(v(1.199,0,0),v(1,0,0),.7),null);
  assert.equal(world.traceWorld(v(1.199,0,0),v(0,0,1),.7),null);
  assert.equal(world.traceWorld(v(1.199,0,0),v(-1,0,0),.7).t,0);
});

test('world edges protect the whole body and let a boundary contact move back inward', () => {
  const world=fixture();world.setWorld({bounds:{minX:-5,maxX:5,minY:-5,maxY:5,minZ:-5,maxZ:5},boxes:[]});
  const position=v(0,0,0);world.moveBikeBody(position,v(0,0,50),0);
  for(const sphere of centers(world,position,0))assert.ok(sphere.z+sphere.radius<=5);
  const contact=position.z;world.moveBikeBody(position,v(0,0,-1),0);close(position.z,contact-1);
});

test('all body samples remain above a sloped triangle surface while the remaining motion slides', () => {
  const world=fixture(), {TriangleCollider}=load('src/triangle-collider.ts');
  world.setTerrainSurface(new TriangleCollider([-20,-10,-20,20,-10,-20,20,10,20,-20,-10,-20,20,10,20,-20,10,20]));
  const position=v(0,6,0); world.moveBikeBody(position,v(3,-10,4),0);
  close(position.x,3);
  assert.ok(position.y>0 && position.z<4);
  for(const sphere of centers(world,position,0)) assert.ok((sphere.y-.5*sphere.z)/Math.hypot(1,.5)>=sphere.radius-.0002);
});

test('fly-controls uses body sweeps for boost and mouse/keyboard yaw and pause leaves pose unchanged', () => {
  const world=fixture([{id:'side',center:v(2.1,0,0),size:v(.1,50,100)}]), definitions={};
  load('src/components/fly-controls.ts',{require(name){return name==='../arena-world'?world:name==='./aframe-export'?{default:{components:definitions,registerComponent(name,value){definitions[name]=value;}}}:name==='../flight-input'?load('src/flight-input.ts'):require(name);}});
  const player=new THREE.Object3D(),camera=new THREE.Object3D(),rig=new THREE.Object3D(); player.add(rig);rig.add(camera);
  const def=definitions['fly-controls'];
  const flight=Object.assign({},def,{data:Object.fromEntries(Object.entries(def.schema).map(([key,value])=>[key,value.default])),playerObj:player,cameraObj:camera,cameraRigEl:{object3D:rig},
    rotation:new THREE.Euler(0,0,0,'YXZ'),el:{sceneEl:{isPlaying:true,components:{'bridgehead-run':{}}},components:{},emit(){}},
    mouseLocked:true,mouseEnabled:true,moveState:{up:0,down:0,left:0,right:0,forward:0,back:0,pitchUp:0,pitchDown:0,yawLeft:0,yawRight:0},
    velocity:new THREE.Vector3(),moveVector:new THREE.Vector3(),rotationVector:new THREE.Vector3(),speedMultiplier:1});
  flight.handleMouseMove({movementX:-Math.PI/(flight.data.lookSensitivity*.004),movementY:0});
  assert.ok(flight.rotation.y>0 && flight.rotation.y<Math.PI/2);
  const before=player.position.clone(); flight.el.sceneEl.isPlaying=false; flight.tick(0,100);
  assert.deepEqual(player.position.toArray(),before.toArray());
  world.setWorld({bounds:{minX:-100,maxX:100,minY:-100,maxY:100,minZ:-100,maxZ:100},boxes:[{id:'front',center:v(0,0,-5),size:v(50,50,.1)}]});
  flight.rotation.y=0;player.rotation.y=0;flight.el.sceneEl.isPlaying=true;
  flight.handleKeyDown({code:'KeyW'});flight.handleKeyDown({code:'ShiftLeft'});
  for(let i=0;i<10;i++)flight.tick(i*100,100);
  assert.ok(player.position.z>-2.3 && player.position.z<-2,`The controller must stop the nose before the wall: ${player.position.toArray()}`);
});
