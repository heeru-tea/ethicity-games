"""공통 팩 원본과 게임 전용 확장을 내장해 harm/harm_v5/index.html을 만든다."""
from pathlib import Path
import base64, hashlib, html, json, mimetypes, re

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
HARM = OUT.parent
ROOT = HARM.parent
PACK = ROOT / 'shared' / 'ethicity-elementary-common-v1'
manifest = json.loads((PACK / 'manifest.json').read_text(encoding='utf-8'))
story = json.loads((OUT / 'scenario.json').read_text(encoding='utf-8'))
extension = json.loads((OUT / 'assets/manifest.extension.json').read_text(encoding='utf-8'))
runtime_manifest = {**manifest, 'characters':{**manifest['characters'], **extension['characters']}}
original = (HARM / 'index.html').read_text(encoding='utf-8')
config = json.loads(re.search(r'<script id="game-config"[^>]*>(.*?)</script>', original, re.S)[1])
# 서버와 허브의 기존 저장 ID는 유지하고 표시만 공통 캐릭터로 연결합니다.
config['characters'] = [
    {'id':'char_03', 'type':'haneul', 'label':'A버전 탐험가'},
    {'id':'char_04', 'type':'jiho', 'label':'B버전 탐험가'}
]
used = {'characters':['haneul','jiho','daon','robot','onyu','saebom','teacher',*extension['characters']], 'backgrounds':['courtyard','classroom','ai_lab']}
files = {}
def embed(relative):
    relative = Path(relative).as_posix()
    data = ((OUT if relative.startswith('assets/') else PACK) / relative).read_bytes()
    mime = {'.woff2':'font/woff2','.wav':'audio/wav','.png':'image/png','.webp':'image/webp'}.get(Path(relative).suffix) or mimetypes.guess_type(relative)[0]
    value = 'data:' + mime + ';base64,' + base64.b64encode(data).decode('ascii')
    files[relative] = value
    return value

for character in used['characters']:
    for kind in ('walk','portraits'):
        embed(runtime_manifest['characters'][character][kind])
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
    runtime_paths.update(runtime_manifest['characters'][c][k] for k in ('walk','portraits'))
runtime_paths.update(manifest['backgrounds'][b]['image'] for b in used['backgrounds'])
runtime_paths.update(manifest[k]['image'] for k in ('icons','effects','props'))
runtime_paths.update(manifest['sounds'].values())
runtime_files = {p:files[p] for p in sorted(runtime_paths)}


def dump(value):
    return json.dumps(value, ensure_ascii=False, separators=(',',':')).replace('<', '\\u003c')
def script(identifier, value):
    return '<script id="' + identifier + '" type="application/json">' + dump(value) + '</script>\n'

css = common_css + '\n' + (HERE/'layout-v5.css').read_text(encoding='utf-8')
css += '\n' + (HERE/'readability.css').read_text(encoding='utf-8')
illustrations = json.loads((OUT/'assets/choice-illustrations.json').read_text(encoding='utf-8'))
choice_art = {str(a['round']): {k:a[k] for k in ('id','title','caption','alt')} | {'src':embed(a['path'])} for a in illustrations['assets']}
runtime = (PACK/'runtime'/'common.js').read_text(encoding='utf-8')
code = '\n'.join((HERE/name).read_text(encoding='utf-8') for name in ('vendor/qrcode.js','common-ui.js','music.js','experience.js','story-rules.js','screens.js','report.js','game.js'))
music_path = OUT/'assets/sounds/pixel-adventure.mp3'
music = {'id':'background_pixel_adventure','title':'Pixel Adventure','src':'data:audio/mpeg;base64,'+base64.b64encode(music_path.read_bytes()).decode('ascii')}
license_text = (PACK/'ui'/'fonts'/'LICENSE.txt').read_text(encoding='utf-8')
output = '''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="윤리시티 매직메이커AI 공방. 8라운드 학급 투표로 AI의 위험을 살피고 함께 고치고 돕는다.">
<meta name="theme-color" content="#294b40"><title>윤리시티 매직메이커AI 공방 · 안전성</title>
<style>''' + css + '''</style></head>
<body class="ee-theme"><header class="appbar"><div class="brand"><span class="brandmark" aria-hidden="true"><canvas class="ee-icon" width="64" height="64" data-common-icon="robot"></canvas></span><span>윤리시티<small>매직메이커AI 공방 · 안전성</small></span></div><div id="topright" class="topright"></div></header>
<main id="main" class="shell"></main><footer class="footer">모든 인물과 자료는 가상입니다. · 우리 반의 한 표씩, 함께 만드는 이야기
<details class="font-license"><summary>글꼴 이용 조건</summary><pre>''' + html.escape(license_text) + '''</pre></details></footer>
<div id="toast" class="toast ee-notice hidden" role="status"></div>
''' + ''.join(script(k,v) for k,v in (
    ('choice-art',choice_art),('kiosk-asset',{'src':embed('assets/magicmaker-kiosk-portrait.png')}),('game-data',story),('game-config',config),('music-asset',music),
    ('common-manifest',manifest),('asset-extension',extension),('common-files',runtime_files),('common-used',used))) + \
    '<script id="common-runtime">' + runtime + '</script>\n<script id="game-code">' + code + '</script></body></html>\n'
(OUT/'index.html').write_text(output, encoding='utf-8', newline='\n')
report = {'uiVersion':'harm-common-v5-2026-11-05','commonPackVersion':manifest['version'],'musicSha256':hashlib.sha256(music_path.read_bytes()).hexdigest(),
          'scenarioVersion':story['version'], 'bytes':len(output.encode()),
          'sha256':hashlib.sha256(output.encode()).hexdigest(), 'used':used,
          'commonSourceSha256':{p:hashlib.sha256((PACK/p).read_bytes()).hexdigest() for p in ['manifest.json','runtime/common.css','runtime/common.js']},
          'kioskSha256':hashlib.sha256((OUT/'assets/magicmaker-kiosk-portrait.png').read_bytes()).hexdigest(),
          'choiceArtSha256':{a['id']:hashlib.sha256((OUT/a['path']).read_bytes()).hexdigest() for a in illustrations['assets']}}
(OUT/'build-info.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:report[k] for k in ['uiVersion','bytes','sha256']},ensure_ascii=False))
