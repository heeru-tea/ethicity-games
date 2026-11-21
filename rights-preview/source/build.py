import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
root=Path(__file__).resolve().parents[1]
src=root/'source'
d=json.loads((root/'scenario.json').read_text(encoding='utf-8'))
js=(src/'outcomes.js').read_text(encoding='utf-8')+'\n'+(src/'game.js').read_text(encoding='utf-8')
html=(src/'template.html').read_text(encoding='utf-8').replace('__INLINE_CSS__',(src/'style.css').read_text(encoding='utf-8')).replace('__INLINE_SCENARIO__',json.dumps(d,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')).replace('__INLINE_SCRIPT__',js.replace('</','<\\/'))
assert '__INLINE_' not in html
class Resources(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ('src','href') and value and not value.startswith(('http:','https:','data:','#','blob:')):
                assert (root/urlsplit(value).path).exists(), 'Missing resource: '+value
Resources().feed(html)
(root/'index.html').write_text(html,encoding='utf-8')
print('Built rights-preview/index.html')
