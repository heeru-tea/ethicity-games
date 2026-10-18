// 지도 그림은 공유하되, 레퍼런스의 안내 문장은 이 편의 화면 부품으로 덮어 표시합니다.
function drawVillage(canvas){
  drawOriginal(canvas,ART_CROPS.map,false);
  const ctx=canvas.getContext('2d');
  function plaque(x,y,w,h,lines,size=17){
    ctx.fillStyle='#173f42';ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#fff9da';ctx.fillRect(x+4,y+4,w-8,h-8);
    ctx.fillStyle='#173f42';ctx.font=`bold ${size}px NanumSquareRound, sans-serif`;ctx.textAlign='center';
    lines.forEach((line,i)=>ctx.fillText(line,x+w/2,y+h/2+(i-(lines.length-1)/2)*(size+8)+size/3));
  }
  plaque(14,10,223,99,['오늘의 부탁','다온과 모아를','함께 도와주세요'],17);
  plaque(380,88,145,43,['윤리시티 배움터'],15);
  plaque(576,146,171,184,['잠깐 멈추고','한 번 더 확인!','우리 반이','함께합니다'],18);
  plaque(118,259,103,94,['얼굴과 목소리','같아 보여도','살펴봅니다'],12);
  plaque(554,349,187,102,['친구를 돕는 길 →','함께 확인하는 길 →'],15);
}
