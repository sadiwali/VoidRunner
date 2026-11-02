"""Convert recovered Unity data into compact assets for the Phaser port.

Inputs:
  recovered/levels/lvl{1,2,3}.json   world-space dump of each built level
  recovered/sprites-and-clips.json   sprite rects + animation frame lists
  VOIDRUNNER_Data/sharedassets*.assets  (only to export the PNG textures)
Outputs (committed, so the web build needs no Python):
  web/public/assets/img/*.png
  web/public/assets/sprites.json
  web/public/assets/levels/lvl{1,2,3}.json

All positions stay in Unity units with y up; the game converts at load time.
Run:  python3 tools/build_web_assets.py   (needs `pip install UnityPy` for textures)
"""
import json, math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REC = os.path.join(ROOT, "recovered")
OUT = os.path.join(ROOT, "web", "public", "assets")
DATA = os.path.join(ROOT, "VOIDRUNNER_Data")

TEXTURES = ["spr_char", "map_Builder_v2", "spr_npc_turret", "spr_npc_molerat",
            "spr_hearts", "spr_title", "spr_mainBG", "spr_arrow_downright", "spr_vig",
            "spr_menu_play_1", "spr_menu_play_2", "spr_menu_back", "spr_menu_achievements", "spr_sayerBG"]


def r3(v):
    return round(v, 3)


def export_textures():
    try:
        import UnityPy
    except ImportError:
        print("UnityPy not installed; skipping texture export")
        return
    os.makedirs(os.path.join(OUT, "img"), exist_ok=True)
    for f in ["sharedassets0.assets", "sharedassets1.assets", "sharedassets2.assets", "sharedassets3.assets"]:
        env = UnityPy.load(os.path.join(DATA, f))
        for o in env.objects:
            if o.type.name != "Texture2D":
                continue
            d = o.read()
            if d.m_Name in TEXTURES:
                img = d.image
                if d.m_Name == "spr_vig":
                    img = img.resize((640, 512))
                img.save(os.path.join(OUT, "img", d.m_Name + ".png"), optimize=True)


def export_sprites(meta):
    frames = {}
    for name, s in meta["sprites"].items():
        if s["tex"] not in TEXTURES:
            continue
        frames[name] = dict(tex=s["tex"], x=round(s["x"]), y=round(s["y"]), w=round(s["w"]), h=round(s["h"]), ppu=s["ppu"])
    clips = {k: dict(frames=v["frames"], rate=v["rate"], stop=v["stop"]) for k, v in meta["clips"].items() if v["frames"]}
    json.dump(dict(frames=frames, clips=clips), open(os.path.join(OUT, "sprites.json"), "w"), separators=(",", ":"))
    return frames


def comp(o, t):
    return [c for c in o["comps"] if c["type"] == t]


def collider_rect(o, c):
    """World-space centre/size/rotation of a BoxCollider2D."""
    rot = math.radians(o["rot"])
    ox, oy = c["offset"]["x"] * o["sx"], c["offset"]["y"] * o["sy"]
    cx = o["x"] + ox * math.cos(rot) - oy * math.sin(rot)
    cy = o["y"] + ox * math.sin(rot) + oy * math.cos(rot)
    w, h = abs(c["size"]["x"] * o["sx"]), abs(c["size"]["y"] * o["sy"])
    deg = o["rot"] % 360
    if abs(deg - 90) < 0.5 or abs(deg - 270) < 0.5:
        w, h, deg = h, w, 0
    elif abs(deg) < 0.5 or abs(deg - 180) < 0.5 or abs(deg - 360) < 0.5:
        deg = 0
    return dict(x=r3(cx), y=r3(cy), w=r3(w), h=r3(h), rot=r3(o["rot"]) if deg else 0)


def sprite_of(o, frames):
    sr = comp(o, "SpriteRenderer")
    if not sr or not sr[0].get("sprite") or sr[0]["sprite"] not in frames:
        return None
    s = sr[0]
    col = s["color"]
    tint = (round(col["r"] * 255) << 16) | (round(col["g"] * 255) << 8) | round(col["b"] * 255)
    return dict(f=s["sprite"], x=r3(o["x"]), y=r3(o["y"]), sx=r3(o["sx"]), sy=r3(o["sy"]), rot=r3(o["rot"]),
                order=s.get("order", 0), tint=tint)


