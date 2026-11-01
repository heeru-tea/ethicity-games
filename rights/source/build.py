#!/usr/bin/env python3
"""Rebuild a no-dependency, single-file rights prototype from editable source."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SCENARIO = ROOT / 'scenario.json'
SRC = ROOT / 'source'
d = json.loads(SCENARIO.read_text(encoding='utf-8'))
assert len(d['chapters']) == 2
assert len(d['stations']) == 8
scene_ids = {scene['id'] for scene in d['scenes']}
chapter_ids = {ch['id'] for ch in d['chapters']}
assert all(s['scene'] in scene_ids for s in d['stations'])
assert all(s['chapter'] in chapter_ids for s in d['stations'])
assert all(len(s['choices']) == 3 for s in d['stations'])
assert all(len(ch['review']['questions']) == 2 for ch in d['chapters'])
template=(SRC/'template.html').read_text(encoding='utf-8')
scenario = json.dumps(d,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
css=(SRC/'style.css').read_text(encoding='utf-8')
js=(SRC/'game.js').read_text(encoding='utf-8').replace('</','<\\/')
html=template.replace('__INLINE_CSS__',css).replace('__INLINE_SCENARIO__',scenario).replace('__INLINE_SCRIPT__',js)
assert '__INLINE_' not in html
out=ROOT/'index.html'
out.write_text(html,encoding='utf-8')
print(f'Built {out} ({out.stat().st_size:,} bytes)')
