"""Author a resident Bridgehead readability kit using headless Blender.

Source level and hero GLBs are read-only. This does not touch the user's GUI.
Export only original route-kit geometry; link source context for review in .blend.
Run: blender --background --factory-startup --python scripts/build-bridgehead-route.py
"""
import bpy, json, math, hashlib, struct
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art/bridgehead'; OUT.mkdir(parents=True,exist_ok=True)
GLB=ROOT/'public/models/bridgehead-route.glb'
SOURCE=ROOT/'art/full-level/full-level.blend'
SOURCE_GLB=ROOT/'public/models/level1.glb'
source_hash=hashlib.sha256(SOURCE_GLB.read_bytes()).hexdigest()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
collections={}
for name in ['ROUTE_EDITABLE','MARKERS','COLLISION_REFERENCE','ACTOR_SCALE_REFERENCE','REVIEW_LIGHTING']:
    col=bpy.data.collections.new(name);scene.collection.children.link(col);collections[name]=col
with bpy.data.libraries.load(str(SOURCE),link=True) as (src,dest):
    dest.collections=[name for name in src.collections if name.startswith('chunk_q')]
for col in dest.collections:scene.collection.children.link(col)

def pos(g):return Vector((g[0],-g[2],g[1]))
def gvec(v):return [round(v.x,5),round(v.z,5),round(-v.y,5)]
def move(o,col):
    for old in list(o.users_collection):old.objects.unlink(o)
    collections[col].objects.link(o)
def mat(name,color,metal=.2,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1)
    n.inputs['Roughness'].default_value=.72;n.inputs['Metallic'].default_value=metal
    n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emission
    return m
steel=mat('Bridgehead graphite',(.065,.092,.105),.4)
rust=mat('Bridgehead weathered alloy',(.30,.15,.085),.3)
ivory=mat('Bridgehead ceramic markings',(.59,.61,.53),.1)
cyan=mat('Bridgehead charge guidance',(.03,.63,.52),.1,.8)
amber=mat('Bridgehead protected guidance',(.95,.36,.085),.1,.65)
materials=[steel,rust,ivory,cyan,amber]
record=[]

def cube(name,g,size,material,col='ROUTE_EDITABLE'):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos(g));o=bpy.context.object;move(o,col);o.name=name
    o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if material:o.data.materials.append(material)
    return o
def beam(name,a,b,width,depth,material):
    a,b=pos(a),pos(b);d=b-a
    o=cube(name,gvec((a+b)/2),(width,d.length,depth),material)
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return o
def polygon(name,points,material):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([pos(p) for p in points],[],[list(range(len(points)))]);mesh.update()
    o=bpy.data.objects.new(name,mesh);collections['ROUTE_EDITABLE'].objects.link(o);mesh.materials.append(material)
    return o

# Existing three boxes: the exact opaque exterior bounds are kept, with inset
# geometric face graphics for readable cover. Detail never expands a collider.
colliders=[
 {'id':'court-cover-west','center':[14,-.4,-4],'size':[3.5,5,3.5]},
 {'id':'court-cover-east','center':[26,-.4,-17],'size':[3.5,5,3.5]},
 {'id':'court-core','center':[28,.4,-5],'size':[5,6.5,4]},
 {'id':'extraction-pad','center':[32,2.6,-15],'size':[7,.4,7]},
 {'id':'bridge-low-deck','center':[-1.5,-3.44,10.7],'size':[19,.16,4.8]},
 {'id':'bridge-high-deck','center':[-3,-.99,-11.8],'size':[16,.16,4.8]},
 {'id':'warden-footplate','center':[23,-.09,-10],'size':[3.6,.18,3.6]},
]
for spec in colliders[:3]:
    name=spec['id'];x,y,z=spec['center'];w,h,d=spec['size']
    body=cube(name,(x,y,z),(w,h,d),steel);body['collider_id']=name
    # Surface-only faceted plating on both sides, inside the exact AABB skin.
    for side in [-1,1]:
        face=x+side*(w/2+.001)
        polygon(name+'_armor_'+str(side),[(face,y-h*.28,z-d*.33),(face,y+h*.27,z-d*.33),
          (face,y+h*.36,z-d*.16),(face,y+h*.36,z+d*.16),(face,y+h*.27,z+d*.33),
          (face,y-h*.28,z+d*.33)],rust)
        for dz in [-d*.36,d*.36]:cube(name+'_corner_mark',(face,y+h*.18,z+dz),(.006,h*.34,.055),ivory)
        for yy in [-.7,-.4,-.1,.2]:cube(name+'_cooling_slat',(face,y+yy,z),(.01,.07,d*.39),steel)
        cube(name+'_signal',(face,y+h*.37,z),(.009,.06,d*.45),amber if 'west' in name else ivory)
    for side in [-1,1]:
        zz=z+side*(d/2+.001)
        cube(name+'_end_panel',(x,y,zz),(w*.7,h*.74,.005),rust)
        for dx in [-w*.34,w*.34]:cube(name+'_end_edge',(x+dx,y,zz),(.065,h*.72,.008),ivory)
    # Recessed roof ribs bounded inside the collider silhouette.
    for dx in [-w*.27,0,w*.27]:cube(name+'_roof_rib',(x+dx,y+h/2+.003,z),(.22,.006,d*.73),rust)

