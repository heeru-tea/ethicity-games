(function(root){
  'use strict';
  const ids=['users','access','need','safety','efficiency'];
  const originalWeights={users:4,access:1,need:1,safety:1,efficiency:3};
  const costs={path:3,play:3,shade:2,garden:2,square:2,lights:2};
  function evaluate(facilities,weights){
    const selected=new Set(facilities),has=id=>selected.has(id);
    const cost=Object.keys(costs).reduce((n,id)=>n+(has(id)?costs[id]:0),0);
    const benefit=(has('play')?4:0)+(has('shade')?2:0)+(has('square')?2:0)+(has('garden')?1:0)+(has('lights')?1:0)+(has('path')?1:0);
    const raw={
      users:Math.min(10,benefit),
      access:Math.min(10,(has('path')?6:0)+(has('square')?2:0)+(has('shade')?1:0)+(has('garden')?1:0)),
      need:Math.min(10,(has('path')?3:0)+(has('play')?2:0)+(has('shade')?2:0)+(has('garden')?2:0)+(has('square')?1:0)+(has('lights')?1:0)),
      safety:Math.min(10,(has('lights')?5:0)+(has('path')?3:0)+(has('play')?1:0)+(has('shade')?1:0)),
      efficiency:cost===0?0:Math.min(10,Math.round(10*benefit/(cost*1.4)))
    };
    const total=ids.reduce((n,id)=>n+weights[id],0);
    return {raw,cost,benefit,score:Math.round(ids.reduce((n,id)=>n+raw[id]*weights[id],0)/Math.max(1,total)*10)};
  }
  function needs(facilities){
    const has=id=>facilities.includes(id);
    return [
      {name:'새봄',need:'친구들과 놀 공간',met:has('play')},
      {name:'정순 할머니',need:'그늘에서 쉴 공간',met:has('shade')},
      {name:'하린',need:'정원까지 접근해 함께 꽃 가꾸기',met:has('path')&&has('garden')},
      {name:'지호',need:'돈을 쓰지 않고 앉을 공간',met:has('square')},
      {name:'저녁 산책 주민',need:'어두운 시간의 이동 안전',met:has('path')&&has('lights')}
    ];
  }
  const api={ids,costs,originalWeights,evaluate,needs};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ParkEvaluation=api;
})(typeof window==='undefined'?globalThis:window);
