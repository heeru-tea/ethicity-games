"""공통 팩의 원본 파일을 재설계 없이 내장하여 harm/v2/index.html을 만듭니다."""
from pathlib import Path
import base64, hashlib, html, json, mimetypes, re

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
HARM = OUT.parent
ROOT = HARM.parent
PACK = ROOT / 'shared' / 'ethicity-elementary-common-v1'
manifest = json.loads((PACK / 'manifest.json').read_text(encoding='utf-8'))
story = json.loads((HARM / 'scenario.json').read_text(encoding='utf-8'))
original = (HARM / 'index.html').read_text(encoding='utf-8')
config = json.loads(re.search(r'<script id="game-config"[^>]*>(.*?)</script>', original, re.S)[1])
# 서버와 허브의 기존 저장 ID는 유지하고 표시만 공통 캐릭터로 연결합니다.
config['characters'] = [
    {'id':'char_03', 'type':'haneul', 'label':'하늘'},
    {'id':'char_04', 'type':'jiho', 'label':'지호'}
]
used = {'characters':['haneul','jiho','daon','robot'], 'backgrounds':['courtyard','classroom']}
files = {}
def embed(relative):
    relative = Path(relative).as_posix()
    data = (PACK / relative).read_bytes()
    mime = {'.woff2':'font/woff2','.wav':'audio/wav','.png':'image/png'}.get(Path(relative).suffix) or mimetypes.guess_type(relative)[0]
    value = 'data:' + mime + ';base64,' + base64.b64encode(data).decode('ascii')
    files[relative] = value
    return value

for character in used['characters']:
    for kind in ('walk','portraits'):
        embed(manifest['characters'][character][kind])
for background in used['backgrounds']:
    embed(manifest['backgrounds'][background]['image'])
for kind in ('icons','effects','props'):
    embed(manifest[kind]['image'])
for sound in manifest['sounds'].values():
    embed(sound)

raw_css = (PACK / 'runtime' / 'common.css').read_text(encoding='utf-8')
def css_asset(match):
    relative = (PACK / 'runtime' / match[1]).resolve().relative_to(PACK.resolve())
    return "url('" + embed(relative) + "')"
common_css = re.sub(r"url\('([^']+)'\)", css_asset, raw_css)
# CSS에 내장한 UI와 글꼴은 JSON에 중복 저장하지 않습니다.
runtime_paths = set()
for c in used['characters']:
    runtime_paths.update(manifest['characters'][c][k] for k in ('walk','portraits'))
runtime_paths.update(manifest['backgrounds'][b]['image'] for b in used['backgrounds'])
runtime_paths.update(manifest[k]['image'] for k in ('icons','effects','props'))
runtime_paths.update(manifest['sounds'].values())
runtime_files = {p:files[p] for p in sorted(runtime_paths)}

scene_data = json.loads((HARM/'source'/'scene-images.json').read_text(encoding='utf-8'))
scenes = {}
for scene in scene_data['scenes']:
    data = (HARM/'assets'/'scenes'/scene['file']).read_bytes()
    scenes[str(scene['id'])] = {k:scene[k] for k in ('alt','caption','width','height')}
    scenes[str(scene['id'])]['src'] = 'data:image/webp;base64,' + base64.b64encode(data).decode('ascii')

def dump(value):
    return json.dumps(value, ensure_ascii=False, separators=(',',':')).replace('<', '\\u003c')
def script(identifier, value):
    return '<script id="' + identifier + '" type="application/json">' + dump(value) + '</script>\n'

css = common_css + '\n' + (HERE/'layout.css').read_text(encoding='utf-8')
runtime = (PACK/'runtime'/'common.js').read_text(encoding='utf-8')
code = '\n'.join((HERE/name).read_text(encoding='utf-8') for name in ('common-ui.js','experience.js','game.js'))
license_text = (PACK/'ui'/'fonts'/'LICENSE.txt').read_text(encoding='utf-8')
output = '''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="윤리시티 공통 팩을 적용한 침해금지 ver2. 8라운드의 학급 투표로 친구를 함께 돕습니다.">
<meta name="theme-color" content="#294b40"><title>윤리시티 얼굴·목소리 지킴대 ver2 · 침해금지</title>
<style>''' + css + '''</style></head>
<body class="ee-theme"><header class="appbar"><div class="brand"><span class="brandmark" aria-hidden="true"><canvas class="ee-icon" width="64" height="64" data-common-icon="robot"></canvas></span><span>윤리시티<small>얼굴·목소리 지킴대 · 침해금지 ver2</small></span></div><div id="topright" class="topright"></div></header>
<main id="main" class="shell"></main><footer class="footer">모든 인물과 자료는 가상입니다. · 우리 반의 한 표씩, 함께 만드는 이야기
<details class="font-license"><summary>글꼴 이용 조건</summary><pre>''' + html.escape(license_text) + '''</pre></details></footer>
<div id="toast" class="toast ee-notice hidden" role="status"></div>
''' + ''.join(script(k,v) for k,v in (
    ('game-data',story),('game-config',config),('scene-assets',scenes),
    ('common-manifest',manifest),('common-files',runtime_files),('common-used',used))) + \
    '<script id="common-runtime">' + runtime + '</script>\n<script id="game-code">' + code + '</script></body></html>\n'
(OUT/'index.html').write_text(output, encoding='utf-8', newline='\n')
report = {'uiVersion':'harm-common-v2-2026-10-21','commonPackVersion':manifest['version'],
          'scenarioVersion':story['version'], 'bytes':len(output.encode()),
          'sha256':hashlib.sha256(output.encode()).hexdigest(), 'used':used,
          'commonSourceSha256':{p:hashlib.sha256((PACK/p).read_bytes()).hexdigest() for p in ['manifest.json','runtime/common.css','runtime/common.js']},
          'sceneSha256':{s['file']:hashlib.sha256((HARM/'assets'/'scenes'/s['file']).read_bytes()).hexdigest() for s in scene_data['scenes']}}
(OUT/'build-info.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:report[k] for k in ['uiVersion','bytes','sha256']},ensure_ascii=False))