# Hover corridors extend the original narrow decks with a visible backed slab.
# Slabs are explicit AABBs because low-detail source decimation drops rail edges.
# Original bridge meshes remain preserved immediately beneath the new surface.
routes=[('low',-11,8,10.7,-3.36,amber),('high',-11,5,-11.8,-.91,cyan)]
for route,start,end,z,deck,signal in routes:
    cube('bridge-'+route+'-deck',((start+end)/2,deck-.08,z),(end-start,.16,4.8),steel)['collider_id']='bridge-'+route+'-deck'
    for side in [-1,1]:
        cube(route+'_outer_longeron',((start+end)/2,deck-.18,z+side*2.3),(end-start,.25,.25),steel)
        cube(route+'_outrigger_walkway',((start+end)/2,deck-.07,z+side*1.65),(end-start,.14,1.0),rust)
        for i,x in enumerate(range(start,end+1,2)):
            cube(route+'_edge_marker_'+str(i),(x,deck+.035,z+side*2.3),(.8,.06,.1),signal)
            beam(route+'_underbrace_'+str(i),(x,deck-.85,z),(x,deck-.2,z+side*2.3),.12,.12,steel)
        for x in [start,end]:
            cube(route+'_threshold_corner',(x,deck+.03,z+side*1.7),(.8,.04,.55),ivory)
    # Distinct icon shapes on paired entry pylons: triple charge versus shield.
    for side in [-1,1]:
        x=start+2;zz=z+side*2.75
        cube(route+'_entrance_foot',(x,deck-.05,zz),(.6,.24,.65),steel)
        lift=2 if route=='high' else 0
        cube(route+'_entrance_post',(x,deck+.95+lift/2,zz),(.34,2+lift,.34),rust)
        cube(route+'_entrance_light',(x-.19,deck+1.3+lift,zz),(.045,.65,.16),signal)
        if route=='high':
            for k in [-1,0,1]:
                polygon('Charge_blade',[(x-.21,deck+4.5+k*.18,zz-.22),(x-.21,deck+4.4+k*.18,zz+.22),
                    (x-.21,deck+4.28+k*.18,zz+.15),(x-.21,deck+4.38+k*.18,zz-.22)],signal)
        else:
            polygon('Shield_icon',[(x-.21,deck+2.6,zz-.28),(x-.21,deck+2.6,zz+.28),
                (x-.21,deck+2.26,zz+.26),(x-.21,deck+2.05,zz),(x-.21,deck+2.26,zz-.26)],signal)

