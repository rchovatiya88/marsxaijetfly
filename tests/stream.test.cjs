const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),THREE=require('three');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function manifest(){return {version:1,bounds:{min:{x:-100,y:0,z:-100},max:{x:100,y:20,z:100}},spawn:{x:-60,y:10,z:-60},chunks:[[-60,-60],[60,-60],[-60,60],[60,60]].map(([x,z],i)=>({id:`q${i}`,center:{x,y:10,z},radius:30,bounds:{min:{x:x-20,y:0,z:z-20},max:{x:x+20,y:20,z:z+20}},lods:[0,1].map(level=>({level,url:`models/level1-stream/q${i}-${level}.glb`,triangles:100,bytes:4}))}))};}
function harness(input=manifest()){
  const exports={},definitions={},requests=[],events=[],disposed=[];
  let world=null,resets=0,terrain=null;
  const collisionExports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/triangle-collider.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:collisionExports,Float32Array,Uint32Array,Int32Array,Map,Set,Math});
  const aframe={components:definitions,registerComponent:(name,value)=>definitions[name]=value,THREE:{GLTFLoader:class{setDRACOLoader(){}parse(buffer,path,done){done({scene:new THREE.Group()});}}}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/world-stream.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
    exports,require:id=>id==='./aframe-export'?{default:aframe}:id==='./hero-model'?{disposeHeroModel:model=>disposed.push(model)}:id==='../mission/bridgehead-run'?{BRIDGEHEAD_START:{x:-19,y:-.8,z:10.7}}:id==='../triangle-collider'?collisionExports:id==='../arena-world'?{setWorld:value=>world=value,setTerrainSurface:value=>terrain=value,resetWorld:()=>resets++}:require(id),AbortController,setTimeout,clearTimeout,performance,fetch:async(url,options)=>{
      if(url.endsWith('.json'))return {ok:true,json:async()=>input};
      return new Promise((resolve,reject)=>{const item={url,resolve:()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}),fail:()=>resolve({ok:false,status:404}),signal:options.signal};requests.push(item);options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});
    }
  });
  const instance=Object.assign({},definitions['world-stream'],{data:{manifest:'models/level1-stream/manifest.json'}});
  const player={object3D:new THREE.Object3D(),components:{'player-component':{data:{minFlyingHeight:1.8,maxFlyingHeight:50}},'fly-controls':{clearInput(){},rotation:new THREE.Euler(),applyLookRotation(){},updateCamera(){}}}};
  instance.el={isPlaying:true,systems:{},setObject3D(){},removeObject3D(){},emit:(type,detail)=>events.push({type,detail}),querySelector:()=>player};
  return {instance,exports,requests,events,disposed,player,aframe,get world(){return world;},get resets(){return resets;},get terrain(){return terrain;}};
}
async function boot(h){h.instance.init();await flush();assert.equal(h.requests.length,2);h.requests[0].resolve();h.requests[1].resolve();await flush();assert.equal(h.requests.length,4);h.requests[2].resolve();h.requests[3].resolve();await flush();}

