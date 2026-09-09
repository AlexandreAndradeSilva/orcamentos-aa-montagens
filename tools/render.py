import sys, xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw
import svgutil as S
NS='{http://www.w3.org/2000/svg}'
def render(fn,out,scale=1.0,bg=(255,255,255),force=None):
    r=ET.parse(fn).getroot()
    vb=[float(v) for v in r.get('viewBox').split()]
    W,H=int(vb[2]*scale),int(vb[3]*scale)
    img=Image.new('RGB',(W,H),bg)
    root_fill=r.get('fill')
    for p in r.iter(NS+'path'):
        fill=p.get('fill') or root_fill or '#000'
        if force: fill=force
        if fill=='currentColor': fill=force or '#1C1A17'
        polys=S.flatten(p.get('d'))
        m=Image.new('1',(W,H),0); dr=ImageDraw.Draw(m)
        for q in sorted(polys,key=lambda z:-abs(S.sarea(z))):
            if len(q)<3: continue
            dr.polygon([(x*scale,y*scale) for x,y in q],fill=1 if S.sarea(q)>0 else 0)
        img.paste(Image.new('RGB',(W,H),fill),mask=m)
    img.save(out); return img.size
print(render(sys.argv[1],sys.argv[2],float(sys.argv[3]) if len(sys.argv)>3 else 1.0,
             force=sys.argv[4] if len(sys.argv)>4 else None))
