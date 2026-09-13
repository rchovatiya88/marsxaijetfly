export const ARENA_PROPS = [
  { id: 'gate-left', position: '-9 2 -16', geometry: 'primitive: box; width: 1.2; height: 4; depth: 1.2', material: 'color: #855241; roughness: 1' },
  { id: 'gate-right', position: '9 2 -16', geometry: 'primitive: box; width: 1.2; height: 4; depth: 1.2', material: 'color: #855241; roughness: 1' },
  { id: 'center-ring-top', position: '0 4 -16', geometry: 'primitive: box; width: 18; height: 0.8; depth: 1.2', material: 'color: #ad6043; roughness: 1' },
  { id: 'cover-left', position: '-12 1 -2', geometry: 'primitive: box; width: 5; height: 2; depth: 2', material: 'color: #4c3430; roughness: 1' },
  { id: 'cover-right', position: '12 1 -3', geometry: 'primitive: box; width: 5; height: 2; depth: 2', material: 'color: #4c3430; roughness: 1' },
  { id: 'tower-a', position: '-18 5 -22', geometry: 'primitive: cylinder; radius: 1.4; height: 10; segmentsRadial: 8', material: 'color: #6a4139; roughness: 1' },
  { id: 'tower-b', position: '18 4 -24', geometry: 'primitive: cylinder; radius: 1.2; height: 8; segmentsRadial: 8', material: 'color: #6a4139; roughness: 1' }
];


export type Vec = { x: number; y: number; z: number };
export type Solid = { min: Vec; max: Vec };
const axes = ['x', 'y', 'z'] as const;
// One source of truth for visible cover, flight collision, spawning and both weapons.
const DEFAULT_SOLIDS: Solid[] = ARENA_PROPS.map(prop => {
  const [x,y,z] = prop.position.split(' ').map(Number);
  const values = Object.fromEntries(prop.geometry.split(';').map(v => v.trim().split(':').map(t => t.trim())));
  const w = Number(values.width || Number(values.radius) * 2);
  const h = Number(values.height), d = Number(values.depth || w);
  return {min:{x:x-w/2,y:y-h/2,z:z-d/2},max:{x:x+w/2,y:y+h/2,z:z+d/2}};
});
export const SOLIDS: Solid[] = DEFAULT_SOLIDS.slice();
export type WorldBounds = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
export type WorldDefinition = { bounds: WorldBounds; boxes: { id: string; center: Vec; size: Vec }[] };
const DEFAULT_BOUNDS: WorldBounds = {minX:-24.8,maxX:24.8,minY:1.8,maxY:26,minZ:-47,maxZ:24};
let bounds = {...DEFAULT_BOUNDS};
type TerrainSurface = {query(start:Vec,delta:Vec,radius?:number):{t:number;normal:Vec}|null};
let terrain:TerrainSurface|null=null;
// Resident terrain is fixed for the entire sortie; visual LOD never owns it.
export function setTerrainSurface(surface:TerrainSurface|null):void { terrain=surface; }

export function validateWorld(value: unknown): WorldDefinition {
  const world = value as WorldDefinition;
  if (!world || !world.bounds || !Array.isArray(world.boxes) || world.boxes.length > 512) throw new Error('Invalid collision world');
  const b = world.bounds;
  for (const axis of ['X','Y','Z'] as const) {
    const min = b[`min${axis}`], max = b[`max${axis}`];
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max || Math.abs(min) > 10000 || Math.abs(max) > 10000) throw new Error('Invalid world bounds');
  }
  const ids = new Set<string>();
  const boxes = world.boxes.map(box => {
    if (!box || typeof box.id !== 'string' || !box.id || ids.has(box.id)) throw new Error('Invalid or duplicate collider ID');
    ids.add(box.id);
    for (const axis of axes) {
      if (!Number.isFinite(box.center?.[axis]) || Math.abs(box.center[axis]) > 10000 || !Number.isFinite(box.size?.[axis]) || box.size[axis] <= 0 || box.size[axis] > 20000) throw new Error('Invalid collider dimensions');
    }
    return {id:box.id,center:{...box.center},size:{...box.size}};
  });
  return {bounds:{...b},boxes};
}

