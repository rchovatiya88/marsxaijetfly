#!/usr/bin/env node
'use strict';
// Offline CPU diagnostic using the same resident GLB geometry as world-stream.
// This is not a browser frame-time or human traversal acceptance measurement.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');
const { performance } = require('node:perf_hooks');
const { createHash } = require('node:crypto');
const compiled = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/triangle-collider.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: compiled, Float32Array, Float64Array, Uint32Array, Map });
async function main() {
const layout=JSON.parse(fs.readFileSync('art/bridgehead/bridgehead-v2-layout.json','utf8'));
const draco = await require(path.resolve('public/vendor/draco/draco_wasm_wrapper.js'))({ wasmBinary: fs.readFileSync('public/vendor/draco/draco_decoder.wasm') });
const vertices = [], sources = [];
for (const id of ['q00', 'q01', 'q10', 'q11']) {
  const file = `public/models/level1-stream/${id}-lod1.glb`, bytes = fs.readFileSync(file);
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw Error('Expected GLB');
  const jsonLength = bytes.readUInt32LE(12), json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const binOffset = 20 + jsonLength + 8;
  const read = (accessorId, index, component = 0) => {
    const accessor = json.accessors[accessorId], view = json.bufferViews[accessor.bufferView];
    if (accessor.sparse || view.buffer !== 0) throw Error('Unsupported sparse/external benchmark accessor');
    const sizes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }, size = sizes[accessor.componentType], width = accessor.type === 'VEC3' ? 3 : 1;
    const offset = binOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0) + index * (view.byteStride || width * size) + component * size;
    return accessor.componentType === 5126 ? bytes.readFloatLE(offset) : accessor.componentType === 5125 ? bytes.readUInt32LE(offset) : accessor.componentType === 5123 ? bytes.readUInt16LE(offset) : bytes.readUInt8(offset);
  };
  function visit(nodeId, parentMatrix) {
    const node = json.nodes[nodeId];
    const matrix = node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(new THREE.Vector3().fromArray(node.translation || [0, 0, 0]), new THREE.Quaternion().fromArray(node.rotation || [0, 0, 0, 1]), new THREE.Vector3().fromArray(node.scale || [1, 1, 1]));
    matrix.premultiply(parentMatrix);
    if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) {
      if (primitive.mode !== undefined && primitive.mode !== 4) throw Error('Unsupported nontriangle primitive');
      const compressed = primitive.extensions?.KHR_draco_mesh_compression;
      if (compressed) {
        const view = json.bufferViews[compressed.bufferView], input = bytes.subarray(binOffset + (view.byteOffset || 0), binOffset + (view.byteOffset || 0) + view.byteLength);
        const decoder = new draco.Decoder(), buffer = new draco.DecoderBuffer(), mesh = new draco.Mesh(), positions = new draco.DracoFloat32Array(), face = new draco.DracoInt32Array();
        try {
          buffer.Init(input, input.length);
          const status = decoder.DecodeBufferToMesh(buffer, mesh);
          if (!status.ok()) throw Error(status.error_msg());
          const attribute = decoder.GetAttributeByUniqueId(mesh, compressed.attributes.POSITION);
          if (!decoder.GetAttributeFloatForAllPoints(mesh, attribute, positions)) throw Error('Failed Draco positions');
          const point = new THREE.Vector3();
          for (let i = 0; i < mesh.num_faces(); i++) {
            decoder.GetFaceFromMesh(mesh, i, face);
            for (let j = 0; j < 3; j++) {
              const index = face.GetValue(j) * 3;
              point.set(positions.GetValue(index), positions.GetValue(index + 1), positions.GetValue(index + 2)).applyMatrix4(matrix);
              vertices.push(point.x, point.y, point.z);
            }
          }
        } finally { [face, positions, mesh, buffer, decoder].forEach(resource => draco.destroy(resource)); }
        continue;
      }
      const positions = primitive.attributes.POSITION, count = json.accessors[primitive.indices ?? positions].count, point = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const index = primitive.indices === undefined ? i : read(primitive.indices, i);
        point.set(read(positions, index, 0), read(positions, index, 1), read(positions, index, 2)).applyMatrix4(matrix);
        vertices.push(point.x, point.y, point.z);
      }
    }
    for (const child of node.children || []) visit(child, matrix);
  }
  for (const node of json.scenes[json.scene || 0].nodes) visit(node, new THREE.Matrix4());
  sources.push({ path: file, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const start = performance.now(), collider = new compiled.TriangleCollider(new Float32Array(vertices.map(n=>n*layout.environmentScale)));
const buildMs = performance.now() - start;
const load = file => {
  const output = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: output });
  return output;
};
const world = load('src/arena-world.ts');
world.setWorld(layout.world); world.setTerrainSurface(collider);
const routePaths=layout.routePaths;
const routeSweeps = Object.entries(routePaths).map(([route, points]) => {
  const position = {...points[0]}, segments = [];let yaw=-Math.PI/2;
  for (const point of points.slice(1)) {
    const target = {...point}, delta = { x: target.x - position.x, y: target.y - position.y, z: target.z - position.z };
    const origin = { ...position },desired=Math.atan2(-delta.x,-delta.z);
    const turn=((desired-yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
    const nextYaw=world.rotateBikeBody(position,yaw,yaw+turn),rotationError=Math.abs(yaw+turn-nextYaw);yaw=nextYaw;
    const firstHit=world.traceBikeBody(position,delta,yaw);
    world.moveBikeBody(position,delta,yaw);
    segments.push({ origin, target, arrived: { ...position }, rotationError,errorMetres: Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z), firstHit });
  }
  return { route, clear: segments.every(segment => segment.errorMetres < .01 && segment.rotationError<.01), segments };
});
const samples = [], candidates = [];
// Fixed positions across both routes and court; continuous short sphere sweeps
// represent collision work only, without input, rendering, animation or UI costs.
for (let i = 0; i < 1200; i++) {
  const progress = (i % 200) / 199;
  const position = { x: -54 + progress * 144, y: i % 2 ? 3.2 : -8.2, z: i % 2 ? -35.4 : 32.1 };
  const delta = { x: .5, y: -.03, z: -.1 };
  const before = performance.now(); world.traceBikeBody(position,delta,-Math.PI/2);
  if (i >= 200) { samples.push(performance.now() - before); candidates.push(collider.lastCandidateCount); }
}
samples.sort((a, b) => a - b); candidates.sort((a, b) => a - b);
const target={...layout.warden,y:layout.warden.y+1.05};
const sightlines=layout.approaches.map(a=>({route:a.id,blocked:!!world.traceWorld(a.position,{x:target.x-a.position.x,y:target.y-a.position.y,z:target.z-a.position.z})}));
const report = { kind: 'offline-full-bike-cpu-diagnostic',layout:'art/bridgehead/bridgehead-v2-layout.json',environmentScale:layout.environmentScale,bodySpheres:world.BIKE_BODY.length,runtime: process.version, platform: `${process.platform}/${process.arch}`, triangles: collider.triangleCount, buildMs, queriesAfterWarmup: samples.length, queryMedianMs: samples[Math.ceil(samples.length * .5) - 1], queryP95Ms: samples[Math.ceil(samples.length * .95) - 1], maxCandidatesOfLastSphere: candidates[candidates.length - 1], routeSweeps,sightlines, sources, limitations: 'No browser/render cost, natural-input completion, hardware acceptance, collision-to-high-LOD visual equivalence, or human playtest claim.' };
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
