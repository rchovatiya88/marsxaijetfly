"""Scene-first scale-three Bridgehead authoring from the shared layout contract."""
import bpy,json,math,hashlib,struct
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'art/bridgehead';LAYOUT=OUT/'bridgehead-v2-layout.json'
D=json.loads(LAYOUT.read_text());GLB=ROOT/'public/models/bridgehead-route.glb'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
C={}
for name in ['VIS_EDITABLE','MARKERS','COLLISION_REFERENCE','SOURCE_LINKED','ACTORS','CAMERAS','ROUTE_ACTIONS']:
    c=bpy.data.collections.new(name);scene.collection.children.link(c);C[name]=c
with bpy.data.libraries.load(str(ROOT/'art/full-level/full-level.blend'),link=True) as (src,dst):dst.collections=[n for n in src.collections if n.startswith('chunk_q')]
for c in dst.collections:
    o=bpy.data.objects.new('Context_'+c.name,None);C['SOURCE_LINKED'].objects.link(o);o.instance_type='COLLECTION';o.instance_collection=c;o.scale=(D['environmentScale'],)*3
def V(g):return Vector((g['x'],-g['z'],g['y'])) if isinstance(g,dict) else Vector((g[0],-g[2],g[1]))
def G(p):return {'x':round(p.x,5),'y':round(p.z,5),'z':round(-p.y,5)}
def move(o,c):
    for old in list(o.users_collection):old.objects.unlink(o)
    C[c].objects.link(o)
TEX=OUT/'textures';TEX.mkdir(exist_ok=True)
def make_texture(name,color,accent):
    path=TEX/(name+'.png')
    img=bpy.data.images.new(name,64,64)
    pixels=[]
    for y in range(64):
      for x in range(64):
        grain=.72+.18*math.sin(x*.47+y*.31)+.08*math.sin((x-y)*.19)
        seam=.35 if x%16 in (0,1) or y%16 in (0,1) else 0
        c=[min(1,max(0,color[i]*grain+accent[i]*seam)) for i in range(3)]
        pixels.extend((*c,1))
    img.pixels.foreach_set(pixels);img.filepath_raw=str(path);img.file_format='PNG';img.save()
    return img
def mat(name,color,emission=0,accent=(0,0,0)):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;tree=m.node_tree;n=tree.nodes['Principled BSDF']
    img=make_texture(name.replace(' ','_').lower(),color,accent)
    tex=tree.nodes.new('ShaderNodeTexImage');tex.image=img
    tree.links.new(tex.outputs['Color'],n.inputs['Base Color'])
    n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=.86;n.inputs['Metallic'].default_value=.18
    n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emission
    return m
