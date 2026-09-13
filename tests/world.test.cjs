const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file,requireModule=require,globals={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:requireModule,...globals});
  return exports;
}
const definition=()=>({bounds:{minX:-25,maxX:25,minY:1.8,maxY:26,minZ:-47,maxZ:24},boxes:[{id:'wall',center:{x:0,y:4,z:0},size:{x:8,y:8,z:1}}]});
test('authored collision is shared by sweeps, ray occlusion and spawn checks; reset restores arena',()=>{
  const world=load('src/arena-world.ts');
  const original=JSON.stringify(world.SOLIDS);
  const input=definition(); world.setWorld(input);
  input.boxes[0].center.z=100;
  assert.equal(world.traceWorld({x:0,y:3,z:5},{x:0,y:0,z:-10}).t,0.45);
  const pos={x:0,y:3,z:5};world.moveInWorld(pos,{x:0,y:0,z:-100});
  assert.ok(pos.z>=1.2); assert.equal(world.clearSpawn(0,0),false);
  const edge={x:100,y:100,z:-100};world.moveInWorld(edge,{x:0,y:0,z:0});
  assert.equal(edge.x,25); assert.equal(edge.y,26); assert.equal(edge.z,-47);
  world.resetWorld(); assert.equal(JSON.stringify(world.SOLIDS),original);
});
test('invalid bounds, IDs and dimensions cannot partially replace active collision',()=>{
  const world=load('src/arena-world.ts');const original=JSON.stringify(world.SOLIDS);
  for(const mutate of [w=>w.bounds.minX=NaN,w=>w.bounds.maxY=0,w=>w.boxes[0].size.z=-1,w=>w.boxes.push(w.boxes[0]),w=>w.boxes[0].center.x=Infinity]) {
    const value=definition();mutate(value);assert.throws(()=>world.setWorld(value));
    assert.equal(JSON.stringify(world.SOLIDS),original);
  }
});
function harness(started=false) {
  let callback,resolveWorld;const events=[],disposed=[],committed=[];
  const definitions={};
  const aframe={components:definitions,registerComponent:(name,value)=>definitions[name]=value,THREE:{GLTFLoader:class {setDRACOLoader(){} load(_url,success){callback=success;}}}};
  const world=load('src/arena-world.ts');
  load('src/components/level-runtime.ts',id=>id==='./aframe-export'?{default:aframe}:id==='./hero-model'?{disposeHeroModel:model=>disposed.push(model)}:world,{AbortController,setTimeout,clearTimeout,fetch:()=>new Promise(resolve=>resolveWorld=resolve)});
  const listeners={};const manager={gameStarted:started};
  const instance=Object.assign({},definitions['level-runtime'],{data:{shell:'shell',world:'world'},el:{components:{'game-manager':manager},systems:{},emit:(type,detail)=>events.push({type,detail}),addEventListener:(type,handler)=>listeners[type]=handler,removeEventListener:()=>{},setObject3D:(_name,model)=>committed.push(model),removeObject3D:()=>{}}});
  instance.init();
  return {instance,world,manager,events,disposed,committed,listeners,model:model=>callback({scene:model}),json:value=>resolveWorld({ok:true,json:async()=>value})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('exported Ridge world permits both flight routes and matches authored gates',()=>{
  const world=load('src/arena-world.ts');
  world.setWorld(JSON.parse(fs.readFileSync('public/mission/ridge-run-world.json','utf8')));
  const mission=load('src/mission/ridge-run.ts');
  const markers=JSON.parse(fs.readFileSync('public/mission/ridge-run-markers.json','utf8')).markers;
  for(const gate of mission.RIDGE_GATES){
    const marker=markers.find(m=>m.id===gate.id+'_gate');
    assert.equal(JSON.stringify(marker.position),JSON.stringify(gate.position));
    assert.equal(marker.radius,gate.radius);
    const pos={x:0,y:3,z:12};
    for(const target of [{x:0,y:gate.position.y,z:12},{x:gate.position.x,y:gate.position.y,z:12},{x:gate.position.x,y:gate.position.y,z:-18},{x:-4,y:3,z:-23},mission.EXTRACTION]){
      world.moveInWorld(pos,{x:target.x-pos.x,y:target.y-pos.y,z:target.z-pos.z});
      for(const axis of ['x','y','z']) assert.ok(Math.abs(pos[axis]-target[axis])<0.01,gate.id+' blocked on '+axis);
    }
  }
});
test('shell and collision activate atomically only before play or on reset',async()=>{
  const h=harness(true);const model={};h.model(model);await flush();assert.equal(h.committed.length,0);
  h.json(definition());await flush();assert.equal(h.instance.status,'staged');assert.equal(h.committed.length,0);
  h.manager.gameStarted=false;h.listeners['mission-reset']();
  assert.equal(h.instance.status,'ready');assert.equal(h.committed[0],model);assert.equal(h.world.SOLIDS.length,1);
  h.instance.remove();assert.equal(h.disposed.length,1);assert.equal(h.world.SOLIDS.length,7);
});
test('invalid collision disposes matching shell and retains playable fallback',async()=>{
  const h=harness();const model={};h.model(model);h.json({});await flush();
  assert.equal(h.instance.status,'fallback');assert.equal(h.committed.length,0);assert.equal(h.disposed[0],model);assert.equal(h.world.SOLIDS.length,7);
  h.instance.remove();
});
test('model completing after component removal is disposed without activation',async()=>{
  const h=harness();h.instance.remove();const model={};h.model(model);h.json(definition());await flush();
  assert.equal(h.disposed[0],model);assert.equal(h.committed.length,0);assert.equal(h.events.length,0);
});
