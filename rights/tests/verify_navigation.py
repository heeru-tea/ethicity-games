"""Check that every scene's portals and evidence NPCs are reachable on foot."""
import json
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'scenario.json').read_text(encoding='utf-8'))
MANIFEST = json.loads((ROOT.parent / 'shared/ethicity-elementary-common-v1/manifest.json').read_text(encoding='utf-8'))
PORTALS = {
    'courtyard': [(295, 435), (1030, 435), (640, 275)],
    'classroom': [(640, 647)],
    'library': [(640, 647)],
    'ai_lab': [(640, 647)],
}
STEP = 5


def reachable(scene, target):
    areas = MANIFEST['backgrounds'][scene]['walkAreas']

    def allowed(p):
        x, y = p
        return 110 <= x <= 1170 and 100 <= y <= 690 and any(
            a['x'] <= x <= a['x'] + a['w'] and a['y'] <= y <= a['y'] + a['h']
            for a in areas
        )

    start = (640, 515 if scene == 'courtyard' else 485)
    queue = deque([start])
    seen = {start}
    while queue:
        x, y = queue.popleft()
        if ((x - target[0]) ** 2 + (y - target[1]) ** 2) ** .5 < 45:
            return True
        for point in [(x + STEP, y), (x - STEP, y), (x, y + STEP), (x, y - STEP)]:
            if point not in seen and allowed(point):
                seen.add(point)
                queue.append(point)
    return False


for scene, portals in PORTALS.items():
    for point in portals:
        assert reachable(scene, point), f'Unreachable portal: {scene} {point}'
for station in DATA['stations']:
    point = (station['pos']['x'], station['pos']['y'])
    assert reachable(station['scene'], point), f'Unreachable NPC: {station["id"]} {point}'
print('Navigation verified: 6 portals and 8 evidence NPCs reachable.')
