// Smoke test recorded audio playback and mute state with a stand-in HTMLAudioElement.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=__dirname,source=fs.readFileSync(path.join(root,'audio.js'),'utf8');
const required=['park-theme','dialogue','collect','portal','select','error','success','complete'];
for(const name of required){const p=path.join(root,'assets','audio',name+'.mp3');assert(fs.existsSync(p)&&fs.statSync(p).size>1000,'Missing real audio '+p);}
const played=[];
class Audio {constructor(src){this.src=src;this.currentTime=0;this.listeners={};this.volume=1;}addEventListener(n,fn){this.listeners[n]=fn;}play(){played.push(this.src);return Promise.resolve();}pause(){} }
const store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const events={},document={hidden:false,addEventListener(k,f){events[k]=f;}},window={addEventListener(k,f){events[k]=f;}};
vm.runInNewContext(source,{window,document,localStorage,Audio,console});
async function main(){const audio=window.ParkAudio;assert(audio.supported&&audio.enabled);audio.start();audio.play('collect');audio.play('portal');audio.test();await Promise.resolve();assert(played.some(p=>p.endsWith('/park-theme.mp3')),'BGM was not started');assert(played.some(p=>p.endsWith('/collect.mp3')),'Collection SFX was not played');assert(played.some(p=>p.endsWith('/portal.mp3')),'Portal SFX was not played');assert.strictEqual(audio.toggle(),false);assert.strictEqual(store.get('ethicity.park.audio.enabled'),'false');audio.toggle();audio.pause();console.log('PASS: actual MP3 file references, playback requests, collection/portal SFX, sound test, mute persistence');}
main().catch(e=>{console.error(e);process.exitCode=1;});