# West approach elevated posts indicate the required climb around source rock.
# A widely spaced paired silhouette leaves the whole four-metre lane open.
for i,(x,y,z) in enumerate([(-17,1.1,7),(-15,3.2,1),(-15,3.2,-5),(-13,3.2,-11.8)]):
    for side in [-1,1]:
        xx=x+side*2.5 if i<3 else x
        zz=z if i<3 else z+side*2.7
        cube('North_breadcrumb_'+str(i),(xx,y-.35,zz),(.13,.7,.13),steel)
        cube('North_breadcrumb_tip_'+str(i),(xx,y+.1,zz),(.19,.2,.19),cyan)
    # Arrow points north for the climb, east for the bridge turn.
    if i<3:
        polygon('North_route_arrow',[(x-.4,y-.12,z+.6),(x,y-.12,z-.5),(x+.4,y-.12,z+.6),(x,y-.12,z+.25)],cyan)
    else:
        polygon('Bridge_turn_arrow',[(x-.6,y-.12,z-.4),(x+.5,y-.12,z),(x-.6,y-.12,z+.4),(x-.25,y-.12,z)],cyan)

# Protected exit asks for a climb before the northern turn, then points to cover.
for i,(x,y,z) in enumerate([(8,.6,10.7),(10,.5,5),(11,.4,1.5)]):
    for side in [-1,1]:
        cube('Protected_turn_'+str(i),(x+side*2.35,y-.4,z),(.18,.75,.18),steel)
        cube('Protected_turn_lamp_'+str(i),(x+side*2.35,y,z),(.24,.1,.24),amber)
    polygon('Protected_chevron',[(x-.35,y-.3,z+.5),(x,y-.3,z-.35),(x+.35,y-.3,z+.5),(x,y-.3,z+.1)],amber)

# Exact extraction deck with a square-in-square landing mark and split upright.
cube('extraction-pad',(32,2.6,-15),(7,.4,7),steel)['collider_id']='extraction-pad'
for side in [-1,1]:
    cube('Exit_deck_rim_x',(32+side*3.35,2.81,-15),(.18,.018,6.7),rust)
    cube('Exit_deck_rim_z',(32,2.81,-15+side*3.35),(6.7,.018,.18),rust)
    cube('Exit_deck_mark_x',(32+side*2.55,2.825,-15),(.07,.015,5.1),ivory)
    cube('Exit_deck_mark_z',(32,2.825,-15+side*2.55),(5.1,.015,.07),ivory)
    for d in [-2,-1,0,1,2]:cube('Exit_bay_dash',(32+d,2.83,-15+side*3.25),(.3,.02,.16),cyan)
    # Rear split tower is part of the resident exit silhouette, not a trigger.
    beam('Exit_split_tower',(35.2,2.8,-15+side*2.7),(35.2,6,-15+side*2.15),.2,.24,steel)
    beam('Exit_split_light',(35.08,4.3,-15+side*2.42),(35.08,6,-15+side*2.15),.09,.1,cyan)
cube('Exit_rear_header',(35.2,6,-15),(.22,.22,4.5),ivory)

# Warden footprint plate gives a stable ground reference at the newly measured
# feet height. It is a visual plate only; Warden owns its stationary anchor.
cube('warden-footplate',(23,-.09,-10),(3.6,.18,3.6),steel)['collider_id']='warden-footplate'
for side in [-1,1]:cube('Warden_footplate_edge',(23+side*1.75,.005,-10),(.08,.01,3.4),rust)

markers=[
 {'id':'launch','position':[-19,-.8,10.7]},
 {'id':'low-entry','position':[-9,-2.2,10.7],'normal':[1,0,0]},
 {'id':'low-exit','position':[7,-2.2,10.7],'normal':[1,0,0]},
 {'id':'high-ridge','position':[-15,3.2,-11.8]},
 {'id':'high-entry','position':[-9,3.2,-11.8],'normal':[1,0,0]},
 {'id':'high-exit','position':[1,3.2,-11.8],'normal':[1,0,0]},
 {'id':'high-approach','position':[12,3.2,-11.8]},
 {'id':'low-climb','position':[8,.6,10.7]},
 {'id':'low-approach','position':[11,.4,-1.5]},
 {'id':'warden-feet','position':[23,0,-10]},
 {'id':'extraction','position':[32,4,-15]},
]
for m in markers:
    o=bpy.data.objects.new('MARKER_'+m['id'],None);collections['MARKERS'].objects.link(o);o.location=pos(m['position']);o.empty_display_size=.5
    o['marker_id']=m['id'];o['runtime_position']=m['position'];o['collision']='resident explicit AABB only'
