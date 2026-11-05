"""roomsHarmV4만 추가할 RTDB 규칙. 기존 배포 규칙과 병합해서 사용한다."""
from pathlib import Path
import json
OUT=Path(__file__).resolve().parent.parent
story=json.loads((OUT/'scenario.json').read_text(encoding='utf-8'))
# v2에서 검증한 소유자/멤버/개인 투표/시간/동률 구조를 재사용한다.
prior=json.loads((OUT.parent/'database.harm.rules.json').read_text(encoding='utf-8'))
rules=json.loads(json.dumps(prior).replace('roomsHarm','roomsHarmV4'))
rules['rules']['roomsHarmV4']['.read']=False
room=rules['rules']['roomsHarmV4']['$room']
versions={story['version']:{k:e['card'] for k,e in story['endings'].items()}}
control=room['control']
control['.validate']=control['.validate'].replace('"ballot"','"ballot","step"')
control['step']={'.validate':'newData.isNumber() && newData.val() >= 0 && newData.val() <= 100 && newData.val() % 1 == 0'}
control['phase']['.validate']+=" || newData.val() == 'clues'"
control['paused']['.validate']='newData.val() == false'
control['remaining']['.validate']='newData.val() == 0'
control['duration']['.validate']='newData.val() == 0'
vote=room['votes']['$round']['$uid']
vote['.write']=vote['.write'].split(' && now < ')[0]
room['control']['version']['.validate']='('+' || '.join('newData.val() == '+json.dumps(v) for v in versions)+') && (!data.exists() || newData.val() == data.val())'
base="newData.parent().parent().child('decisions')"
def selected(i):return f"{base}.child('{i}').child('choice').val()"
trust='('+' + '.join(f"({selected(i)} == 0 ? {r['choices'][0]['trust']} : ({selected(i)} == 1 ? {r['choices'][1]['trust']} : {r['choices'][2]['trust']}))" for i,r in enumerate(story['rounds']))+')'
# 7번의 지원 실행은 네 항목의 실행·확인을 포함한다. 약속만으로 위험을 지우지 않는다.
is_a=f"({trust} >= 12 && {selected(6)} == 1 && {selected(7)} == 2)"
technical=f"({selected(6)} == 0 || {selected(6)} == 1 || ({selected(2)} == 0 && {selected(3)} == 2 && {selected(4)} == 1))"
is_b=f"(!{is_a} && {trust} >= 6 && {technical})"
room['outcome']['ending']['.validate']=f"(newData.val() == 'A' && {is_a}) || (newData.val() == 'B' && {is_b}) || (newData.val() == 'C' && !{is_a} && !{is_b})"
room['outcome']['card']['.validate']=' || '.join(f"(newData.parent().parent().child('control').child('version').val() == {json.dumps(version)} && newData.parent().child('ending').val() == '{k}' && newData.val() == {json.dumps(card,ensure_ascii=False)})" for version,cards in versions.items() for k,card in cards.items())
# 정해진 집계는 재접속/중복 요청으로 바뀌지 않는다.
d=room['decisions']['$round']
d['.validate']+=" && newData.child('total').val() == newData.child('counts').child('0').val() + newData.child('counts').child('1').val() + newData.child('counts').child('2').val()"
for key in ['choice','total','tie','at']:
    d[key]['.validate']+=' && (!data.exists() || newData.val() == data.val())'
for key in ['0','1','2']:
    d['counts'][key]['.validate']+=' && (!data.exists() || newData.val() == data.val())'
(OUT/'database.harm-v4.rules.json').write_text(json.dumps(rules,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Generated rules for roomsHarmV4 only')
