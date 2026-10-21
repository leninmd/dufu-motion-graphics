import math
W,H=1920,1080
def hash_(seed,i):
    a=(seed ^ ((i+1)*0x9E3779B9)) & 0xffffffff
    t=(a ^ (a>>16))*0x21f0aaad & 0xffffffff
    t=(t ^ (t>>15))*0x735a2d97 & 0xffffffff
    return ((t ^ (t>>15))&0xffffffff)/4294967296
items=[]
for i in range(46):
    ang=i*2.399963
    r=26*math.sqrt(i/46)
    ring=i/46
    items.append(dict(x=math.cos(ang)*r, z=math.sin(ang)*r-4, y=6.0+pow(ring,1.6)*5.5+hash_(2024,i)*0.8, scale=2.6+(1-ring)*4.4, ring=ring))
def sim(pitch,camy,camz,fov,minD,label):
    f=(H/2)/math.tan(fov/2); cy=H*0.52
    rows=[]
    for it in items:
        dy=it['y']-camy; dz=it['z']-camz
        cp,sp=math.cos(pitch),math.sin(pitch)
        x=it['x']
        y=dy*cp - dz*sp
        z=dy*sp + dz*cp
        if z<=0.05 or z<minD: continue
        s=f/z
        w=it['scale']*s
        if w<4: continue
        rows.append((round(z,1), round(w), round(cy+x*s), round(cy-y*s), round(cy-y*s-0.81*w), round(it['ring'],2)))
    rows.sort()
    print(label,'n=',len(rows)); print('  (depth,w,sx,baseY,topY,ring)')
    for r in rows: print('   ',r)
sim(0.30,1.2,-10,1.15,8.5,'pitch=0.30 z=-10 minD 8.5')
sim(0.30,1.2,-10,1.15,10.0,'pitch=0.30 minD 10')
