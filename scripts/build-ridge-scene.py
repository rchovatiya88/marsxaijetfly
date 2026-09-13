"""Extract actual level1 modules and author a compact Ridge Run scene.
Original assets are read-only. Output is local prototype art; source licensing remains unverified.
"""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/ridge-run'
PUBLIC=ROOT/'public'
(PUBLIC/'mission').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(PUBLIC/'models/level1.glb'))
bpy.context.view_layer.update()
source_objects=list(bpy.context.scene.objects)
kit={}
for prefix in ['SM_Env_Rock_Large_01','SM_Env_Rock_Large_03','SM_Env_Rock_03','SM_Bld_Bridge_01',
               'SM_Bld_Corp_Barracks_01','SM_Bld_Corp_Comms_Tower_01','SM_Bld_Column_02','SM_Prop_Container_01',
               'SM_Bld_Platform_Large_03','SM_Prop_Antenna_01']:
    source=next(o for o in source_objects if o.type=='MESH' and o.name.startswith(prefix))
    mesh=source.data.copy(); mesh.transform(source.matrix_world)
    points=[v.co.copy() for v in mesh.vertices]
    lo=Vector([min(p[i] for p in points) for i in range(3)])
    hi=Vector([max(p[i] for p in points) for i in range(3)])
    center=(lo+hi)/2
    for v in mesh.vertices:
        v.co=Vector([(v.co[i]-center[i])/max(hi[i]-lo[i],.0001) for i in range(3)])
    kit[prefix]=(mesh,source.name)
for obj in source_objects: bpy.data.objects.remove(obj,do_unlink=True)
for coll in list(bpy.data.collections): bpy.data.collections.remove(coll)
scene=bpy.context.scene
collections={}
for name in ['VIS','COL','NAV','ROUTE_MARKERS','ACTORS_PREVIEW','LIGHTING_PREVIEW']:
    col=bpy.data.collections.new(name);scene.collection.children.link(col);collections[name]=col
scene.unit_settings.system='METRIC'
def pos(g):return Vector((g[0],-g[2],g[1]))
def mat(name,color,metal=0,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1)
    n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=.68
    n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emission
    return m
rock=mat('Ridge / oxidized basalt',(.3,.095,.037))
rock2=mat('Ridge / sunlit strata',(.52,.22,.085))
steel=mat('Outpost / graphite steel',(.13,.17,.19),.55)
ochre=mat('Outpost / ochre panels',(.62,.29,.055),.3)
sand=mat('Ridge / dust',(.32,.155,.09))
cyan=mat('Route / cyan',(.01,.65,.85),.1,2)
amber=mat('Route / amber',(.95,.22,.015),.1,2)
boxes=[];placed=[]
def move(o,c):
    for old in list(o.users_collection):old.objects.unlink(o)
    collections[c].objects.link(o)
def collider(name,g,size):
    boxes.append({'id':name,'center':dict(zip('xyz',g)),'size':dict(zip('xyz',size))})
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos(g));o=bpy.context.object;move(o,'COL')
    o.name='COL_'+name;o.dimensions=(size[0],size[2],size[1]);o.hide_render=True;o.display_type='WIRE'
def module(key,name,g,size,m,solid=False):
    mesh,source=kit[key];o=bpy.data.objects.new(name,mesh.copy());collections['VIS'].objects.link(o)
    o.location=pos(g);o.scale=(size[0],size[2],size[1]);o.data.materials.clear();o.data.materials.append(m)
    for p in o.data.polygons:p.material_index=0
    o['source_object']=source;o['source_file']='level1.glb'
    placed.append({'object':name,'source':source,'gameCenter':g,'size':size})
    if solid:collider(name,g,size)
    return o
def cube(name,g,size,m,solid=False):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos(g));o=bpy.context.object;move(o,'VIS');o.name=name
    o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(m)
    if solid:collider(name,g,size)
    return o
# Narrow playable chasm, with extracted cliffs outside the clear two-lane corridor.
cube('Chasm_floor',(0,-1,-12),(56,2,88),sand)
for side in [-1,1]:
    for i,z in enumerate([18,5,-9,-23,-39,-51]):
        x=side*(22+(i%2)*1.7); height=[17,21,18,24,19,26][i]
        module('SM_Env_Rock_Large_01' if i%2 else 'SM_Env_Rock_Large_03',f'Cliff_{side}_{i}',
               (x,height/2-3,z),(12,height,17),rock if i%2 else rock2,True)
    for i,z in enumerate([11,-17,-45]):
        module('SM_Env_Rock_03',f'Spire_{side}_{i}',(side*30,15,z),(8,36,10),rock)
# Actual bridge deck kit is a narrow elevated route; proxy is a conservative slab.
for i,z in enumerate([-2,-11]):
    module('SM_Bld_Bridge_01',f'High_bridge_{i}',(-6,6.2,z),(7,.8,9),steel,True)
    module('SM_Bld_Column_02',f'Bridge_support_{i}',(-9,2,z),(1.3,7,1.5),ochre,True)
# Low lane receives a roof, leaving its gate aperture clear.
cube('Low_cover_roof',(6,7.4,-8),(8,.6,12),steel,True)
for x in [1.6,10.4]:
    cube('Low_cover_pier_'+str(x),(x,3.5,-8),(.6,7,1.2),ochre,True)