def convert_level(name, frames):
    objs = json.load(open(os.path.join(REC, "levels", name + ".json")))
    by_path = {o["path"]: o for o in objs}
    lvl = dict(solids=[], slopes=[], decor=[], checkpoints=[], molerats=[], turrets=[], death=[], exit=None,
               player=None, camera=None, bg=None)
    for o in objs:
        p, n = o["path"], o["name"]
        scripts = [c.get("script") for c in comp(o, "MonoBehaviour")]
        if n == "go_plr":
            box = comp(o, "BoxCollider2D")[0]
            lvl["player"] = dict(x=o["x"], y=o["y"], w=r3(box["size"]["x"]), h=r3(box["size"]["y"]),
                                 ox=r3(box["offset"]["x"]), oy=r3(box["offset"]["y"]))
        elif n == "cam_mainCam":
            lvl["camera"] = dict(x=o["x"], y=o["y"])
        elif n == "BG_mainBG":
            lvl["bg"] = sprite_of(o, frames)
        elif "Checkpoint" in scripts:
            lvl["checkpoints"].append(collider_rect(o, comp(o, "BoxCollider2D")[0]))
        elif "LevelReload" in scripts:
            lvl["death"].append(collider_rect(o, comp(o, "BoxCollider2D")[0]))
        elif "NextLevelCollider" in scripts:
            lvl["exit"] = collider_rect(o, comp(o, "BoxCollider2D")[0])
        elif n.startswith("gO_molerat") and p.count("/") <= 1:
            sens = {}
            for child in ("edgeChecker", "platformCheckUp", "platformCheckDown"):
                c = by_path.get(p + "/" + child)
                if c:
                    b = comp(c, "BoxCollider2D")[0]
                    # relative to the molerat, in its default (facing left, scale +5) frame
                    sens[child] = dict(x=r3(b["offset"]["x"] * 5), y=r3(b["offset"]["y"] * 5),
                                       w=r3(b["size"]["x"] * 5), h=r3(b["size"]["y"] * 5))
            body = comp(o, "BoxCollider2D")[0]
            lvl["molerats"].append(dict(x=o["x"], y=o["y"], w=r3(body["size"]["x"] * 5), h=r3(body["size"]["y"] * 5),
                                        ox=r3(body["offset"]["x"] * 5), sensors=sens))
        elif o["tag"] == "Turret":
            t = dict(x=o["x"], y=o["y"])
            for child in ("ShootPointLeft", "ShootPointRight"):
                c = by_path.get(p + "/" + child)
                t[child] = [c["x"], c["y"]]
            rng = by_path.get(p + "/AttackRangeTrigger/AttackRangeRight")
            t["range"] = r3(comp(rng, "CircleCollider2D")[0]["radius"] * abs(rng["sx"])) if rng else 12
            lvl["turrets"].append(t)
            col = by_path.get(p + "/Collider")
            if col:
                lvl["solids"].append(dict(collider_rect(col, comp(col, "BoxCollider2D")[0]), ground=True))
        else:
            boxes = [b for b in comp(o, "BoxCollider2D") if not b["trigger"]]
            spr = sprite_of(o, frames)
            if boxes and not p.startswith("go_plr") and "/gO_npc_turret" not in p:
                r = collider_rect(o, boxes[0])
                r["ground"] = o["tag"] == "ground"
                if r["rot"]:
                    lvl["slopes"].append(r)
                else:
                    lvl["solids"].append(r)
            if spr and "/gO_npc_turret" not in p:
                lvl["decor"].append(spr)
    lvl["decor"].sort(key=lambda d: d["order"])
    return lvl


def main():
    meta = json.load(open(os.path.join(REC, "sprites-and-clips.json")))
    os.makedirs(os.path.join(OUT, "levels"), exist_ok=True)
    if "--no-tex" not in sys.argv:
        export_textures()
    frames = export_sprites(meta)
    for name in ("lvl1", "lvl2", "lvl3"):
        lvl = convert_level(name, frames)
        json.dump(lvl, open(os.path.join(OUT, "levels", name + ".json"), "w"), separators=(",", ":"))
        print(name, {k: len(v) if isinstance(v, list) else bool(v) for k, v in lvl.items()})


if __name__ == "__main__":
    main()
