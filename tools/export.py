import UnityPy, json, sys
D="/home/claude/VoidRunner/VOIDRUNNER_Data/"
OUT=sys.argv[1]
sprites={}; clips={}
for f in ["sharedassets0.assets","sharedassets1.assets","sharedassets2.assets","sharedassets3.assets"]:
    env=UnityPy.load(D+f)
    for o in env.objects:
        t=o.type.name
        if t=="Texture2D":
            d=o.read()
            if d.m_Width>0 and d.m_Name not in("Font Texture",):
                try: d.image.save(f"{OUT}/tex/{d.m_Name}.png")
                except Exception as e: print("tex fail",d.m_Name,e)
        elif t=="Sprite":
            d=o.read()
            tex=d.m_RD.texture.read()
            r=d.m_Rect
            tr=d.m_RD.textureRect
            sprites[d.m_Name]=dict(tex=tex.m_Name,x=tr.x,y=tex.m_Height-tr.y-tr.height,w=tr.width,h=tr.height,
                rx=r.x,ry=r.y,rw=r.width,rh=r.height,ppu=d.m_PixelsToUnits,pivot=[d.m_Pivot.x,d.m_Pivot.y] if getattr(d,"m_Pivot",None) else None,
                off=[d.m_Offset.x,d.m_Offset.y])
        elif t=="AnimationClip":
            d=o.read()
            try:
                m=d.m_ClipBindingConstant.pptrCurveMapping
                names=[p.read().m_Name if p.path_id else None for p in m]
            except Exception as e: names=str(e)
            clips[d.m_Name]=dict(frames=names,rate=d.m_SampleRate,stop=getattr(d.m_MuscleClip,"m_StopTime",None),loop=getattr(d.m_MuscleClip,"m_LoopTime",None))
json.dump(dict(sprites=sprites,clips=clips),open(f"{OUT}/meta.json","w"),indent=1)
print(len(sprites),len(clips))
for k,v in clips.items(): print(k,v)
