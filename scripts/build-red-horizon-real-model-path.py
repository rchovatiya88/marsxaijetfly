"""Build real-model Red Horizon path visuals from supplied GLB assets.

This opens art/full-level/full-level.blend, adds non-runtime route overlays using
art/real-path/red-horizon-real-path-layout.json, imports the AVI jetbike and
Warden for scale, renders a design image set, and saves a separate Blender copy.

It does not modify runtime GLBs.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art" / "real-path"
RAW = ART / "raw"
FULL_BLEND = ROOT / "art" / "full-level" / "full-level.blend"
LAYOUT = ART / "red-horizon-real-path-layout.json"

RAW.mkdir(parents=True, exist_ok=True)

if not FULL_BLEND.exists():
    raise FileNotFoundError(f"Missing normalized full-level Blender source: {FULL_BLEND}")
if not LAYOUT.exists():
    raise FileNotFoundError(f"Missing real-model path layout: {LAYOUT}")

D = json.loads(LAYOUT.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def V(g: dict[str, float] | tuple[float, float, float], lift: float = 0.0) -> Vector:
    if isinstance(g, dict):
        return Vector((g["x"], -g["z"], g["y"] + lift))
    return Vector((g[0], -g[2], g[1] + lift))


def game_dict(x: float, y: float, z: float) -> dict[str, float]:
    return {"x": x, "y": y, "z": z}


def clean_collection(name: str) -> bpy.types.Collection:
    old = bpy.data.collections.get(name)
    if old:
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        for collection in list(bpy.data.collections):
            if old.name in collection.children:
                collection.children.unlink(old)
        bpy.data.collections.remove(old)
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to(collection: bpy.types.Collection, obj: bpy.types.Object) -> bpy.types.Object:
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def make_mat(name: str, color: tuple[float, float, float], emission: float) -> bpy.types.Material:
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.5
    return mat


def make_curve_path(
    collection: bpy.types.Collection,
    name: str,
    points: list[dict[str, float]],
    mat: bpy.types.Material,
    lift: float = 0.55,
    bevel: float = 0.024,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 3
    curve.bevel_depth = bevel
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, game in zip(spline.points, points):
        point.co = (*V(game, lift), 1.0)
    obj = bpy.data.objects.new(name, curve)
    obj.data.materials.append(mat)
    obj["purpose"] = "Real-model path guide only; not runtime collision."
    collection.objects.link(obj)
    return obj


def game_from_blender(v: Vector) -> dict[str, float]:
    return {"x": v.x, "y": v.z, "z": -v.y}


def ray_ground(scene: bpy.types.Scene, deps: bpy.types.Depsgraph, g: dict[str, float]) -> dict[str, object] | None:
    origin = Vector((g["x"], -g["z"], 40.0))
    direction = Vector((0, 0, -1))
    hit, loc, normal, face_index, obj, matrix = scene.ray_cast(deps, origin, direction, distance=110)
    if not hit:
        return None
    game = game_from_blender(loc)
    return {
        "x": g["x"],
        "y": game["y"],
        "z": g["z"],
        "surfaceObject": obj.name if obj else None,
        "deltaY": g["y"] - game["y"],
    }


def add_surface_route_decals(
    collection: bpy.types.Collection,
    scene: bpy.types.Scene,
    deps: bpy.types.Depsgraph,
    route_name: str,
    points: list[dict[str, float]],
    mat: bpy.types.Material,
    max_hover: float = 1.65,
) -> list[dict[str, object]]:
    receipts: list[dict[str, object]] = []
    current: list[dict[str, float]] = []
    current_index = 0

    def flush(end_index: int) -> None:
        nonlocal current, current_index
        if len(current) >= 2:
            make_curve_path(
                collection,
                f"{route_name}_SURFACE_DECAL_{current_index}_{end_index}",
                current,
                mat,
                lift=0.08,
                bevel=0.016,
            )
        current = []
        current_index = end_index

    for index, point in enumerate(points):
        ground = ray_ground(scene, deps, point)
        if ground is None:
            flush(index)
            receipts.append({"index": index, "beat": point.get("beat"), "mode": "no-ground"})
            continue
        delta = float(ground["deltaY"])
        receipt = {
            "index": index,
            "beat": point.get("beat"),
            "surfaceObject": ground["surfaceObject"],
            "groundY": round(float(ground["y"]), 3),
            "routeY": round(float(point["y"]), 3),
            "deltaY": round(delta, 3),
        }
        if -0.35 <= delta <= max_hover:
            projected = {"x": point["x"], "y": float(ground["y"]), "z": point["z"]}
            current.append(projected)
            receipt["mode"] = "surface-decal"
        else:
            flush(index)
            receipt["mode"] = "air-gate-needed"
        receipts.append(receipt)
    flush(len(points))
    return receipts


def add_air_gate(
    collection: bpy.types.Collection,
    name: str,
    center: dict[str, float],
    next_point: dict[str, float],
    mat: bpy.types.Material,
    radius: float = 1.15,
) -> bpy.types.Object:
    forward = Vector((next_point["x"] - center["x"], 0, next_point["z"] - center["z"]))
    if forward.length < 0.001:
        forward = Vector((1, 0, 0))
    forward.normalize()
    up = Vector((0, 0, 1))
    right = up.cross(forward)
    if right.length < 0.001:
        right = Vector((1, 0, 0))
    right.normalize()
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = 0.025
    curve.bevel_resolution = 3
    ring = curve.splines.new("POLY")
    count = 72
    ring.points.add(count)
    c = V(center)
    for index in range(count + 1):
        angle = (index % count) / count * math.tau
        pos = c + right * math.cos(angle) * radius + up * math.sin(angle) * radius
        ring.points[index].co = (*pos, 1.0)
    obj = bpy.data.objects.new(name, curve)
    obj.data.materials.append(mat)
    obj["purpose"] = "Vertical hover/air gate, used where the route intentionally leaves a surface."
    collection.objects.link(obj)
    return obj


def add_text(
    collection: bpy.types.Collection,
    name: str,
    text: str,
    game_pos: dict[str, float] | tuple[float, float, float],
    mat: bpy.types.Material,
    size: float = 0.82,
    lift: float = 1.4,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.resolution_u = 4
    obj = bpy.data.objects.new(name, curve)
    obj.location = V(game_pos, lift)
    obj.data.materials.append(mat)
    obj["purpose"] = "Real-model path annotation only; not shipped gameplay art."
    collection.objects.link(obj)
    return obj


def add_ring(
    collection: bpy.types.Collection,
    name: str,
    game_pos: dict[str, float],
    mat: bpy.types.Material,
    radius: float = 0.95,
    lift: float = 0.4,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = 0.016
    curve.bevel_resolution = 3
    poly = curve.splines.new("POLY")
    count = 64
    poly.points.add(count)
    for i in range(count + 1):
        angle = (i % count) / count * math.tau
        x = game_pos["x"] + math.cos(angle) * radius
        z = game_pos["z"] + math.sin(angle) * radius
        p = V(game_dict(x, game_pos["y"], z), lift)
        poly.points[i].co = (*p, 1.0)
    obj = bpy.data.objects.new(name, curve)
    obj.data.materials.append(mat)
    collection.objects.link(obj)
    return obj


def add_actor(
    collection: bpy.types.Collection,
    source: Path,
    name: str,
    game_pos: dict[str, float],
    target: dict[str, float],
    target_height: float,
    posed: bool = False,
) -> bpy.types.Object:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported = set(bpy.data.objects) - before
    if posed:
        action = next((action for action in bpy.data.actions if "Baka_Idle" in action.name), None)
        if action:
            for obj in imported:
                if obj.type == "ARMATURE":
                    obj.animation_data_create()
                    obj.animation_data.action = action
                    if hasattr(obj.animation_data, "action_slot") and getattr(action, "slots", None):
                        if len(action.slots):
                            obj.animation_data.action_slot = action.slots[0]
            bpy.context.scene.frame_set(int(action.frame_range[0]))
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for obj in imported:
        if obj.type != "MESH":
            continue
        if posed:
            evaluated = obj.evaluated_get(deps)
            mesh = evaluated.to_mesh()
            points.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
            evaluated.to_mesh_clear()
        else:
            points.extend(obj.matrix_world @ Vector(c) for c in obj.bound_box)
    lo = Vector([min(p[i] for p in points) for i in range(3)])
    hi = Vector([max(p[i] for p in points) for i in range(3)])
    scale = target_height / max(0.001, hi.z - lo.z)
    heading = math.atan2(target["x"] - game_pos["x"], target["z"] - game_pos["z"])
    root = bpy.data.objects.new(name, None)
    collection.objects.link(root)
    root.scale = (scale, scale, scale)
    root.rotation_euler.z = heading
    offset = Matrix.Rotation(heading, 4, "Z") @ Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)) * scale
    root.location = V(game_pos) - offset
    for obj in imported:
        move_to(collection, obj)
        if obj.parent not in imported:
            obj.parent = root
    root["targetHeight"] = target_height
    root["purpose"] = "Scale reference actor in real-model path design scene."
    return root


def pose(root: bpy.types.Object | None, p: dict[str, float], target: dict[str, float], skinned: bool = False) -> None:
    if root is None:
        return
    root.rotation_euler.z = math.atan2(target["x"] - p["x"], target["z"] - p["z"])
    root.location = (0, 0, 0)
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for obj in root.children_recursive:
        if obj.type != "MESH":
            continue
        if skinned:
            evaluated = obj.evaluated_get(deps)
            mesh = evaluated.to_mesh()
            points.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
            evaluated.to_mesh_clear()
        else:
            points.extend(obj.matrix_world @ Vector(c) for c in obj.bound_box)
    if not points:
        return
    lo = Vector([min(q[i] for q in points) for i in range(3)])
    hi = Vector([max(q[i] for q in points) for i in range(3)])
    root.location = V(p) - Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    bpy.context.view_layer.update()


def set_chase_camera(
    cam: bpy.types.Object,
    p: dict[str, float],
    target: dict[str, float],
    camera: dict[str, float],
    extra_distance: float = 0.0,
) -> dict[str, object]:
    forward = Vector((target["x"] - p["x"], 0, target["z"] - p["z"]))
    if forward.length < 0.001:
        forward = Vector((1, 0, 0))
    forward.normalize()
    right = Vector((-forward.z, 0, forward.x))
    eye = (
        Vector((p["x"], p["y"] + camera["height"], p["z"]))
        - forward * (camera["distance"] + extra_distance)
        + right * camera["shoulder"]
    )
    cam.data.type = "PERSP"
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 24
    cam.data.lens = 12 / math.tan(math.radians(camera["fov"] / 2))
    cam.location = V(eye)
    cam.rotation_euler = (V(target, 0.5) - cam.location).to_track_quat("-Z", "Y").to_euler()
    return {"player": p, "target": target, "camera": [round(eye.x, 3), round(eye.y, 3), round(eye.z, 3)]}


def set_ortho_camera(
    cam: bpy.types.Object,
    eye: tuple[float, float, float],
    target: tuple[float, float, float],
    scale: float,
) -> dict[str, object]:
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = scale
    cam.location = V(eye)
    cam.rotation_euler = (V(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    return {"eye": list(eye), "target": list(target), "orthoScale": scale}


def set_free_camera(
    cam: bpy.types.Object,
    eye: tuple[float, float, float],
    target: tuple[float, float, float],
    fov: float,
) -> dict[str, object]:
    cam.data.type = "PERSP"
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 24
    cam.data.lens = 12 / math.tan(math.radians(fov / 2))
    cam.location = V(eye)
    cam.rotation_euler = (V(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    return {"eye": list(eye), "target": list(target), "verticalFov": fov}


if Path(bpy.data.filepath).resolve() != FULL_BLEND.resolve():
    bpy.ops.wm.open_mainfile(filepath=str(FULL_BLEND))
scene = bpy.context.scene
deps = bpy.context.evaluated_depsgraph_get()
overlay = clean_collection("RED_HORIZON_REAL_PATH_OVERLAY")
actors = clean_collection("RED_HORIZON_REAL_PATH_ACTORS")

cyan = make_mat("RH high route cyan", (0.0, 0.82, 0.72), 1.8)
amber = make_mat("RH low route amber", (1.0, 0.43, 0.06), 1.7)
white = make_mat("RH readable white", (0.96, 0.93, 0.82), 1.3)
red = make_mat("RH Warden red", (1.0, 0.09, 0.03), 1.9)
green = make_mat("RH extraction green", (0.3, 1.0, 0.42), 1.7)

grounding_receipts = {
    "highRoute": add_surface_route_decals(overlay, scene, deps, "HIGH_ROUTE_REAL_UPPER_BRIDGE", D["highRoute"], cyan),
    "lowRoute": add_surface_route_decals(overlay, scene, deps, "LOW_ROUTE_REAL_LOWER_BRIDGE", D["lowRoute"], amber),
    "extractionPath": add_surface_route_decals(
        overlay, scene, deps, "EXTRACTION_ROUTE_REAL_OUTPOST", D["extractionPath"], green, max_hover=1.8
    ),
}
for point in D["highRoute"][1:-1]:
    add_ring(overlay, "HIGH_BEAT_" + point["beat"].replace(" ", "_")[:30], point, cyan, 0.55)
for point in D["lowRoute"][1:-1]:
    add_ring(overlay, "LOW_BEAT_" + point["beat"].replace(" ", "_")[:30], point, amber, 0.5)
add_ring(overlay, "WARDEN_ARENA_RING", D["warden"], red, 1.35, 0.35)
add_ring(overlay, "EXTRACTION_PAD_RING", D["extraction"], green, D["extraction"]["radius"], 0.25)

add_text(overlay, "LABEL_START", "START / REAL BRIDGEHEAD", D["start"], white, 0.72, 1.7)
add_text(overlay, "LABEL_SPLIT", "ROUTE SPLIT", D["fork"], white, 0.62, 1.4)
add_text(overlay, "LABEL_HIGH", "HIGH: UPPER BRIDGE CHARGE", D["highRoute"][4], cyan, 0.58, 1.45)
add_text(overlay, "LABEL_LOW", "LOW: LOWER BRIDGE SHIELD", D["lowRoute"][3], amber, 0.58, 1.25)
add_text(overlay, "LABEL_WARDEN", "WARDEN COURT", D["warden"], red, 0.78, 2.5)
add_text(overlay, "LABEL_EXIT", "EXTRACT", D["extraction"], green, 0.72, 1.6)

player = add_actor(
    actors,
    ROOT / "public" / "models" / "avi-jetbike.glb",
    "AVI_JETBIKE_REAL_PATH_SCALE",
    D["start"],
    D["fork"],
    D["player"]["targetHeight"],
)
warden = add_actor(
    actors,
    ROOT / "public" / "models" / "enemy.glb",
    "WARDEN_REAL_PATH_SCALE",
    D["warden"],
    D["lowPeek"],
    D.get("wardenActor", {}).get("targetHeight", 2.05),
    posed=True,
)

scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
try:
    scene.render.engine = "BLENDER_WORKBENCH"
except TypeError:
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
if scene.render.engine == "BLENDER_WORKBENCH":
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
elif hasattr(scene, "eevee"):
    if hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 16
    if hasattr(scene.eevee, "use_gtao"):
        scene.eevee.use_gtao = True
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.10, 0.12, 0.15, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.65

cam = scene.camera
if cam is None:
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    scene.camera = cam
cam.data.clip_start = 0.05
cam.data.clip_end = 600

shots = [
    {
        "id": "00_real_model_overview",
        "title": "Real model route: twin bridges into Warden court",
        "beat": "The supplied level already contains the playable structure: a left bridgehead, upper bridge, lower bridge, right industrial court, and outpost extraction.",
        "playerAction": "Read the complete route before flying: split, bridge choice, Warden fight, extraction.",
        "developerTarget": "Build gameplay from the real bridge surfaces in the supplied model, not from an invented replacement scene.",
        "kind": "ortho",
        "eye": (58, 82, 46),
        "target": (6, -1.0, -4),
        "scale": 64,
        "player": D["start"],
        "targetPoint": D["warden"],
    },
    {
        "id": "01_left_bridgehead_start",
        "title": "Start on the real left bridgehead surface",
        "beat": "The playable start now sits on a measured model surface near the bridge split. The cannon remains a landmark in the world, not the route foundation.",
        "playerAction": "Accelerate forward, read the split, and choose upper bridge speed or lower bridge safety.",
        "developerTarget": "Set spawn, first camera frame, and mission copy around this actual surface height.",
        "kind": "chase",
        "player": D["start"],
        "targetPoint": D["fork"],
        "extraDistance": 1.0,
    },
    {
        "id": "02_bridge_route_split",
        "title": "Choose upper bridge or lower bridge",
        "beat": "Both routes come from real level modules. The upper bridge is the fast charge route; the lower bridge is the shield route with a tighter steering test.",
        "playerAction": "Commit to the upper bridge for charged shots, or drop to the lower bridge for shield and side entry.",
        "developerTarget": "Use this split for route reward locking, UI prompt timing, and first-player comprehension tests.",
        "kind": "chase",
        "player": D["fork"],
        "targetPoint": D["highRoute"][3],
        "extraDistance": 2.0,
    },
    {
        "id": "03_high_upper_bridge",
        "title": "High route follows the real upper bridge",
        "beat": "The high line is no longer a floating ribbon. It rides the named upper bridge pieces and the nearby industrial deck surfaces.",
        "playerAction": "Boost across the upper bridge, collect charged shots, then enter the court exposed.",
        "developerTarget": "Fit the hover lane, decals, charge pickup, and collision proxy to the upper bridge deck width.",
        "kind": "free",
        "player": D["highRoute"][3],
        "targetPoint": D["highRoute"][6],
        "eye": (-9.0, 6.0, -18.2),
        "target": (-2.4, -0.35, -11.8),
        "fov": 52,
    },
    {
        "id": "04_low_lower_bridge",
        "title": "Low route follows the real lower bridge",
        "beat": "The shield route now uses the lower bridge span. The pipe assets are supporting industrial dressing, not the whole driving surface.",
        "playerAction": "Drop to the lower bridge, hold center through the narrow lane, then climb into side cover.",
        "developerTarget": "Create a readable low hover lane with forgiving collision margins over the real lower bridge modules.",
        "kind": "chase",
        "player": D["lowRoute"][2],
        "targetPoint": D["lowRoute"][4],
        "extraDistance": 2.2,
    },
    {
        "id": "05_warden_industrial_court",
        "title": "Warden staged as an elite rival in the real court",
        "beat": "Both bridge choices converge in the right industrial court. The Warden stays at supplied-character scale and needs combat state art around it.",
        "playerAction": "Use the route reward: high spends charge windows; low uses shield and cover timing.",
        "developerTarget": "Tune Warden scale, red state effects, cover reads, projectile lanes, and camera framing in this court.",
        "kind": "free",
        "player": D["highDodge"],
        "targetPoint": D["warden"],
        "eye": (10.4, 4.2, -22.0),
        "target": (18.4, 0.7, -16.2),
        "fov": 58,
    },
    {
        "id": "06_extraction_outpost",
        "title": "Extraction at the far-right outpost pad",
        "beat": "The finish pulls the player out of the arena toward a separate pad, giving the vertical slice a clean final objective.",
        "playerAction": "After defeating the Warden, clear the buildings and hold the extraction pad.",
        "developerTarget": "Implement exit activation, hold timer, result stats, and replay copy around this measured outpost point.",
        "kind": "free",
        "player": D["extractionPath"][1],
        "targetPoint": D["extraction"],
        "eye": (22.8, 4.6, -11.2),
        "target": (29.8, -1.1, -3.4),
        "fov": 54,
    },
    {
        "id": "07_dev_route_contract",
        "title": "Development contract from the supplied model",
        "beat": "The route coordinates, model anchors, actors, cameras, collision proxies, UI prompts, and playtest captures should all reference this same file.",
        "playerAction": "Use this view to check whether the browser build still matches the real model route.",
        "developerTarget": "Ship no runtime route that disagrees with the supplied level’s measured bridge surfaces.",
        "kind": "ortho",
        "eye": (16, 100, 8),
        "target": (7, -1, -5),
        "scale": 54,
        "player": D["fork"],
        "targetPoint": D["highRoute"][3],
    },
]

receipts = []
for shot in shots:
    pose(player, shot["player"], shot["targetPoint"])
    pose(warden, D["warden"], shot["player"], True)
    if shot["kind"] == "chase":
        camera_receipt = set_chase_camera(
            cam,
            shot["player"],
            shot["targetPoint"],
            D["camera"],
            shot.get("extraDistance", 0),
        )
    elif shot["kind"] == "free":
        camera_receipt = set_free_camera(cam, shot["eye"], shot["target"], shot["fov"])
    else:
        camera_receipt = set_ortho_camera(cam, shot["eye"], shot["target"], shot["scale"])
    raw = RAW / f"{shot['id']}.png"
    scene.render.filepath = str(raw)
    bpy.ops.render.render(write_still=True)
    receipts.append({"id": shot["id"], "raw": str(raw.relative_to(ROOT)).replace("\\", "/"), "camera": camera_receipt})

copy = ART / "red-horizon-real-model-path.blend"
scene["real_model_path_layout"] = "art/real-path/red-horizon-real-path-layout.json"
scene["real_model_path_layout_sha256"] = sha256(LAYOUT)
scene["real_model_path_note"] = "Design overlay only. Runtime GLBs are not exported or changed by this script."
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(copy))

manifest = {
    "name": "Red Horizon real-model path image set",
    "purpose": "Use the supplied level, AVI jetbike, and Warden models to define a playable twin-bridge route.",
    "source": {
        "levelBlend": str(FULL_BLEND.relative_to(ROOT)).replace("\\", "/"),
        "levelBlendSha256": sha256(FULL_BLEND),
        "layout": str(LAYOUT.relative_to(ROOT)).replace("\\", "/"),
        "layoutSha256": sha256(LAYOUT),
        "levelModel": "public/models/level1.glb",
        "levelModelSha256": sha256(ROOT / "public" / "models" / "level1.glb"),
        "navmesh": "public/models/level1_navmesh.glb",
        "player": "public/models/avi-jetbike.glb",
        "warden": "public/models/enemy.glb"
    },
    "output": {
        "blend": str(copy.relative_to(ROOT)).replace("\\", "/"),
        "rawDirectory": str(RAW.relative_to(ROOT)).replace("\\", "/")
    },
    "shots": [
        {
            "id": shot["id"],
            "title": shot["title"],
            "beat": shot["beat"],
            "playerAction": shot["playerAction"],
            "developerTarget": shot["developerTarget"],
            "raw": str((RAW / f"{shot['id']}.png").relative_to(ROOT)).replace("\\", "/")
        }
        for shot in shots
    ],
    "renderReceipts": receipts,
    "groundingReceipts": grounding_receipts,
    "limitations": D["limitations"] + [
        "Offline Blender images are design evidence; browser playtest evidence is still required.",
        "The cannon-platform path was rejected; this pass uses the real upper and lower bridge modules as the playable route."
    ]
}

(ART / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print("RED_HORIZON_REAL_MODEL_PATH_RENDERED " + json.dumps(manifest["output"]), flush=True)
