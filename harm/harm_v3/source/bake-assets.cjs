/*
 * 승인된 새 인물 시트의 alpha 영역을 공통 팩과 같은 칸에 배치한다.
 * 공통 자산 원본은 수정하지 않는다. 장면은 원본 스프라이트·배경·UI의 합성이다.
 * NODE_PATH: sharp 및 @napi-rs/canvas가 설치된 모듈 경로.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const out=path.resolve(__dirname,'..'),root=path.resolve(out,'../..'),pack=path.join(root,'shared/ethicity-elementary-common-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));
const ids=['grandmother','photographer','company_staff'];
const names={grandmother:'새봄 할머니',photographer:'반짝사진관 주인',company_staff:'두빛기술 직원'};
const expressions=['neutral','happy','worried','explaining'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function components(data,w,h){
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),out=[];
 for(let n=0;n<w*h;n++){
  if(seen[n]||data[n*4+3]<160)continue;
  let head=0,tail=1,x0=w,y0=h,x1=0,y1=0;queue[0]=n;seen[n]=1;
  while(head<tail){const i=queue[head++],x=i%w,y=(i/w)|0;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(const j of [i-1,i+1,i-w,i+w]){if(j<0||j>=w*h||seen[j]||data[j*4+3]<160||Math.abs(j%w-x)>1)continue;seen[j]=1;queue[tail++]=j;}}
  if(tail>1000)out.push({x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,area:tail});
 }
 return out.sort((a,b)=>b.area-a.area).slice(0,5);
}
function fit(ctx,img,r,x,y,w,h,pad=8){const scale=Math.min((w-pad*2)/r.w,(h-pad*2)/r.h),dw=Math.round(r.w*scale),dh=Math.round(r.h*scale);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,r.x,r.y,r.w,r.h,x+Math.round((w-dw)/2),y+h-pad-dh,dw,dh);}
function slice(ctx,img,x,y,w,h){const edge=12,iw=img.width,ih=img.height;for(let row=0;row<3;row++)for(let col=0;col<3;col++){const sx=[0,edge,iw-edge][col],sy=[0,edge,ih-edge][row],sw=[edge,iw-edge*2,edge][col],sh=[edge,ih-edge*2,edge][row],dx=[x,x+edge,x+w-edge][col],dy=[y,y+edge,y+h-edge][row],dw=[edge,w-edge*2,edge][col],dh=[edge,h-edge*2,edge][row];ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);}}

(async()=>{
 fs.mkdirSync(path.join(out,'assets/scenes'),{recursive:true});
 const extension={id:'harm-v3-approved-npcs',version:'1.0.0',commonPackVersion:manifest.version,scope:'harm/harm_v3 only; common pack originals unchanged',created:'2026-10-31',sourceMode:'Approved built-in image_gen concept sheets; deterministic alpha sprite packing only',characters:{},scenes:{},commonSources:{}};
 const priorExtension=path.join(out,'assets/manifest.extension.json');
 if(fs.existsSync(priorExtension)){const prior=JSON.parse(fs.readFileSync(priorExtension,'utf8'));if(prior.sounds)extension.sounds=prior.sounds;}
 const npcImages={};
 for(const id of ids){
  const relative='assets/characters/'+id+'-source.png',file=path.join(out,relative),bytes=fs.readFileSync(file),img=await loadImage(file);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const comps=components(data,info.width,info.height);if(comps.length!==5)throw Error(id+' requires one body plus four portraits');
  const body=comps.find(c=>c.x<500),portraits=comps.filter(c=>c!==body).sort((a,b)=>a.y-b.y);
  const ordered=[...portraits.slice(0,2).sort((a,b)=>a.x-b.x),...portraits.slice(2).sort((a,b)=>a.x-b.x)];
  const padded=r=>({x:Math.max(0,r.x-4),y:Math.max(0,r.y-4),w:Math.min(info.width-r.x+4,r.w+8),h:Math.min(info.height-r.y+4,r.h+8)});
  const standing=createCanvas(96,128),pc=createCanvas(1024,256),sc=standing.getContext('2d'),ctx=pc.getContext('2d');
  fit(sc,img,padded(body),0,0,96,128,8);ordered.forEach((r,i)=>fit(ctx,img,padded(r),i*256,0,256,256,8));
  const standingPath='assets/characters/'+id+'-standing.png',portraitPath='assets/characters/'+id+'-portraits.png';
  fs.writeFileSync(path.join(out,standingPath),standing.toBuffer('image/png'));fs.writeFileSync(path.join(out,portraitPath),pc.toBuffer('image/png'));
  extension.characters[id]={name:names[id],source:relative,sourceSha256:hash(bytes),standing:standingPath,walk:standingPath,directions:['down'],frames:{down_0:{x:0,y:0,w:96,h:128}},portraits:portraitPath,frameWidth:96,frameHeight:128,feetAnchor:{x:48,y:120},expressions,portraitFrame:{w:256,h:256},sourceRects:{standing:padded(body),portraits:ordered.map(padded)},animation:'static only; drawCharacter uses down/frame 0 only; no generated walk cycle'};
  npcImages[id]={standing:await loadImage(path.join(out,standingPath)),portraits:await loadImage(path.join(out,portraitPath))};
 }
 const scope={};vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(pack,'runtime/common.js'),'utf8'),scope);
 const art=new scope.EthicityAssets.CommonAssets(manifest);
 const assetPaths=new Set([manifest.icons.image,manifest.effects.image,manifest.props.image,'ui/panel.png','ui/speech.png']);
 for(const id of ['onyu','saebom','daon','teacher','robot']){assetPaths.add(manifest.characters[id].walk);assetPaths.add(manifest.characters[id].portraits);}
 for(const id of ['ai_lab','classroom','courtyard'])assetPaths.add(manifest.backgrounds[id].image);
 for(const relative of assetPaths){const bytes=fs.readFileSync(path.join(pack,relative));art.images.set(relative,await loadImage(path.join(pack,relative)));extension.commonSources[relative]=hash(bytes);}
 const panel=art.images.get('ui/panel.png');
 const specs=[
  {id:1,file:'01-face-rules.webp',background:'ai_lab',title:'얼굴 바꾸기의 규칙',caption:'축제 전날, 온유·다온·선생님이 얼굴 놀이의 사용 방법을 살핀다.',alt:'AI 실습실의 컴퓨터 곁에 온유와 다온, 선생님이 모여 있다. 화면 옆 자료 창에 다온의 원본 얼굴과 살펴보기 도구가 보인다.',actors:[['onyu',535,524,'right'],['daon',742,548,'left'],['teacher',638,432,'down']],prop:'computer',portraits:['onyu','daon'],icons:['person','inspect','notebook'],branchNeutral:true},
  {id:2,file:'02-voice-rules.webp',background:'ai_lab',title:'목소리 놀이의 규칙',caption:'새봄과 온유가 목소리를 그대로 흉내 내는 기능과 로봇 소리를 살핀다.',alt:'온유와 새봄이 AI 실습실의 컴퓨터 앞에서 이야기한다. 자료 창에는 새봄과 안내 로봇의 원본 얼굴, 소리 아이콘이 나란히 있다.',actors:[['onyu',530,535,'right'],['saebom',740,535,'left'],['robot',640,450,'down']],prop:'computer',portraits:['saebom','robot'],icons:['volume','arrow_right','robot'],branchNeutral:true},
  {id:3,file:'03-daon-photo.webp',background:'courtyard',title:'다온의 사진과 마음',caption:'다온과 개발팀이 사진 사용 시도와 지금 필요한 도움을 함께 확인한다.',alt:'중앙마당 게시판 옆에 여자 친구 다온과 온유, 선생님이 서 있다. 다온의 원본 얼굴이 자료 창에 보이며, 놀리는 사진이나 이미 퍼졌다는 표시는 없다.',actors:[['daon',580,537,'down'],['onyu',740,555,'left'],['teacher',840,495,'left']],prop:'noticeboard',portraits:['daon','teacher'],icons:['person','inspect','help'],branchNeutral:true},
  {id:4,file:'04-grandmother-call.webp',background:'classroom',title:'새봄 할머니에게 온 전화',caption:'새봄 할머니와 새봄이 선생님에게 전화 확인 방법을 이야기한다.',alt:'교실에서 새봄 할머니가 휴대전화를 들고 새봄과 선생님을 만난다. 자료 창에는 할머니와 새봄, 소리와 살펴보기 아이콘이 있다. 돈을 보낸 장면은 없다.',actors:[['grandmother',590,555,'down'],['saebom',735,548,'left'],['teacher',855,485,'left']],prop:'notebook',portraits:['grandmother','saebom'],icons:['volume','inspect','help'],branchNeutral:true},
  {id:5,file:'05-company-proposal.webp',background:'ai_lab',title:'두빛기술의 제안',caption:'두빛기술 직원이 여러 기록을 연결하는 기능을 제안하고, 개발팀이 살핀다.',alt:'제안서를 든 두빛기술 직원과 온유, 선생님이 실습실에 모인다. 자료 창은 사람 자료와 여러 기록, 지도의 연결을 보여 준다. 실제 사람이나 위치 정보는 없다.',actors:[['company_staff',590,540,'down'],['onyu',740,560,'left'],['teacher',855,480,'left']],prop:'computer',portraits:['company_staff','onyu'],icons:['person','notebook','map'],branchNeutral:true},
  {id:6,file:'06-photo-shop.webp',background:'classroom',title:'사진관과 함께할 방법',caption:'축제 몇 주 뒤, 사진관 주인이 개발팀과 만나 함께할 방법을 의논한다.',alt:'카메라와 앞치마를 갖춘 반짝사진관 주인이 교실의 상담 자리에서 새봄, 온유와 이야기한다. 가게 폐업이나 모든 손님이 사라진 장면은 없다.',actors:[['photographer',590,550,'down'],['saebom',740,540,'left'],['onyu',850,570,'left']],prop:'desk',portraits:['photographer','saebom'],icons:['person','notebook','help'],branchNeutral:true},
  {id:7,file:'07-follow-through.webp',background:'classroom',title:'고친 일과 아직 필요한 도움',caption:'선생님과 개발팀이 앞선 선택과 남아 있는 도움을 함께 확인한다.',alt:'다온, 새봄, 온유와 선생님이 교실의 기록장 곁에 모인다. 자료 창에 할머니와 사진관 주인, 점검과 도움 아이콘이 있다. 조치가 모두 완료됐다는 표시는 없다.',actors:[['daon',500,535,'right'],['saebom',610,575,'up'],['onyu',740,560,'left'],['teacher',740,440,'down']],prop:'notebook',portraits:['grandmother','photographer'],icons:['inspect','notebook','help'],branchNeutral:true},
  {id:8,file:'08-next-festival.webp',background:'courtyard',title:'다음 축제에 지킬 약속',caption:'다음 축제를 앞두고 개발팀과 마을 사람들이 다시 모인다.',alt:'다온, 온유, 새봄, 선생님, 새봄 할머니와 사진관 주인이 중앙마당에 모인다. 개발팀의 노트와 사람, 도움 아이콘이 보인다. 발표할 약속의 답은 미리 표시하지 않는다.',actors:[['onyu',510,510,'down'],['saebom',748,510,'down'],['daon',480,620,'up'],['teacher',840,605,'left'],['grandmother',615,630,'down'],['photographer',740,650,'down']],prop:'noticeboard',portraits:['onyu','saebom'],icons:['notebook','person','help'],branchNeutral:true}
 ];
 function drawActor(ctx,[id,x,y,dir]){if(npcImages[id])ctx.drawImage(npcImages[id].standing,x-48*.95,y-120*.95,96*.95,128*.95);else art.drawCharacter(ctx,id,x,y,dir,1,id==='robot'?.7:id==='teacher'?.95:.9);}
 function portrait(ctx,id,x,y,size,expression='neutral'){if(npcImages[id])ctx.drawImage(npcImages[id].portraits,expressions.indexOf(expression)*256,0,256,256,x,y,size,size);else art.drawPortrait(ctx,id,expression,x,y,size);}
 const results=[];
 for(const spec of specs){
  const canvas=createCanvas(1280,720),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;art.drawBackground(ctx,spec.background);
  // World actors always use manifest pixels; source poses and costumes are never redrawn.
  const propY=spec.id===8?460:502,world=spec.actors.map(actor=>({depth:actor[2],draw:()=>drawActor(ctx,actor)}));
  world.push({depth:propY,draw:()=>{if(spec.prop==='notebook'){art.drawProp(ctx,'desk',630,propY,110);art.drawProp(ctx,'notebook',630,propY-52,52);}else art.drawProp(ctx,spec.prop,630,propY,spec.prop==='computer'?130:spec.prop==='noticeboard'?180:110);}});
  world.sort((a,b)=>a.depth-b.depth).forEach(item=>item.draw());
  // A close-up of the same source portraits makes the subject readable at small display sizes.
  // It is a neutral evidence panel, not a result/answer illustration.
  slice(ctx,panel,856,56,368,302);
  portrait(ctx,spec.portraits[0],884,84,142,spec.id===3?'worried':spec.id===4?'explaining':'neutral');
  portrait(ctx,spec.portraits[1],1048,84,142,spec.id===7?'neutral':'explaining');
  spec.icons.forEach((id,i)=>art.drawIcon(ctx,id,896+i*108,260,56));
  const filename=path.join(out,'assets/scenes',spec.file);await sharp(canvas.toBuffer('image/png')).webp({quality:92,effort:6}).toFile(filename);
  const bytes=fs.readFileSync(filename),result={...spec,width:1280,height:720,sha256:hash(bytes),bytes:bytes.length};results.push(result);
  extension.scenes['harm_v3_round_'+spec.id]={file:'assets/scenes/'+spec.file,sha256:result.sha256,commonBackground:spec.background,commonCharacters:spec.actors.map(a=>a[0]).filter(id=>manifest.characters[id]),additionalCharacters:spec.actors.map(a=>a[0]).filter(id=>npcImages[id]),branchNeutral:true};
 }
 const data={generator:'Canvas composition using unchanged common-pack pixels and approved NPC sprites',mode:'compose-existing-assets',date:'2026-10-31',logicalStage:{width:1280,height:720},commonPack:'shared/ethicity-elementary-common-v1',commonPackVersion:manifest.version,notes:['All eight scenes are neutral to prior class choices; branch-specific narrative and evidence remain live text.','No common character, background, prop, icon, effect or sound was redrawn.','New NPC sheets were generated in the approved design phase; this build only packs their existing alpha pixels.','Short labels and all story text remain HTML, not image text.'],scenes:results};
 fs.writeFileSync(path.join(__dirname,'scene-images.json'),JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync(path.join(out,'assets/manifest.extension.json'),JSON.stringify(extension,null,2)+'\n');
 // Contact sheet is QA only; it is not embedded in the game.
 const contact=createCanvas(1280,1440),cc=contact.getContext('2d');for(let i=0;i<results.length;i++){const image=await loadImage(path.join(out,'assets/scenes',results[i].file));cc.drawImage(image,(i%2)*640,Math.floor(i/2)*360,640,360);}
 fs.writeFileSync(path.join(out,'assets/scenes/contact-preview.png'),contact.toBuffer('image/png'));
 console.log(JSON.stringify({characters:ids,scenes:results.map(s=>({id:s.id,file:s.file,bytes:s.bytes})),commonAssetsUnchanged:true},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
