// Static, double-sided triangle collision. Build once before gameplay; visual LOD
// changes must not recreate it. Coordinates are baked runtime Y-up world metres.
export type CollisionVector = { x: number; y: number; z: number };
export type TriangleHit = { t: number; normal: CollisionVector; triangle: number };
const EPS = 1e-8;

export class TriangleCollider {
  readonly triangleCount: number;
  readonly positions: Float32Array;
  readonly cellSize: number;
  lastCandidateCount = 0;
  private normals: Float64Array;
  private boxes: Float64Array;
  private cells = new Map<string, number[]>();
  private global: number[] = [];
  private stamps: Uint32Array;
  private stamp = 0;
  private candidates: number[] = [];
  private bestT = Infinity;
  private bestX = 0;
  private bestY = 0;
  private bestZ = 0;
  private bestTriangle = -1;
  private sx = 0; private sy = 0; private sz = 0;
  private dx = 0; private dy = 0; private dz = 0;
  private radius = 0;

  constructor(positions: ArrayLike<number>, cellSize = 4) {
    if (!positions || positions.length % 9 || positions.length > 9000000) throw Error('Triangle positions must contain at most one million complete XYZ triangles');
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw Error('Invalid triangle grid cell size');
    this.cellSize = cellSize;
    this.positions = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i++) {
      const value = positions[i];
      if (!Number.isFinite(value) || Math.abs(value) > 100000) throw Error('Invalid triangle coordinate');
      this.positions[i] = value;
    }
    this.triangleCount = positions.length / 9;
    this.normals = new Float64Array(this.triangleCount * 3);
    this.boxes = new Float64Array(this.triangleCount * 6);
    this.stamps = new Uint32Array(this.triangleCount);
    const p = this.positions;
    for (let triangle = 0; triangle < this.triangleCount; triangle++) {
      const i = triangle * 9, j = triangle * 3, k = triangle * 6;
      const abx = p[i + 3] - p[i], aby = p[i + 4] - p[i + 1], abz = p[i + 5] - p[i + 2];
      const acx = p[i + 6] - p[i], acy = p[i + 7] - p[i + 1], acz = p[i + 8] - p[i + 2];
      const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
      const length = Math.hypot(nx, ny, nz);
      if (length < EPS) continue; // Degenerate decorative triangles have no face.
      this.normals[j] = nx / length; this.normals[j + 1] = ny / length; this.normals[j + 2] = nz / length;
      const minX = Math.min(p[i], p[i + 3], p[i + 6]), maxX = Math.max(p[i], p[i + 3], p[i + 6]);
      const minY = Math.min(p[i + 1], p[i + 4], p[i + 7]), maxY = Math.max(p[i + 1], p[i + 4], p[i + 7]);
      const minZ = Math.min(p[i + 2], p[i + 5], p[i + 8]), maxZ = Math.max(p[i + 2], p[i + 5], p[i + 8]);
      this.boxes.set([minX, minY, minZ, maxX, maxY, maxZ], k);
      const x0 = Math.floor(minX / cellSize), x1 = Math.floor(maxX / cellSize), z0 = Math.floor(minZ / cellSize), z1 = Math.floor(maxZ / cellSize);
      if ((x1 - x0 + 1) * (z1 - z0 + 1) > 4096) { this.global.push(triangle); continue; }
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        const key = `${x},${z}`, bucket = this.cells.get(key);
        if (bucket) bucket.push(triangle); else this.cells.set(key, [triangle]);
      }
    }
  }

  private accept(t: number, nx: number, ny: number, nz: number, triangle: number): void {
    if (t < -EPS || t > 1 + EPS || t >= this.bestT || this.dx * nx + this.dy * ny + this.dz * nz >= -EPS) return;
    const length = Math.hypot(nx, ny, nz);
    if (length < EPS) return;
    this.bestT = Math.max(0, t); this.bestX = nx / length; this.bestY = ny / length; this.bestZ = nz / length; this.bestTriangle = triangle;
  }

  private inside(x: number, y: number, z: number, i: number): boolean {
    const p = this.positions;
    const abx = p[i + 3] - p[i], aby = p[i + 4] - p[i + 1], abz = p[i + 5] - p[i + 2];
    const acx = p[i + 6] - p[i], acy = p[i + 7] - p[i + 1], acz = p[i + 8] - p[i + 2];
    const qx = x - p[i], qy = y - p[i + 1], qz = z - p[i + 2];
    const aa = abx * abx + aby * aby + abz * abz, cc = acx * acx + acy * acy + acz * acz;
    const ac = abx * acx + aby * acy + abz * acz, qa = qx * abx + qy * aby + qz * abz, qc = qx * acx + qy * acy + qz * acz;
    const denominator = aa * cc - ac * ac;
    if (denominator <= EPS * EPS) return false;
    const u = (qa * cc - qc * ac) / denominator, v = (qc * aa - qa * ac) / denominator;
    return u >= -EPS && v >= -EPS && u + v <= 1 + EPS;
  }

  // Segment capsule: test the infinite cylinder, then both spherical caps.
  private edge(ax: number, ay: number, az: number, bx: number, by: number, bz: number, triangle: number): void {
    const ex = bx - ax, ey = by - ay, ez = bz - az, ee = ex * ex + ey * ey + ez * ez;
    if (ee < EPS * EPS) return;
    const qx = this.sx - ax, qy = this.sy - ay, qz = this.sz - az;
    const along = (qx * ex + qy * ey + qz * ez) / ee;
    const speedAlong = (this.dx * ex + this.dy * ey + this.dz * ez) / ee;
    const rx = qx - ex * along, ry = qy - ey * along, rz = qz - ez * along;
    const vx = this.dx - ex * speedAlong, vy = this.dy - ey * speedAlong, vz = this.dz - ez * speedAlong;
    const a = vx * vx + vy * vy + vz * vz, b = rx * vx + ry * vy + rz * vz, c = rx * rx + ry * ry + rz * rz - this.radius * this.radius;
    if (c <= 0 && along >= 0 && along <= 1) this.accept(0, rx, ry, rz, triangle);
    if (a > EPS * EPS) {
      const discriminant = b * b - a * c;
      if (discriminant >= 0) {
        const t = (-b - Math.sqrt(discriminant)) / a, u = along + speedAlong * t;
        if (u >= 0 && u <= 1) this.accept(t, rx + vx * t, ry + vy * t, rz + vz * t, triangle);
      }
    }
    this.vertex(ax, ay, az, triangle); this.vertex(bx, by, bz, triangle);
  }

  private vertex(x: number, y: number, z: number, triangle: number): void {
    const qx = this.sx - x, qy = this.sy - y, qz = this.sz - z;
    const a = this.dx * this.dx + this.dy * this.dy + this.dz * this.dz;
    const b = qx * this.dx + qy * this.dy + qz * this.dz;
    const c = qx * qx + qy * qy + qz * qz - this.radius * this.radius;
    if (c <= 0) this.accept(0, qx, qy, qz, triangle);
    const discriminant = b * b - a * c;
    if (a <= EPS * EPS || discriminant < 0) return;
    const t = (-b - Math.sqrt(discriminant)) / a;
    this.accept(t, qx + this.dx * t, qy + this.dy * t, qz + this.dz * t, triangle);
  }

  trace(start: CollisionVector, delta: CollisionVector, radius = 0): TriangleHit | null {
    if (![start.x, start.y, start.z, delta.x, delta.y, delta.z, radius].every(Number.isFinite) || radius < 0) throw Error('Invalid collision query');
    this.sx = start.x; this.sy = start.y; this.sz = start.z; this.dx = delta.x; this.dy = delta.y; this.dz = delta.z; this.radius = radius;
    this.bestT = Infinity; this.bestTriangle = -1;
    this.lastCandidateCount = 0;
    if (delta.x * delta.x + delta.y * delta.y + delta.z * delta.z < EPS * EPS) return null;
    const minX = Math.min(start.x, start.x + delta.x) - radius, maxX = Math.max(start.x, start.x + delta.x) + radius;
    const minY = Math.min(start.y, start.y + delta.y) - radius, maxY = Math.max(start.y, start.y + delta.y) + radius;
    const minZ = Math.min(start.z, start.z + delta.z) - radius, maxZ = Math.max(start.z, start.z + delta.z) + radius;
    const x0 = Math.floor(minX / this.cellSize), x1 = Math.floor(maxX / this.cellSize), z0 = Math.floor(minZ / this.cellSize), z1 = Math.floor(maxZ / this.cellSize);
    this.stamp = (this.stamp + 1) >>> 0;
    if (this.stamp === 0) { this.stamps.fill(0); this.stamp = 1; }
    this.candidates.length = 0;
    // A malformed long camera/projectile query cannot create an unbounded grid walk.
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 16384) {
      for (let triangle = 0; triangle < this.triangleCount; triangle++) this.candidates.push(triangle);
    } else {
      for (const triangle of this.global) { this.candidates.push(triangle); this.stamps[triangle] = this.stamp; }
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        const bucket = this.cells.get(`${x},${z}`);
        if (bucket) for (const triangle of bucket) if (this.stamps[triangle] !== this.stamp) { this.stamps[triangle] = this.stamp; this.candidates.push(triangle); }
      }
    }
    const p = this.positions, n = this.normals, boxes = this.boxes;
    for (const triangle of this.candidates) {
      const k = triangle * 6, j = triangle * 3, i = triangle * 9;
      if (boxes[k] > maxX || boxes[k + 3] < minX || boxes[k + 1] > maxY || boxes[k + 4] < minY || boxes[k + 2] > maxZ || boxes[k + 5] < minZ) continue;
      const nx = n[j], ny = n[j + 1], nz = n[j + 2];
      if (nx === 0 && ny === 0 && nz === 0) continue;
      this.lastCandidateCount++;
      const distance = (this.sx - p[i]) * nx + (this.sy - p[i + 1]) * ny + (this.sz - p[i + 2]) * nz;
      const speed = this.dx * nx + this.dy * ny + this.dz * nz;
      if (radius > 0 && Math.abs(distance) <= radius && this.inside(this.sx - distance * nx, this.sy - distance * ny, this.sz - distance * nz, i)) {
        const sign = distance < 0 ? -1 : distance > 0 ? 1 : speed > 0 ? -1 : 1;
        this.accept(0, nx * sign, ny * sign, nz * sign, triangle);
      }
      if (Math.abs(speed) > EPS) for (let sign = -1; sign <= 1; sign += 2) {
        const t = (sign * radius - distance) / speed;
        if (t < -EPS || t > 1 + EPS || t >= this.bestT) continue;
        const x = this.sx + this.dx * t - sign * radius * nx, y = this.sy + this.dy * t - sign * radius * ny, z = this.sz + this.dz * t - sign * radius * nz;
        if (this.inside(x, y, z, i)) this.accept(t, nx * sign, ny * sign, nz * sign, triangle);
      }
      if (radius > 0) {
        this.edge(p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5], triangle);
        this.edge(p[i + 3], p[i + 4], p[i + 5], p[i + 6], p[i + 7], p[i + 8], triangle);
        this.edge(p[i + 6], p[i + 7], p[i + 8], p[i], p[i + 1], p[i + 2], triangle);
      }
    }
    return this.bestTriangle < 0 ? null : { t: this.bestT, normal: { x: this.bestX, y: this.bestY, z: this.bestZ }, triangle: this.bestTriangle };
  }

  query(start: CollisionVector, delta: CollisionVector, radius = 0): TriangleHit | null {
    return this.trace(start, delta, radius);
  }

  // Scalar normal projection also supports sloped triangles; zeroing world axes
  // (the AABB-only solver's rule) would incorrectly stop every direction on slopes.
  move(position: CollisionVector, delta: CollisionVector, radius = 0.7, iterations = 5): void {
    const remaining = { ...delta };
    for (let iteration = 0; iteration < Math.min(12, Math.max(1, iterations)); iteration++) {
      const length = Math.hypot(remaining.x, remaining.y, remaining.z);
      if (length < EPS) break;
      const hit = this.trace(position, remaining, radius);
      const t = hit ? Math.max(0, hit.t - 0.0001 / length) : 1;
      position.x += remaining.x * t; position.y += remaining.y * t; position.z += remaining.z * t;
      if (!hit) break;
      remaining.x *= 1 - t; remaining.y *= 1 - t; remaining.z *= 1 - t;
      const dot = remaining.x * hit.normal.x + remaining.y * hit.normal.y + remaining.z * hit.normal.z;
      if (dot < 0) { remaining.x -= hit.normal.x * dot; remaining.y -= hit.normal.y * dot; remaining.z -= hit.normal.z * dot; }
    }
  }
}
