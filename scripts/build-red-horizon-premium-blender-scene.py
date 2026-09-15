"""Build a premium Blender visual-target scene for Red Horizon Twin Bridge Run.

This creates a non-runtime art-direction scene from the supplied full-level,
AVI jetbike, and Warden assets. It preserves the source level materials and
textures, then adds lighting, fog cards, route dressing, combat/extraction VFX,
and camera plates that translate the premium concept images back into real
model space.

It does not modify or export the supplied runtime GLBs.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "art" / "concepts" / "red-horizon-premium-blender"
RAW = OUT / "raw"
FULL_BLEND = ROOT / "art" / "full-level" / "full-level.blend"
LAYOUT = ROOT / "art" / "real-path" / "red-horizon-real-path-layout.json"

RAW.mkdir(parents=True, exist_ok=True)

if not FULL_BLEND.exists():
    raise FileNotFoundError(f"Missing full-level Blender source: {FULL_BLEND}")
if not LAYOUT.exists():
    raise FileNotFoundError(f"Missing Twin Bridge layout: {LAYOUT}")

D = json.loads(LAYOUT.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def V(game: dict[str, float] | tuple[float, float, float], lift: float = 0.0) -> Vector:
    if isinstance(game, dict):
        return Vector((game["x"], -game["z"], game["y"] + lift))
    return Vector((game[0], -game[2], game[1] + lift))


def G(x: float, y: float, z: float) -> dict[str, float]:
    return {"x": x, "y": y, "z": z}


def game_from_blender(v: Vector) -> dict[str, float]:
    return {"x": v.x, "y": v.z, "z": -v.y}


def collection(name: str, *, clean: bool = True) -> bpy.types.Collection:
    existing = bpy.data.collections.get(name)
    if clean and existing:
        for obj in list(existing.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        for parent in list(bpy.data.collections):
            if existing.name in parent.children:
                parent.children.unlink(existing)
        bpy.data.collections.remove(existing)
        existing = None
    if existing:
        return existing
    created = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(created)
    return created


def move_to(target: bpy.types.Collection, obj: bpy.types.Object) -> bpy.types.Object:
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def make_mat(
    name: str,
    color: tuple[float, float, float],
    *,
    alpha: float = 1.0,
    emission: float = 0.0,
    metallic: float = 0.0,
    roughness: float = 0.65,
) -> bpy.types.Material:
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, alpha)
    mat.use_nodes = True
    try:
        mat.blend_method = "BLEND" if alpha < 0.999 else "OPAQUE"
    except Exception:
        pass
    if hasattr(mat, "surface_render_method") and alpha < 0.999:
        try:
            mat.surface_render_method = "BLENDED"
        except Exception:
            pass
    if hasattr(mat, "use_screen_refraction"):
        mat.use_screen_refraction = False
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        inputs = bsdf.inputs
        if "Base Color" in inputs:
            inputs["Base Color"].default_value = (*color, alpha)
        if "Alpha" in inputs:
            inputs["Alpha"].default_value = alpha
        if "Emission Color" in inputs:
            inputs["Emission Color"].default_value = (*color, 1.0)
        if "Emission Strength" in inputs:
            inputs["Emission Strength"].default_value = emission
        if "Metallic" in inputs:
            inputs["Metallic"].default_value = metallic
        if "Roughness" in inputs:
            inputs["Roughness"].default_value = roughness
    return mat


def add_noise_to_material(
    mat: bpy.types.Material,
    dark: tuple[float, float, float],
    light: tuple[float, float, float],
    *,
    scale: float,
    detail: float = 7.0,
    roughness: float = 0.58,
    bump_strength: float = 0.0,
) -> None:
    mat.use_nodes = True
    tree = mat.node_tree
    bsdf = tree.nodes.get("Principled BSDF")
    if not bsdf:
        return
    noise = tree.nodes.new("ShaderNodeTexNoise")
    noise.name = mat.name + " Noise"
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = detail
    noise.inputs["Roughness"].default_value = roughness
    ramp = tree.nodes.new("ShaderNodeValToRGB")
    ramp.name = mat.name + " Color Ramp"
    ramp.color_ramp.elements[0].position = 0.20
    ramp.color_ramp.elements[0].color = (*dark, 1.0)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (*light, 1.0)
    tree.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    if "Base Color" in bsdf.inputs:
        tree.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    if bump_strength > 0 and "Normal" in bsdf.inputs:
        bump = tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = bump_strength
        bump.inputs["Distance"].default_value = 0.16
        tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        tree.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])


def material_image_names(mat: bpy.types.Material | None) -> list[str]:
    if not mat or not mat.use_nodes or not mat.node_tree:
        return []
    names: list[str] = []
    for node in mat.node_tree.nodes:
        if node.bl_idname != "ShaderNodeTexImage":
            continue
        image = getattr(node, "image", None)
        if image:
            names.append(image.name)
    return sorted(set(names))


def record_source_level_materials() -> dict[str, object]:
    """Record source level material slots without replacing their textures."""

    objects: list[dict[str, object]] = []
    unique_materials: dict[str, dict[str, object]] = {}
    for obj in sorted(bpy.data.objects, key=lambda item: item.name):
        if obj.type != "MESH" or not obj.name.startswith("chunk_q"):
            continue
        slots: list[dict[str, object]] = []
        for index, slot in enumerate(obj.material_slots):
            mat = slot.material
            mat_name = mat.name if mat else None
            image_names = material_image_names(mat)
            slots.append(
                {
                    "index": index,
                    "material": mat_name,
                    "imageTextures": image_names,
                }
            )
            if mat_name:
                unique_materials[mat_name] = {
                    "usesNodes": bool(mat and mat.use_nodes),
                    "imageTextures": image_names,
                    "diffuseColor": [round(float(value), 4) for value in (mat.diffuse_color if mat else [])],
                }
        objects.append({"object": obj.name, "slotCount": len(slots), "slots": slots})

    return {
        "policy": "preserve-source-level-material-slots-and-image-textures",
        "chunkMeshCount": len(objects),
        "uniqueMaterialCount": len(unique_materials),
        "uniqueImageTextureCount": len({name for item in unique_materials.values() for name in item["imageTextures"]}),
        "materials": unique_materials,
        "objects": objects,
    }


def ray_ground(scene: bpy.types.Scene, deps: bpy.types.Depsgraph, g: dict[str, float]) -> dict[str, object] | None:
    origin = Vector((g["x"], -g["z"], 40.0))
    hit, loc, normal, face_index, obj, matrix = scene.ray_cast(deps, origin, Vector((0, 0, -1)), distance=120)
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


def projected_points(scene: bpy.types.Scene, deps: bpy.types.Depsgraph, points: list[dict[str, float]], lift: float) -> tuple[list[dict[str, float]], list[dict[str, object]]]:
    projected: list[dict[str, float]] = []
    receipts: list[dict[str, object]] = []
    for index, point in enumerate(points):
        ground = ray_ground(scene, deps, point)
        if ground is None:
            projected.append(point)
            receipts.append({"index": index, "beat": point.get("beat"), "mode": "no-ground"})
            continue
        p = {"x": point["x"], "y": float(ground["y"]) + lift, "z": point["z"], "beat": point.get("beat", "")}
        projected.append(p)
        receipts.append(
            {
                "index": index,
                "beat": point.get("beat"),
                "mode": "surface-attached",
                "surfaceObject": ground["surfaceObject"],
                "groundY": round(float(ground["y"]), 3),
                "visualY": round(float(p["y"]), 3),
                "deltaY": round(float(p["y"] - float(ground["y"])), 3),
            }
        )
    return projected, receipts


def make_curve_path(
    target: bpy.types.Collection,
    name: str,
    points: list[dict[str, float]],
    mat: bpy.types.Material,
    *,
    bevel: float = 0.035,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 8
    curve.bevel_depth = bevel
    curve.bevel_resolution = 5
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for p, point in zip(spline.points, points):
        p.co = (*V(point), 1.0)
    obj = bpy.data.objects.new(name, curve)
    obj.data.materials.append(mat)
    obj["purpose"] = "Premium visual route dressing attached to measured source-model surfaces."
    target.objects.link(obj)
    return obj


def make_route_strip(
    target: bpy.types.Collection,
    name: str,
    points: list[dict[str, float]],
    mat: bpy.types.Material,
    *,
    width: float,
) -> bpy.types.Object:
    verts: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for index, point in enumerate(points):
        prev_p = points[max(0, index - 1)]
        next_p = points[min(len(points) - 1, index + 1)]
        tangent = Vector((next_p["x"] - prev_p["x"], 0, next_p["z"] - prev_p["z"]))
        if tangent.length < 0.001:
            tangent = Vector((1, 0, 0))
        tangent.normalize()
        right = Vector((-tangent.z, 0, tangent.x))
        left_game = G(point["x"] - right.x * width * 0.5, point["y"], point["z"] - right.z * width * 0.5)
        right_game = G(point["x"] + right.x * width * 0.5, point["y"], point["z"] + right.z * width * 0.5)
        verts.append(tuple(V(left_game)))
        verts.append(tuple(V(right_game)))
        if index > 0:
            faces.append((2 * index - 2, 2 * index - 1, 2 * index + 1, 2 * index))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    obj["purpose"] = "Aspirational visible hover-lane strip; runtime collision must be separately validated."
    target.objects.link(obj)
    return obj


def make_ring(
    target: bpy.types.Collection,
    name: str,
    center: dict[str, float],
    mat: bpy.types.Material,
    *,
    radius: float = 1.0,
    bevel: float = 0.03,
    lift: float = 0.05,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 24
    curve.bevel_depth = bevel
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    count = 96
    spline.points.add(count)
    for i in range(count + 1):
        angle = (i % count) / count * math.tau
        p = G(center["x"] + math.cos(angle) * radius, center["y"] + lift, center["z"] + math.sin(angle) * radius)
        spline.points[i].co = (*V(p), 1.0)
    obj = bpy.data.objects.new(name, curve)
    obj.data.materials.append(mat)
    obj["purpose"] = "Surface-attached objective/route ring."
    target.objects.link(obj)
    return obj


def make_vertical_beam(target: bpy.types.Collection, name: str, base: dict[str, float], mat: bpy.types.Material, *, height: float, bevel: float) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = bevel
    curve.bevel_resolution = 5
    spline = curve.splines.new("POLY")
    spline.points.add(1)
    spline.points[0].co = (*V(base, 0.05), 1.0)
    spline.points[1].co = (*V(base, height), 1.0)
    obj = bpy.data.objects.new(name, curve)
    obj.data.materials.append(mat)
    obj["purpose"] = "Extraction/objective beacon VFX concept, attached to measured pad point."
    target.objects.link(obj)
    return obj


def make_fog_card(
    target: bpy.types.Collection,
    name: str,
    center: tuple[float, float, float],
    size: tuple[float, float],
    yaw_degrees: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    w, h = size
    verts = [(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = V(center)
    obj.rotation_euler.z = math.radians(yaw_degrees)
    obj.data.materials.append(mat)
    obj["purpose"] = "Transparent dust/fog card for visual target renders only."
    target.objects.link(obj)
    return obj


def make_sun_disc(
    target: bpy.types.Collection,
    name: str,
    center: tuple[float, float, float],
    radius: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    verts: list[tuple[float, float, float]] = [(0, 0, 0)]
    faces: list[tuple[int, int, int]] = []
    count = 96
    for i in range(count):
        angle = i / count * math.tau
        verts.append((math.cos(angle) * radius, 0, math.sin(angle) * radius))
    for i in range(1, count + 1):
        faces.append((0, i, 1 if i == count else i + 1))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = V(center)
    obj.data.materials.append(mat)
    obj["purpose"] = "Visual sunset disc for premium concept matching; not runtime geometry."
    target.objects.link(obj)
    return obj


def add_text_label(target: bpy.types.Collection, name: str, text: str, point: dict[str, float], mat: bpy.types.Material) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = 0.55
    obj = bpy.data.objects.new(name, curve)
    obj.location = V(point, 1.15)
    obj.rotation_euler.x = math.radians(64)
    obj.data.materials.append(mat)
    obj["purpose"] = "Small editor label; hidden from beauty renders but available in the Blender scene."
    obj.hide_render = True
    target.objects.link(obj)
    return obj


def add_actor(
    target: bpy.types.Collection,
    source: Path,
    name: str,
    game_pos: dict[str, float],
    aim: dict[str, float],
    target_height: float,
    *,
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
            points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        raise RuntimeError(f"No mesh bounds found in {source}")
    lo = Vector([min(p[i] for p in points) for i in range(3)])
    hi = Vector([max(p[i] for p in points) for i in range(3)])
    scale = target_height / max(0.001, hi.z - lo.z)
    heading = math.atan2(aim["x"] - game_pos["x"], aim["z"] - game_pos["z"])
    root = bpy.data.objects.new(name, None)
    target.objects.link(root)
    root.scale = (scale, scale, scale)
    root.rotation_euler.z = heading
    offset = Matrix.Rotation(heading, 4, "Z") @ Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)) * scale
    root.location = V(game_pos) - offset
    for obj in imported:
        move_to(target, obj)
        if obj.parent not in imported:
            obj.parent = root
    root["source"] = rel(source)
    root["targetHeight"] = target_height
    root["purpose"] = "Supplied source actor staged for premium Blender scene."
    return root


def set_actor_render(root: bpy.types.Object, visible: bool) -> None:
    root.hide_viewport = not visible
    root.hide_render = not visible
    for obj in root.children_recursive:
        obj.hide_viewport = not visible
        obj.hide_render = not visible


def set_free_camera(cam: bpy.types.Object, eye: tuple[float, float, float], target: tuple[float, float, float], fov: float) -> dict[str, object]:
    cam.data.type = "PERSP"
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 24
    cam.data.lens = 12 / math.tan(math.radians(fov / 2))
    cam.location = V(eye)
    cam.rotation_euler = (V(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    return {"eye": list(eye), "target": list(target), "verticalFov": fov}


def set_chase_camera(
    cam: bpy.types.Object,
    p: dict[str, float],
    target: dict[str, float],
    *,
    height: float = 2.2,
    distance: float = 6.0,
    shoulder: float = 1.0,
    fov: float = 72,
) -> dict[str, object]:
    forward = Vector((target["x"] - p["x"], 0, target["z"] - p["z"]))
    if forward.length < 0.001:
        forward = Vector((1, 0, 0))
    forward.normalize()
    right = Vector((-forward.z, 0, forward.x))
    eye = Vector((p["x"], p["y"] + height, p["z"])) - forward * distance + right * shoulder
    return set_free_camera(cam, (eye.x, eye.y, eye.z), (target["x"], target["y"] + 0.65, target["z"]), fov)


def configure_render(scene: bpy.types.Scene) -> str:
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    chosen = ""
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
        try:
            scene.render.engine = engine
            chosen = engine
            break
        except TypeError:
            continue
    if hasattr(scene, "eevee"):
        if hasattr(scene.eevee, "taa_render_samples"):
            scene.eevee.taa_render_samples = 48
        if hasattr(scene.eevee, "use_gtao"):
            scene.eevee.use_gtao = True
        if hasattr(scene.eevee, "gtao_distance"):
            scene.eevee.gtao_distance = 4
        if hasattr(scene.eevee, "gtao_factor"):
            scene.eevee.gtao_factor = 1.3
    if chosen == "BLENDER_WORKBENCH":
        scene.display.shading.light = "STUDIO"
        scene.display.shading.color_type = "MATERIAL"
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        pass
    for look in ("AgX - Medium High Contrast", "Medium High Contrast", "AgX - High Contrast", "High Contrast", "None"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = -0.85
    scene.view_settings.gamma = 1.0
    return chosen


# Build scene.
if Path(bpy.data.filepath).resolve() != FULL_BLEND.resolve():
    bpy.ops.wm.open_mainfile(filepath=str(FULL_BLEND))

scene = bpy.context.scene
level_material_receipts = record_source_level_materials()
scene.render.engine = scene.render.engine
visual = collection("RED_HORIZON_PREMIUM_BLENDER_TARGET", clean=True)
actors = collection("RED_HORIZON_PREMIUM_ACTORS", clean=True)
lights = collection("RED_HORIZON_PREMIUM_LIGHTING", clean=True)

cyan = make_mat("RH Premium Charge Cyan", (0.0, 0.86, 0.78), emission=2.8, roughness=0.25)
cyan_strip = make_mat("RH Premium Charge Lane", (0.0, 0.58, 0.52), alpha=0.62, emission=1.4, roughness=0.35)
amber = make_mat("RH Premium Shield Amber", (1.0, 0.46, 0.10), emission=2.4, roughness=0.25)
amber_strip = make_mat("RH Premium Shield Lane", (0.92, 0.32, 0.05), alpha=0.58, emission=1.1, roughness=0.35)
red = make_mat("RH Premium Warden Red", (1.0, 0.06, 0.03), emission=3.2, roughness=0.3)
green = make_mat("RH Premium Extraction Green", (0.26, 1.0, 0.42), emission=3.0, roughness=0.25)
white = make_mat("RH Premium Warm Label", (1.0, 0.88, 0.66), emission=1.2, roughness=0.4)
dust_mat = make_mat("RH Premium Dust Fog Card", (0.78, 0.25, 0.08), alpha=0.075, emission=0.08, roughness=1.0)
sun_disc_mat = make_mat("RH Premium Painted Sun Disc", (1.0, 0.50, 0.12), alpha=0.72, emission=1.45, roughness=1.0)

# Lighting.
bpy.ops.object.light_add(type="SUN", location=(0, 0, 40), rotation=(math.radians(52), 0, math.radians(-37)))
sun = bpy.context.object
sun.name = "RH_MARS_LOW_SUN"
sun.data.energy = 1.75
sun.data.angle = math.radians(7.5)
if hasattr(sun.data, "use_shadow"):
    sun.data.use_shadow = False
move_to(lights, sun)
for name, pos, energy, color, size in [
    ("RH_START_WARM_KEY", (-18.0, 6.5, -4.0), 120, (1.0, 0.48, 0.22), 7.5),
    ("RH_BRIDGE_CYAN_FILL", (-5.0, 3.2, -12.0), 65, (0.15, 0.82, 0.92), 4.2),
    ("RH_WARDEN_RED_KEY", (18.5, 2.4, -16.0), 90, (1.0, 0.12, 0.05), 5.0),
    ("RH_EXTRACTION_GREEN_FILL", (29.8, 1.5, -3.4), 70, (0.25, 1.0, 0.40), 4.0),
]:
    bpy.ops.object.light_add(type="AREA", location=tuple(V(pos)))
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.color = color
    light.data.size = size
    if hasattr(light.data, "use_shadow"):
        light.data.use_shadow = False
    move_to(lights, light)

scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
if background:
    background.inputs[0].default_value = (0.72, 0.28, 0.14, 1.0)
    background.inputs[1].default_value = 0.13
scene.world.mist_settings.use_mist = True
scene.world.mist_settings.start = 18
scene.world.mist_settings.depth = 85
scene.world.mist_settings.falloff = "QUADRATIC"

# Route dressing attached to measured surfaces.
deps = bpy.context.evaluated_depsgraph_get()
high_points, high_receipts = projected_points(scene, deps, D["highRoute"], 0.055)
low_points, low_receipts = projected_points(scene, deps, D["lowRoute"], 0.055)
extraction_points, extraction_receipts = projected_points(scene, deps, D["extractionPath"], 0.065)

make_route_strip(visual, "RH_HIGH_ROUTE_UPPER_BRIDGE_SURFACE_LANE", high_points, cyan_strip, width=0.62)
make_curve_path(visual, "RH_HIGH_ROUTE_UPPER_BRIDGE_ENERGY_RAIL", high_points, cyan, bevel=0.025)
make_route_strip(visual, "RH_LOW_ROUTE_LOWER_BRIDGE_SURFACE_LANE", low_points, amber_strip, width=0.72)
make_curve_path(visual, "RH_LOW_ROUTE_LOWER_BRIDGE_ENERGY_RAIL", low_points, amber, bevel=0.025)
make_curve_path(visual, "RH_EXTRACTION_SURFACE_GUIDE", extraction_points, green, bevel=0.025)

for idx, p in enumerate(high_points[2:8], start=2):
    make_ring(visual, f"RH_HIGH_CHARGE_PICKUP_{idx:02d}", p, cyan, radius=0.55, bevel=0.02, lift=0.12)
for idx, p in enumerate(low_points[2:8], start=2):
    make_ring(visual, f"RH_LOW_SHIELD_PICKUP_{idx:02d}", p, amber, radius=0.55, bevel=0.02, lift=0.12)
make_ring(visual, "RH_START_PAD_RING_REAL_BRIDGEHEAD", high_points[0], white, radius=1.25, bevel=0.035, lift=0.12)
make_ring(visual, "RH_ROUTE_SPLIT_DECISION_RING", high_points[1], white, radius=1.15, bevel=0.035, lift=0.12)
make_ring(visual, "RH_WARDEN_RED_TELEGRAPH_RING", D["warden"], red, radius=1.65, bevel=0.045, lift=0.13)
make_ring(visual, "RH_WARDEN_RED_INNER_RING", D["warden"], red, radius=0.82, bevel=0.024, lift=0.16)
make_curve_path(visual, "RH_WARDEN_PROJECTILE_LANE", [D["warden"], D["highDodge"]], red, bevel=0.028)
make_ring(visual, "RH_EXTRACTION_HOLD_RING", D["extraction"], green, radius=D["extraction"]["radius"], bevel=0.035, lift=0.15)
make_vertical_beam(visual, "RH_EXTRACTION_VERTICAL_BEACON", D["extraction"], green, height=8.5, bevel=0.075)

# Atmospheric cards placed in canyon/outpost gaps. These are visual-only fog planes.
for i, (pos, size, yaw) in enumerate(
    [
        ((-8.0, -5.0, -4.0), (40, 7), 18),
        ((-2.0, -5.2, 7.5), (38, 6), -10),
        ((9.0, -4.2, -12.0), (34, 6), 24),
        ((21.0, -3.8, -8.0), (28, 5.5), -18),
        ((20.0, -2.6, -18.0), (24, 5), 4),
        ((31.0, -3.0, -2.5), (20, 4.5), -22),
    ],
    start=1,
):
    make_fog_card(visual, f"RH_DUST_FOG_CARD_{i:02d}", pos, size, yaw, dust_mat)
make_sun_disc(visual, "RH_PREMIUM_SUNSET_DISC", (38.0, 18.0, -58.0), 5.5, sun_disc_mat)

# Small editor labels are kept in the scene for designers, but renders focus on visual form.
add_text_label(visual, "RH_LABEL_START", "START", high_points[0], white)
add_text_label(visual, "RH_LABEL_HIGH", "CHARGE", high_points[4], cyan)
add_text_label(visual, "RH_LABEL_LOW", "SHIELD", low_points[3], amber)
add_text_label(visual, "RH_LABEL_WARDEN", "WARDEN", D["warden"], red)
add_text_label(visual, "RH_LABEL_EXTRACT", "EXTRACT", D["extraction"], green)

# Stage supplied actors for the four beats.
player_src = ROOT / "public" / "models" / "avi-jetbike.glb"
warden_src = ROOT / "public" / "models" / "enemy.glb"
player_height = float(D["player"].get("targetHeight", 1.8))
warden_height = float(D.get("wardenActor", {}).get("targetHeight", 2.05))
player_start = add_actor(actors, player_src, "AVI_JETBIKE_PREMIUM_START", D["start"], D["fork"], player_height)
player_split = add_actor(actors, player_src, "AVI_JETBIKE_PREMIUM_SPLIT", D["fork"], D["highRoute"][3], player_height)
player_combat = add_actor(actors, player_src, "AVI_JETBIKE_PREMIUM_COMBAT", D["highDodge"], D["warden"], player_height)
player_extract = add_actor(actors, player_src, "AVI_JETBIKE_PREMIUM_EXTRACTION", D["extractionPath"][1], D["extraction"], player_height)
warden = add_actor(actors, warden_src, "WARDEN_PREMIUM_REAL_MODEL_SCALE", D["warden"], D["highDodge"], warden_height, posed=True)
actors_by_shot = {
    "01_bridgehead_start": [player_start],
    "02_route_choice": [player_split],
    "03_warden_combat": [player_combat, warden],
    "04_extraction": [player_extract],
}
all_actor_roots = [player_start, player_split, player_combat, player_extract, warden]

# Cameras match the concept beats while staying in real model coordinates.
cam_data = bpy.data.cameras.new("RH_PREMIUM_RENDER_CAMERA")
cam = bpy.data.objects.new("RH_PREMIUM_RENDER_CAMERA", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.clip_start = 0.05
cam.data.clip_end = 800

shots = [
    {
        "id": "01_bridgehead_start",
        "title": "Bridgehead start rebuilt in real model space",
        "conceptReference": "docs/images/red-horizon-premium-concept-01-bridgehead-start.jpg",
        "truthReference": "docs/images/red-horizon-left-bridgehead-start.jpg",
        "buildIntent": "First playable camera with real bridgehead surface, cannon landmark, route visible ahead.",
        "cameraKind": "chase",
        "player": D["start"],
        "target": D["fork"],
        "height": 2.4,
        "distance": 6.8,
        "shoulder": 0.9,
        "fov": 68,
    },
    {
        "id": "02_route_choice",
        "title": "Upper and lower bridge choice rebuilt on supplied level",
        "conceptReference": "docs/images/red-horizon-premium-concept-02-route-choice.jpg",
        "truthReference": "docs/images/red-horizon-bridge-route-split.jpg",
        "buildIntent": "Show high cyan charge and low amber shield language attached to measured route surfaces.",
        "cameraKind": "free",
        "eye": (-17.0, 5.0, 2.8),
        "target": (-4.0, -1.6, 3.0),
        "fov": 55,
    },
    {
        "id": "03_warden_combat",
        "title": "Warden combat court rebuilt with real enemy scale",
        "conceptReference": "docs/images/red-horizon-premium-concept-03-warden-combat.jpg",
        "truthReference": "docs/images/red-horizon-warden-court.jpg",
        "buildIntent": "Stage supplied Warden as elite rival with red telegraph and projectile lane in real court.",
        "cameraKind": "free",
        "eye": (10.0, 4.3, -23.0),
        "target": (18.2, 0.55, -16.2),
        "fov": 58,
    },
    {
        "id": "04_extraction",
        "title": "Extraction outpost rebuilt as surface-held objective",
        "conceptReference": "docs/images/red-horizon-premium-concept-04-extraction.jpg",
        "truthReference": "docs/images/red-horizon-extraction-outpost.jpg",
        "buildIntent": "Keep extraction beacon and hold ring on the measured outpost pad.",
        "cameraKind": "free",
        "eye": (23.0, 5.0, -12.2),
        "target": (29.8, -1.1, -3.4),
        "fov": 54,
    },
]

engine = configure_render(scene)
render_receipts: list[dict[str, object]] = []
for shot in shots:
    for root in all_actor_roots:
        set_actor_render(root, root in actors_by_shot[shot["id"]])
    if shot["cameraKind"] == "chase":
        cam_receipt = set_chase_camera(
            cam,
            shot["player"],
            shot["target"],
            height=shot["height"],
            distance=shot["distance"],
            shoulder=shot["shoulder"],
            fov=shot["fov"],
        )
    else:
        cam_receipt = set_free_camera(cam, shot["eye"], shot["target"], shot["fov"])
    raw = RAW / f"{shot['id']}.png"
    scene.render.filepath = str(raw)
    bpy.ops.render.render(write_still=True)
    render_receipts.append({"id": shot["id"], "raw": rel(raw), "camera": cam_receipt})

# Leave all staged actors visible for designers opening the .blend.
for root in all_actor_roots:
    set_actor_render(root, True)

copy = OUT / "red-horizon-premium-blender-target.blend"
scene["red_horizon_premium_scene_layout"] = rel(LAYOUT)
scene["red_horizon_premium_scene_note"] = "Visual target scene only. Source GLBs are not exported or modified."
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(copy))

manifest = {
    "name": "Red Horizon premium Blender visual target",
    "created": "2026-09-15",
    "purpose": "Rebuild the premium concept image direction in the real supplied level model space using non-destructive Blender scene dressing while preserving source level materials and textures.",
    "engine": engine,
    "source": {
        "fullLevelBlend": rel(FULL_BLEND),
        "fullLevelBlendSha256": sha256(FULL_BLEND),
        "layout": rel(LAYOUT),
        "layoutSha256": sha256(LAYOUT),
        "levelModel": "public/models/level1.glb",
        "levelModelSha256": sha256(ROOT / "public" / "models" / "level1.glb"),
        "player": rel(player_src),
        "playerSha256": sha256(player_src),
        "warden": rel(warden_src),
        "wardenSha256": sha256(warden_src),
    },
    "output": {
        "blend": rel(copy),
        "rawDirectory": rel(RAW),
    },
    "levelMaterialReceipts": level_material_receipts,
    "groundingReceipts": {
        "highRoute": high_receipts,
        "lowRoute": low_receipts,
        "extractionPath": extraction_receipts,
    },
    "addedSceneCollections": [rel_path for rel_path in ["RED_HORIZON_PREMIUM_BLENDER_TARGET", "RED_HORIZON_PREMIUM_ACTORS", "RED_HORIZON_PREMIUM_LIGHTING"]],
    "shots": [
        {
            "id": shot["id"],
            "title": shot["title"],
            "conceptReference": shot["conceptReference"],
            "truthReference": shot["truthReference"],
            "buildIntent": shot["buildIntent"],
            "raw": rel(RAW / f"{shot['id']}.png"),
        }
        for shot in shots
    ],
    "renderReceipts": render_receipts,
    "acceptanceBoundary": [
        "This is a Blender visual-target scene, not shipped runtime geometry.",
        "The supplied full level, AVI jetbike and Warden assets are preserved and referenced by hash.",
        "The supplied level material slots and image textures are preserved; only added VFX/dressing materials are new.",
        "Route lanes, fog cards, beacons and telegraphs are added scene dressing and must be rebuilt/exported deliberately before runtime use.",
        "Collision remains governed by the Twin Bridge layout and must be separately implemented and tested.",
    ],
}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print("RED_HORIZON_PREMIUM_BLENDER_SCENE_RENDERED " + json.dumps(manifest["output"]), flush=True)
