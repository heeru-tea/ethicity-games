'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),sharp=require('sharp');
const base=path.resolve(__dirname,'..'),pack=path.resolve(base,'../../shared/ethicity-elementary-common-v1');
const extension=JSON.parse(fs.readFileSync(path.join(base,'assets/manifest.extension.json'),'utf8'));
const scenes=JSON.parse(fs.readFileSync(path.join(__dirname,'scene-images.json'),'utf8'));
const approved={grandmother:'0659994dce2d85e4ebc49d7e113369da22b03cf9873fcf018856e3036c3d6ac3',photographer:'c6a194a480970e470fec22071bf237d68cb394e6ee410713a590175b098f9668',company_staff:'092d168551ed3f714f661f23bdf1f71efceda8a1de5065da80d90a12b00ea5d2'};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async()=>{
 const checks=[];
 for(const [file,sha] of Object.entries(extension.commonSources))assert.equal(hash(path.join(pack,file)),sha,file+' retains common source bytes');
 checks.push(Object.keys(extension.commonSources).length+' common source assets retain their registered original bytes');
 for(const [id,c] of Object.entries(extension.characters)){
  assert.equal(hash(path.join(base,c.source)),approved[id],id+' retains approved sheet');
  assert.equal(c.sourceSha256,approved[id]);
  for(const [kind,width,height] of [['standing',96,128],['portraits',1024,256]]){
   const img=sharp(path.join(base,c[kind])),meta=await img.metadata();assert.equal(meta.width,width);assert.equal(meta.height,height);assert(meta.hasAlpha);
   const {data,info}=await img.ensureAlpha().raw().toBuffer({resolveWithObject:true});let opaque=0;
   for(let x=0;x<info.width;x++){assert.equal(data[x*4+3],0);assert.equal(data[((info.height-1)*info.width+x)*4+3],0);}
   for(let i=3;i<data.length;i+=4)if(data[i]>160)opaque++;assert(opaque>width*height*.1);
  }
  assert.deepEqual(c.expressions,['neutral','happy','worried','explaining']);
  assert.equal(c.walk,c.standing);assert.deepEqual(c.directions,['down']);
 }
 checks.push('Three approved NPC sheets are preserved; standing sprites and four-expression portrait atlases have transparent margins');
 assert.equal(scenes.scenes.length,8);assert.equal(Object.keys(extension.scenes).length,8);
 for(let i=0;i<8;i++){
  const s=scenes.scenes[i],file=path.join(base,'assets/scenes',s.file),meta=await sharp(file).metadata();
  assert.equal(s.id,i+1);assert.equal(meta.width,1280);assert.equal(meta.height,720);assert.equal(hash(file),s.sha256);assert(s.branchNeutral);assert(s.alt&&s.caption);
 }
 checks.push('Eight 1280×720 scene files match metadata and use branch-neutral imagery with Korean captions/alt text');
 const report={date:new Date().toISOString(),passed:checks.length,checks,commonSourceCount:Object.keys(extension.commonSources).length,sceneCount:8,npcCount:3,sceneBytes:scenes.scenes.reduce((sum,s)=>sum+s.bytes,0),mode:'Existing asset composition; approved NPC packing; no new image generation'};
 fs.writeFileSync(path.join(base,'verification-assets.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
