import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
await build({entryPoints:[resolve(here,'../source/classroom.js')],outfile:resolve(here,'../classroom.bundle.js'),bundle:true,format:'iife',target:['es2020'],minify:true,legalComments:'linked',nodePaths:[resolve(here,'node_modules')]});
console.log('Classroom bundle built (Firebase SDK included locally).');
