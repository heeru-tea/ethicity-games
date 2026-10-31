"""기존 수업 규칙은 보존하고 roomsHarmV3에 추가할 RTDB 규칙을 만든다."""
from pathlib import Path
import json
OUT=Path(__file__).resolve().parent.parent
story=json.loads((OUT/'scenario.json').read_text(encoding='utf-8'))
# v2에서 검증한 소유자/멤버/개인 투표/시간/동률 구조를 재사용한다.
prior=json.loads((OUT.parent/'database.harm.rules.json').read_text(encoding='utf-8'))
rules=json.loads(json.dumps(prior).replace('roomsHarm','roomsHarmV3'))
room=rules['rules']['roomsHarmV3']['$room']
room['control']['version']['.validate']='newData.val() == '+json.dumps(story['version'])
base="newData.parent().parent().child('decisions')"
def selected(i):return f"{base}.child('{i}').child('choice').val()"
trust='('+' + '.join(f"({selected(i)} == 0 ? {r['choices'][0]['trust']} : ({selected(i)} == 1 ? {r['choices'][1]['trust']} : {r['choices'][2]['trust']}))" for i,r in enumerate(story['rounds']))+')'
# 7번의 지원 실행은 네 항목의 실행·확인을 포함한다. 약속만으로 위험을 지우지 않는다.
is_a=f"({trust} >= 12 && {selected(6)} == 1 && {selected(7)} == 2)"
technical=f"({selected(6)} == 0 || {selected(6)} == 1 || ({selected(2)} == 0 && {selected(3)} == 2 && {selected(4)} == 1))"
is_b=f"(!{is_a} && {trust} >= 6 && {technical})"
room['outcome']['ending']['.validate']=f"(newData.val() == 'A' && {is_a}) || (newData.val() == 'B' && {is_b}) || (newData.val() == 'C' && !{is_a} && !{is_b})"
room['outcome']['card']['.validate']=' || '.join(f"(newData.parent().child('ending').val() == '{k}' && newData.val() == {json.dumps(e['card'],ensure_ascii=False)})" for k,e in story['endings'].items())
# 정해진 집계는 재접속/중복 요청으로 바뀌지 않는다.
d=room['decisions']['$round']
d['.validate']+=" && newData.child('total').val() == newData.child('counts').child('0').val() + newData.child('counts').child('1').val() + newData.child('counts').child('2').val()"
for key in ['choice','total','tie','at']:
    d[key]['.validate']+=' && (!data.exists() || newData.val() == data.val())'
for key in ['0','1','2']:
    d['counts'][key]['.validate']+=' && (!data.exists() || newData.val() == data.val())'
(OUT/'database.harm-v3.rules.json').write_text(json.dumps(rules,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Generated rules for roomsHarmV3 only')
