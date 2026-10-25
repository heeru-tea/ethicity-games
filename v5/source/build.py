"""문장 수정 후 실행: python source/build.py (외부 패키지 불필요)."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
def data(name):
    return json.dumps(json.loads((root/name).read_text(encoding='utf-8')),ensure_ascii=False,indent=2).replace('<','\\u003c')
head='''<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="초등학교 5~6학년을 위한 프라이버시 보호 게임. 기존 8개 사례와 윤리시티 공통 자산을 사용합니다.">
<meta name="theme-color" content="#294b40"><title>윤리시티 · 프라이버시 보호 v5</title>
<link rel="stylesheet" href="common/runtime/common.css">
<link rel="stylesheet" href="source/v5.css">
</head><body class="ee-theme">
<header class="appbar"><div class="brand"><canvas width="64" height="64" class="ee-icon" data-common-icon="lock" aria-hidden="true"></canvas><span>윤리시티 · AI 윤리 탐험대<small>v5 · 프라이버시 보호 · 친구의 AI 비서 탐험</small></span></div><div class="topright" id="topright"></div></header>
<p id="asset-status" class="ee-notice asset-status" role="status" hidden></p>
<main class="shell" id="main"><p>탐험을 준비하고 있습니다.</p></main>
<footer class="footer">모든 인물과 자료는 가상입니다. 실제 사진·이름·학교·연락처를 입력하거나 올리지 않습니다.<br>윤리시티 공통 팩 1.0.0 · <a href="common/ui/fonts/LICENSE.txt" target="_blank" rel="noopener">Galmuri 글꼴 이용 안내</a></footer>
<div class="toast ee-notice hidden" id="toast" role="status"></div><div id="modal-host"></div>
'''
scripts=['common/runtime/manifest.js','common/runtime/common.js','source/app.js','source/case-data.js','source/round-screens.js','source/case-screens.js','source/typewriter.js','source/teacher-panels.js','source/common-bridge.js','source/live.js']
out=head+'<script id="game-data" type="application/json">'+data('scenario.json')+'</script>\n'+'<script id="game-config" type="application/json">'+data('config.json')+'</script>\n'+'\n'.join('<script src="'+s+'"></script>' for s in scripts)+'\n</body></html>\n'
(root/'index.html').write_text(out,encoding='utf-8')
print('Built v5/index.html; local assets remain in common/ and source/.')
