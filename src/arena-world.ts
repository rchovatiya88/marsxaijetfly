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
export const SOLIDS: Solid[] = ARENA_PROPS.map(prop => {
  const [x,y,z] = prop.position.split(' ').map(Number);
  const values = Object.fromEntries(prop.geometry.split(';').map(v => v.trim().split(':').map(t => t.trim())));
  const w = Number(values.width || Number(values.radius) * 2);
  const h = Number(values.height), d = Number(values.depth || w);
  return {min:{x:x-w/2,y:y-h/2,z:z-d/2},max:{x:x+w/2,y:y+h/2,z:z+d/2}};
});
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
  position.x = Math.max(-24.8,Math.min(24.8,position.x));
  position.y = Math.max(1.8,Math.min(26,position.y));
  position.z = Math.max(-47,Math.min(24,position.z));
}
export function clearSpawn(x: number,z: number): boolean {
  return x > -23 && x < 23 && z > -45 && z < 22 && !SOLIDS.some(b =>
    x>b.min.x-1.2 && x<b.max.x+1.2 && z>b.min.z-1.2 && z<b.max.z+1.2);
}
