import AFRAME from './aframe-export';
import * as THREE from 'three';
import { setWorld, resetWorld, Vec } from '../arena-world';
import { disposeHeroModel } from './hero-model';

type Bounds = {min:Vec;max:Vec};
type Lod = {level:number;url:string;triangles:number;bytes:number};
export type StreamChunk = {id:string;center:Vec;radius:number;bounds:Bounds;lods:Lod[]};
export type StreamManifest = {version:1;bounds:Bounds;spawn:Vec;chunks:StreamChunk[]};
const axes = ['x','y','z'] as const;
function vector(v:any) { return v && axes.every(a=>Number.isFinite(v[a]) && Math.abs(v[a])<9000); }
function box(b:any) { return b && vector(b.min) && vector(b.max) && axes.every(a=>b.min[a]<b.max[a]); }
export function localStreamUrl(url:unknown): url is string {
  return typeof url==='string' && /^models\/level1-stream\/[A-Za-z0-9_-]+\.(glb|json)$/.test(url);
}
export function validateStreamManifest(value:any): StreamManifest {
  if(value?.version!==1 || !box(value.bounds) || !vector(value.spawn) || !Array.isArray(value.chunks) || value.chunks.length!==4)throw Error('Invalid stream manifest');
  if(!axes.every(a=>value.spawn[a]>=value.bounds.min[a]-20 && value.spawn[a]<=value.bounds.max[a]+40))throw Error('Spawn outside survey');
  const ids=new Set(),urls=new Set();
  for(const c of value.chunks) {
    if(!c || typeof c.id!=='string' || !/^[A-Za-z0-9_-]{1,64}$/.test(c.id) || ids.has(c.id) || !vector(c.center) || !box(c.bounds) || !Number.isFinite(c.radius) || c.radius<=0 || c.radius>20000 || !Array.isArray(c.lods) || c.lods.length!==2)throw Error('Invalid stream chunk');
    ids.add(c.id);
    c.lods=c.lods.map((lod:any,index:number)=>({...lod,level:lod.level ?? index}));
    if(!axes.every(a=>c.bounds.min[a]>=value.bounds.min[a]-.01 && c.bounds.max[a]<=value.bounds.max[a]+.01))throw Error('Chunk outside world');
    for(const level of [0,1]) {
      const lod=c.lods.find((l:any)=>l.level===level);
      if(!lod || !localStreamUrl(lod.url) || !lod.url.endsWith('.glb') || urls.has(lod.url) || !Number.isInteger(lod.triangles) || lod.triangles<0 || lod.triangles>2000000 || !Number.isInteger(lod.bytes) || lod.bytes<1 || lod.bytes>32000000)throw Error('Invalid stream LOD budget or URL');
      urls.add(lod.url);
    }
  }
  if(value.chunks.reduce((n:number,c:StreamChunk)=>n+c.lods.find(l=>l.level===1)!.triangles,0)>350000)throw Error('Coarse triangle budget exceeded');
  return value;
}
export function distanceToChunk(p:Vec,b:Bounds):number {
  return Math.hypot(...axes.map(a=>Math.max(b.min[a]-p[a],0,p[a]-b.max[a])));
}
export function selectDetailedChunks(chunks:StreamChunk[],p:Vec,previous:Set<string>):Set<string> {
  const eligible=chunks.map(c=>({id:c.id,distance:distanceToChunk(p,c.bounds)})).filter(c=>c.distance<=(previous.has(c.id)?20:12));
  eligible.sort((a,b)=>a.distance-b.distance || a.id.localeCompare(b.id));
  let triangles=chunks.reduce((n,c)=>n+c.lods.find(l=>l.level===1)!.triangles,0);
  const selected=new Set<string>();
  for(const candidate of eligible){const c=chunks.find(c=>c.id===candidate.id)!;const extra=c.lods.find(l=>l.level===0)!.triangles-c.lods.find(l=>l.level===1)!.triangles;if(selected.size<2 && triangles+extra<=350000){selected.add(c.id);triangles+=extra;}}
  return selected;
}

