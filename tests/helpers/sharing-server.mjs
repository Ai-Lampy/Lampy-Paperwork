import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
import {mkdtemp,readFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function runtime(){
 const directory=await realpath(await mkdtemp(path.join(tmpdir(),'lampy-share-test-'))),script=path.join(directory,'worker.mjs');
 await build({entryPoints:[path.join(root,'backend/patch-sharing-worker.mjs')],outfile:script,bundle:true,format:'esm',platform:'neutral',target:'es2022'});
 const mf=new Miniflare({rootPath:directory,modulesRoot:directory,modules:true,scriptPath:script,compatibilityDate:'2026-07-30',cf:false,d1Databases:['AUTH_DB'],bindings:{ALLOWED_ORIGINS:'https://lampy.example,http://127.0.0.1:8790',APP_URL:'https://lampy.example/',SHARE_PREFIX:'/paperwork/account-api/shares'}});
 const db=await mf.getD1Database('AUTH_DB');for(const migration of ['0002-patch-sharing.sql','0003-patch-note-replies.sql'])await db.exec((await readFile(path.join(root,'backend/migrations',migration),'utf8')).replace(/--[^\n]*/g,'').replace(/\s+/g,' '));
 return {mf,db,async close(){await mf.dispose();await rm(directory,{recursive:true,force:true})}};
}
export async function serve(){
 const test=await runtime();const server=createServer(async(req,res)=>{try{
  res.setHeader('Cache-Control','no-store');const url=new URL(req.url,'http://127.0.0.1:8790');
  if(url.pathname==='/js/patch-sharing-config.json'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({apiURL:'http://127.0.0.1:8790/paperwork/account-api/shares/'}));return}
  if(url.pathname.startsWith('/paperwork/account-api/')){const chunks=[];for await(const chunk of req)chunks.push(chunk);const response=await test.mf.dispatchFetch(url,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return}
  const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';if(!/^(index\.html|(?:js|images|json|info_txt)\/)/.test(relative)||relative.split('/').includes('..')){res.writeHead(404);res.end();return}
  const data=await readFile(path.join(root,relative)),mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(relative)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(data);
 }catch(error){res.writeHead(500);res.end(error.message)}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(8790,'127.0.0.1',resolve)});
 console.log('V61 local test: http://127.0.0.1:8790 — temporary database only');
 const close=async()=>{await new Promise(resolve=>server.close(resolve));await test.close()};process.once('SIGINT',async()=>{await close();process.exit(0)});return {server,...test};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await serve();