steel=mat('Bridgehead graphite',(.10,.13,.135),0,(.08,.09,.08));rust=mat('Bridgehead burnt alloy',(.34,.16,.075),0,(.22,.12,.04));white=mat('Bridgehead ceramic',(.69,.68,.56),0,(.12,.11,.08));cyan=mat('Bridgehead charge guide',(.045,.7,.56),.9,(.04,.16,.13));amber=mat('Bridgehead shield guide',(.96,.37,.075),.8,(.18,.06,.015));M=[steel,rust,white,cyan,amber]
for navigation_material in [cyan,amber]:navigation_material.use_backface_culling=True
def cube(name,g,size,m,col='VIS_EDITABLE'):
    s=list(size.values())if isinstance(size,dict) else list(size)
    hx,hy,hz=s[0]/2,s[2]/2,s[1]/2
    verts=[(-hx,-hy,-hz),(hx,-hy,-hz),(hx,hy,-hz),(-hx,hy,-hz),(-hx,-hy,hz),(hx,-hy,hz),(hx,hy,hz),(-hx,hy,hz)]
    faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    mesh=bpy.data.meshes.new(name+'Mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='panel_uv')
    for poly in mesh.polygons:
      for i,li in enumerate(poly.loop_indices):
        uv.data[li].uv=((i==1 or i==2)*s[0]*.18,(i>=2)*s[1]*.18)
    o=bpy.data.objects.new(name,mesh);C[col].objects.link(o);o.location=V(g)
    if m:o.data.materials.append(m)
    if col=='VIS_EDITABLE':
      bevel=o.modifiers.new('small manufactured bevel','BEVEL');bevel.width=.035;bevel.segments=1
      o.modifiers.new('weighted panel normals','WEIGHTED_NORMAL')
    return o
def poly(name,pts,m):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([V(p)for p in pts],[],[list(range(len(pts)))]);mesh.update();mesh.materials.append(m)
    o=bpy.data.objects.new(name,mesh);C['VIS_EDITABLE'].objects.link(o);return o
def marker(name,g,kind='checkpoint',extra=None):
    o=bpy.data.objects.new(name,None);C['MARKERS'].objects.link(o);o.location=V(g);o.empty_display_type='ARROWS';o.empty_display_size=.7;o['marker_id']=name;o['kind']=kind
    if extra:
      for k,v in extra.items():o[k]=v
    return o

# All physical structures originate in the same array used by runtime collision.
for box in D['world']['boxes']:
    name=box['id'];g=box['center'];s=box['size'];x,y,z=g.values();w,h,d=s.values()
    o=cube(name,g,s,rust if 'post' in name else steel);o['collider_id']=name
    ref=cube('COL_'+name,g,s,None,'COLLISION_REFERENCE');ref.hide_render=True;ref.display_type='WIRE';ref['collider_id']=name
    if 'cover' in name or name=='court-core':
      for side in [-1,1]:
        face=x+side*(w/2+.003)
        poly(name+'_inset_'+str(side),[(face,y-h*.36,z-d*.35),(face,y+h*.25,z-d*.35),(face,y+h*.38,z-d*.2),(face,y+h*.38,z+d*.2),(face,y+h*.25,z+d*.35),(face,y-h*.36,z+d*.35)],rust)
        for k in range(3):cube(name+'_vent',(face,y-.2+k*.2,z),(.008,.065,d*.38),steel)
        for dz in [-d*.36,d*.36]:cube(name+'_edge_mark',(face,y,z+dz),(.008,h*.58,.05),white)
        cube(name+'_safe_reading',(face,y+h*.36,z),(.008,.075,d*.5),amber if 'west' in name else white)
      for side in [-1,1]:
        zz=z+side*(d/2+.003);cube(name+'_end_mark',(x,y,zz),(w*.6,h*.72,.008),rust)
    if 'deck' in name:
      top=y+h/2
      for side in [-1,1]:
        cube(name+'_painted_edge',(x,top+.012,z+side*(d/2-.22)),(w-.1,.015,.14),amber if 'low' in name else cyan)
        for xx in range(math.ceil(x-w/2)+1,math.floor(x+w/2),3):cube(name+'_rib_mark',(xx,top+.01,z+side*1.4),(.09,.012,1.0),rust)
    if name in ['court-floor','extraction-pad']:
      top=y+h/2
      for side in [-1,1]:
        cube(name+'_edge_x',(x+side*(w/2-.2),top+.012,z),(.12,.015,d-.3),white)
        cube(name+'_edge_z',(x,top+.012,z+side*(d/2-.2)),(w-.3,.015,.12),white)
      if name=='extraction-pad':
        for side in [-1,1]:
          cube('Exit_inner_x',(x+side*2.8,top+.027,z),(.1,.015,5.6),cyan)
          cube('Exit_inner_z',(x,top+.027,z+side*2.8),(5.6,.015,.1),cyan)
      else:
        for xx in range(55,78,2):cube('Court_entry_dash',(xx,top+.025,-33),(.55,.02,.13),cyan)
        for zz in range(-16,-25,-2):cube('Covered_peek_dash',(55,top+.025,zz),(.13,.02,.5),amber)

# Guide glyphs are expressly non-solid holograms, never implied invisible walls.
for route,points in D['routePaths'].items():
    signal=cyan if route=='high' else amber
    for i,(a,b) in enumerate(zip(points,points[1:])):
      delta=V(b)-V(a);dist=delta.length
      for t in ([.35,.7]if dist>20 else [.5]):
        p=V(a).lerp(V(b),t);forward=Vector((delta.x,delta.y,0)).normalized();right=Vector((forward.y,-forward.x,0))
        pts=[p+forward*.75,p-forward*.55+right*.4,p-forward*.25,p-forward*.55-right*.4]
        pts=[G(q-Vector((0,0,.3)))for q in reversed(pts)];o=poly(f'GUIDE_HOLOGRAM_{route}_{i}',pts,signal);o['collision']='none; holographic route arrow'
      if b['y']-a['y']>2:
        # Upright paired chevrons face the incoming route instead of disappearing edge-on.
        # They are light glyphs, not structural arches or collision surfaces.
        center=V(a).lerp(V(b),.5);forward=Vector((delta.x,delta.y,0)).normalized();right=Vector((forward.y,-forward.x,0));up=Vector((0,0,1))
        shape=[(-.55,-.18),(0,.35),(.55,-.18),(.40,-.33),(0,.06),(-.40,-.33)]
        for side in [-1,1]:
          for tier in [0,1]:
            p=center+right*side*2.4+up*(1.35+tier*.8)
            pts=[p+right*u+up*v for u,v in shape]
            if (pts[1]-pts[0]).cross(pts[2]-pts[0]).dot(-forward)<0:pts.reverse()
            o=poly(f'CLIMB_HOLOGRAM_{route}_{i}_{side}_{tier}',[G(q)for q in pts],signal);o['collision']='none; incoming-facing holographic climb chevron'
    curve=bpy.data.curves.new('ACTION_PATH_'+route,'CURVE');curve.dimensions='3D';spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for p,g in zip(spline.points,points):p.co=(*V(g),1)
    o=bpy.data.objects.new('ACTION_PATH_'+route,curve);C['ROUTE_ACTIONS'].objects.link(o);o.hide_render=True

# Facing-west fork labels use authored mesh letters for source-free game text.
def label(name,text,g,size,m,face='west'):
    bpy.ops.object.text_add(location=V(g));o=bpy.context.object;move(o,'VIS_EDITABLE');o.name=name;o.data.body=text;o.data.size=size;o.data.align_x='CENTER';o.data.extrude=0;o.data.resolution_u=2
    normals={'west':Vector((-1,0,0)),'east':Vector((1,0,0)),'south':Vector((0,-1,0)),'north':Vector((0,1,0))}
    normal=normals[face];up=Vector((0,0,1));x_axis=up.cross(normal).normalized()
    # Text local Y is vertical; local Z is the readable face normal.
    o.rotation_euler=Matrix(((x_axis.x,up.x,normal.x),(x_axis.y,up.y,normal.y),(x_axis.z,up.z,normal.z))).to_euler();o.data.materials.append(m)
    bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o=bpy.context.object;o['collision']='none; holographic navigation text';return o
label('Fork_charge','CHARGE / CLIMB',(-48,-1,27.5),.7,cyan)
label('Fork_shield','SHIELD / COVER',(-48,-1,36.5),.7,amber)
label('High_descent_callout','DESCEND',(-29,8.1,-35.4),.72,cyan)
label('Low_bank_callout','RISE + TURN',(29,-4.6,32.1),.75,amber,'south')
label('Exit_callout','EXIT',(94,8.7,-45),1.0,cyan)

markers=[]
for name,g in [('launch',D['start']),('high-ridge',D['highApproach']['position']),('high-descent',D['highDescent']['position']),('high-align',D['highAlign']['position']),('low-climb',D['lowClimb']['position']),('high-climb',D['highClimb']['position']),('low-peek',D['lowPeek']),('high-dodge',D['highDodge']),('warden-feet',D['warden']),('extraction',D['extraction'])]:
    marker(name,g);markers.append({'id':name,'position':[g[k]for k in 'xyz']})
for key,suffix in [('gates','entry'),('exits','exit'),('approaches','approach')]:
 for m in D[key]:
    name=m['id']+'-'+suffix;marker(name,m['position'],extra={'radius':m['radius'],'route':m['id']});markers.append({'id':name,'position':[m['position'][k]for k in 'xyz'],'radius':m['radius']})

def actor(file,name,g,height,heading,posed=False):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(file));items=set(bpy.data.objects)-before
    if posed:
      action=next((a for a in bpy.data.actions if 'Baka_Idle' in a.name),None)
      for o in items:
       if o.type=='ARMATURE' and action:
        o.animation_data_create()
        for track in o.animation_data.nla_tracks:track.mute=True
        o.animation_data.action=action
        if len(action.slots):o.animation_data.action_slot=action.slots[0]
      if action:scene.frame_set(int(action.frame_range[0]))
    bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();pts=[]
    for o in items:
      if o.type!='MESH':continue
      if posed:
        evaluated=o.evaluated_get(deps);mesh=evaluated.to_mesh();pts.extend(evaluated.matrix_world@v.co for v in mesh.vertices);evaluated.to_mesh_clear()
      else:pts.extend(o.matrix_world@Vector(c)for c in o.bound_box)
    lo=Vector([min(p[i]for p in pts)for i in range(3)]);hi=Vector([max(p[i]for p in pts)for i in range(3)]);scale=height/(hi.z-lo.z)
    root=bpy.data.objects.new(name,None);C['ACTORS'].objects.link(root)
    for o in items:
      move(o,'ACTORS')
      if o.parent not in items:o.parent=root
    root.scale=(scale,)*3;root.rotation_euler.z=heading;offset=Matrix.Rotation(heading,4,'Z')@Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))*scale;root.location=V(g)-offset
    return root,offset,{'width':(hi.x-lo.x)*scale,'height':height,'length':(hi.y-lo.y)*scale,'posed':posed}
