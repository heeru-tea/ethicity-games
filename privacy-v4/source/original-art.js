// 원본 PNG 두 장을 HTML 안에 그대로 보관합니다. 좌표는 화면에 보여 줄 영역입니다.
// 원본을 다시 그리거나 배경을 지우지 않고, 필요한 부분만 액자처럼 보여 줍니다.
const ART_CROPS={
  boy:{sheet:'village',rect:[309,882,101,151]},
  pony:{sheet:'characters',rect:[56,811,114,164]},
  ponyHappy:{sheet:'characters',rect:[936,800,148,176]},
  bot:{sheet:'characters',rect:[812,1074,88,75]},
  botHappy:{sheet:'characters',rect:[987,1170,90,84]},
  friend:{sheet:'village',rect:[663,850,89,140]},
  teacher:{sheet:'village',rect:[535,829,114,168]},
  map:{sheet:'village',rect:[341,109,765,580]}
};
let originalArt=null,artLoading=null;
function loadOriginalArt(){
  if(artLoading)return artLoading;
  const data=JSON.parse(document.getElementById('game-assets').textContent);
  originalArt={};
  artLoading=Promise.all(Object.entries(data).map(([key,src])=>new Promise((resolve,reject)=>{
    const image=new Image();originalArt[key]=image;image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('원본 그림을 불러오지 못했습니다. 화면을 새로고침해 주시기 바랍니다.'));image.src=src;
  })));
  return artLoading;
}
function drawOriginal(canvas,crop,square=true){
  const img=originalArt?.[crop.sheet];if(!img?.complete||!img.naturalWidth)return;
  const [sx,sy,sw,sh]=crop.rect;canvas.width=square?256:sw;canvas.height=square?256:sh;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const scale=Math.min(canvas.width/sw,canvas.height/sh),w=sw*scale,h=sh*scale;
  ctx.drawImage(img,sx,sy,sw,sh,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
}
function drawCharacter(canvas,type='boy',mood='normal'){
  drawOriginal(canvas,ART_CROPS[mood==='happy'&&ART_CROPS[type+'Happy']?type+'Happy':type]||ART_CROPS.boy);
}
function drawVillage(canvas){drawOriginal(canvas,ART_CROPS.map,false);}
function paintArt(){
  const characters=Array.from(document.querySelectorAll('canvas[data-character]'));
  const maps=Array.from(document.querySelectorAll('canvas[data-village]'));
  if(!characters.length&&!maps.length)return;
  loadOriginalArt().then(()=>{
    characters.forEach(c=>{if(c.isConnected)drawCharacter(c,c.dataset.character,c.dataset.mood);});
    maps.forEach(c=>{if(c.isConnected)drawVillage(c);});
  }).catch(()=>{if(typeof showToast==='function')showToast('그림을 불러오지 못했습니다. 새로고침하면 다시 확인합니다.');});
}
