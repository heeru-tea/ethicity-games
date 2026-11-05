'use strict';
const fs=require('node:fs'),path=require('node:path');
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node merge-rules.cjs existing-rules.json merged-rules.json');
if(path.resolve(input)===path.resolve(output))throw Error('Use a separate output file to preserve the exported rules.');
const existing=JSON.parse(fs.readFileSync(input,'utf8')),fragment=require('../database.harm-v4.rules.json');
if(!existing.rules||typeof existing.rules!=='object')throw Error('Expected an exported object with a rules property.');
const merged={...existing,rules:{...existing.rules,roomsHarmV4:fragment.rules.roomsHarmV4}};
fs.writeFileSync(output,JSON.stringify(merged,null,2)+'\n',{flag:'wx'});
console.log('Created merged rules. Existing branches preserved; no deployment performed.');
