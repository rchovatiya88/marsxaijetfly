"""Whole-level experimental survey export. Originals and Ridge Run are untouched.
Run: blender --background --factory-startup --python scripts/build-full-level.py
"""
import bpy,bmesh,json,hashlib,time
from pathlib import Path
from mathutils import Vector,Matrix

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/level1-stream';OUT.mkdir(parents=True,exist_ok=True)
ART=ROOT/'art/full-level';ART.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'public/models/level1.glb';digest=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE));bpy.context.view_layer.update()
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH']
points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
center=(lo+hi)/2
# Keep original vertical datum; center horizontal axes, uniformly scale all geometry.
transform=Matrix.Diagonal((.1,.1,.1,1))@Matrix.Translation((-center.x,-center.y,0))
source_bounds={'min':list(lo),'max':list(hi)}
for o in meshes:
    mesh=o.data.copy();mesh.transform(transform@o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4);o.data=mesh
for o in list(scene.objects):
    if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
image_report=[]
for im in bpy.data.images:
    if im.size[0] and im.size[1]:
        old=list(im.size)
        if max(old)>1024:
            ratio=1024/max(old);im.scale(max(1,int(old[0]*ratio)),max(1,int(old[1]*ratio)))
        image_report.append({'name':im.name,'sourceSize':old,'outputSize':list(im.size)})

def xyz(v):return {'x':round(v.x,5),'y':round(v.z,5),'z':round(-v.y,5)}
def bounds(objects):
    pts=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    a=Vector([min(p[i] for p in pts) for i in range(3)]);b=Vector([max(p[i] for p in pts) for i in range(3)])
    return {'min':{'x':a.x,'y':a.z,'z':-b.y},'max':{'x':b.x,'y':b.z,'z':-a.y}},(a+b)/2,(b-a).length/2
def triangles(objects):return sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in objects)

bpy.context.view_layer.update()
full_bounds,full_center,full_radius=bounds(meshes)
chunks=[]
original_triangles=triangles(meshes)
groups={(x,z):[]for x in [0,1]for z in [0,1]}
for o in meshes:
    bb,c,r=bounds([o]);groups[(int(c.x>=0),int(-c.y>=0))].append(o)
for xsign in [0,1]:
 for zsign in [0,1]:
    objects=groups[(xsign,zsign)]
    if not objects:continue
    name=f'q{xsign}{zsign}'
    col=bpy.data.collections.new('chunk_'+name);scene.collection.children.link(col)
    for o in objects:
        for old in list(o.users_collection):old.objects.unlink(o)
        col.objects.link(o)
    # Join all objects; exporter makes a primitive per material. Original material slots preserved.
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();high=objects[0];high.name='chunk_'+name
    b,c,r=bounds([high]);entry={'id':name,'bounds':b,'center':xyz(c),'radius':r,'lods':[]}
    entry['sourceTriangles']=triangles([high])
    for lod,ratio in [(0,min(1,199990/entry['sourceTriangles'])),(1,.15)]:
        simplified=ratio<1
        obj=high.copy() if simplified else high
        if simplified:
            obj.data=high.data.copy();col.objects.link(obj);obj.name='chunk_'+name+'_low'
            # Imported hard normals split coincident vertices; weld the copy before
            # collapse so neighboring cliff faces simplify together instead of tearing.
            bm=bmesh.new();bm.from_mesh(obj.data)
            bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.00001)
            bm.to_mesh(obj.data);bm.free()
            bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
            mod=obj.modifiers.new('Survey low detail','DECIMATE');mod.ratio=ratio;mod.use_collapse_triangulate=True
            bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
        file=OUT/f'{name}-lod{lod}.glb'
        bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,
            export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_animations=False)
        entry['lods'].append({'url':f'models/level1-stream/{file.name}','triangles':triangles([obj]),'bytes':file.stat().st_size})
        if simplified:bpy.data.objects.remove(obj,do_unlink=True)
    chunks.append(entry);print('CHUNK_COMPLETE',json.dumps(entry),flush=True)

spawn={'x':0,'y':full_bounds['max']['y']+7,'z':full_bounds['max']['z']+8}
manifest={'version':1,'units':'metres','mode':'experimental-whole-level-survey','bounds':full_bounds,'spawn':spawn,
 'recommendedSurveySpawn':spawn,'chunks':chunks,'normalization':{'uniformScale':.1,'sourceBlenderBounds':source_bounds,
 'sourceBlenderHorizontalCenter':[center.x,center.y],'runtimeAxes':'Y-up','globalCoordinates':True},
 'sourceSha256':digest,'collision':'none; survey flight only','lodPolicy':'index 0 capped at 200k triangles per quadrant; index 1 decimated target 15% original; replace, never overlay',
 'texturePolicy':'source valid materials retained; embedded images limited to 1024; GLBs duplicate image bytes'}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Offline full-scene evidence, without any decimation applied to authoring source.
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.19,.24,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
bpy.ops.object.light_add(type='SUN',location=(0,-40,80));bpy.context.object.data.energy=3;bpy.context.object.rotation_euler=(.4,-.5,-.5)
bpy.ops.object.camera_add(location=(95,-125,95));cam=bpy.context.object
target=Vector((0,0,-4));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=125;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.filepath=str(ART/'full-level-oblique.png');bpy.ops.render.render(write_still=True)
cam.location=(0,0,110);cam.rotation_euler=(0,0,0);cam.data.ortho_scale=110
scene.render.filepath=str(ART/'full-level-top.png');bpy.ops.render.render(write_still=True)
cam.location=(95,-125,95);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=125
bpy.context.preferences.filepaths.save_version=0;bpy.ops.object.select_all(action='DESELECT')
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'full-level.blend'))
proof=[]
for chunk in chunks:
 for lod in chunk['lods']:
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public'/lod['url']))
    imported=set(bpy.data.objects)-before;loaded=[o for o in imported if o.type=='MESH']
    assert loaded
    proof.append({'url':lod['url'],'meshes':len(loaded),'triangles':triangles(loaded),'status':'reimport-passed'})
    for o in imported:bpy.data.objects.remove(o,do_unlink=True)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==digest
(ART/'verification.json').write_text(json.dumps({'blender':bpy.app.version_string,'sourceSha256':digest,'sourcePreserved':True,
 'sourceTriangles':original_triangles,'highTriangles':sum(c['lods'][0]['triangles']for c in chunks),'lowTriangles':sum(c['lods'][1]['triangles']for c in chunks),
 'images':image_report,'reimports':proof,'manifest':manifest},indent=2)+'\n')
print('FULL_LEVEL_VERIFIED',json.dumps({'chunks':len(chunks),'bytes':sum(l['bytes']for c in chunks for l in c['lods']),'bounds':full_bounds,'spawn':spawn}),flush=True)
