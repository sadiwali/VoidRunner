import UnityPy, struct
D="/home/claude/VoidRunner/VOIDRUNNER_Data/"
def scripts_for(fname):
    env=UnityPy.load(D+fname)
    sf=list(env.files.values())[0]
    # map script pid->name
    out=[]
    for o in env.objects:
        if o.type.name!="MonoBehaviour": continue
        raw=o.get_raw_data()
        go_fid,go_pid=struct.unpack_from("<iq",raw,0)
        en=raw[12]
        sc_fid,sc_pid=struct.unpack_from("<iq",raw,16)
        nl=struct.unpack_from("<i",raw,28)[0]
        off=32+((nl+3)//4*4)
        try:
            from UnityPy.classes import PPtr
            m=o.read(check_read=False)
            name=m.m_Script.read().m_ClassName
        except Exception as e:
            name=f"?{sc_fid}:{sc_pid}"
        try: gname=m.m_GameObject.read().m_Name
        except Exception: gname="?"
        out.append((o.path_id,go_pid,gname,name,raw[off:]))
    return out
if __name__=="__main__":
    for pid,gp,gn,n,body in scripts_for("level0"):
        print(gn,n,len(body))
