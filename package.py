"""Refresh the portable lecture files and editable course ZIP. Python stdlib only."""
from pathlib import Path
import re, base64, mimetypes, zipfile
root=Path(__file__).parent
lecture=root/'1-intro'
source=(lecture/'index.html').read_text(encoding='utf-8')
html=source
for src in re.findall(r'<link rel="stylesheet" href="([^"]+)">',source):
    html=html.replace(f'<link rel="stylesheet" href="{src}">','<style>'+(lecture/src.split('?',1)[0]).read_text(encoding='utf-8')+'</style>')
for src in re.findall(r'<script src="([^"]+)"></script>',source):
    js=(lecture/src).read_text(encoding='utf-8').replace('</script','<\\/script')
    html=html.replace(f'<script src="{src}"></script>','<script>'+js+'</script>')
for src in set(re.findall(r'assets/[\w.-]+',html)):
    mime=mimetypes.guess_type(src)[0] or 'application/octet-stream'
    html=html.replace(src,'data:'+mime+';base64,'+base64.b64encode((lecture/src).read_bytes()).decode())
(root/'olympiad-biology.html').write_text(html,encoding='utf-8')
files=['index.html','README.md','EDITING.md','DESIGN.md','MEDIA.md','package.py','serve.ps1']
assets=set(re.findall(r'assets/[\w.-]+',source+(lecture/'fonts.css').read_text(encoding='utf-8')))
with zipfile.ZipFile(root/'olympiad-biology-reveal.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in files:
        z.write(root/name,'pansionmsu-olbio/'+name)
    for name in ['index.html','styles.css','fonts.css','app.js']+sorted(assets)+['assets/Commissioner-OFL.txt']:
        z.write(lecture/name,'pansionmsu-olbio/1-intro/'+name)
    for path in (lecture/'vendor').rglob('*'):
        if path.is_file(): z.write(path,'pansionmsu-olbio/1-intro/'+path.relative_to(lecture).as_posix())
assert 'src="assets/' not in html
assert len(re.findall(r'<section\b',source))>0, 'No slides found.'

def data_url(path):
    mime=mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()

for folder, filename in [('2-chemistry','chemistry-of-life.html'),('1-homework','homework-1.html'),('2-homework','homework-2.html'),('4-biochemistry','biochemistry.html')]:
    base=root/folder
    document=(base/'index.html').read_text(encoding='utf-8')
    for src in re.findall(r'<link rel="stylesheet" href="([^"]+)">',document):
        path=base/src.split('?',1)[0]
        css=path.read_text(encoding='utf-8')
        def inline_css(match):
            url=match.group(1).strip('"\'')
            if url.startswith(('data:','http:','https:','#')): return match.group(0)
            return 'url("'+data_url(path.parent/url.split('?',1)[0])+'")'
        css=re.sub(r'url\(([^)]+)\)',inline_css,css)
        document=document.replace(f'<link rel="stylesheet" href="{src}">','<style>'+css+'</style>')
    for src in re.findall(r'<script src="([^"]+)"></script>',document):
        js=(base/src).read_text(encoding='utf-8').replace('</script','<\\/script')
        document=document.replace(f'<script src="{src}"></script>','<script>'+js+'</script>')
    for src in set(re.findall(r'(?:src|href|poster)="((?:\.\./2-chemistry/)?assets/[^\"]+)"',document)):
        document=document.replace('"'+src+'"','"'+data_url(base/src)+'"')
    document=document.replace('href="../2-chemistry/"','href="chemistry-of-life.html"')
    document=document.replace('href="../1-homework/"','href="homework-1.html"')
    (root/filename).write_text(document,encoding='utf-8')
    assert not re.search(r'<(?:link[^>]+href|script[^>]+src)="\.?\.?/',document)

with zipfile.ZipFile(root/'olympiad-biology-reveal.zip','a',zipfile.ZIP_DEFLATED) as z:
    for folder in ['1-homework','2-homework','2-chemistry','4-biochemistry']:
        for path in (root/folder).rglob('*'):
            if path.is_file(): z.write(path,'pansionmsu-olbio/'+path.relative_to(root).as_posix())
    z.write(root/'.nojekyll','pansionmsu-olbio/.nojekyll')
print('Created five portable HTML files and the editable course ZIP.')
