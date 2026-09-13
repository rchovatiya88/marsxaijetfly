"""Build an ORIGINAL candidate layout study, not active runtime collision.

Run with Blender --background --factory-startup --python scripts/build-ridge-blockout.py.
All outputs are confined to art/ridge-run; supplied models are never read or altered.
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "art" / "ridge-run"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    bpy.data.collections.remove(collection)
scene = bpy.context.scene
collections = {}
for name in ["VIS", "COL", "NAV", "ROUTE_MARKERS", "LIGHTING_PREVIEW"]:
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    collections[name] = collection
scene["status"] = "CANDIDATE LAYOUT STUDY - NOT ACTIVE GAME COLLISION"
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0

def position(game):
    return (game[0], -game[2], game[1])

def material(name, color, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = 0.8
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    return mat

rust = material("Clay basalt", (0.32, 0.12, 0.075))
dark = material("Dark structural rock", (0.10, 0.13, 0.16))
sand = material("Pale landing surfaces", (0.54, 0.40, 0.29))
cyan = material("High route cyan", (0.04, 0.8, 1), 1.4)
amber = material("Low route amber", (1, 0.38, 0.025), 1.4)
red = material("Warden red", (0.9, 0.08, 0.03), 1)
white = material("Label ivory", (0.85, 0.87, 0.8), 0.4)

def move(obj, collection):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collections[collection].objects.link(obj)
    return obj

def box(name, game, dimensions, mat, collision=False, collection="VIS"):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position(game))
    obj = move(bpy.context.object, collection)
    obj.name = name
    obj.dimensions = (dimensions[0], dimensions[2], dimensions[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if collision:
        proxy = obj.copy()
        proxy.data = obj.data.copy()
        proxy.name = "COL_" + name
        collections["COL"].objects.link(proxy)
        proxy.hide_render = True
        proxy.display_type = "WIRE"
    return obj

box("Ground", (0, -0.7, -15), (34, 1, 68), rust, True)
for x in [-16, 16]:
    for index, z in enumerate([9, -5, -19, -34]):
        box("Ridge_%s_%s" % (x, index), (x, 3.5, z), (4, 8, 12), dark, True)
box("Launch_pad", (0, 0, 12), (10, 0.35, 7), sand, True)
box("High_bridge_deck", (-6, 6.6, -8), (7.5, 0.8, 18), sand, True)
for z in [-1, -15]:
    box("Bridge_pier_%s" % z, (-6, 3, z), (1.5, 6, 1.8), dark, True)
box("Low_passage_left", (1.8, 2.4, -8), (1, 5, 13), dark, True)
box("Low_passage_right", (10.2, 2.4, -8), (1, 5, 13), dark, True)
roof = box("Low_passage_roof", (6, 7.2, -8), (9.4, 0.8, 13), sand, True)
# Cutaway only in the authoring preview; selected-object GLB export retains roof.
roof.hide_render = True
roof.display_type = "WIRE"
roof["preview_note"] = "Roof hidden in render to reveal low gate; retained in shell export"
box("Warden_plinth", (0, 0.25, -30), (7, 0.5, 7), dark, True)
box("Extraction_pad", (0, 0, -41), (11, 0.35, 8), sand, True)

markers = [
    {"name": "player_spawn", "game": [0, 3, 12], "radius": 0},
    {"name": "high_gate", "game": [-6, 10, -8], "radius": 2.8, "route": "high", "color": "cyan"},
    {"name": "low_gate", "game": [6, 3.5, -8], "radius": 2.8, "route": "low", "color": "amber"},
    {"name": "warden", "game": [0, 0, -30], "radius": 0},
    {"name": "extraction", "game": [0, 3.5, -41], "radius": 4},
]
for marker in markers:
    marker["blender"] = list(position(marker["game"]))
    obj = bpy.data.objects.new(marker["name"], None)
    collections["ROUTE_MARKERS"].objects.link(obj)
    obj.location = marker["blender"]
    obj.empty_display_type = "SPHERE"
    obj.empty_display_size = max(0.5, marker["radius"])
    obj["game_x"], obj["game_y"], obj["game_z"] = marker["game"]
    obj["radius"] = marker["radius"]
    obj["status"] = "candidate"
    if marker["radius"]:
        bpy.ops.mesh.primitive_torus_add(major_radius=marker["radius"], minor_radius=0.16,
                                      major_segments=32, minor_segments=6,
                                      location=marker["blender"], rotation=(math.pi / 2, 0, 0))
        gate = move(bpy.context.object, "VIS")
        gate.name = "VIS_" + marker["name"]
        gate.data.materials.append(amber if marker["name"] == "low_gate" else cyan)

box("Warden_placeholder", (0, 2, -30), (2.6, 3.5, 2.6), red)
box("Bike_scale_placeholder", (0, 3, 12), (1.3, 0.6, 2.7), cyan)
for route, x, y, mat in [("HIGH", -6, 9, cyan), ("LOW", 6, 2.6, amber)]:
    for z in [5, 0, -5, -10, -15, -20]:
        box(route + "_route_dash_" + str(z), (x, y, z), (0.3, 0.08, 1.7), mat)
    nav = box("NAV_" + route + "_REFERENCE_ONLY", (x, y - 0.5, -8), (5, 0.03, 27), mat, collection="NAV")
    nav.hide_render = True
    nav.display_type = "WIRE"
    nav["purpose"] = "Layout reference strip; not a baked or connected navmesh"

def label(text, game, size=1):
    bpy.ops.object.text_add(location=position(game))
    obj = move(bpy.context.object, "LIGHTING_PREVIEW")
    obj.name = "LABEL_" + text
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.002
    obj.data.materials.append(white)

label("RIDGE RUN / CANDIDATE LAYOUT", (0, 0.1, 18), 1.15)
label("HIGH / BRIDGE", (-7, 7.1, -3), 0.6)
label("LOW / PASSAGE", (6, 0, -1), 0.6)
label("WARDEN", (0, 0.6, -27), 0.65)
label("EXTRACTION", (0, 0.3, -45), 0.65)

bpy.ops.object.camera_add(location=(51, -42, 57))
camera = move(bpy.context.object, "LIGHTING_PREVIEW")
camera.rotation_euler = (Vector((0, 15, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 79
scene.camera = camera
bpy.ops.object.light_add(type="AREA", location=(0, -10, 45))
light = move(bpy.context.object, "LIGHTING_PREVIEW")
light.data.energy = 45000
light.data.shape = "DISK"
light.data.size = 50
bpy.ops.object.light_add(type="SUN", location=(20, 10, 30))
sun = move(bpy.context.object, "LIGHTING_PREVIEW")
sun.data.energy = 2
sun.rotation_euler = (0.5, -0.4, -0.5)
scene.world.color = (0.14, 0.17, 0.22)
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1400
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT / "ridge-run-blockout.png")

def export_collection(name, filename):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collections[name].objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / filename), export_format="GLB",
                             use_selection=True, export_yup=True, export_extras=True)

export_collection("VIS", "ridge-run-shell.candidate.glb")
export_collection("COL", "ridge-run-collision.candidate.glb")
export_collection("ROUTE_MARKERS", "ridge-run-markers.candidate.glb")
(OUT / "ridge-run-markers.candidate.json").write_text(json.dumps({
    "status": "candidate-layout-study", "units": "metres", "runtimeAxes": "Y-up",
    "mapping": "Blender=(gameX,-gameZ,gameY); glTF export_yup restores runtime axes",
    "markers": markers,
}, indent=2) + "\n", encoding="utf-8")
bpy.ops.object.select_all(action="DESELECT")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "ridge-run-blockout.blend"))
bpy.ops.render.render(write_still=True)

# Reimport each exported file into a separate temporary scene and record proof.
proof = []
for filename in ["ridge-run-shell.candidate.glb", "ridge-run-collision.candidate.glb", "ridge-run-markers.candidate.glb"]:
    verification = bpy.data.scenes.new("VERIFY_" + filename)
    bpy.context.window.scene = verification
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT / filename))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    assert imported, "Empty reimport: " + filename
    if "markers" in filename:
        for marker in markers:
            found = [obj for obj in imported if obj.name.split(".")[0] == marker["name"]]
            assert len(found) == 1, marker["name"]
            assert (found[0].matrix_world.translation - Vector(marker["blender"])).length < 0.001
    proof.append({"file": filename, "bytes": (OUT / filename).stat().st_size,
                  "reimportedObjects": len(imported), "status": "passed"})
bpy.context.window.scene = scene
(OUT / "verification.json").write_text(json.dumps({"blender": bpy.app.version_string,
    "exports": proof, "render": "ridge-run-blockout.png",
    "limits": "Authoring reimport only; no runtime collision or performance validation"}, indent=2) + "\n")
print("RIDGE_BLOCKOUT_VERIFIED", json.dumps(proof))
