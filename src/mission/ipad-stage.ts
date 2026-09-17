import type { Vec } from '../arena-world';

export const IPAD_STAGE_SPEED = 16;
export const IPAD_STAGE_CAMERA = { height: 1.7, distance: 6.4, shoulder: 0 } as const;

export const IPAD_STAGE_GATES = [
  { id: 'charge', position: { x: -4.5, y: 4.8, z: 2 }, radius: 4.8, color: '#78ffe1' },
  { id: 'shield', position: { x: 4.5, y: 3.2, z: 2 }, radius: 4.8, color: '#ffb174' },
] as const;

export const IPAD_STAGE_WARDEN = { x: 0, y: 0, z: -12 };
export const IPAD_STAGE_EXTRACTION = { x: 0, y: 3.2, z: -30 };

export function crossesIpadStageGate(from: Vec, to: Vec, gate: { position: Vec; radius: number }): boolean {
  if (from.z <= gate.position.z || to.z > gate.position.z) return false;
  const t = (gate.position.z - from.z) / (to.z - from.z);
  const x = from.x + (to.x - from.x) * t - gate.position.x;
  const y = from.y + (to.y - from.y) * t - gate.position.y;
  return x * x + y * y <= gate.radius * gate.radius;
}
