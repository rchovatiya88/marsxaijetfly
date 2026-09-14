const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');

function fixture(projection = new THREE.PerspectiveCamera(80, 16 / 9, .005, 10000)) {
  const worldExports = {}, definitions = {}, exports = {};
  const transpile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(transpile('src/arena-world.ts'), { exports: worldExports });
  vm.runInNewContext(transpile('src/components/fly-controls.ts'), { exports, require: name => name === '../arena-world' ? worldExports : name === './aframe-export' ? { default: { components: definitions, registerComponent(name, definition) { definitions[name] = definition; } } } : name === '../flight-input' ? (() => { const inputExports = {}; vm.runInNewContext(transpile('src/flight-input.ts'), { exports: inputExports, globalThis: {} }); return inputExports; })() : require(name) });
  const player = new THREE.Object3D(), rig = new THREE.Object3D(), cameraEntity = new THREE.Object3D();
  player.add(rig); rig.add(cameraEntity); cameraEntity.add(projection);
  const flight = Object.assign({}, definitions['fly-controls'], {
    data: { cameraHeight: .5, cameraDistance: 8 }, playerObj: player, cameraRigEl: { object3D: rig },
    cameraEl: { object3D: cameraEntity, getObject3D() { return projection; } }, cameraObj: cameraEntity,
    el: { sceneEl: { components: { 'bridgehead-run': {} } } }
  });
  worldExports.setWorld({ bounds: { minX: -100, maxX: 100, minY: -100, maxY: 100, minZ: -100, maxZ: 100 }, boxes: [] });
  return { flight, player, rig, cameraEntity, projection, world: worldExports, radius: exports.cameraNearPlaneRadius };
}
function corners(projection) {
  return [-1, 1].flatMap(x => [-1, 1].map(y => new THREE.Vector3(x, y, -1).unproject(projection)));
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('shipped camera near plane is already protected and keeps the authored boom unchanged', () => {
  const h = fixture(); h.player.position.set(3, 4, 5); h.player.rotation.y = .7;
  h.flight.updateCamera(0); h.player.updateMatrixWorld(true);
  const center = h.rig.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.max(...corners(h.projection).map(corner => corner.distanceTo(center))) < .011);
  close(h.radius(h.projection, center, new THREE.Vector3()), .25);
  close(h.rig.position.y, .5); close(h.rig.position.z, 8);
});

test('wide near plane exposes the fixed-radius gap and the revised sweep keeps every corner outside the wall', () => {
  const h = fixture(new THREE.PerspectiveCamera(100, 3.2, .5, 1000));
  // Facing sideways is a legal yaw-parented chase view. One side of this wide
  // near plane extends toward the wall while its centre remains clear.
  h.player.rotation.y = Math.PI / 2;
  h.cameraEntity.rotation.y = -Math.PI / 2;
  // Use a wall perpendicular to the rotated boom (world +X).
  h.world.setWorld({ bounds: { minX: -100, maxX: 100, minY: -100, maxY: 100, minZ: -100, maxZ: 100 }, boxes: [{ id: 'court-wall', center: { x: 5.25, y: 0, z: 0 }, size: { x: .5, y: 100, z: 100 } }] });
  h.player.updateMatrixWorld(true);
  const anchor = h.player.localToWorld(new THREE.Vector3(0, .5, 0)), delta = h.player.localToWorld(new THREE.Vector3(0, .5, 8)).sub(anchor);
  const oldHit = h.world.traceWorld(anchor, delta, .25), oldCenter = anchor.clone().addScaledVector(delta, Math.max(0, oldHit.t - .04));
  h.rig.position.copy(h.player.worldToLocal(oldCenter)); h.player.updateMatrixWorld(true);
  assert.ok(corners(h.projection).some(corner => corner.x > 5), 'Old fixed sweep must demonstrably let a near-plane corner cross the wall');
  h.flight.updateCamera(0); h.player.updateMatrixWorld(true);
  assert.ok(corners(h.projection).every(corner => corner.x < 5), 'Every projected near-plane corner must remain outside the wall');
  assert.ok(h.rig.position.z < 4);
});

test('parent transforms, child camera offset, pitch, zoom and asymmetric frusta remain inside the sweep sphere', () => {
  const h = fixture(new THREE.PerspectiveCamera(95, 2.8, .4, 1000));
  h.player.position.set(7, -2, 9); h.player.rotation.y = 1.1; h.player.scale.set(1.5, .8, 2);
  h.cameraEntity.position.set(.3, .2, -.1);
  for (const pitch of [-1, -.3, .7, 1]) for (const zoom of [.5, 1, 2]) {
    h.cameraEntity.rotation.x = pitch; h.projection.zoom = zoom;
    h.projection.setViewOffset(2800, 1000, 200, 0, 2400, 1000); h.projection.updateProjectionMatrix();
    h.flight.updateCamera(0); h.player.updateMatrixWorld(true);
    const center = h.rig.getWorldPosition(new THREE.Vector3()), radius = h.radius(h.projection, center, new THREE.Vector3());
    for (const corner of corners(h.projection)) assert.ok(corner.distanceTo(center) <= radius + 1e-8);
    assert.ok(radius > .25); close(h.rig.position.z, 8);
  }
});

test('camera clearance follows projection changes after launch without changing pitch or creating another controller', () => {
  const h = fixture();
  h.cameraEntity.rotation.x = .6; h.flight.updateCamera(0); h.player.updateMatrixWorld(true);
  const center = h.rig.getWorldPosition(new THREE.Vector3()), before = h.radius(h.projection, center, new THREE.Vector3());
  h.projection.near = .5; h.projection.aspect = 3; h.projection.zoom = .6; h.projection.updateProjectionMatrix();
  h.flight.updateCamera(0); h.player.updateMatrixWorld(true);
  const after = h.radius(h.projection, h.rig.getWorldPosition(center), new THREE.Vector3());
  assert.ok(after > before * 5); close(h.cameraEntity.rotation.x, .6); close(h.rig.position.z, 8);
  close(h.radius(undefined, center, new THREE.Vector3()), .25);
});

test('shoulder offset stays local to the yawed player and shortens against cover as part of the same boom', () => {
  const h=fixture(); h.flight.data.cameraShoulder=1.2; h.player.position.set(3,4,5);h.player.rotation.y=.8;
  h.flight.updateCamera(0);close(h.rig.position.x,1.2);close(h.rig.position.z,8);
  h.player.position.set(0,0,0);h.player.rotation.y=0;
  h.world.setWorld({bounds:{minX:-100,maxX:100,minY:-100,maxY:100,minZ:-100,maxZ:100},boxes:[{id:'shoulder-cover',center:{x:1.1,y:0,z:5},size:{x:1,y:10,z:.5}}]});
  h.flight.updateCamera(0);
  assert.ok(h.rig.position.z<5);close(h.rig.position.x/h.rig.position.z,1.2/8);
});
