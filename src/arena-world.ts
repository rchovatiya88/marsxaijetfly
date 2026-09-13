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
    if (valid && leave >= 0 && enter <= 1 && (enter >= -1e-8 || radius === 0)) {
      const t = Math.max(0,enter);
      if (!best || t < best.t) best = {t,normal};
    }
  }
  return best;
}
export function moveInWorld(position: Vec, delta: Vec, radius = 0.7): void {
  const remaining = {...delta};
  for (let i=0;i<3;i++) {
    const hit = traceWorld(position,remaining,radius);
    const t = hit ? Math.max(0,hit.t-0.0001) : 1;
    for (const axis of axes) position[axis] += remaining[axis] * t;
    if (!hit) break;
    for (const axis of axes) remaining[axis] = hit.normal[axis] ? 0 : remaining[axis]*(1-t);
  }
  position.x = Math.max(bounds.minX,Math.min(bounds.maxX,position.x));
  position.y = Math.max(bounds.minY,Math.min(bounds.maxY,position.y));
  position.z = Math.max(bounds.minZ,Math.min(bounds.maxZ,position.z));
}
export function clearSpawn(x: number,z: number): boolean {
  return x > bounds.minX+1.8 && x < bounds.maxX-1.8 && z > bounds.minZ+2 && z < bounds.maxZ-2 && !SOLIDS.some(b =>
    x>b.min.x-1.2 && x<b.max.x+1.2 && z>b.min.z-1.2 && z<b.max.z+1.2);
}