player,player_offset,player_size=actor(ROOT/'public/models/avi-jetbike.glb','PLAYER_BASE_ORIGIN',D['start'],1.8,math.pi/2)
warden,_,warden_size=actor(ROOT/'public/models/enemy.glb','WARDEN_IDLE_POSED',D['warden'],2.15,math.pi/2,True)
for name,p in [('MUZZLE_LEFT',D['player']['muzzleLeft']),('MUZZLE_RIGHT',D['player']['muzzleRight'])]:
    g=D['start'];o=marker(name,{'x':g['x']-p['z'],'y':g['y']+p['y'],'z':g['z']+p['x']},'measured hero socket',{'player_local_xyz':[p[k]for k in 'xyz']});o.empty_display_size=.12

scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs[0].default_value=(.12,.075,.075,1);bg.inputs[1].default_value=.8
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;move(sun,'CAMERAS');sun.data.energy=2.6;sun.rotation_euler=(.6,-.6,-.8)
bpy.ops.object.light_add(type='AREA',location=(-25,-10,80));light=bpy.context.object;move(light,'CAMERAS');light.data.energy=18000;light.data.size=80
bpy.ops.object.camera_add();cam=bpy.context.object;move(cam,'CAMERAS');scene.camera=cam;cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=12/math.tan(math.radians(40));cam.data.clip_start=.05;cam.data.clip_end=600
cam.location=V((-63.2,-2,33.3));cam.rotation_euler=(V((-27,-8.2,32.1))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
bpy.context.preferences.filepaths.save_version=0
BLEND=OUT/'bridgehead-v2.blend';bpy.ops.wm.save_as_mainfile(filepath=str(BLEND));bpy.ops.file.make_paths_relative();bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
print('BLENDER_SCENE_FIRST_SAVED '+str(BLEND)+' '+json.dumps({'player':player_size,'warden':warden_size}),flush=True)

def bounds(objects):
    pts=[o.matrix_world@Vector(c)for o in objects if o.type=='MESH'for c in o.bound_box];lo=Vector([min(p[i]for p in pts)for i in range(3)]);hi=Vector([max(p[i]for p in pts)for i in range(3)])
    return {'min':[lo.x,lo.z,-hi.y],'max':[hi.x,hi.z,-lo.y]}
def tris(objects):return sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in objects if o.type=='MESH')
EXPORT=bpy.data.collections.new('EXPORT_TEMP');scene.collection.children.link(EXPORT)
for m in M:
    items=[]
    for o in C['VIS_EDITABLE'].objects:
      if o.data.materials[0]!=m:continue
      copy=o.copy();copy.data=o.data.copy();EXPORT.objects.link(copy);items.append(copy)
    bpy.ops.object.select_all(action='DESELECT')
    for o in items:o.select_set(True)
    bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();o=items[0];o.name=m.name.replace(' ','_');o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
