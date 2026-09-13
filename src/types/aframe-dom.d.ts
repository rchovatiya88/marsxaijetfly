import type * as THREE from 'three';

// A-Frame extends its custom elements, not the entire DOM.
declare global {
  interface AFrameElement extends HTMLElement {
    object3D: THREE.Object3D;
    components: Record<string, any>;
    sceneEl: AFrameElement;
    isPlaying: boolean;
    setAttribute(name: string, value: any, componentValue?: any): void;
    getAttribute(name: string): any;
    setObject3D(name: string, object: THREE.Object3D): void;
    getObject3D(name: string): THREE.Object3D;
    removeObject3D(name: string): void;
    emit(name: string, detail?: any): void;
  }
  interface HTMLElementTagNameMap {
    'a-scene': AFrameElement;
    'a-entity': AFrameElement;
    'a-camera': AFrameElement;
    'a-light': AFrameElement;
    'a-sky': AFrameElement;
    'a-box': AFrameElement;
    'a-sphere': AFrameElement;
    'a-ring': AFrameElement;
    'a-cylinder': AFrameElement;
    'a-text': AFrameElement;
    'a-plane': AFrameElement;
    'a-circle': AFrameElement;
  }
  interface Document {
    querySelector(selector: '#player' | '#camera' | '#jetbike' | '#camera-rig' | '[game-manager]' | 'a-scene'): AFrameElement | null;
  }
}
