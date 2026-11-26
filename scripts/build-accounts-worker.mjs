import {build} from 'esbuild';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function buildWorker(outfile,entry=resolve(root,'backend/accounts-worker.mjs')){
 await mkdir(dirname(outfile),{recursive:true});
 return build({entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'neutral',conditions:['workerd','worker','browser'],mainFields:['module','main'],external:['node:*','bun:*'],target:'es2022',minify:true,legalComments:'eof'});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('Supply an output path outside the project folder.');
 const target=resolve(process.argv[2]);if(target===root||target.startsWith(root+'/'))throw Error('Use an output path outside the project folder.');
 await buildWorker(target);console.log('Worker built: '+target);
}
