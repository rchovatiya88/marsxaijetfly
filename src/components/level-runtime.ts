import AFRAME from './aframe-export';
import { resetWorld, setWorld, validateWorld } from '../arena-world';
import { disposeHeroModel } from './hero-model';

// Owns one optional authored shell and its matching box world. No live physics swaps.
if (!AFRAME.components['level-runtime']) AFRAME.registerComponent('level-runtime', {
  schema: {
    shell: {type:'string',default:'models/ridge-run-shell.glb'},
    world: {type:'string',default:'mission/ridge-run-world.json'}
  },
  init: function(this: any) {
    this.status = 'loading'; this.removed = false; this.pending = null; this.model = null;
    this.generation = 1;
    this.abort = new AbortController();
    this.onReset = () => { if (this.pending) this.activate(); };
    this.el.addEventListener('mission-reset',this.onReset);
    this.load();
  },
  announce: function(this: any, error?: string) {
    this.el.emit('level-ready',{status:this.status,authored:this.status==='ready',error});
  },
  activate: function(this: any) {
    if (!this.pending || this.removed || this.el.components['game-manager']?.gameStarted) return;
    const {model,world} = this.pending;
    setWorld(world);
    this.el.setObject3D('authored-level',model);
    this.model = model; this.pending = null; this.status = 'ready';
    this.announce();
  },
  load: async function(this: any) {
    const generation = this.generation;
    let candidate: any = null;
    let expired = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const live = () => !this.removed && !expired && generation===this.generation;
    try {
      const loader = new AFRAME.THREE.GLTFLoader();
      const draco = this.el.systems?.['gltf-model']?.getDRACOLoader();
      if (draco) loader.setDRACOLoader(draco);
      const modelPromise = new Promise<any>((resolve,reject) => {
        loader.load(this.data.shell,(gltf:any) => {
          const model = gltf.scene || gltf.scenes?.[0];
          if (!model) { reject(new Error('Empty authored shell')); return; }
          if (!live()) { disposeHeroModel(model); reject(new Error('Stale authored shell')); return; }
          candidate = model; resolve(model);
        },undefined,reject);
      });
      const worldPromise = fetch(this.data.world,{signal:this.abort.signal}).then(response => {
        if (!response.ok) throw new Error(`Collision world HTTP ${response.status}`);
        return response.json();
      }).then(validateWorld);
      const deadline = new Promise<never>((_,reject) => {
        timeout = setTimeout(() => reject(new Error('Authored level timed out')),15000);
      });
      const [model,world] = await Promise.race([Promise.all([modelPromise,worldPromise]),deadline]);
      if (!live()) { if (candidate) disposeHeroModel(candidate); candidate=null; return; }
      this.pending = {model,world}; candidate = null;
      if (this.el.components['game-manager']?.gameStarted) {
        this.status = 'staged'; this.announce();
      } else this.activate();
    } catch (error) {
      expired = true;
      this.abort.abort();
      if (candidate) { disposeHeroModel(candidate); candidate=null; }
      if (!this.removed) { this.status = 'fallback'; this.announce(String(error)); }
    } finally { if (timeout) clearTimeout(timeout); }
  },
  remove: function(this: any) {
    this.removed = true; this.generation++;
    this.abort.abort();
    this.el.removeEventListener('mission-reset',this.onReset);
    if (this.pending) disposeHeroModel(this.pending.model);
    if (this.model) { this.el.removeObject3D('authored-level'); disposeHeroModel(this.model); resetWorld(); }
    this.pending = null; this.model = null;
  }
});
