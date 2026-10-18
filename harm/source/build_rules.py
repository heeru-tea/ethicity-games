"""harm 전용 규칙 조각. 기존 서버 규칙에 roomsHarm만 추가해 적용합니다."""
from pathlib import Path
import json
OUT=Path(__file__).resolve().parent.parent
s=json.loads((OUT/'scenario.json').read_text(encoding='utf-8'))
r="root.child('roomsHarm').child($room)"
owner=f"auth != null && {r}.child('owner').val() == auth.uid"
member=f"auth != null && {r}.child('members').child(auth.uid).exists()"
read=f"({owner}) || ({member})"
def val(exp): return {'.validate':exp}
def number(lo,hi): return val(f'newData.isNumber() && newData.val() >= {lo} && newData.val() <= {hi} && newData.val() % 1 == 0')
def exact_fields(fields): return {'$other':{'.validate':False},'.validate':'newData.hasChildren('+json.dumps(fields,separators=(',',':'))+')'}
control=exact_fields(['version','round','phase','revision','accepting','paused','remaining','startedAt','duration','ballot'])
control['.read']=f"({read}) || (auth != null && data.child('accepting').val() == true)"
control['.validate']+=" && ((newData.child('phase').val() == 'lobby' || newData.child('phase').val() == 'intro') ? newData.child('round').val() == -1 : newData.child('round').val() >= 0) && (newData.child('phase').val() != 'ended' || (newData.child('round').val() == 7 && newData.parent().child('outcome').exists()))"
control.update({'version':val("newData.val() == "+json.dumps(s['version'])),'round':number(-1,7),'phase':val("newData.val() == 'lobby' || newData.val() == 'intro' || newData.val() == 'observe' || newData.val() == 'vote' || newData.val() == 'tie' || newData.val() == 'empty' || newData.val() == 'feedback' || newData.val() == 'ended'"),'revision':number(0,1000000000),'accepting':val('newData.isBoolean()'),'paused':val('newData.isBoolean()'),'remaining':number(0,7200000),'startedAt':val('newData.isNumber() && newData.val() <= now + 60000'),'duration':number(0,7200000),'ballot':number(0,1000000000)})
m=exact_fields(['nickname','character','joinedAt'])
m.update({'.read':'auth != null && auth.uid == $uid','.write':f"auth != null && auth.uid == $uid && newData.exists() && {r}.child('owner').exists() && (data.exists() || {r}.child('control').child('accepting').val() == true)",'nickname':val("newData.isString() && newData.val().length > 0 && newData.val().length <= 32 && !newData.val().matches(/.*[<>].*/)"),'character':val("newData.val() == 'char_03' || newData.val() == 'char_04'"),'joinedAt':val('newData.isNumber() && ((!data.exists() && newData.val() >= now - 60000 && newData.val() <= now + 60000) || (data.exists() && newData.val() == data.val()))')})
v=exact_fields(['choice','ballot','at'])
v.update({'.read':'auth != null && auth.uid == $uid','.write':f"({member}) && auth.uid == $uid && newData.exists() && {r}.child('control').child('phase').val() == 'vote' && {r}.child('control').child('paused').val() == false && $round == {r}.child('control').child('round').val() + '' && now < {r}.child('control').child('startedAt').val() + {r}.child('control').child('duration').val()",'choice':number(0,2),'ballot':val(f"newData.val() == {r}.child('control').child('ballot').val()"),'at':val('newData.isNumber() && newData.val() >= now - 60000 && newData.val() <= now + 60000')})
# 교사가 방 전체를 한 번에 확정할 때, 이전 라운드의 변하지 않은 투표도 검증됩니다.
for field in ['ballot','at']:
    v[field]['.validate']="(data.exists() && newData.val() == data.val()) || ("+v[field]['.validate']+")"
counts={'.validate':"newData.hasChildren(['0','1','2'])",'0':number(0,10000),'1':number(0,10000),'2':number(0,10000),'$other':{'.validate':False}}
d=exact_fields(['choice','counts','total','tie','at'])
d['.validate']+=" && $round.matches(/^[0-7]$/) && (!data.exists() || (newData.child('choice').val() == data.child('choice').val() && newData.child('total').val() == data.child('total').val() && newData.child('at').val() == data.child('at').val()))"
d.update({'choice':number(0,2),'counts':counts,'total':number(1,10000),'tie':val('newData.isBoolean()'),'at':val('newData.isNumber() && newData.val() <= now + 60000')})
def good(i,base):
    choice=next(j for j,c in enumerate(s['rounds'][i]['choices']) if c['protect'])
    return f"{base}.child('{i}').child('choice').val() == {choice}"
base="newData.parent().parent().child('decisions')"
g=[f'({good(i,base)})' for i in range(8)]
early='('+' || '.join('('+' && '.join(g[j] for j in range(4) if j!=skip)+')' for skip in range(4))+')'
repair=f'(({g[4]} && {g[5]}) || ({g[4]} && {g[6]}) || ({g[5]} && {g[6]}))'
is_a=f'({early} && {repair} && {g[7]})'
ending=f"(newData.val() == 'A' && {is_a}) || (newData.val() == 'B' && {repair} && !{is_a}) || (newData.val() == 'C' && !{repair})"
card=' || '.join(f"(newData.parent().child('ending').val() == '{k}' && newData.val() == {json.dumps(e['card'],ensure_ascii=False)})" for k,e in s['endings'].items())
outcome=exact_fields(['game','completed','ending','card'])
outcome['.read']=read
outcome['.validate']+=' && '+ ' && '.join(f"newData.parent().child('decisions').child('{i}').exists()" for i in range(8))
outcome.update({'game':val("newData.val() == 'harm'"),'completed':val('newData.val() == true'),'ending':val(ending),'card':val(card)})
res=exact_fields(['game','completed','ending','card'])
res.update({'.read':'auth != null && auth.uid == $uid','.write':f"({member}) && auth.uid == $uid && newData.exists() && {r}.child('control').child('phase').val() == 'ended'"})
for key in ['game','completed','ending','card']:res[key]=val(f"newData.val() == {r}.child('outcome').child('{key}').val()")
room={'.read':"auth != null && data.child('owner').val() == auth.uid",'.write':"auth != null && ((!data.exists() && newData.child('owner').val() == auth.uid) || (data.child('owner').val() == auth.uid && (!newData.exists() || newData.child('owner').val() == auth.uid)))",'.validate':"newData.hasChildren(['owner','createdAt','control','recap']) && $room.matches(/^[a-f0-9]{32}$/)",'owner':val("newData.isString() && (!data.exists() || newData.val() == data.val())"),'createdAt':val('newData.isNumber() && (!data.exists() || newData.val() == data.val())'),'control':control,'members':{'$uid':m},'votes':{'$round':{'.validate':"$round.matches(/^[0-7]$/)",'$uid':v}},'decisions':{'.read':read,'$round':d},'outcome':outcome,'recap':{'.read':read,**number(0,127)},'results':{'$uid':res},'$other':{'.validate':False}}
rules={'rules':{'roomsHarm':{'.indexOn':['owner'],'.read':"auth != null && query.orderByChild == 'owner' && query.equalTo == auth.uid",'$room':room}}}
(OUT/'database.harm.rules.json').write_text(json.dumps(rules,ensure_ascii=False,indent=2),encoding='utf-8')
print('harm rules generated; merge roomsHarm into the current server rules before deployment')
