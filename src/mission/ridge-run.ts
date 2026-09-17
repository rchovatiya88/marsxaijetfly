import type { Vec } from '../arena-world';

export const RIDGE_GATES = [
  { id: 'high', position: { x: -6, y: 10, z: -8 }, radius: 2.8, color: '#78ffe1' },
  { id: 'low', position: { x: 6, y: 3.5, z: -8 }, radius: 2.8, color: '#00ff9d' }
] as const;
export const EXTRACTION = { x: 0, y: 3.5, z: -41 };

// Swept gate-plane crossing: fast flight cannot jump over a narrow trigger.
export function crossesGate(from: Vec, to: Vec, gate: { position: Vec; radius: number }): boolean {
  if (from.z <= gate.position.z || to.z > gate.position.z) return false;
  const t = (gate.position.z - from.z) / (to.z - from.z);
  const x = from.x + (to.x - from.x) * t - gate.position.x;
  const y = from.y + (to.y - from.y) * t - gate.position.y;
  return x * x + y * y <= gate.radius * gate.radius;
}
