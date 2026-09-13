const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
function mission(){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/mission/bridgehead-run.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});return exports;}
test('Blender export receipt matches shipped bytes, all solid proxies and mission markers',()=>{
  const m=mission(),receipt=JSON.parse(fs.readFileSync('art/bridgehead/verification.json','utf8'));
  const bytes=fs.readFileSync('public/models/bridgehead-route.glb');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),receipt.output.sha256);
  assert.equal(bytes.length,receipt.output.bytes);assert.equal(bytes.readUInt32LE(0),0x46546c67);
  const layoutBytes=fs.readFileSync('art/bridgehead/bridgehead-v2-layout.json');
  assert.equal(crypto.createHash('sha256').update(layoutBytes).digest('hex'),receipt.layoutSha256);
  const layout=JSON.parse(layoutBytes);
  assert.equal(m.BRIDGEHEAD_ENVIRONMENT_SCALE,layout.environmentScale);
  assert.equal(m.BRIDGEHEAD_SPEED,layout.movement.speed);
  assert.deepEqual(JSON.parse(JSON.stringify(m.BRIDGEHEAD_CAMERA)),layout.camera);
  assert.deepEqual(JSON.parse(JSON.stringify(m.BRIDGEHEAD_ROUTE_PATHS)),layout.routePaths);
  assert.equal(receipt.collision.boxes.length,m.BRIDGEHEAD_WORLD.boxes.length);
  for(const box of m.BRIDGEHEAD_WORLD.boxes){
    const exported=receipt.collision.boxes.find(b=>b.id===box.id);assert.ok(exported,box.id);
    for(const [i,axis] of ['x','y','z'].entries()){assert.equal(exported.center[i],box.center[axis]);assert.equal(exported.size[i],box.size[axis]);}
  }
  const markers=JSON.parse(fs.readFileSync('art/bridgehead/bridgehead-markers.json','utf8')).markers;
  const expected={launch:m.BRIDGEHEAD_START,'high-ridge':m.BRIDGEHEAD_HIGH_APPROACH.position,'high-descent':m.BRIDGEHEAD_HIGH_DESCENT.position,'high-align':m.BRIDGEHEAD_HIGH_ALIGN.position,'high-climb':m.BRIDGEHEAD_HIGH_CLIMB.position,'low-climb':m.BRIDGEHEAD_LOW_CLIMB.position,'warden-feet':m.BRIDGEHEAD_WARDEN,extraction:m.BRIDGEHEAD_EXTRACTION};
  for(const gate of m.BRIDGEHEAD_GATES)expected[gate.id+'-entry']=gate.position;
  for(const exit of m.BRIDGEHEAD_EXITS)expected[exit.id+'-exit']=exit.position;
  for(const approach of m.BRIDGEHEAD_APPROACHES)expected[approach.id+'-approach']=approach.position;
  for(const [id,position] of Object.entries(expected))assert.deepEqual(markers.find(m=>m.id===id)?.position,[position.x,position.y,position.z],id);
});
