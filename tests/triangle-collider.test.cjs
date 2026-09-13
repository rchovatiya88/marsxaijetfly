const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/triangle-collider.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject, Float32Array, Float64Array, Uint32Array, Map });
const { TriangleCollider } = exportsObject;
const near = (actual, expected, tolerance = .0002) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const v = (x, y, z) => ({ x, y, z });
// Two triangles forming a 20m wide vertical wall at z=0.
const wall = [-10, -10, 0, 10, -10, 0, 10, 10, 0, -10, -10, 0, 10, 10, 0, -10, 10, 0];

test('double-sided wall rejects boosted sphere tunnelling and shares exact camera/weapon rays', () => {
  const collider = new TriangleCollider(new Float32Array(wall));
  const shot = collider.query(v(2, 0, 10), v(0, 0, -100), 0);
  const bike = collider.query(v(2, 0, 10), v(0, 0, -100), .7);
  const reverse = collider.query(v(2, 0, -10), v(0, 0, 100), .7);
  near(shot.t, .1); near(bike.t, .093); near(reverse.t, .093);
  near(bike.normal.z, 1); near(reverse.normal.z, -1);
  const pos = v(2, 0, 10); collider.move(pos, v(0, 0, -100)); near(pos.z, .7001);
});
test('diagonal sweep slides along wall; sphere contact allows tangent and outward motion', () => {
  const collider = new TriangleCollider(wall);
  const pos = v(0, 0, 4); collider.move(pos, v(4, 0, -10));
  near(pos.x, 4); near(pos.z, .7);
  assert.equal(collider.query(v(0, 0, .7), v(1, 0, 0), .7), null);
  assert.equal(collider.query(v(0, 0, .6), v(0, 0, 1), .7), null);
  const inward = collider.query(v(0, 0, .6), v(0, 0, -1), .7);
  near(inward.t, 0); near(inward.normal.z, 1);
});
test('spherical edge and vertex contacts stop paths missed by a face-only collider', () => {
  const collider = new TriangleCollider([0, 0, 0, 4, 0, 0, 0, 4, 0]);
  // Parallel to triangle plane and below its AB edge; hits rounded capsule edge.
  const edge = collider.query(v(2, -2, .3), v(0, 4, 0), .5);
  near(edge.t, .4); near(edge.normal.y, -.8); near(edge.normal.z, .6);
  // Approaching A outside both adjacent edge extents, only sphere cap collides.
  const vertex = collider.query(v(-2, -.3, 0), v(4, 0, 0), .5);
  near(vertex.t, .4); near(vertex.normal.x, -.8); near(vertex.normal.y, -.6);
  assert.equal(collider.query(v(2, -2, .6), v(0, 4, 0), .5), null);
});
test('slope slides by normal projection and corner iterations cannot escape a closed corner', () => {
  const slope = new TriangleCollider([-10, -10, -10, 10, 10, -10, 10, 10, 10, -10, -10, -10, 10, 10, 10, -10, -10, 10]);
  const pos = v(-2, 2, 0); slope.move(pos, v(5, 0, 0), .7);
  assert.ok(pos.x > 1 && pos.y > 2); near((pos.y - pos.x) / Math.SQRT2, .7);
  const side = [0, -10, -10, 0, 10, -10, 0, 10, 10, 0, -10, -10, 0, 10, 10, 0, -10, 10];
  const corner = new TriangleCollider([...wall, ...side]);
  const atCorner = v(4, 0, 4); corner.move(atCorner, v(-10, 3, -10));
  near(atCorner.x, .7); near(atCorner.z, .7); near(atCorner.y, 3);
});
test('broadphase culls distant geometry and deduplicates triangles across cells', () => {
  const geometry = [...wall];
  for (let i = 0; i < 2000; i++) {
    const x = 100 + (i % 50) * 5, z = 100 + Math.floor(i / 50) * 5;
    geometry.push(x, 0, z, x + 1, 0, z, x, 1, z);
  }
  const collider = new TriangleCollider(geometry, 2);
  const hit = collider.query(v(2, 0, 2), v(0, 0, -4), .7);
  assert.ok(hit); assert.equal(collider.lastCandidateCount, 2);
  for (let i = 0; i < 100; i++) {
    near(collider.query(v(2, 0, 2), v(0, 0, -4), .7).t, .325);
    assert.equal(collider.lastCandidateCount, 2);
  }
});
test('nearest triangle wins independently of input ordering, winding and vertex buffer mutation', () => {
  const distant = wall.map((number, index) => index % 3 === 2 ? -5 : number);
  const source = new Float32Array([...distant, ...wall]);
  const collider = new TriangleCollider(source); source.fill(999);
  near(collider.query(v(2, 0, 10), v(0, 0, -100), .7).t, .093);
  const reversed = [];
  for (let i = 0; i < wall.length; i += 9) reversed.push(...wall.slice(i + 6, i + 9), ...wall.slice(i + 3, i + 6), ...wall.slice(i, i + 3));
  near(new TriangleCollider(reversed).query(v(2, 0, 10), v(0, 0, -100), .7).t, .093);
});
test('invalid inputs fail before use; empty and degenerate geometry never produce NaN hits', () => {
  assert.throws(() => new TriangleCollider([0, 0]));
  assert.throws(() => new TriangleCollider([0, 0, 0, 1, 0, 0, NaN, 1, 0]));
  assert.throws(() => new TriangleCollider(wall, 0));
  const degenerate = new TriangleCollider([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(degenerate.query(v(0, 0, 1), v(0, 0, -2), .7), null);
  assert.equal(new TriangleCollider([]).query(v(0, 0, 1), v(0, 0, -2), .7), null);
  assert.throws(() => new TriangleCollider(wall).query(v(0, 0, 1), v(0, 0, -2), -1));
});
