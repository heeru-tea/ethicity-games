"""GitHub privacy-v4/source에서 실행: python rebuild.py (Python 기본 기능만 사용)."""
from pathlib import Path
import re,json,base64
SOURCE=Path(__file__).resolve().parent;GAME=SOURCE.parent
target=GAME/'index.html';html=target.read_text(encoding='utf-8')
story=json.loads((GAME/'scenario.json').read_text(encoding='utf-8'))
scenes={r['scene']:'data:image/webp;base64,'+base64.b64encode((GAME/'assets/scenes'/f"{r['scene']}.webp").read_bytes()).decode() for r in story['rounds']}
code='\n'.join((SOURCE/n).read_text(encoding='utf-8') for n in ['original-art.js','app.js','round-screens.js','typewriter.js','teacher-panels.js','live.js'])
for ident,value in [('game-data',json.dumps(story,ensure_ascii=False,indent=2).replace('<',r'\u003c')),('scene-assets',json.dumps(scenes)),('game-code',code)]:
    html,count=re.subn(r'(<script id="'+ident+r'"[^>]*>)[\s\S]*?(</script>)',lambda m:m[1]+value+m[2],html)
    assert count==1,ident
css=(SOURCE/'ver4.css').read_text(encoding='utf-8')
html,count=re.subn(r'(<style id="ver4-style">)[\s\S]*?(</style>)',lambda m:m[1]+css+m[2],html)
assert count==1
target.write_text(html,encoding='utf-8')
print('privacy-v4/index.html을 갱신했습니다. 문장별 점수를 바꾸었다면 서버의 엔딩 검증 규칙도 함께 갱신해야 합니다.')