for c in colliders:
    o=cube('COL_'+c['id'],c['center'],c['size'],None,'COLLISION_REFERENCE');o.hide_render=True;o.display_type='WIRE';o['collider_id']=c['id']

def bounds(objects):
    pts=[o.matrix_world@Vector(c) for o in objects if o.type=='MESH' for c in o.bound_box]
    lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)])
    return {'min':[round(lo.x,5),round(lo.z,5),round(-hi.y,5)],'max':[round(hi.x,5),round(hi.z,5),round(-lo.y,5)]}
def triangles(objects):return sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects if o.type=='MESH')
bpy.context.view_layer.update()
kit_bounds=bounds(collections['ROUTE_EDITABLE'].objects);tri=triangles(collections['ROUTE_EDITABLE'].objects)
assert tri<20000,tri
editable_count=len(collections['ROUTE_EDITABLE'].objects)
EXPORT=bpy.data.collections.new('EXPORT_TEMP');scene.collection.children.link(EXPORT)
for m in materials:
    copies=[]
    for o in list(collections['ROUTE_EDITABLE'].objects):
        if o.data.materials[0]!=m:continue
        clone=o.copy();clone.data=o.data.copy();EXPORT.objects.link(clone);copies.append(clone)
    bpy.ops.object.select_all(action='DESELECT')
    for o in copies:o.select_set(True)
    bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();o=copies[0]
    o.name=m.name.replace(' ','_');o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
    o['purpose']='resident route silhouette; explicit runtime collision independent of LOD'
bpy.ops.object.select_all(action='DESELECT')
for o in EXPORT.objects:o.select_set(True)
for o in collections['MARKERS'].objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False)
for o in list(EXPORT.objects):bpy.data.objects.remove(o,do_unlink=True)
bpy.data.collections.remove(EXPORT)
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(GLB));imported=set(bpy.data.objects)-before
mesh_imports=[o for o in imported if o.type=='MESH'];bpy.context.view_layer.update()
roundtrip={'meshes':len(mesh_imports),'triangles':triangles(mesh_imports),'bounds':bounds(mesh_imports)}
assert roundtrip['triangles']==tri and len(mesh_imports)==5
for o in imported:bpy.data.objects.remove(o,do_unlink=True)
blob=GLB.read_bytes();json_size=struct.unpack_from('<I',blob,12)[0];gltf=json.loads(blob[20:20+json_size])
assert len(gltf.get('images',[]))==0 and len(gltf.get('materials',[]))==5

def actor(file,name,g,height,heading):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(file));imported=set(bpy.data.objects)-before
    root=bpy.data.objects.new(name,None);collections['ACTOR_SCALE_REFERENCE'].objects.link(root)
    for o in imported:
        move(o,'ACTOR_SCALE_REFERENCE')
        if o.parent not in imported:o.parent=root
    bpy.context.view_layer.update()
    pts=[o.matrix_world@Vector(c) for o in imported if o.type=='MESH' for c in o.bound_box]
    lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)])
    scale=height/(hi.z-lo.z);root.scale=(scale,)*3;root.rotation_euler.z=heading
    offset=Matrix.Rotation(heading,4,'Z')@Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))*scale
    root.location=pos(g)-offset
    return root,offset,{'width':(hi.x-lo.x)*scale,'height':height,'length':(hi.y-lo.y)*scale}
