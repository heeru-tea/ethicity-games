(function(root){'use strict';
function summary(record){const connections=Object.keys(record?.connections||{}).length;return {online:connections>0,connections,lastConnectedAt:record?.lastConnectedAt||null,lastSeenAt:record?.lastSeenAt||null};}
function start(db,base,uid,stamp,onConnection=()=>{}){
 let stopped=false,serial=0,current=null,onlineNow=false;const info=db.ref('.info/connected');
 const listener=async snap=>{const online=snap.val()===true;onlineNow=online;onConnection(online);if(!online||stopped)return;const version=++serial;
  const con=db.ref(base+'presence/'+uid+'/connections').push();const seen=db.ref(base+'presence/'+uid+'/lastSeenAt');
  try{await con.onDisconnect().remove();await seen.onDisconnect().set(stamp);if(stopped||version!==serial){await con.onDisconnect().cancel();await seen.onDisconnect().cancel();return;}
   current=con;await db.ref(base+'presence/'+uid).update({['connections/'+con.key]:true,lastConnectedAt:stamp});
  }catch{onConnection(false);}
 };
 info.on('value',listener);
 return async()=>{stopped=true;serial++;info.off('value',listener);if(current&&onlineNow){await current.remove().catch(()=>{});await current.onDisconnect().cancel().catch(()=>{});}if(onlineNow)await db.ref(base+'presence/'+uid+'/lastSeenAt').onDisconnect().cancel().catch(()=>{});};
}
const api={summary,start};if(typeof module!=='undefined')module.exports=api;else root.ClassroomPresence=api;
})(globalThis);
