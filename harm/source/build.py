"""게임 실행 파일은 index.html 하나입니다. 개발 원본을 바꾼 뒤 이 파일을 실행합니다."""
from pathlib import Path
import json, re, html, hashlib, base64

HERE=Path(__file__).resolve().parent
OUT=HERE.parent
REFERENCE=OUT.parent/'privacy-v3'/'index.html'
ref=REFERENCE.read_text(encoding='utf-8')
story=json.loads((OUT/'scenario.json').read_text(encoding='utf-8'))
scene_manifest=json.loads((HERE/'scene-images.json').read_text(encoding='utf-8'))
assert [s['id'] for s in scene_manifest['scenes']]==[r['id'] for r in story['rounds']]
scenes={}
for scene in scene_manifest['scenes']:
    image=(OUT/'assets'/'scenes'/scene['file']).read_bytes()
    assert image[:4]==b'RIFF' and image[8:12]==b'WEBP', 'Expected a WebP scene image'
    scenes[str(scene['id'])]={k:scene[k] for k in ('alt','caption','width','height')}
    scenes[str(scene['id'])]['src']='data:image/webp;base64,'+base64.b64encode(image).decode('ascii')
def block(name):
    return re.search(r'<script id="'+name+r'"[^>]*>(.*?)</script>',ref,re.S)[1]
config=json.loads(block('game-config'))
config={'characters':config['characters'],'firebase':config['firebase']}
style=re.search(r'<style>(.*?)</style>',ref,re.S)[1]
style+='\n'+(HERE/'harm.css').read_text(encoding='utf-8')
art=block('game-code').split('// ==================== 문장과 설정을 읽는 곳')[0]
art=art.replace('function drawVillage(canvas){drawOriginal(canvas,ART_CROPS.map,false);}',(HERE/'art-overlay.js').read_text(encoding='utf-8'))
code=art+'\n'+(HERE/'game.js').read_text(encoding='utf-8')
def dump(v): return json.dumps(v,ensure_ascii=False,indent=2).replace('<','\\u003c')
license_path=OUT.parent/'privacy-v3'/'NanumSquareRound-LICENSE.txt'
license_text=license_path.read_text(encoding='utf-8')
out='''<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="초등학교 5~6학년을 위한 침해금지 학급 공동 선택 게임. 윤리시티의 친구를 함께 돕습니다.">
<meta name="theme-color" content="#145d4f"><title>윤리시티 얼굴·목소리 지킴대 · 침해금지</title><style>'''+style+'''</style></head>
<body><header class="appbar"><div class="brand"><span class="brandmark" aria-hidden="true">♧</span><span>윤리시티<small>AI 윤리 탐험대 · 침해금지</small></span></div><div id="topright" class="topright"></div></header>
<main id="main" class="shell"></main><footer class="footer">모든 인물과 자료는 가상입니다. · 우리 반의 한 표씩, 함께 만드는 이야기
<details class="font-license"><summary>글꼴 이용 조건</summary><pre>'''+html.escape(license_text)+'''</pre></details></footer>
<div id="toast" class="toast hidden" role="status"></div>
<script id="game-data" type="application/json">'''+dump(story)+'''</script>
<script id="game-config" type="application/json">'''+dump(config)+'''</script>
<script id="scene-assets" type="application/json">'''+dump(scenes)+'''</script>
<script id="game-assets" type="application/json">'''+block('game-assets')+'''</script>
<script id="game-code">'''+code+'''</script></body></html>'''
(OUT/'index.html').write_text(out,encoding='utf-8',newline='\n')
(OUT/'NanumSquareRound-LICENSE.txt').write_text(license_text,encoding='utf-8',newline='\n')

