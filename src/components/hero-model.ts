import * as THREE from 'three';
import AFRAME from './aframe-export';

export function disposeHeroModel(model: any): void {
  const resources = new Set<any>();
  model.traverse((object: any) => {
    if (object.geometry) resources.add(object.geometry);
    if (object.skeleton) resources.add(object.skeleton);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      resources.add(material);
      Object.values(material).forEach((value: any) => { if (value?.isTexture) resources.add(value); });
    }
  });
  resources.forEach(resource => resource.dispose?.());
}

/**
 * Loads an authored GLB as a quality layer over a gameplay-safe fallback.
 * The model is normalized by its measured bounds, so exported scale errors
 * cannot change the combat hitbox or make an asset invisible at runtime.
 */
export default function initializeHeroModel(): void {
  if (AFRAME.components['hero-model']) return;
  AFRAME.registerComponent('hero-model', {
    schema: {
      src: { type: 'string', default: '' },
      targetHeight: { type: 'number', default: 2.2 },
      heading: { type: 'number', default: 0 },
      animation: { type: 'string', default: 'Baka_Idle' }
    },
    init: function(this: any): void {
      this.mixer = null;
      this.action = null;
      this.model = null;
      this.failed = false;
      this.removed = false;
      this.onLoaded = (event: any) => {
        const model = event?.detail?.model || this.modelEl?.getObject3D('mesh');
        if (!model) return;
        this.model = model;
        model.rotation.y += (this.data.heading || 0) * Math.PI / 180;
        model.traverse((object: any) => {
          if (!object.isMesh) return;
          object.castShadow = false;
          object.receiveShadow = false;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material: any) => {
            if (!material) return;
            material.roughness = Math.max(0.34, material.roughness ?? 0.72);
            material.metalness = Math.min(0.72, material.metalness ?? 0.12);
            material.needsUpdate = true;
          });
        });
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        if (size.y > 0.001) {
          const scale = this.data.targetHeight / size.y;
          model.scale.multiplyScalar(scale);
          const normalized = new THREE.Box3().setFromObject(model);
          const center = normalized.getCenter(new THREE.Vector3());
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= normalized.min.y;
        }
        this.el.object3D.traverse((object: any) => {
          if (object !== model && object.userData?.heroFallback) object.visible = false;
        });
        const clips = event?.detail?.model?.animations || event?.detail?.gltf?.animations || [];
        if (clips.length) {
          this.mixer = new THREE.AnimationMixer(model);
          const clip = THREE.AnimationClip.findByName(clips, this.data.animation);
          if (clip) { this.action = this.mixer.clipAction(clip); this.action.reset().play(); }
        }
        this.el.emit('hero-model-ready', { model, animated: Boolean(this.action) });
      };
      this.onError = () => {
        // Hero art is optional; never let a cosmetic model failure pause the mission.
        if (this.removed) return;
        this.failed = true;
        this.el.emit('hero-model-fallback', { src: this.data.src });
      };
      if (!this.data.src) return;
      this.modelEl = document.createElement('a-entity');
      this.modelEl.classList.add('hero-model-asset');
      this.el.appendChild(this.modelEl);
      // Use A-Frame's installed loader/runtime and shared decoder, while owning
      // disposal and late completions (A-Frame 1.4 gltf-model does neither).
      const loader = new AFRAME.THREE.GLTFLoader();
      const draco = this.el.sceneEl.systems['gltf-model'].getDRACOLoader();
      if (draco) loader.setDRACOLoader(draco);
      const src = this.data.src.replace(/^url\((.*)\)$/, '$1');
      loader.load(src, (gltf: any) => {
        const model = gltf.scene || gltf.scenes[0];
        if (this.removed) { disposeHeroModel(model); return; }
        model.animations = gltf.animations;
        // Normalize while detached: world-space enemy position must not be
        // subtracted from the model's local center (which moves art off its hitbox).
        this.onLoaded({detail:{model}});
        this.modelEl.setObject3D('mesh', model);
      }, undefined, this.onError);
    },
    tick: function(this: any, _time: number, delta: number): void {
      if (this.mixer && this.el.sceneEl?.isPlaying) this.mixer.update(Math.min(delta, 50) / 1000);
    },
    remove: function(this: any): void {
      this.removed = true;
      this.mixer?.stopAllAction();
      if (this.model) this.mixer?.uncacheRoot(this.model);
      if (this.model) disposeHeroModel(this.model);
      if (this.modelEl) {
        this.modelEl.removeEventListener('model-loaded', this.onLoaded);
        this.modelEl.removeEventListener('model-error', this.onError);
        this.modelEl.remove();
      }
      this.mixer = null;
      this.model = null;
    }
  });
}

initializeHeroModel();
