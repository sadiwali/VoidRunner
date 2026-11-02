import sys, struct
sys.path.insert(0,sys.argv[1])
from mb import scripts_for
def parse(name,b):
    if name=="Player":
        f=struct.unpack_from("<8f2i",b,0); bools=[b[40+4*i] for i in range(7)]
        return dict(zip("maxSpeed speed jumpPower maxVerticalSpeed maxWallJumpPower minWallJumpPower drillSpeed wallJumpDecreaseMultiplier curHealth maxHealth".split(),f))
    if name=="molerat":
        f=struct.unpack_from("<4f",b,12); return dict(zip("speed maxVerticalDistance maxHorizontalDistance runBackTime".split(),f))
    if name=="Turret":
        f=struct.unpack_from("<2i5f",b,0); return dict(zip("curHealth maxHealth distance wakeRange shootInterval bulletSpeed bulletTimer".split(),f))
    if name=="CameraFollow":
        return dict(zip("cameraSpeed cameraNorm cameraMax internalCameraNorm".split(),struct.unpack_from("<4f",b,0)))
    if name=="AttackCone": return {"isLeft":b[12]}
    if name=="platCheckUp": return {"up":b[0]}
    if name=="Sayer": return {"animateSpeed":struct.unpack_from("<f",b,0)[0]}
    return None
for lv in ["level0","level1","level2"]:
    print("==",lv)
    seen=set()
    for pid,gp,gn,n,body in scripts_for(lv):
        r=parse(n,body)
        if r is not None:
            key=(n,str(r))
            if key in seen: continue
            seen.add(key); print(" ",gn,n,r)