# 시나리오 문서도 같은 원본으로 만듭니다. 실행 파일은 이 문서를 요청하지 않습니다.
e=html.escape
parts=[f'<h1>핵심 탐구 질문</h1><p class="question">{e(story["question"])}</p><table><tr><th>요소</th><th>내용</th><th>탐구 질문</th></tr>']
for n,v in story['elements'].items(): parts.append(f'<tr><td>{n}</td><td>{e(v["text"])}</td><td>{e(v["question"])}</td></tr>')
parts+=['</table>',f'<h1>{e(story["title"])}</h1><p>게임 코드: harm · 8라운드 · 도입·이야기·결과·정리는 시간 제한 없이 교사가 진행합니다. 투표만 교사가 20·40·60·90초 중 골라 시작하고 조정합니다.</p><p>각 라운드의 줄거리와 그림은 투표와 결과를 읽을 때도 계속 표시됩니다.</p>',f'<h2>도입</h2><p>{e(story["intro"]["text"])}</p><blockquote>다온: {e(story["intro"]["dialogue"])}</blockquote>']
for r in story['rounds']:
    scene=scenes[str(r['id'])]
    parts.append(f'<figure style="margin:32px 0 0"><img src="{scene["src"]}" alt="{e(scene["alt"])}" width="{scene["width"]}" height="{scene["height"]}" style="display:block;width:100%;height:auto;border-radius:12px" loading="lazy"><figcaption>{e(scene["caption"])}</figcaption></figure>')
    parts += [f'<h2>{r["id"]}. {e(r["title"])}</h2><p class="question">{e(r["question"])}</p><h3>학습자에게 소개하는 이야기</h3>']
    parts += [f'<p>{e(p)}</p>' for p in r.get('narrative',[r['situation']])]
    parts += [f'<blockquote>다온: {e(r["dialogue"])}</blockquote><h3>화면 속 자료</h3>']
    for m in r['media']: parts.append(f'<p><b>{e(m["label"])}</b> — {e(m["text"])}</p>')
    parts.append('<h3>위험 신호</h3><ul>'+''.join(f'<li>{e(t)}</li>' for t in r['clues'])+'</ul><table><tr><th>선택</th><th>내용</th><th>결과·피드백</th><th>다온의 반응</th><th>학습 요소</th></tr>')
    for i,c in enumerate(r['choices']): parts.append(f'<tr><td>{"ABC"[i]}</td><td>당신은 {e(c["text"])}</td><td>{e(c["change"])}<br>{e(c["feedback"])}</td><td>{e(c["reply"])}</td><td>{", ".join(map(str,c["tags"]))}</td></tr>')
    parts.append('</table>')
parts.append('<h2>공동 엔딩 기준</h2><p>초반 대응: 1~4라운드의 보호 선택 횟수. 함께 해결: 5~7라운드의 보호 선택 횟수. 새 상황 예방: 8라운드의 보호 선택.</p><p>A: 초반 3회 이상 + 해결 2회 이상 + 새 상황 예방 성공. B: 해결 2회 이상이며 A 조건에 해당하지 않음. C: 해결 0~1회.</p>')
for key,v in story['endings'].items(): parts.append(f'<h3>엔딩 {key} · {e(v["title"])}</h3><p>{e(v["text"])}</p><blockquote>다온: {e(v["reply"])}</blockquote><p><b>카드:</b> {e(v["card"])}</p>')
parts.append('<h2>핵심 질문에 대한 우리 반의 답</h2>')
for g in story['recap']:
    parts.append(f'<h3>{e(g["title"])}</h3><ul>')
    for c in g['choices']: parts.append(f'<li>{e(c["text"])} <small>요소 {", ".join(map(str,c["tags"]))}</small></li>')
    parts.append('</ul>')
doc='<!DOCTYPE html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>침해금지 시나리오</title><style>body{font-family:"Malgun Gothic",sans-serif;line-height:1.8;color:#163b43;max-width:1100px;margin:auto;padding:30px;background:#fffdf2}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{border:1px solid #bed5c8;padding:12px;text-align:left;vertical-align:top}th,.question{background:#e2f2e7}.question{padding:16px;font-weight:bold}blockquote{border-left:4px solid #145d4f;margin:18px 0;padding:10px 20px;background:#f4f8ec}h2{margin-top:45px}@media print{h2{break-after:avoid}tr{break-inside:avoid}}</style><body>'+''.join(parts)+'</body></html>'
(OUT/'시나리오.html').write_text(doc,encoding='utf-8',newline='\n')
print(json.dumps({'rounds':len(story['rounds']),'htmlBytes':len(out.encode()),'sha256':hashlib.sha256(out.encode()).hexdigest()},ensure_ascii=False))
