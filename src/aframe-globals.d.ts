// Type definitions for global A-Frame, Three.js, and YUKA variables

interface AFrameEntity extends Element {
  object3D: THREE.Object3D;
  components: Record<string, any>;
  querySelector: (selector: string) => AFrameEntity | null;
  querySelectorAll: (selector: string) => NodeListOf<Element>;
  setAttribute: (name: string, value: any, property?: string) => void;
  getAttribute: (name: string) => any;
  removeAttribute: (name: string) => void;
  emit: (name: string, detail?: any, bubbles?: boolean) => void;
  addEventListener: (name: string, callback: Function, options?: boolean | AddEventListenerOptions) => void;
  removeEventListener: (name: string, callback: Function, options?: boolean | EventListenerOptions) => void;
  getObject3D: (type: string) => THREE.Object3D | undefined;
  removeObject3D: (type: string) => void;
  hasAttribute: (name: string) => boolean;
  appendChild: (child: Element) => void;
  parentNode: Element | null;
  id: string;
}

interface AFrameComponentDefinition {
  schema?: Record<string, any>;
  init?: Function;
  update?: Function;
  tick?: (time: number, delta: number) => void;
  play?: Function;
  pause?: Function;
  remove?: Function;
  [key: string]: any;
}

interface AFrameSystem {
  registerComponent: (name: string, definition: AFrameComponentDefinition) => void;
  registerSystem: (name: string, definition: any) => void;
  registerShader: (name: string, definition: any) => void;
  components: Record<string, any>;
}

// Registry for hitbox components
interface HitboxComponent {
  isEnemy: boolean;
  hitboxMesh: Element;
}

// Extend Window interface to include global variables
interface Window {
  AFRAME: AFrameSystem;
  THREE: typeof import('three');
  YUKA: any;
  AFRAME_INITIALIZED?: boolean;
  HITBOX_REGISTRY?: HitboxComponent[];
}

declare global {
  const AFRAME: AFrameSystem;
  const THREE: typeof import('three');
  const YUKA: any;
}

export {};