test('stream manifest rejects unsafe URLs, duplicate IDs, bad bounds and oversized budgets',()=>{
  const {exports:e}=harness();assert.equal(e.validateStreamManifest(manifest()).chunks.length,4);
  for(const mutate of [m=>m.chunks[0].lods[0].url='https://host/a.glb',m=>m.chunks[0].lods[0].url='models/level1-stream/../x.glb',m=>m.chunks[0].lods[0].url='models/level1-stream/%2e%2e.glb',m=>m.chunks[1].id='q0',m=>m.bounds.min.x=Infinity,m=>m.chunks[0].lods[0].bytes=40000000]){const m=manifest();mutate(m);assert.throws(()=>e.validateStreamManifest(m));}
});
test('exported streaming manifest matches local files and coarse rendering budget',()=>{
  const {exports:e}=harness();
  const value=e.validateStreamManifest(JSON.parse(fs.readFileSync('public/models/level1-stream/manifest.json','utf8')));
  let low=0;for(const c of value.chunks)for(const lod of c.lods){assert.equal(fs.statSync(`public/${lod.url}`).size,lod.bytes);if(lod.level===1)low+=lod.triangles;}
  assert.ok(low<=350000);
  for(const c of value.chunks){const selected=e.selectDetailedChunks(value.chunks,c.center,new Set());const triangles=value.chunks.reduce((n,chunk)=>n+chunk.lods[selected.has(chunk.id)?0:1].triangles,0);assert.ok(triangles<=350000);}
});
test('detail selection uses 12m entry, 20m exit hysteresis and maximum two chunks',()=>{
  const {exports:e}=harness(),chunks=manifest().chunks;
  assert.equal(e.selectDetailedChunks(chunks,{x:-27,y:10,z:-60},new Set()).size,0);
  assert.ok(e.selectDetailedChunks(chunks,{x:-27,y:10,z:-60},new Set(['q0'])).has('q0'));
  assert.equal(e.selectDetailedChunks(chunks,{x:-19,y:10,z:-60},new Set(['q0'])).size,0);
  const overlap=chunks.map(c=>({...c,bounds:chunks[0].bounds}));assert.equal(e.selectDetailedChunks(overlap,{x:-60,y:10,z:-60},new Set()).size,2);
  overlap.forEach(c=>{c.lods[0].triangles=200000;c.lods[1].triangles=40000;});
  assert.equal(e.selectDetailedChunks(overlap,{x:-60,y:10,z:-60},new Set()).size,1);
});
test('stream boot loads only four lows max two concurrently; detail replaces low and evicts',async()=>{
  const h=harness();try{await boot(h);const s=h.instance;assert.equal(s.status,'ready');assert.ok(h.requests.every(r=>r.url.endsWith('-1.glb')));assert.equal(h.events.filter(e=>e.detail.authored).length,1);
    assert.equal(s.start(),true);assert.equal(h.world.boxes.length,0);assert.equal(h.world.bounds.minX,-120);assert.equal(h.requests.length,5);assert.ok(s.states.get('q0').low.visible);
    h.requests[4].resolve();await flush();assert.equal(s.states.get('q0').low.visible,false);assert.ok(s.states.get('q0').high);
    s.updateSelection({x:60,y:10,z:60});assert.equal(s.states.get('q0').high,null);assert.equal(s.states.get('q0').low.visible,true);assert.equal(h.disposed.length,1);assert.ok(s.active.size<=2);
  }finally{h.instance.remove();await flush();}assert.equal(h.resets,1);
});
test('coarse failure is atomic fallback and removal aborts outstanding work',async()=>{
  const h=harness();h.instance.init();await flush();h.requests[0].resolve();await flush();h.requests[1].fail();await flush();
  assert.equal(h.instance.status,'fallback');assert.equal(h.events.at(-1).detail.authored,false);assert.equal(h.disposed.length,1);assert.ok(h.requests[2].signal.aborted);assert.equal(h.instance.start(),false);h.instance.remove();
});
test('detail failure retains low and backs off; requests and residents stay capped',async()=>{
  const h=harness();try{await boot(h);const s=h.instance;s.start();h.requests[4].fail();await flush();assert.ok(s.states.get('q0').low.visible);const count=h.requests.length;
    for(let i=0;i<20;i++)s.updateSelection(manifest().spawn);assert.equal(h.requests.length,count);
    s.now=5001;s.updateSelection(manifest().spawn);assert.equal(h.requests.length,count+1);
    s.updateSelection({x:60,y:10,z:60});await flush();s.updateSelection({x:60,y:10,z:60});assert.ok(s.active.size<=2);assert.ok([...s.active.values()].filter(j=>j.level===0).length+[...s.states.values()].filter(state=>state.high).length<=2);
  }finally{h.instance.remove();await flush();}
});
test('late parsed model after removal is disposed and cannot attach',async()=>{
  const h=harness();const pending=[];
  await boot(h);h.aframe.THREE.GLTFLoader=class{parse(buffer,path,done){pending.push(done);}};
  h.instance.start();const job=h.requests[4];job.resolve();await flush();assert.equal(pending.length,1);
  h.instance.remove();const model=new THREE.Group();pending[0]({scene:model});await flush();assert.ok(h.disposed.includes(model));assert.equal(h.instance.root.children.length,0);assert.ok(job.signal.aborted);
});
test('playable terrain is built from resident geometry once and survives detail eviction',async()=>{
  const h=harness();h.instance.data.playable=true;
  h.aframe.THREE.GLTFLoader=class{parse(_buffer,_path,done){const root=new THREE.Group();const mesh=new THREE.Mesh(new THREE.PlaneGeometry(200,200));mesh.rotation.x=-Math.PI/2;root.add(mesh);done({scene:root});}};
  try{
    await boot(h);const s=h.instance;assert.equal(s.status,'ready');assert.equal(s.stats().collisionTriangles,8);
    s.start();const collider=h.terrain;assert.ok(collider);assert.ok(collider.query({x:0,y:10,z:0},{x:0,y:-20,z:0},.7));
    const collision=s.collision;s.updateSelection({x:60,y:10,z:60});assert.equal(s.collision,collision);assert.equal(h.terrain,collision);
  }finally{h.instance.remove();await flush();}
  assert.equal(h.instance.collision,null);
});

test('playable world scale transforms collision and bounds while detail selection stays in source coordinates',async()=>{
  const h=harness();h.instance.data.playable=true;h.instance.data.scale=3;
  h.aframe.THREE.GLTFLoader=class{parse(_buffer,_path,done){const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(200,200));mesh.rotation.x=-Math.PI/2;mesh.position.y=2;root.add(mesh);done({scene:root});}};
  try {
    await boot(h);const s=h.instance;s.start();
    const hit=h.terrain.query({x:0,y:10,z:0},{x:0,y:-10,z:0},.7);
    assert.ok(Math.abs(hit.t-.33)<1e-6,'scaled deck atY6 stops sphere center atY6.7');
    assert.equal(h.world.bounds.minX,-320);assert.equal(s.root.scale.x,3);
    s.updateSelection({x:-180,y:30,z:-180});assert.ok(s.desired.has('q0'));
    s.updateSelection({x:180,y:30,z:180});assert.ok(s.desired.has('q3'));assert.ok(!s.desired.has('q0'));
  }finally{h.instance.remove();await flush();}
});
