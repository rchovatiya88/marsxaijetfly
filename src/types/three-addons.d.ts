declare module 'three/addons/loaders/ColladaLoader.js' {
  import { Object3D } from 'three';
  
  export class ColladaLoader {
    constructor();
    load(url: string, onLoad: (collada: { scene: Object3D }) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
    parse(text: string, path: string): { scene: Object3D };
  }
}

declare module 'three/addons/loaders/FBXLoader.js' {
  import { Group, LoadingManager } from 'three';
  
  export class FBXLoader {
    constructor(manager?: LoadingManager);
    load(url: string, onLoad: (object: Group) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
    parse(FBXBuffer: ArrayBuffer | string): Group;
  }
}

declare module 'three/examples/jsm/loaders/ColladaLoader.js' {
  import { Object3D } from 'three';
  
  export class ColladaLoader {
    constructor();
    load(url: string, onLoad: (collada: { scene: Object3D }) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
    parse(text: string, path: string): { scene: Object3D };
  }
}

declare module 'three/examples/jsm/loaders/FBXLoader.js' {
  import { Group, LoadingManager } from 'three';
  
  export class FBXLoader {
    constructor(manager?: LoadingManager);
    load(url: string, onLoad: (object: Group) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
    parse(FBXBuffer: ArrayBuffer | string): Group;
  }
}