# Recognizable barracks and comms buildings sit safely beside combat space.
module('SM_Bld_Corp_Barracks_01','West_barracks',(-15,4,-29),(7,8,11),ochre,True)
module('SM_Bld_Corp_Comms_Tower_01','East_comms',(16,8,-34),(6,16,6),steel,True)
for x,z in [(-13,5),(14,-19),(-12,-42)]:
    module('SM_Prop_Container_01',f'Cargo_{x}_{z}',(x,1.5,z),(2.5,3,5),ochre,True)
module('SM_Prop_Antenna_01','Relay_aerial',(-15,11,-29),(1.2,8,1.2),steel)
for name,g,size in [('Launch',(0,.15,12),(11,.3,7)),('Extraction',(0,.15,-41),(12,.3,8)),('Warden_stage',(0,.1,-30),(7,.2,7))]:
    module('SM_Bld_Platform_Large_03',name,g,size,steel)
# Small emissive path inset strips remain independent of runtime trigger rings.
for x,y,m in [(-6,6.66,cyan),(6,.12,amber)]:
    for z in [5,1,-3,-7,-11,-15,-19]:cube(f'Lane_{x}_{z}',(x,y,z),(.15,.06,1.4),m)
for x in [-5,5]:cube('Extraction_beacon_'+str(x),(x,2,-41),(.18,4,.18),cyan)

markers={'player_spawn':(0,3,12),'high_gate':(-6,10,-8),'low_gate':(6,3.5,-8),'warden':(0,0,-30),'extraction':(0,3.5,-41)}
for name,g in markers.items():
    o=bpy.data.objects.new(name,None);collections['ROUTE_MARKERS'].objects.link(o);o.location=pos(g);o.empty_display_size=1
world={'bounds':{'minX':-25,'maxX':25,'minZ':-47,'maxZ':24,'minY':1.8,'maxY':26},'boxes':boxes}
(PUBLIC/'mission/ridge-run-world.json').write_text(json.dumps(world,indent=2)+'\n')
(PUBLIC/'mission/ridge-run-markers.json').write_text(json.dumps({'units':'metres','axes':'Y-up','markers':[{'id':n,'position':dict(zip('xyz',g)),'radius':2.8 if 'gate' in n else 4 if n=='extraction' else 0}for n,g in markers.items()]},indent=2)+'\n')
# Merge static geometry by assigned material: seven materials, <=seven primitives.
for material in [rock,rock2,steel,ochre,sand,cyan,amber]:
    objs=[o for o in collections['VIS'].objects if o.data.materials[0]==material]
    if not objs:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name=material.name.replace(' / ','_')
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in collections['VIS'].objects)
assert triangles<250000
bpy.ops.object.select_all(action='DESELECT')
for o in collections['VIS'].objects:o.select_set(True)
shell=PUBLIC/'models/ridge-run-shell.glb'
bpy.ops.export_scene.gltf(filepath=str(shell),export_format='GLB',use_selection=True,export_yup=True,export_extras=True)

def actor(path,name,g,height,rotate=0):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));imported=set(bpy.data.objects)-before
    root=bpy.data.objects.new(name,None);collections['ACTORS_PREVIEW'].objects.link(root)
    for o in imported:
        move(o,'ACTORS_PREVIEW')
        if o.parent not in imported:o.parent=root
    bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(c) for o in imported if o.type=='MESH' for c in o.bound_box]
    lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
    scale=height/(hi.z-lo.z);root.scale=(scale,)*3;root.rotation_euler.z=rotate
    offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))*scale
    offset=Matrix.Rotation(rotate,4,'Z')@offset;root.location=pos(g)-offset
    return root
actor(ROOT/'art/staging/jetbike-material-study.glb','PLAYER_PREVIEW',(0,3,12),2.2,math.pi)
actor(PUBLIC/'models/enemy.glb','WARDEN_PREVIEW',(0,0,-30),2.15)
import runpy
runpy.run_path(str(ROOT/'scripts/ridge-preview.py'))['configure_preview']()

bpy.ops.object.camera_add(location=(44,-47,42));cam=bpy.context.object;move(cam,'LIGHTING_PREVIEW')
cam.rotation_euler=(Vector((0,15,4))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=90;scene.camera=cam
bpy.ops.object.light_add(type='SUN',location=(0,-20,40));sun=bpy.context.object;move(sun,'LIGHTING_PREVIEW');sun.data.energy=2.3;sun.rotation_euler=(.4,-.5,-.6)
bpy.ops.object.light_add(type='AREA',location=(0,-5,35));light=bpy.context.object;move(light,'LIGHTING_PREVIEW');light.data.energy=18000;light.data.size=35
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.16,.10,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'ridge-run-scene.png')
# Useful initial viewport when opening the authored file.
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.clip_end=1000
bpy.ops.object.select_all(action='DESELECT');bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ridge-run.blend'))
bpy.ops.render.render(write_still=True)
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(shell));reimported=set(bpy.data.objects)-before
assert len([o for o in reimported if o.type=='MESH'])<=30
report={'source':'public/models/level1.glb','sourceSha256':hashlib.sha256((PUBLIC/'models/level1.glb').read_bytes()).hexdigest(),
 'sourceModules':placed,'shellBytes':shell.stat().st_size,'staticTriangles':triangles,'staticMeshes':len(collections['VIS'].objects),
 'reimportMeshCount':len([o for o in reimported if o.type=='MESH']),'colliderBoxes':len(boxes),'status':'export-render-reimport-passed',
 'limitations':'Conservative AABB proxies; licensing unverified; preview actors excluded shell; not production/fun validation'}
(OUT/'ridge-run-scene-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print('RIDGE_SCENE_VERIFIED',json.dumps({k:v for k,v in report.items() if k!='sourceModules'}))
