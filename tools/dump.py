import UnityPy, sys, json, math
D="/home/claude/VoidRunner/VOIDRUNNER_Data/"
env=UnityPy.load(D+"mainData")
tags=None
for o in env.objects:
    if o.type.name=="TagManager":
        tags=o.read_typetree()["tags"]
    if o.type.name=="Physics2DSettings":
        p=o.read_typetree(); print("phys2d", {k:p[k] for k in p if k in("m_Gravity","m_DefaultMaterial","m_VelocityIterations","m_LayerCollisionMatrix")})
    if o.type.name=="TimeManager": print("time",o.read_typetree())
print("tags",tags)
builtin={0:"Untagged",1:"Respawn",2:"Finish",3:"EditorOnly",5:"MainCamera",6:"Player",7:"GameController"}
def tagname(t): return tags[t-20000] if t>=20000 else builtin.get(t,str(t))

def q2z(q):  # rotation z in degrees
    x,y,z,w=q["x"],q["y"],q["z"],q["w"]
    return math.degrees(math.atan2(2*(w*z+x*y),1-2*(y*y+z*z)))
def dump(fname,out):
    env=UnityPy.load(D+fname)
    objs={o.path_id:o for o in env.objects}
    trs={}
    for o in env.objects:
        if o.type.name in("Transform",):
            trs[o.path_id]=o.read_typetree()
    def world(pid):
        t=trs[pid]; chain=[]
        while True:
            chain.append(t)
            f=t["m_Father"]["m_PathID"]
            if f==0 or f not in trs: break
            t=trs[f]
        # compose from root
        px=py=0; rot=0; sx=sy=1
        for t in reversed(chain):
            lp=t["m_LocalPosition"]; lr=q2z(t["m_LocalRotation"]); ls=t["m_LocalScale"]
            c,s=math.cos(math.radians(rot)),math.sin(math.radians(rot))
            x=lp["x"]*sx; y=lp["y"]*sy
            px+=c*x-s*y; py+=s*x+c*y
            rot+=lr; sx*=ls["x"]; sy*=ls["y"]
        return px,py,rot,sx,sy,chain[0]["m_LocalPosition"]["z"]
    gos=[]
    for pid,t in trs.items():
        go=objs[t["m_GameObject"]["m_PathID"]].read_typetree()
        path=[]; tt=t
        while True:
            g=objs[tt["m_GameObject"]["m_PathID"]].read_typetree(); path.append(g["m_Name"])
            f=tt["m_Father"]["m_PathID"]
            if f==0 or f not in trs: break
            tt=trs[f]
        px,py,rot,sx,sy,z=world(pid)
        e={"path":"/".join(reversed(path)),"name":go["m_Name"],"tag":tagname(go["m_Tag"]),"layer":go["m_Layer"],"active":go["m_IsActive"],
           "x":round(px,4),"y":round(py,4),"rot":round(rot,3),"sx":round(sx,4),"sy":round(sy,4),"comps":[]}
        for c in go["m_Component"]:
            cc=c["component"] if isinstance(c,dict) else (c[1] if isinstance(c,(tuple,list)) else c); cid=cc["m_PathID"] if isinstance(cc,dict) else cc.path_id
            if cid not in objs: continue
            co=objs[cid]; tn=co.type.name
            if tn in("Transform",): continue
            d={"type":tn}
            try: tt2=co.read_typetree()
            except Exception as ex: d["err"]=str(ex); e["comps"].append(d); continue
            if tn=="BoxCollider2D":
                d.update(size=tt2["m_Size"],offset=tt2["m_Offset"],trigger=tt2["m_IsTrigger"],enabled=tt2["m_Enabled"])
            elif tn=="CircleCollider2D":
                d.update(radius=tt2["m_Radius"],offset=tt2["m_Offset"],trigger=tt2["m_IsTrigger"],enabled=tt2["m_Enabled"])
            elif tn=="SpriteRenderer":
                sp=tt2["m_Sprite"]["m_PathID"]; spn=None
                try:
                    s=co.read().m_Sprite
                    spn=s.read().m_Name if s and s.path_id else None
                except Exception as ex: spn="ERR"+str(ex)
                d.update(sprite=spn,color=tt2["m_Color"],order=tt2.get("m_SortingOrder"),enabled=tt2["m_Enabled"],flipX=tt2.get("m_FlipX"))
            elif tn=="Rigidbody2D":
                d.update({k:tt2[k] for k in tt2 if k in("m_Mass","m_LinearDrag","m_AngularDrag","m_GravityScale","m_IsKinematic","m_FixedAngle","m_Constraints","m_Interpolate")})
            elif tn=="MonoBehaviour":
                try:
                    scr=co.read().m_Script.read().m_ClassName
                except Exception: scr="?"
                d["script"]=scr
                d["fields"]={k:v for k,v in tt2.items() if not k.startswith("m_")} if scr not in("?",) else {}
            elif tn=="Animator":
                try: d["controller"]=co.read().m_Controller.read().m_Name
                except Exception: pass
            elif tn=="AudioSource":
                try: d["clip"]=co.read().m_audioClip.read().m_Name
                except Exception: pass
            e["comps"].append(d)
        gos.append(e)
    gos.sort(key=lambda e:e["path"])
    json.dump(gos,open(out,"w"),indent=1,default=str)
    print(fname,len(gos))
for i,f in enumerate(["level0","level1","level2"]):
    dump(f,sys.argv[1]+f"/lvl{i+1}.json")
