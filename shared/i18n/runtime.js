/* Bilingual presentation layer. Game IDs, choices, saved state and input values stay untouched. */
(function () {
  'use strict';
  const messages=window.ETHICITY_EN||{};
  const key='ethicity.language.'+(document.currentScript?.dataset.game||'game');
  let language='ko';
  try{language=localStorage.getItem(key)==='en'?'en':'ko';}catch{}
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=new RegExp(Object.keys(messages).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
  let userTextDepth=0;
  function t(value){const text=String(value??'');return language==='en'&&!userTextDepth?text.replace(pattern,match=>messages[match]):text;}
  function userText(callback){userTextDepth++;try{return callback();}finally{userTextDepth--;}}
  function record(lines,protectedValues=[]){
    let text=Array.isArray(lines)?lines.join('\n'):String(lines);
    if(language!=='en')return text;
    const saved=[];
    for(const value of [...new Set(protectedValues.filter(Boolean))].sort((a,b)=>b.length-a.length)){
      const token='\uE000'+saved.length+'\uE001';saved.push(String(value));text=text.split(value).join(token);
    }
    text=t(text);
    return text.replace(/\uE000(\d+)\uE001/g,(_,i)=>saved[Number(i)]);
  }
  const originals=new WeakMap(),attrOriginals=new WeakMap();
  const excluded='script,style,textarea,input,[data-user-text],#heroName,.language-control';
  const attributes=['aria-label','aria-description','alt','title','placeholder'];
  let observer;
  function localizeNode(node){
    if(node.nodeType!==Node.TEXT_NODE||node.parentElement?.closest(excluded))return;
    const current=node.nodeValue,cached=originals.get(node);
    const source=cached&&current===cached.last?cached.source:current;
    const translated=t(source);
    if(current!==translated)node.nodeValue=translated;
    originals.set(node,{source,last:translated});
  }
  function refresh(){
    observer?.disconnect();
    document.documentElement.lang=language;
    const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
    let node;while((node=walker.nextNode()))localizeNode(node);
    for(const el of document.querySelectorAll('[aria-label],[aria-description],[alt],[title],[placeholder]')){
      if(el.closest('.language-control,script,style,[data-user-text]'))continue;
      let cache=attrOriginals.get(el);if(!cache){cache={};attrOriginals.set(el,cache);}
      for(const name of attributes){
        const current=el.getAttribute(name);if(current===null)continue;
        const old=cache[name],source=old&&current===old.last?old.source:current;
        const translated=t(source);if(current!==translated)el.setAttribute(name,translated);
        cache[name]={source,last:translated};
      }
    }
    document.querySelector('#gameLanguage').value=language;
    observer?.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
  }
  function setLanguage(next){
    if(!['ko','en'].includes(next))return;
    language=next;try{localStorage.setItem(key,language);}catch{}
    refresh();window.dispatchEvent(new CustomEvent('ethicity-language-change',{detail:{language}}));
  }
  window.EthicityI18n={t,record,userText,refresh,setLanguage,get language(){return language;}};
  const bar=document.createElement('div');bar.className='language-control';
  bar.innerHTML='<label for="gameLanguage">언어 / Language</label><select id="gameLanguage" aria-label="언어 / Language"><option value="ko">한국어</option><option value="en">English</option></select>';
  document.body.prepend(bar);bar.querySelector('select').addEventListener('change',e=>setLanguage(e.target.value));
  bar.addEventListener('keydown',e=>e.stopPropagation());
  const css=document.createElement('style');
  css.textContent='@font-face{font-family:EthicityPixel;src:url("../shared/ethicity-elementary-common-v1/ui/fonts/Galmuri11.woff2") format("woff2");font-weight:400;font-display:swap}@font-face{font-family:EthicityPixel;src:url("../shared/ethicity-elementary-common-v1/ui/fonts/Galmuri11-Bold.woff2") format("woff2");font-weight:700 900;font-display:swap}html[lang=en] body{font-size:16px;line-height:1.8}html[lang=en] .facility small,html[lang=en] .reaction p,html[lang=en] .policy span{font-size:14px;line-height:1.7}.overlay{padding-top:72px}.overlay .dialog,.overlay .dialog-card{max-height:calc(100dvh - 96px)}.language-control{position:sticky;top:0;z-index:150;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:7px 16px;background:#294b40;color:#fff9e7;font:14px/1.4 EthicityPixel,monospace;border-bottom:2px solid #f3cf72}.language-control select{font:16px EthicityPixel,monospace;min-height:38px;min-width:110px;background:#fff9e7;color:#294b40;border:2px solid #a8bb8c;padding:4px 8px}.language-control select:focus-visible{outline:3px solid #f3cf72;outline-offset:2px}html[lang=en] body,html[lang=en] body.ee-theme{font-family:EthicityPixel,monospace}html[lang=en] button,html[lang=en] input,html[lang=en] textarea{font-family:EthicityPixel,monospace}html[lang=en] .dialog,html[lang=en] .dialog-card,html[lang=en] .intro-content,html[lang=en] .chapter-banner{word-break:normal;overflow-wrap:break-word}html[lang=en] .intro-content h2{font-size:clamp(28px,3vw,42px)}html[lang=en] .mission-btn,html[lang=en] .notebook-btn{line-height:1.45}html[lang=en] .masthead{flex-wrap:wrap}html[lang=en] .cover-heading h2{font-size:clamp(36px,5vw,68px)}html[lang=en] .card-mini .card-t{font-size:12px;line-height:1.4}html[lang=en] .dialogue p{overflow-wrap:break-word}';
  document.head.append(css);
  // Canvas text is rendered directly, so it needs the same translator as DOM text.
  for(const method of ['fillText','strokeText','measureText']){
    const original=CanvasRenderingContext2D.prototype[method];
    CanvasRenderingContext2D.prototype[method]=function(text,...args){
      const font=this.font;
      this.font=font.replace(/(\d+(?:\.\d+)?px)\s+.+$/, '$1 EthicityPixel, monospace');
      try{return original.call(this,t(text),...args);}finally{this.font=font;}
    };
  }
  for(const method of ['confirm','alert','prompt']){
    const original=window[method].bind(window);window[method]=(message,...args)=>original(t(message),...args);
  }
  const anchorClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){if(this.download)this.download=t(this.download);return anchorClick.call(this);};
  observer=new MutationObserver(refresh);
  refresh();
})();

