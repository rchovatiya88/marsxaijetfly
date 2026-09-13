#!/usr/bin/env node
'use strict';
// Read-only geometry/animation diagnostic with A-Frame's installed Three r147.
// Textures are omitted; geometry, skinning, clips and runtime normalization are real.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),THREE=require('super-three');
function load(file,globals={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
    {exports,console,TextDecoder,ArrayBuffer,Uint8Array,Float32Array,Uint16Array,Uint32Array,require:name=>name==='three'?THREE:require(name),...globals});
  return exports;
}
const boundsRecord=box=>({min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray(),center:box.getCenter(new THREE.Vector3()).toArray()});
async function main() {
  const draco=await require(path.resolve('public/vendor/draco/draco_wasm_wrapper.js'))({wasmBinary:fs.readFileSync('public/vendor/draco/draco_decoder.wasm')});
  const {GLTFLoader}=load('node_modules/super-three/examples/jsm/loaders/GLTFLoader.js');
  const loader=new GLTFLoader();
  loader.register(()=>({name:'geometry-only-audit',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  loader.setDRACOLoader({preload(){},decodeDracoFile(buffer,onLoad,attributes,types) {
    const decoder=new draco.Decoder(),input=new draco.DecoderBuffer(),mesh=new draco.Mesh(),face=new draco.DracoInt32Array();
    try {
      input.Init(new Int8Array(buffer),buffer.byteLength);const status=decoder.DecodeBufferToMesh(input,mesh);
      if(!status.ok())throw Error(status.error_msg());
      const geometry=new THREE.BufferGeometry(),indices=new Uint32Array(mesh.num_faces()*3);
      for(let i=0;i<mesh.num_faces();i++){decoder.GetFaceFromMesh(mesh,i,face);for(let j=0;j<3;j++)indices[i*3+j]=face.GetValue(j);}
      geometry.setIndex(new THREE.BufferAttribute(indices,1));
      for(const [name,id] of Object.entries(attributes)) {
        const attribute=decoder.GetAttributeByUniqueId(mesh,id),data=new draco.DracoFloat32Array();
        try {
          if(!decoder.GetAttributeFloatForAllPoints(mesh,attribute,data))throw Error(`Cannot decode ${name}`);
          const Typed=globalThis[types[name]],array=new Typed(data.size());
          for(let i=0;i<data.size();i++)array[i]=data.GetValue(i);
          geometry.setAttribute(name,new THREE.BufferAttribute(array,attribute.num_components()));
        }finally{draco.destroy(data);}
      }
      onLoad(geometry);
    } finally {[face,mesh,input,decoder].forEach(value=>draco.destroy(value));}
  }});
  const source='public/models/enemy.glb',bytes=fs.readFileSync(source);
  const gltf=await new Promise((resolve,reject)=>loader.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject));
  const definitions={},aframe={components:definitions,registerComponent(name,value){definitions[name]=value;}};
  const {heroPoseBounds}=load('src/components/hero-model.ts',{require:name=>name==='three'?THREE:name==='./aframe-export'?{default:aframe}:require(name)});
  const model=gltf.scene;model.animations=gltf.animations;
  const rawBind=boundsRecord(new THREE.Box3().setFromObject(model));
  const hero=Object.assign({},definitions['hero-model'],{data:{src:'',targetHeight:2.15,targetLength:0,heading:0,animation:'Baka_Idle'},el:{object3D:new THREE.Object3D(),sceneEl:{isPlaying:true},emit(){}}});
  hero.init();hero.onLoaded({detail:{model}});
  const idleAtLoad=boundsRecord(heroPoseBounds(model)),samples=[],bones=[];
  model.traverse(object=>{if(object.isBone && /Hips$|Spine2$|Head$/.test(object.name))bones.push(object);});
  for(const clip of gltf.animations) {
    hero.playAnimation(clip.name,{fade:0});hero.action.setLoop(THREE.LoopOnce,0);hero.action.clampWhenFinished=true;
    const poses=[],union=new THREE.Box3();
    const count=Math.max(2,Math.ceil(clip.duration*30));
    for(let frame=0;frame<=count;frame++) {
      const seconds=clip.duration*frame/count;
      hero.action.time=seconds;hero.mixer.update(0);
      const box=heroPoseBounds(model);union.union(box);poses.push({seconds,...boundsRecord(box),bones:Object.fromEntries(bones.map(bone=>[bone.name,bone.getWorldPosition(new THREE.Vector3()).toArray()]))});
    }
    const minima=axis=>Math.min(...poses.map(pose=>pose.center[axis])),maxima=axis=>Math.max(...poses.map(pose=>pose.center[axis]));
    samples.push({clip:clip.name,duration:clip.duration,frames:poses.length,union:boundsRecord(union),
      centerMovement:[0,1,2].map(axis=>maxima(axis)-minima(axis)),first:poses[0],last:poses[poses.length-1],
      attackWindows:[.85,1.4].map(seconds=>({seconds,bones:Object.fromEntries(bones.map(bone=>{
        const points=poses.filter(pose=>pose.seconds<=seconds).map(pose=>pose.bones[bone.name]);
        return [bone.name,{min:[0,1,2].map(axis=>Math.min(...points.map(point=>point[axis]))),max:[0,1,2].map(axis=>Math.max(...points.map(point=>point[axis]))),
          maxDistanceFromAimCenter:Math.max(...points.map(point=>Math.hypot(point[0],point[1]-1.1,point[2])))}];
      }))})),
      first900msUnion:boundsRecord(poses.filter(pose=>pose.seconds<=.9).reduce((box,pose)=>box.union(new THREE.Box3(new THREE.Vector3().fromArray(pose.min),new THREE.Vector3().fromArray(pose.max))),new THREE.Box3()))});
  }
  hero.playAnimation('Baka_Idle');hero.mixer.update(0);
  hero.playAnimation('Baka_Dying',{fade:.06,duration:.8,once:true});
  const deathPlayback=[];
  for(let frame=0;frame<=18;frame++) {
    if(frame)hero.tick(frame*50,50);
    deathPlayback.push({seconds:frame*.05,clipTime:hero.action.time,...boundsRecord(heroPoseBounds(model))});
  }
  const bikeSource='public/models/avi-jetbike.glb',bikeBytes=fs.readFileSync(bikeSource);
  const bikeGltf=await new Promise((resolve,reject)=>loader.parse(bikeBytes.buffer.slice(bikeBytes.byteOffset,bikeBytes.byteOffset+bikeBytes.byteLength),'',resolve,reject));
  const bike=bikeGltf.scene;bike.animations=bikeGltf.animations;
  const bikeHero=Object.assign({},definitions['hero-model'],{data:{src:'',targetHeight:1.8,targetLength:0,heading:180,animation:'none'},el:{object3D:new THREE.Object3D(),sceneEl:{isPlaying:true},emit(){}}});
  bikeHero.init();bikeHero.onLoaded({detail:{model:bike}});
  const bikeBox=boundsRecord(new THREE.Box3().setFromObject(bike)),bikeVertices=boundsRecord(heroPoseBounds(bike));
  const {BIKE_BODY_ENVELOPE}=load('src/arena-world.ts');
  const staticBike={source:bikeSource,sha256:createHash('sha256').update(bikeBytes).digest('hex'),normalization:'unskinned geometry Box3; targetHeight1.8 heading180; base-origin0',
    geometryBox:bikeBox,actualVertexBounds:bikeVertices,collisionEnvelope:BIKE_BODY_ENVELOPE,skinnedMeshes:0,vertices:0,outsideEnvelope:0};
  const point=new THREE.Vector3();
  bike.traverse(mesh=>{
    if(mesh.isSkinnedMesh)staticBike.skinnedMeshes++;
    const positions=mesh.geometry?.attributes?.position;if(!mesh.isMesh||!positions)return;
    mesh.skeleton?.update();
    for(let i=0;i<positions.count;i++) {
      point.fromBufferAttribute(positions,i);if(mesh.isSkinnedMesh)mesh.boneTransform(i,point);point.applyMatrix4(mesh.matrixWorld);
      staticBike.vertices++;
      if(['x','y','z'].some(axis=>point[axis]<BIKE_BODY_ENVELOPE.min[axis]-1e-7||point[axis]>BIKE_BODY_ENVELOPE.max[axis]+1e-7))staticBike.outsideEnvelope++;
    }
  });
  assert.equal(staticBike.skinnedMeshes,0,'Bike normalization contract assumes a static assembly');
  assert.ok(Math.abs(bikeBox.size[2]-4.705897)<.003,`Bike length changed: ${bikeBox.size[2]}`);
  assert.ok(Math.abs(bikeBox.size[0]-.988)<.02,`Bike width changed: ${bikeBox.size[0]}`);
  assert.ok(Math.abs(bikeBox.size[1]-1.8)<1e-5,`Bike declared height changed: ${bikeBox.size[1]}`);
  assert.equal(staticBike.outsideEnvelope,0,'Actual displayed bike vertices exceed the full-body collision envelope');
  staticBike.checksPassed=true;
  const report={kind:'offline-skinned-pose-geometry-audit',runtime:process.version,threeRevision:THREE.REVISION,source,sha256:createHash('sha256').update(bytes).digest('hex'),
    normalizedBy:'actual src/components/hero-model.ts onLoaded while detached; initial Baka_Idle frame0; targetHeight2.15',rawBind,idleAtLoad,clips:samples,
    combat:{directBox:{min:[-.7,0,-.7],max:[.7,2,.7]},aimAssistCenter:[0,1.1,0],weaponOrigin:[0,1.2,0],healthBarY:2.3,deathVisibleSeconds:.9},
    deathPlayback:{duration:.8,once:true,fade:.06,samples:deathPlayback},
    staticBike,
    limitations:'No rendered silhouette/texture quality or human aiming measurement. Pose samples30Hz. Geometry-only custom Draco adapter preserves all decoded attribute types; uses installed super-three147 GLTFLoader and skinning.'};
  const output=process.argv[2];if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