bike,bike_offset,bike_size=actor(ROOT/'public/models/avi-jetbike.glb','PLAYER_PREVIEW',(-19,-.8,10.7),1.8,math.pi/2)
warden,_,_=actor(ROOT/'public/models/enemy.glb','WARDEN_PREVIEW',(23,0,-10),2.15,0)
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs[0].default_value=(.13,.105,.115,1);bg.inputs[1].default_value=.7
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;move(sun,'REVIEW_LIGHTING');sun.data.energy=2.8;sun.rotation_euler=(.55,-.55,-.9)
bpy.ops.object.light_add(type='AREA',location=(-15,-4,35));light=bpy.context.object;move(light,'REVIEW_LIGHTING');light.data.energy=4500;light.data.shape='DISK';light.data.size=45
bpy.ops.object.camera_add();cam=bpy.context.object;move(cam,'REVIEW_LIGHTING');scene.camera=cam
cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=12/math.tan(math.radians(40))
cam.data.clip_start=.05;cam.data.clip_end=500
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
views=[
 ('launch',(-19,-.8,10.7),(-25.2,1.7,10.7),(-10,.2,10.7)),
 ('fork',(-15,3.2,-5),(-15,5.7,1.2),(-14,2.6,-11.8)),
 ('south-bridge',(-2,-2.2,10.7),(-8.2,.3,10.7),(8,-.5,10.7)),
 ('court',(12,3.2,-11.8),(5.8,5.7,-11.8),(24,1.3,-10)),
]
for name,player,eye,target in views:
    heading=math.pi if name=='fork' else math.pi/2
    bike.rotation_euler.z=heading
    bike.location=pos(player)-Matrix.Rotation(heading-math.pi/2,4,'Z')@bike_offset
    cam.location=pos(eye);cam.rotation_euler=(pos(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/('bridgehead-'+name+'.png'));bpy.ops.render.render(write_still=True)
# Overview exposes lane width, two bridge positions, cover and landing silhouette.
bike.rotation_euler.z=math.pi/2;bike.location=pos((-19,-.8,10.7))-bike_offset
cam.location=pos((56,43,45));cam.rotation_euler=(pos((6,0,-2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=81
scene.render.filepath=str(OUT/'bridgehead-overview.png');bpy.ops.render.render(write_still=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='DESELECT')
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bridgehead-route.blend'))
bpy.ops.file.make_paths_relative();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bridgehead-route.blend'))
assert hashlib.sha256(SOURCE_GLB.read_bytes()).hexdigest()==source_hash
receipt={
 'asset':'bridgehead-route','version':1,'blender':bpy.app.version_string,'sourceContext':{'path':'art/full-level/full-level.blend','linkedOnly':True,'sourceGLB':'public/models/level1.glb','sha256':source_hash,'preserved':True},
 'output':{'path':'public/models/bridgehead-route.glb','sha256':hashlib.sha256(blob).hexdigest(),'bytes':len(blob),'triangles':tri,'meshes':5,'materials':5,'textures':0,'animations':0,'bounds':kit_bounds,'transform':'identity; global runtime Y-up metres'},
 'authoring':{'path':'art/bridgehead/bridgehead-route.blend','editableMeshObjects':editable_count,'sourceContext':'linked .blend; never exported','process':'original scripted Blender meshes, no paid provider; game-dev CLI unavailable on PATH, direct Blender fallback per BLENDER_MCP_SETUP.md'},
 'collision':{'boxes':colliders,'policy':'3 existing court AABBs plus exact extraction, bridge and Warden slabs; terrain collision derived separately from resident low source chunks; no side walls in the intended flight channel','surfaceGraphicsOffsetMaxMetres':.009},
 'markers':markers,'roundtrip':roundtrip,'previewBike':bike_size,
 'clearance':{'flightChannelWidth':4,'outerBeamInnerSeparation':4.35,'sourceBridgeDeckWidthApprox':1,'sourceGroundEvidence':'art/bridgehead/source-ground-samples.json','limits':'sampled top-surface evidence; no claim of continuous source-terrain collision or human traversal'},
 'previews':[{'name':n,'player':p,'camera':e,'lookAt':t,'size':[1280,720],'verticalFovDegrees':80,'chaseHeight':2.5,'chaseDistance':6.2,'kind':'offline Blender source+kit+hero composition, not browser input evidence'} for n,p,e,t in views],
 'rights':'kit geometry authored locally from primitives; supplied source level/hero commercial rights remain unverified; no release license assertion',
 'limitations':['Browser import, collision registration and ordinary-input camera sweeps require runtime verification.','Terrain collider must remain resident independently of visible LOD; art export does not implement runtime collision.','No human route comprehension or premium score evidence.']}
(OUT/'verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
(OUT/'bridgehead-markers.json').write_text(json.dumps({'version':1,'units':'metres','axes':'Y-up','markers':markers},indent=2)+'\n')
print('BRIDGEHEAD_ART_VERIFIED '+json.dumps(receipt['output']),flush=True)