bpy.context.view_layer.update();triangle_count=tris(EXPORT.objects);kit_bounds=bounds(EXPORT.objects);assert triangle_count<20000
bpy.ops.object.select_all(action='DESELECT')
for o in EXPORT.objects:o.select_set(True)
for o in C['MARKERS'].objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False)
for o in list(EXPORT.objects):bpy.data.objects.remove(o,do_unlink=True)
bpy.data.collections.remove(EXPORT)
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(GLB));imported=set(bpy.data.objects)-before;bpy.context.view_layer.update();roundtrip={'meshes':sum(o.type=='MESH'for o in imported),'triangles':tris(imported),'bounds':bounds(imported)}
assert roundtrip['meshes']==5 and roundtrip['triangles']==triangle_count
for o in imported:bpy.data.objects.remove(o,do_unlink=True)
blob=GLB.read_bytes();gltf=json.loads(blob[20:20+struct.unpack_from('<I',blob,12)[0]]);texture_count=len(gltf.get('images',[]));assert texture_count>=5
receipt={'asset':'bridgehead-route','version':2,'blender':bpy.app.version_string,'layout':'art/bridgehead/bridgehead-v2-layout.json','layoutSha256':hashlib.sha256(LAYOUT.read_bytes()).hexdigest(),
 'sourceContext':{'path':'art/full-level/full-level.blend','linkedOnly':True,'environmentScale':3,'sourceGLB':'public/models/level1.glb','sha256':hashlib.sha256((ROOT/'public/models/level1.glb').read_bytes()).hexdigest(),'preserved':True},
 'output':{'path':'public/models/bridgehead-route.glb','sha256':hashlib.sha256(blob).hexdigest(),'bytes':len(blob),'triangles':triangle_count,'meshes':5,'materials':5,'textures':texture_count,'animations':0,'bounds':kit_bounds,'transform':'identity; already authored in scale-three world metres'},
 'authoring':{'path':'art/bridgehead/bridgehead-v2.blend','editableMeshObjects':len(C['VIS_EDITABLE'].objects),'process':'Blender background; scene saved before export or runtime activation','surfacePass':'Custom authored mesh plates with bevel normals and embedded 64px panel/grain textures; collision references remain exact boxes.'},
 'collision':{'boxes':[{'id':b['id'],'center':[b['center'][k]for k in 'xyz'],'size':[b['size'][k]for k in 'xyz']}for b in D['world']['boxes']]},'markers':markers,'roundtrip':roundtrip,'previewBike':player_size,'previewWarden':warden_size,
 'rights':'Owner attestation accepted in docs/BRIDGEHEAD_ITERATION_REVIEW.md; not an independently audited license record.',
 'limitations':['Offline preview is not natural-input evidence.','Runtime must scale source context and collision by3 while leaving this overlay identity.','Player origin is assembly base0 without legacy hover. Warden preview evaluates Baka_Idle before normalization.']}
(OUT/'verification.json').write_text(json.dumps(receipt,indent=2)+'\n');(OUT/'bridgehead-markers.json').write_text(json.dumps({'version':2,'units':'metres','axes':'Y-up','markers':markers},indent=2)+'\n')
print('BRIDGEHEAD_V2_EXPORTED '+json.dumps(receipt['output']),flush=True)

import runpy
runpy.run_path(str(ROOT/'scripts/render-bridgehead-v2.py'),run_name='__main__')
print('V2_RENDER_COMPLETE',flush=True)
