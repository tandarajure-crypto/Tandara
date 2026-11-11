#!/usr/bin/env python3
"""Build the complete illustrated PDF from zivot.html."""
import os, re, io, html, urllib.parse
from pathlib import Path
import requests
from bs4 import BeautifulSoup
from PIL import Image as PILImage, ImageOps
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'zivot.html'
out=ROOT/'pdf'/'Zivot_Tandara_kroz_3_stoljeca.pdf'
out.parent.mkdir(exist_ok=True)
tmp=ROOT/'.pdf_photos'; tmp.mkdir(exist_ok=True)
soup=BeautifulSoup(source.read_text(encoding='utf-8'),'html.parser')
article=soup.select_one('article.content-card')
assert article is not None
figures=article.select('figure')
assert len(figures)==17, f'Expected 17 photographs, got {len(figures)}'
fontdir=Path('/usr/share/fonts/truetype/dejavu')
pdfmetrics.registerFont(TTFont('DejaVu', str(fontdir/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DejaVu-Bold',str(fontdir/'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFontFamily('DejaVu',normal='DejaVu',bold='DejaVu-Bold',italic='DejaVu',boldItalic='DejaVu-Bold')
ink=HexColor('#222b31'); blue=HexColor('#23465b'); grey=HexColor('#66737a')
styles={
 'title':ParagraphStyle('TitleX',fontName='DejaVu-Bold',fontSize=27,leading=36,textColor=ink,spaceAfter=12*mm),
 'deck':ParagraphStyle('DeckX',fontName='DejaVu',fontSize=12.3,leading=20,textColor=grey),
 'h2':ParagraphStyle('H2X',fontName='DejaVu-Bold',fontSize=16,leading=23,textColor=blue,spaceBefore=9*mm,spaceAfter=4*mm,keepWithNext=True),
 'h3':ParagraphStyle('H3X',fontName='DejaVu-Bold',fontSize=11.8,leading=18,textColor=blue,spaceBefore=5*mm,spaceAfter=3*mm,keepWithNext=True),
 'body':ParagraphStyle('BodyX',fontName='DejaVu',fontSize=9.6,leading=16.5,textColor=ink,spaceAfter=3.2*mm),
 'caption':ParagraphStyle('CapX',fontName='DejaVu',fontSize=8,leading=12,textColor=grey,alignment=TA_CENTER,spaceBefore=2*mm),
 'small':ParagraphStyle('SmallX',fontName='DejaVu',fontSize=8.6,leading=14,textColor=ink,spaceAfter=2*mm),
}
pagew,pageh=A4; W=pagew-42*mm
def clean_html(tag):
 t=tag.decode_contents()
 t=re.sub(r'<a\\b([^>]*)>',r'<link\\1>',t)
 t=t.replace('</a>','</link>')
 t=re.sub(r'\\s(?:class|style|id|target|rel)="[^"]*"','',t)
 t=t.replace('<br>','<br/>')
 return t
def para(tag,style='body'):
 return Paragraph(clean_html(tag),styles[style])
def photo(figure):
 img=figure.find('img')
 url=img['src']
 name=Path(urllib.parse.unquote(urllib.parse.urlsplit(url).path)).name
 local=tmp/name
 if not local.exists():
  r=requests.get(url,timeout=50,headers={'User-Agent':'Tandara-PDF/1.0'});r.raise_for_status()
  local.write_bytes(r.content)
 with PILImage.open(local) as im:
  im=ImageOps.exif_transpose(im).convert('RGB')
  im.thumbnail((1400,1100))
  jpg=tmp/(str(len(list(tmp.glob('photo_*.jpg')))).zfill(2)+'_photo.jpg')
  im.save(jpg,'JPEG',quality=84,optimize=True)
  iw,ih=im.size
 return jpg,iw,ih
images={}
for f in figures: images[id(f)]=photo(f)
story=[]
story += [Spacer(1,35*mm),Paragraph('Život Tandara<br/>kroz 3 stoljeća',styles['title']),HRFlowable(width='34%',thickness=2,color=blue,spaceAfter=11*mm),Paragraph('Kuća i zemlja · Godišnji krug rada · Obitelj · Prehrana · Nasljeđe',styles['deck']),Spacer(1,10*mm),Paragraph('Ilustrirano izdanje za čitanje, dijeljenje i čuvanje obiteljske povijesti.',styles['deck']),Spacer(1,34*mm),Paragraph('Izvor: web-stranica „Život Tandara kroz 3 stoljeća”<br/>tandarajure-crypto.github.io/Tandara/zivot.html',styles['small']),PageBreak()]
gallery_n=0
for section in article.find_all('section',recursive=False):
 for child in section.find_all(recursive=False):
  if child.name=='h2':story.append(Paragraph(child.get_text(' ',strip=True),styles['h2']))
  elif child.name=='h3':story.append(Paragraph(child.get_text(' ',strip=True),styles['h3']))
  elif child.name=='p':story.append(para(child,'small' if 'napomena' in child.get('class',[]) else 'body'))
  elif child.name=='ul':
   for li in child.find_all('li',recursive=False):
    story.append(Paragraph('• '+clean_html(li),styles['small']))
  elif child.name=='div' and 'life-photo-gallery' in child.get('class',[]):
   fs=child.find_all('figure')
   gallery_n+=len(fs)
   for k in range(0,len(fs),2):
    cells=[]
    for f in fs[k:k+2]:
     p,iw,ih=images[id(f)]
     maxw=(W-8*mm)/2
     maxh=65*mm
     scale=min(maxw/iw,maxh/ih)
     iw2,ih2=iw*scale,ih*scale
     desc=f.find('figcaption')
     caption=desc.get_text(' ',strip=True) if desc else f.find('img').get('alt','')
     cells.append([Image(str(p),width=iw2,height=ih2,hAlign='CENTER'),Paragraph(html.escape(caption),styles['caption'])])
    if len(cells)==1:cells.append([])
    tab=Table([[cells[0],cells[1]]],colWidths=[W/2,W/2],hAlign='CENTER')
    tab.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),3*mm),('RIGHTPADDING',(0,0),(-1,-1),3*mm),('TOPPADDING',(0,0),(-1,-1),3*mm),('BOTTOMPADDING',(0,0),(-1,-1),5*mm)]))
    story.append(tab)
assert gallery_n==17
def decoration(canvas,doc):
 canvas.saveState();canvas.setStrokeColor(HexColor('#dce1e4'));canvas.line(21*mm,19*mm,pagew-21*mm,19*mm)
 canvas.setFont('DejaVu',7.5);canvas.setFillColor(grey)
 canvas.drawString(21*mm,14*mm,'Život Tandara kroz 3 stoljeća')
 canvas.drawRightString(pagew-21*mm,14*mm,str(doc.page))
 canvas.restoreState()
pdf=SimpleDocTemplate(str(out),pagesize=A4,rightMargin=21*mm,leftMargin=21*mm,topMargin=19*mm,bottomMargin=23*mm,title='Život Tandara kroz 3 stoljeća',author='Jure Tandara',subject='Ilustrirana povijest života roda Tandara')
pdf.build(story,onFirstPage=decoration,onLaterPages=decoration)
print('CREATED',out,'BYTES',out.stat().st_size,'PHOTOS',gallery_n)
