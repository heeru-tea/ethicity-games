// Regressions: stone wall, barrier tunneling, resident and portal reachability.
const assert=require('node:assert/strict'),fs=require('node:fs');
const text=fs.readFileSync(require('node:path').join(__dirname,'game.js'),'utf8');
const pick=(symbol)=>{const start=text.indexOf('const '+symbol+'=');assert(start>=0,symbol);const i=text.indexOf('[',start),j=text.indexOf('];',i);return Function('return '+text.slice(i,j+1))();};
const rect=pick('PARK_BLOCKERS'),lab=pick('LAB_BLOCKERS'),walls=pick('PARK_STONE_WALLS');
const seg=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/den)):0;return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);};
const blocked=(x,y,area='park')=>{
 if(x<80||x>1520||y<170||y>(area==='lab'?885:935))return true;
 const obstacles=area==='lab'?lab:rect;
 if(obstacles.some(r=>x>r[0]-12&&x<r[2]+12&&y>r[1]-12&&y<r[3]+12))return true;
 return area==='park'&&walls.some(w=>w.points.some((p,i)=>i&&seg(x,y,w.points[i-1],p)<=w.halfWidth+14));
};
const reachable=(from,to,area='park')=>{
 const STEP=10,seed=from.map(v=>Math.round(v/STEP)*STEP),queue=[seed],seen=new Set([seed.join(',')]);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(Math.hypot(x-to[0],y-to[1])<55)return true;
  for(const [dx,dy] of [[STEP,0],[-STEP,0],[0,STEP],[0,-STEP]]){const xx=x+dx,yy=y+dy,key=xx+','+yy;if(!seen.has(key)&&!blocked(xx,yy,area)){seen.add(key);queue.push([xx,yy]);}}
 }return false;
};
for(const point of [[1080,828],[1050,760],[998,695],[1150,860]])assert(blocked(...point),'Stone parapet must stop the avatar: '+point);
for(const point of [[350,340],[335,745],[1265,736],[1260,370],[805,190]])assert(reachable([800,860],point),'Resident or portal unreachable: '+point);
assert(reachable([800,725],[800,850],'lab'),'Lab exit unreachable');
assert(text.includes('Math.ceil(Math.hypot(dx,dy)/4)'),'Swept movement must prevent frame tunneling');
console.log('PASS: 4 stone-wall checks, 4 residents, park portal, lab portal, anti-tunneling');
