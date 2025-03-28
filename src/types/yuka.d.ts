declare module 'yuka' {
  export class EntityManager {
    constructor();
    add(entity: any): void;
    remove(entity: any): void;
    update(delta: number): void;
  }

  export class Vehicle {
    constructor();
    position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void; copy: (vector: any) => void; };
    quaternion: any;
    rotation: any;
    maxSpeed: number;
    maxForce: number;
    mass: number;
    steering: {
      add: (behavior: any) => void;
    };
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    copy(vector: Vector3): this;
    set(x: number, y: number, z: number): this;
  }

  export class SeekBehavior {
    constructor();
    target: Vector3;
    active: boolean;
  }

  export class SeparationBehavior {
    constructor();
    active: boolean;
  }
}
