/* 시나리오의 문장은 scenario.json에, 분기와 판정은 이 순수 함수에 둔다. */
'use strict';
function createStoryRules(story) {
  const topics = ['photo', 'voice', 'tracking', 'shop'];
  function progress(decisions, limit = 8) {
    const s = {popularity:0, trust:0, count:0, choices:[],
      statuses:Object.fromEntries(topics.map(k=>[k,'unseen'])),
      technical:{photo:false,voice:false,tracking:false},
      photoSpread:false, photoRequested:false, voiceHarm:false,
      photoMode:'unopened', voiceMode:'off', trackingMode:'off',
      paused:false, supported:false, pledge:false};
    for (let i=0;i<Math.min(8,limit);i++) {
      const c=decisions?.[i]?.choice;
      if (!Number.isInteger(c)||c<0||c>2) break;
      const ch=story.rounds[i].choices[c];
      s.choices.push(c);s.count++;s.popularity+=ch.popularity;s.trust+=ch.trust;
      if(i===0){s.photoMode=['open','onsite','button'][c];s.photoSpread=c===0;}
      if(i===1){s.voiceMode=['off','open','robot'][c];s.voiceHarm=c===1;}
      if(i===2){
        s.statuses.photo=['resolved','working','needed'][c];s.technical.photo=c===0;
        if(c===0){s.photoMode='checked';s.photoRequested=s.photoSpread;}
        if(c===2)s.photoMode='open';
      }
      if(i===3){
        s.statuses.voice=['needed','working','resolved'][c];s.technical.voice=c===2;
        if(c===0)s.voiceMode='open';
        if(c===2)s.voiceMode=s.choices[1]===0?'off-checked':'robot-checked';
      }
      if(i===4){s.statuses.tracking=['needed','resolved','working'][c];s.technical.tracking=c===1;s.trackingMode=c===1?'off-checked':'open';}
      if(i===5){s.statuses.shop=['resolved','needed','working'][c];s.paused=c===2;}
      if(i===6&&c!==2){
        s.technical={photo:true,voice:true,tracking:true};s.photoMode='checked';
        s.voiceMode=s.voiceMode.startsWith('off')?'off-checked':'robot-checked';s.trackingMode='off-checked';
        if(c===1){for(const k of topics)s.statuses[k]='resolved';s.supported=true;s.photoRequested=s.photoSpread;}
        else for(const k of ['photo','voice','tracking'])if(s.statuses[k]!=='resolved')s.statuses[k]='working';
      }
      if(i===7)s.pledge=c===2;
    }
    s.allTechnical=Object.values(s.technical).every(Boolean);
    s.allResolved=Object.values(s.statuses).every(v=>v==='resolved');
    return s;
  }
  function summarize(decisions) {
    const s=progress(decisions);if(s.count!==8)return null;
    s.ending=s.trust>=12&&s.allResolved&&s.supported&&s.pledge?'A':s.trust>=6&&s.allTechnical?'B':'C';
    return s;
  }
  function resultOf(decisions) {
    const s=summarize(decisions);
    return s?{game:'harm',completed:true,ending:s.ending,card:story.endings[s.ending].card}:null;
  }
  function resolveRound(index, decisions) {
    let r=structuredClone(story.rounds[index]);
    const s=progress(decisions,index),t=story.stateText;
    // 이번 라운드의 결과는 원래 상황에 섞지 않아 결과 화면에서도 이야기를 다시 읽을 수 있다.
    if(r.branch){
      const c=decisions?.[r.branch.round]?.choice;
      if(Number.isInteger(c)&&r.branch.variants[c]){
        const {choices,...variant}=structuredClone(r.branch.variants[c]);
        Object.assign(r,variant);
        // Branches change wording, never vote indices, scores or learning tags.
        if(choices)r.choices=r.choices.map((choice,i)=>({...choice,...choices[i]}));
      }
    }
    if(index===6){
      const photo=s.photoSpread?(s.photoRequested?'requested':'notRequested'):'prevented';
      const voice=s.voiceHarm?'harmed':'prevented';
      r.narrative.push(t[s.paused?'paused':'open'],t.photoReview[photo],t.voiceReview[voice]);
      r.dialogues.unshift({speaker:'daon',text:t.photoDialogue[photo],mood:s.photoSpread?'worried':'explaining'},
        {speaker:'grandmother',text:t.voiceDialogue[voice],mood:s.voiceHarm?'worried':'explaining'});
      r.media=technicalLines(s).map(row=>({label:t.labels[row.key],text:row.text}));
      r.media.push({label:t.labels.shop,text:t.shopReview[s.choices[5]===0?'done':'pending']});
      const steps=t.supportSteps;
      r.choices[1].steps=[steps.start,steps[s.photoSpread?'photoSpread':'photoPrevented'],
        steps[s.voiceHarm?'voiceHarmed':'voicePrevented'],steps[s.trackingMode==='open'?'trackingOpen':'trackingOff'],
        steps[s.choices[5]===0?'shopDone':'shopPending'],steps.finish];
    }
    if(index===7)r.narrative.push(t[s.paused?'pausedPledge':'openPledge']);
    r.choices=r.choices.map(ch=>{
      if(ch.resultVariants){const v=ch.resultVariants;ch.feedback+= ' '+v[s[v.key]?'yes':'no'];}
      return ch;
    });
    r.dialogue=r.dialogues[0]?.text||'';
    return r;
  }
  function technicalLines(s) {
    const t=story.stateText.technical;
    return ['photo','voice','tracking'].map(key=>({key,text:key==='tracking'?(s.choices[4]===1?story.stateText.trackingReview.off:s.technical.tracking?t.checked:story.stateText.trackingReview.open):t[s.technical[key]?'checked':key==='voice'&&s.voiceMode==='off'?'off':key==='voice'&&s.voiceMode==='robot'?'robot':key==='photo'&&s.photoMode==='onsite'?'onsite':'unchecked']}));
  }
  function pending(s) {
    const t=story.stateText,out=[];
    for(const k of topics)if(s.statuses[k]!=='resolved')out.push(t.labels[k]+' · '+t.statuses[s.statuses[k]]);
    if(!s.supported)out.push(t.pendingSupport);
    if(!s.pledge)out.push(t.pendingPledge);
    if(s.trust<12)out.push(t.continueTrust);
    return out;
  }
  return Object.freeze({progress,summarize,resultOf,resolveRound,technicalLines,pending});
}
if(typeof module!=='undefined')module.exports={createStoryRules};
