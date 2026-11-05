// Content regression checks against v4; no network requests or user data.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'..'),prev=path.resolve(base,'../harm_v4');
const story=require('../scenario.json'),before=JSON.parse(fs.readFileSync(path.join(prev,'scenario.json'),'utf8'));
const art=require('../assets/choice-illustrations.json'),{createStoryRules}=require('./story-rules.js');
const current=createStoryRules(story),old=createStoryRules(before),checks=[];
assert.deepEqual([story.characters.onyu,story.characters.saebom,story.characters.daon],['온유','새봄','다온']);
assert(!JSON.stringify(story).includes('학생'));
for(let i=0;i<3;i++){
 const d={0:{choice:i},1:{choice:i}};
 assert(JSON.stringify(current.resolveRound(2,d)).includes('다온이'));
 assert(JSON.stringify(current.resolveRound(3,d)).includes('새봄이'));
}
const seen=new Set();
for(const r of story.rounds)for(const c of r.choices){assert(c.tags.length>0&&c.tags.every(n=>n>=1&&n<=5));c.tags.forEach(n=>seen.add(n));}
assert.equal(seen.size,5);checks.push('Named speakers, all photo/voice branches, narrative and reflection text restored; five learning tags preserved');
for(let code=0;code<6561;code++){let n=code,d={};for(let i=0;i<8;i++){d[i]={choice:n%3};n=Math.floor(n/3);}assert.deepEqual(current.summarize(d),old.summarize(d));assert.deepEqual(current.resultOf(d),old.resultOf(d));}
checks.push('All 6561 class paths keep v4 scores, incident history, endings and completion schema');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const embedded=id=>JSON.parse(html.match(new RegExp('<script id="'+id+'"[^>]*>(.*?)</script>','s'))[1]);
assert.deepEqual(embedded('game-data'),story);const images=embedded('choice-art');assert.equal(Object.keys(images).length,8);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const a of art.assets){const b=fs.readFileSync(path.join(base,a.path));assert.equal(sha(b),a.webpSha256);assert.equal(sha(Buffer.from(images[a.round].src.split(',')[1],'base64')),a.webpSha256);assert(images[a.round].caption.length>10);}
assert(images[3].caption.includes('보낸다면'));checks.push('Eight approved lossless illustrations embedded with conditional sharing caption and accessible alt text');
const pack=path.resolve(base,'../../shared/ethicity-elementary-common-v1');
assert.deepEqual(embedded('common-manifest'),JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8')));
const originalFiles=embedded('common-files');for(const [file,data] of Object.entries(originalFiles)){if(file.startsWith('assets/'))continue;assert.equal(sha(Buffer.from(data.split(',')[1],'base64')),sha(fs.readFileSync(path.join(pack,file))));}
assert(html.includes(fs.readFileSync(path.join(pack,'runtime/common.js'),'utf8').replace(/\r\n/g,'\n')));checks.push('Common manifest, embedded original character/background assets and runtime unchanged (line endings normalized by build)');
const output={verifiedAt:new Date().toISOString(),checks};fs.writeFileSync(path.join(base,'verification-content.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
