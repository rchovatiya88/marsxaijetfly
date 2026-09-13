import AFRAME from './aframe-export';
import * as THREE from 'three';
import { BRIDGEHEAD_WORLD } from '../mission/bridgehead-run';
import { disposeHeroModel } from './hero-model';

// Identity-transform art: the Blender export is authored in mission metres.
// Collision never depends on the timing or success of this optional GLB.
if (!AFRAME.components['bridgehead-art']) AFRAME.registerComponent('bridgehead-art', {
  schema: { src: {type:'string', default:'models/bridgehead-route.glb'} },
  init: function(this:any) {
    this.removed=false; this.status='loading'; this.root=new THREE.Group();
    this.fallback=new THREE.Group(); this.root.add(this.fallback);
    const material=new THREE.MeshStandardMaterial({color:'#786453',roughness:.9,metalness:.15});
    BRIDGEHEAD_WORLD.boxes.forEach(box=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(box.size.x,box.size.y,box.size.z),material);
      mesh.position.set(box.center.x,box.center.y,box.center.z);this.fallback.add(mesh);
    });
    this.el.setObject3D('bridgehead-art',this.root);
    this.abort=new AbortController(); this.load();
  },
  load: async function(this:any) {
    const timeout=setTimeout(()=>this.abort.abort(),15000);
    try {
      const response=await fetch(this.data.src,{signal:this.abort.signal,redirect:'error'});
      if(!response.ok)throw Error(`Route art HTTP ${response.status}`);
      const bytes=await response.arrayBuffer();
      if(this.removed || this.abort.signal.aborted)return;
      if(bytes.byteLength>2000000)throw Error('Route art exceeds 2 MB');
      const loader=new AFRAME.THREE.GLTFLoader();
      const gltf:any=await new Promise((resolve,reject)=>{
        const aborted=()=>reject(Error('Route art timed out'));
        this.abort.signal.addEventListener('abort',aborted,{once:true});
        loader.parse(bytes,'models/',(value:any)=>{
          this.abort.signal.removeEventListener('abort',aborted);
          if(this.removed || this.abort.signal.aborted){if(value.scene)disposeHeroModel(value.scene);reject(Error('Late route art'));return;}
          resolve(value);
        },(error:any)=>{this.abort.signal.removeEventListener('abort',aborted);reject(error);});
      });
      const model=gltf.scene;
      if(!model)throw Error('Route art is empty');
      if(this.removed || this.abort.signal.aborted){disposeHeroModel(model);return;}
      model.traverse((object:any)=>{object.castShadow=false;object.receiveShadow=false;});
      this.root.add(model);this.fallback.visible=false;this.status='ready';
      this.el.emit('route-art-ready',{authored:true});
    }catch(error){
      if(!this.removed){this.status='fallback';this.el.emit('route-art-ready',{authored:false,error:String(error)});}
    }finally{clearTimeout(timeout);}
  },
  remove: function(this:any) {
    this.removed=true;this.abort.abort();this.el.removeObject3D('bridgehead-art');disposeHeroModel(this.root);
  }
});