if(!AFRAME.components['world-stream'])AFRAME.registerComponent('world-stream',{
  schema:{manifest:{type:'string',default:'models/level1-stream/manifest.json'}},
  init:function(this:any) {
    this.status='loading';this.removed=false;this.now=0;this.nextSelection=0;
    this.counters={loaded:0,requests:0,disposed:0,errors:0};
    this.queue=[];this.active=new Map();this.states=new Map();this.desired=new Set();
    this.root=new THREE.Group();this.manifestAbort=new AbortController();this.refreshTelemetry();
    this.boot();
  },
  refreshTelemetry:function(this:any) {
    let low=0,high=0;this.states.forEach((s:any)=>{if(s.low)low++;if(s.high)high++;});
    this.telemetry=`STREAM ${this.status} · coarse ${low}/4 · detail ${high}/2 · fetching ${this.active.size}/2 · triangles ${this.stats().visibleTriangles}/350000 · requests ${this.counters.requests} · disposed ${this.counters.disposed} · errors ${this.counters.errors}`;
  },
  stats:function(this:any) {
    let lowResident=0,highResident=0,visibleTriangles=0;
    this.states.forEach((s:any)=>{if(s.low)lowResident++;if(s.high)highResident++;if(s.high||s.low)visibleTriangles+=s.chunk.lods.find((l:Lod)=>l.level===(s.high?0:1)).triangles;});
    return {lowResident,highResident,inFlight:this.active.size,visibleTriangles,counters:{...this.counters},ready:this.status==='ready',status:this.status};
  },
  disposeModel:function(this:any,model:any) { if(!model)return;model.removeFromParent();disposeHeroModel(model);this.counters.disposed++; },
  announce:function(this:any,error?:string) {this.refreshTelemetry();this.el.emit('level-ready',{status:this.status,authored:this.status==='ready',error});},
  boot:async function(this:any) {
    const timeout=setTimeout(()=>this.manifestAbort.abort(),15000);
    try {
      if(!localStreamUrl(this.data.manifest) || !this.data.manifest.endsWith('.json'))throw Error('Invalid manifest URL');
      const response=await fetch(this.data.manifest,{signal:this.manifestAbort.signal,redirect:'error'});
      if(!response.ok)throw Error(`Manifest HTTP ${response.status}`);
      const manifest=validateStreamManifest(await response.json());if(this.removed)return;
      this.manifest=manifest;
      manifest.chunks.forEach((chunk:StreamChunk)=>{this.states.set(chunk.id,{chunk,low:null,high:null,retryAt:0});this.queue.push({id:chunk.id,level:1});});
      this.pump();
    }catch(error){if(!this.removed)this.fail(String(error));}finally{clearTimeout(timeout);}
  },
  fail:function(this:any,error:string) {
    if(this.status==='fallback' || this.removed)return;
    this.status='fallback';this.counters.errors++;this.queue=[];this.desired.clear();
    this.active.forEach((job:any)=>job.abort.abort());
    this.states.forEach((s:any)=>{this.disposeModel(s.low);this.disposeModel(s.high);s.low=s.high=null;});
    this.el.removeObject3D('world-stream');this.announce(error);
  },
  pump:function(this:any) {
    while(!this.removed && this.status!=='fallback' && this.active.size<2 && this.queue.length) {
      const job=this.queue.shift();
      if(job.level===0 && !this.desired.has(job.id))continue;
      job.abort=new AbortController();this.active.set(`${job.id}:${job.level}`,job);this.request(job);
    }
    this.refreshTelemetry();
  },
  request:async function(this:any,job:any) {
    const s=this.states.get(job.id),lod=s.chunk.lods.find((l:Lod)=>l.level===job.level);
    this.counters.requests++;
    const timeout=setTimeout(()=>{job.timedOut=true;job.abort.abort();},15000);
    let candidate:any=null;
    try {
      const response=await fetch(lod.url,{signal:job.abort.signal,redirect:'error'});
      if(!response.ok)throw Error(`Chunk HTTP ${response.status}`);
      const buffer=await response.arrayBuffer();
      if(buffer.byteLength>32000000 || buffer.byteLength!==lod.bytes)throw Error('Chunk byte budget mismatch');
      if(this.removed || this.status==='fallback' || job.abort.signal.aborted)return;
      const loader=new AFRAME.THREE.GLTFLoader();
      const draco=this.el.systems?.['gltf-model']?.getDRACOLoader();if(draco)loader.setDRACOLoader(draco);
      const gltf:any=await new Promise((resolve,reject)=>{
        const aborted=()=>reject(Error('Chunk cancelled or timed out'));
        job.abort.signal.addEventListener('abort',aborted,{once:true});
        loader.parse(buffer,'models/level1-stream/',(result:any)=>{
          job.abort.signal.removeEventListener('abort',aborted);
          if(job.abort.signal.aborted || this.removed){this.disposeModel(result.scene || result.scenes?.[0]);reject(Error('Late chunk'));return;}
          resolve(result);
        },(error:any)=>{job.abort.signal.removeEventListener('abort',aborted);reject(error);});
      });
      candidate=gltf.scene || gltf.scenes?.[0];if(!candidate)throw Error('Empty chunk');
      if(this.removed || this.status==='fallback' || job.abort.signal.aborted || (job.level===0 && !this.desired.has(job.id))) {this.disposeModel(candidate);candidate=null;return;}
      this.counters.loaded++;
      if(job.level===1) {
        s.low=candidate;this.root.add(candidate);candidate=null;
        if([...this.states.values()].every((state:any)=>state.low)) {
          this.el.setObject3D('world-stream',this.root);this.status='ready';this.announce();
        }
      } else {s.high=candidate;this.root.add(candidate);candidate=null;s.low.visible=false;}
    }catch(error) {
      if(candidate)this.disposeModel(candidate);
      if(!this.removed && this.status!=='fallback') {
        if(job.level===1)this.fail(String(error));
        else if(!job.abort.signal.aborted || job.timedOut) {this.counters.errors++;s.retryAt=this.now+5000;}
      }
    }finally{clearTimeout(timeout);this.active.delete(`${job.id}:${job.level}`);this.pump();}
  },
  updateSelection:function(this:any,p:Vec) {
    if(this.status!=='ready' || this.removed)return;
    this.desired=selectDetailedChunks(this.manifest.chunks,p,this.desired);
    this.queue=this.queue.filter((j:any)=>j.level===1 || this.desired.has(j.id));
    this.states.forEach((s:any,id:string)=>{
      if(!this.desired.has(id)) {
        if(s.high){this.disposeModel(s.high);s.high=null;s.low.visible=true;}
        this.active.get(`${id}:0`)?.abort.abort();
      }
    });
    let reserved=[...this.states.values()].filter((s:any)=>s.high).length+[...this.active.values()].filter((j:any)=>j.level===0).length+this.queue.filter((j:any)=>j.level===0).length;
    for(const id of this.desired) {
      const s=this.states.get(id);
      if(reserved>=2)break;
      if(!s.high && !this.active.has(`${id}:0`) && !this.queue.some((j:any)=>j.id===id && j.level===0) && this.now>=s.retryAt){this.queue.push({id,level:0});reserved++;}
    }
    this.pump();
  },
  start:function(this:any):boolean {
    if(this.status!=='ready' || this.removed)return false;
    const b=this.manifest.bounds;
    setWorld({bounds:{minX:b.min.x-20,maxX:b.max.x+20,minY:b.min.y,maxY:b.max.y+40,minZ:b.min.z-20,maxZ:b.max.z+20},boxes:[]});
    this.ownsWorld=true;
    const player=this.el.querySelector('#player'),flight=player?.components?.['fly-controls'];
    if(player){player.object3D.position.copy(this.manifest.spawn);const health=player.components?.['player-component'];if(health){this.playerLimits ||= {component:health,min:health.data.minFlyingHeight,max:health.data.maxFlyingHeight};health.data.minFlyingHeight=b.min.y;health.data.maxFlyingHeight=b.max.y+40;}}
    if(flight){flight.clearInput();flight.rotation.set(-.3,0,0,'YXZ');flight.applyLookRotation();flight.updateCamera(0);}
    this.updateSelection(this.manifest.spawn);return true;
  },
  tick:function(this:any,_time:number,delta:number) {
    if(!this.el.isPlaying || this.status!=='ready' || !this.ownsWorld)return;
    this.now+=Math.min(delta,100);if(this.now<this.nextSelection)return;this.nextSelection=this.now+250;
    const player=this.el.querySelector('#player');if(player)this.updateSelection(player.object3D.position);
  },
  remove:function(this:any) {
    this.removed=true;this.manifestAbort.abort();this.queue=[];this.desired.clear();this.active.forEach((job:any)=>job.abort.abort());
    this.states.forEach((s:any)=>{this.disposeModel(s.low);this.disposeModel(s.high);s.low=s.high=null;});
    this.el.removeObject3D('world-stream');if(this.ownsWorld)resetWorld();
    if(this.playerLimits){this.playerLimits.component.data.minFlyingHeight=this.playerLimits.min;this.playerLimits.component.data.maxFlyingHeight=this.playerLimits.max;}
  }
});
