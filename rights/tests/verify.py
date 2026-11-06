#!/usr/bin/env python3
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
scenario = json.loads((ROOT/'scenario.json').read_text(encoding='utf-8'))
assert scenario['meta']['title']
assert len(scenario['chapters']) == 2
assert len(scenario['stations']) == 8
for ch in scenario['chapters']:
    assert ch['id'] in {s['chapter'] for s in scenario['stations']}
for st in scenario['stations']:
    assert len(st['choices']) == 3
print('verify.py: basic scenario checks passed')

assert len(scenario['final']['policies'])==4
assert any(p['id']=='efficiency_first' for p in scenario['final']['policies'])
