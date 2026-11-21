const fs=require('node:fs'),path=require('node:path');
const messages=JSON.parse(fs.readFileSync(path.join(__dirname,'en.json'),'utf8'));
for(const [ko,en] of Object.entries(messages)){
  if(typeof en!=='string'||!en.trim()||/[가-힣]/.test(en))throw Error('Invalid English translation: '+ko);
}
fs.writeFileSync(path.join(__dirname,'messages.js'),'/* Generated from en.json. Keep source keys stable for saved game data. */\nwindow.ETHICITY_EN='+JSON.stringify(messages)+';\n');
console.log('Compiled '+Object.keys(messages).length+' English messages.');
