# 문항 정답을 테스트용 JSON 으로 뽑는다 (content.ts / math.ts 를 정규식으로 읽음)
import re, json, sys, pathlib

src = pathlib.Path(r"C:/Users/dumok/dev/ethicity-repo/solidarity-src/src/game/exam")
out = {}

def parse(text):
    qs = []
    pat = re.compile(r'q:\s*"([^"]+)",\s*options:\s*\[(.*?)\],\s*answer:\s*(\d+)', re.S)
    for m in pat.finditer(text):
        opts = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(2))
        qs.append({"q": m.group(1), "options": [o.replace('\\"', '"') for o in opts], "answer": int(m.group(3))})
    return qs

out["exam1"] = parse((src / "content.ts").read_text(encoding="utf-8"))
math = (src / "math.ts").read_text(encoding="utf-8")
size = int(re.search(r"MATH_ROUND_SIZE\s*=\s*(\d+)", math).group(1))
out["math"] = parse(math)[:size]
print(len(out["exam1"]), len(out["math"]))
pathlib.Path(sys.argv[1]).write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
