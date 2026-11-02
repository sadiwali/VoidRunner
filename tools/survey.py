import UnityPy, sys, collections
D="/home/claude/VoidRunner/VOIDRUNNER_Data/"
for f in ["mainData","level0","level1","level2","level3"]:
    env=UnityPy.load(D+f)
    c=collections.Counter(o.type.name for o in env.objects)
    print(f, dict(c.most_common(25)))
    if f=="mainData":
        for o in env.objects:
            if o.type.name=="BuildSettings":
                d=o.read_typetree(); print(d.get("scenes") or d.get("levels"))
    else:
        names=[]
        for o in env.objects:
            if o.type.name=="GameObject":
                d=o.read(); 
        roots=[o.read() for o in env.objects if o.type.name=="Transform"]
        rn=[]
        for t in roots:
            if not t.m_Father or t.m_Father.path_id==0:
                rn.append(t.m_GameObject.read().m_Name)
        print("  roots:",rn[:60])