// Validate before committing either physics field; failed loads retain the current world.
export function setWorld(value: unknown): void {
  const world = validateWorld(value);
  const solids = world.boxes.map(({center:c,size:s}) => ({min:{x:c.x-s.x/2,y:c.y-s.y/2,z:c.z-s.z/2},max:{x:c.x+s.x/2,y:c.y+s.y/2,z:c.z+s.z/2}}));
  SOLIDS.splice(0,SOLIDS.length,...solids);
  bounds = world.bounds;
}
export function resetWorld(): void {
  terrain=null;
  SOLIDS.splice(0,SOLIDS.length,...DEFAULT_SOLIDS);
  bounds = {...DEFAULT_BOUNDS};
}
export function traceWorld(start: Vec, delta: Vec, radius = 0, solids = SOLIDS): { t: number; normal: Vec } | null {
  let best: {t: number; normal: Vec} | null = null;
  for (const box of solids) {
    let enter = -Infinity, leave = Infinity;
    let normal: Vec = {x:0,y:0,z:0};
    let valid = true;
    for (const axis of axes) {
      const lo = box.min[axis] - radius, hi = box.max[axis] + radius;
      if (Math.abs(delta[axis]) < 1e-10) {
        if (start[axis] < lo || start[axis] > hi) { valid = false; break; }
        continue;
      }
      const a = (lo - start[axis]) / delta[axis], b = (hi - start[axis]) / delta[axis];
      const near = Math.min(a,b), far = Math.max(a,b);
      if (near > enter) { enter = near; normal = {x:0,y:0,z:0}; normal[axis] = delta[axis] > 0 ? -1 : 1; }
      leave = Math.min(leave,far);
      if (enter > leave) { valid = false; break; }
    }
    if (valid && leave >= 0 && enter < -1e-8 && radius > 0) {
      // An existing contact (including the tiny rotational arc inflation) may
      // move tangent or out, but must not travel deeper through the obstacle.
      let depth = Infinity;
      for (const axis of axes) {
        const lowDepth = start[axis] - box.min[axis] + radius;
        const highDepth = box.max[axis] + radius - start[axis];
        if (lowDepth < depth) { depth = lowDepth; normal = {x:0,y:0,z:0}; normal[axis] = -1; }
        if (highDepth < depth) { depth = highDepth; normal = {x:0,y:0,z:0}; normal[axis] = 1; }
      }
      if (delta.x * normal.x + delta.y * normal.y + delta.z * normal.z < -1e-10) enter = 0;
    }
    if (valid && leave >= 0 && enter <= 1 && (enter >= -1e-8 || radius === 0)) {
      const t = Math.max(0,enter);
      if (!best || t < best.t) best = {t,normal};
    }
  }
  const ground=solids===SOLIDS ? terrain?.query(start,delta,radius) : null;
  if(ground && (!best || ground.t<best.t))return ground;
  return best;
}
export function moveInWorld(position: Vec, delta: Vec, radius = 0.7): void {
  const remaining = {...delta};
  for (let i=0;i<5;i++) {
    const hit = traceWorld(position,remaining,radius);
    const t = hit ? Math.max(0,hit.t-0.0001) : 1;
    for (const axis of axes) position[axis] += remaining[axis] * t;
    if (!hit) break;
    for (const axis of axes) remaining[axis]*=1-t;
    const inward=Math.min(0,remaining.x*hit.normal.x+remaining.y*hit.normal.y+remaining.z*hit.normal.z);
    for (const axis of axes) remaining[axis]-=inward*hit.normal[axis];
    if(Math.hypot(remaining.x,remaining.y,remaining.z)<1e-7)break;
  }
  position.x = Math.max(bounds.minX,Math.min(bounds.maxX,position.x));
  position.y = Math.max(bounds.minY,Math.min(bounds.maxY,position.y));
  position.z = Math.max(bounds.minZ,Math.min(bounds.maxZ,position.z));
}

