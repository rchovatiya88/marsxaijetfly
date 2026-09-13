import * as THREE from 'three';
import AFRAME from './aframe-export';

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
      animation: { type: 'string', default: 'Baka_Idle' }
    },
    init: function(this: any): void {
      this.mixer = null;
      this.action = null;
      this.model = null;
      this.failed = false;
      this.onLoaded = (event: any) => {
        const model = event?.detail?.model || this.modelEl?.getObject3D('mesh');
        if (!model) return;
        this.model = model;
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
          const clip = this.data.animation ? THREE.AnimationClip.findByName(clips, this.data.animation) || clips[0] : clips[0];
          this.action = this.mixer.clipAction(clip);
          this.action.reset().play();
        }
        this.el.emit('hero-model-ready', { model, animated: Boolean(this.action) });
      };
      this.onError = (event: Event) => {
        // Hero art is optional; never let a cosmetic model failure pause the mission.
        event.stopPropagation();
        this.failed = true;
        this.el.emit('hero-model-fallback', { src: this.data.src });
      };
      if (!this.data.src) return;
      this.modelEl = document.createElement('a-entity');
      this.modelEl.classList.add('hero-model-asset');
      this.modelEl.addEventListener('model-loaded', this.onLoaded);
      this.modelEl.addEventListener('model-error', this.onError);
      this.modelEl.setAttribute('gltf-model', this.data.src);
      this.el.appendChild(this.modelEl);
    },
    tick: function(this: any, _time: number, delta: number): void {
      if (this.mixer && this.el.sceneEl?.isPlaying) this.mixer.update(Math.min(delta, 50) / 1000);
    },
    remove: function(this: any): void {
      this.mixer?.stopAllAction();
      if (this.model) this.mixer?.uncacheRoot(this.model);
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
