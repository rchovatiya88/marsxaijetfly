const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),THREE=require('super-three');
function fixture() {
  const definitions={},exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/hero-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
    {exports,require:name=>name==='three'?THREE:{default:{components:definitions,registerComponent(name,value){definitions[name]=value;}}}});
  const model=new THREE.Object3D(),idle=new THREE.AnimationClip('idle',4,[new THREE.NumberKeyframeTrack('.position[y]',[0,4],[2.15,2.15])]);
  const dying=new THREE.AnimationClip('dying',4.633333,[new THREE.NumberKeyframeTrack('.position[y]',[0,4.633333],[2.15,.3])]);
  const hero=Object.assign({},definitions['hero-model'],{clips:[idle,dying],mixer:new THREE.AnimationMixer(model),el:{sceneEl:{isPlaying:true}}});
  return {hero,model,dying};
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);

test('r147 duration survives cross-fade and the one-shot holds its exact endpoint before disposal',()=>{
  const {hero,model,dying}=fixture();assert.equal(THREE.REVISION,'147');
  hero.playAnimation('idle');hero.tick(0,50);
  hero.playAnimation('dying',{fade:.06,duration:.8,once:true});
  for(let i=0;i<8;i++)hero.tick(i*50,50);
  assert.ok(model.position.y>.3 && model.position.y<2.15);
  const paused=model.position.y;hero.el.sceneEl.isPlaying=false;
  for(let i=0;i<20;i++)hero.tick(i*50,50);close(model.position.y,paused);
  hero.el.sceneEl.isPlaying=true;
  for(let i=0;i<9;i++)hero.tick(i*50,50);
  close(hero.action.time,dying.duration);close(model.position.y,.3);
  assert.equal(hero.action.loop,THREE.LoopOnce);assert.equal(hero.action.clampWhenFinished,true);
  const action=hero.action;hero.playAnimation('dying',{duration:.8,once:true});hero.tick(0,50);
  assert.equal(hero.action,action);close(model.position.y,.3);
});

test('reusing a cached clip clears prior one-shot duration and returns to ordinary looping',()=>{
  const {hero,model}=fixture();hero.playAnimation('dying',{duration:.8,once:true});
  for(let i=0;i<20;i++)hero.tick(i*50,50);
  hero.playAnimation('idle');hero.playAnimation('dying');
  assert.equal(hero.action.loop,THREE.LoopRepeat);assert.equal(hero.action.clampWhenFinished,false);
  close(hero.action.getEffectiveTimeScale(),1);hero.tick(0,50);assert.ok(model.position.y>2);
});

test('invalid authored durations retain normal finite playback',()=>{
  for(const duration of [0,-1,NaN,Infinity]) {
    const {hero}=fixture();hero.playAnimation('dying',{duration});
    close(hero.action.getEffectiveTimeScale(),1);hero.tick(0,50);close(hero.action.time,.05);
  }
});