export type BodySphere = { center: Vec; radius: number };
// Measured normalized hero envelope (metres), with the player at the bike base.
// Each sphere encloses one complete cell, so their union conservatively covers
// every point of the box, including gaps between longitudinal samples. Yaw only:
// visual hover/roll must not be reintroduced without expanding this envelope.
export const BIKE_BODY_ENVELOPE: Solid = {min:{x:-.53,y:-.03,z:-2.38},max:{x:.53,y:1.84,z:2.38}};
const cellY = (BIKE_BODY_ENVELOPE.max.y - BIKE_BODY_ENVELOPE.min.y) / 3;
const cellZ = (BIKE_BODY_ENVELOPE.max.z - BIKE_BODY_ENVELOPE.min.z) / 6;
const bodyRadius = Math.hypot(.53, cellY / 2, cellZ / 2);
export const BIKE_BODY: readonly BodySphere[] = Object.freeze(Array.from({length:18}, (_, index) => Object.freeze({
  center: Object.freeze({x:0, y:BIKE_BODY_ENVELOPE.min.y + (Math.floor(index / 6) + .5) * cellY,
    z:BIKE_BODY_ENVELOPE.min.z + (index % 6 + .5) * cellZ}), radius:bodyRadius
})));
const bodyStart: Vec = {x:0,y:0,z:0}, bodyEnd: Vec = {x:0,y:0,z:0}, bodyDelta: Vec = {x:0,y:0,z:0};
function bodyCenter(position: Vec, yaw: number, sphere: BodySphere, out: Vec): Vec {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  out.x = position.x + sphere.center.x * c + sphere.center.z * s;
  out.y = position.y + sphere.center.y;
  out.z = position.z - sphere.center.x * s + sphere.center.z * c;
  return out;
}
function traceBodySphere(start: Vec, delta: Vec, radius: number): {t:number;normal:Vec}|null {
  let best = traceWorld(start, delta, radius);
  for (const axis of axes) {
    if (Math.abs(delta[axis]) < 1e-10) continue;
    const upper = axis.toUpperCase() as 'X'|'Y'|'Z';
    const positive = delta[axis] > 0;
    const limit = positive ? bounds[`max${upper}`] - radius : bounds[`min${upper}`] + radius;
    const t = (positive ? start[axis] > limit : start[axis] < limit) ? 0 : (limit - start[axis]) / delta[axis];
    // Starting outside a boundary can always move back into the playable world.
    if (t >= -1e-8 && t <= 1 && (!best || t < best.t)) {
      const normal = {x:0,y:0,z:0}; normal[axis] = positive ? -1 : 1;
      best = {t:Math.max(0,t),normal};
    }
  }
  return best;
}
export function traceBikeBody(position: Vec, delta: Vec, yaw: number): {t:number;normal:Vec}|null {
  let best: {t:number;normal:Vec}|null = null;
  for (const sphere of BIKE_BODY) {
    bodyCenter(position, yaw, sphere, bodyStart);
    const hit = traceBodySphere(bodyStart, delta, sphere.radius);
    if (hit && (!best || hit.t < best.t)) best = hit;
  }
  return best;
}
export function moveBikeBody(position: Vec, delta: Vec, yaw: number): void {
  const remaining = {...delta};
  for (let iteration = 0; iteration < 5; iteration++) {
    const length = Math.hypot(remaining.x, remaining.y, remaining.z);
    if (length < 1e-8) break;
    const hit = traceBikeBody(position, remaining, yaw);
    const t = hit ? Math.max(0,hit.t - .0001 / length) : 1;
    for (const axis of axes) position[axis] += remaining[axis] * t;
    if (!hit) break;
    for (const axis of axes) remaining[axis] *= 1-t;
    const inward = Math.min(0, remaining.x*hit.normal.x + remaining.y*hit.normal.y + remaining.z*hit.normal.z);
    for (const axis of axes) remaining[axis] -= inward*hit.normal[axis];
  }
}
export function rotateBikeBody(position: Vec, fromYaw: number, toYaw: number): number {
  if (!Number.isFinite(fromYaw) || !Number.isFinite(toYaw)) return fromYaw;
  const requested = toYaw - fromYaw;
  if (Math.abs(requested) < 1e-10) return toYaw;
  // One complete clear revolution proves additional revolutions at this pose.
  const total = Math.sign(requested) * Math.min(Math.abs(requested), Math.PI*2);
  const steps = Math.ceil(Math.abs(total) / (Math.PI / 36)), step = total / steps;
  for (let i = 0; i < steps; i++) {
    const yaw = fromYaw + step*i;
    let first = 1;
    for (const sphere of BIKE_BODY) {
      bodyCenter(position, yaw, sphere, bodyStart);
      bodyCenter(position, yaw+step, sphere, bodyEnd);
      for (const axis of axes) bodyDelta[axis] = bodyEnd[axis] - bodyStart[axis];
      // The circular centre path stays inside this inflated chord sweep.
      const sagitta = Math.hypot(sphere.center.x,sphere.center.z) * (1-Math.cos(step/2));
      const hit = traceBodySphere(bodyStart,bodyDelta,sphere.radius+sagitta);
      if (hit) first = Math.min(first, Math.max(0,hit.t-.0001));
    }
    if (first < 1) return yaw + step*first;
  }
  return toYaw;
}
export function clearSpawn(x: number,z: number): boolean {
  return x > bounds.minX+1.8 && x < bounds.maxX-1.8 && z > bounds.minZ+2 && z < bounds.maxZ-2 && !SOLIDS.some(b =>
    x>b.min.x-1.2 && x<b.max.x+1.2 && z>b.min.z-1.2 && z<b.max.z+1.2);
}
