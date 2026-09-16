"""After editing 1-intro/index.html, refresh the standalone HTML and ZIP."""
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
print('Created standalone HTML and editable Reveal.js ZIP.')
