// Manual browser preview only. Uses temporary workerd/R2 data and a test JWT.
// Binds loopback and is excluded from every deployment artifact.
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export async function serve({mf,jwt}){
 const root=fileURLToPath(new URL('../../',import.meta.url)),origin='http://127.0.0.1:8790',prefix='/paperwork/account-api/';let signedIn=true;
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,origin);
  if(url.pathname=== '/js/account-config.json'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({enabled:true,apiURL:origin+prefix}));return}
  if(url.pathname===prefix+'login'){res.writeHead(303,{Location:origin});res.end();return}
  if(url.pathname.startsWith(prefix)){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const headers=new Headers(req.headers);headers.set('Origin',origin);if(signedIn)headers.set('Cf-Access-Jwt-Assertion',jwt);
   const response=await mf.dispatchFetch(url.href,{method:req.method,headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';if(!/^(index\.html|(?:js|images|json|info_txt)\/)/.test(relative)||relative.split('/').includes('..')){res.writeHead(404);res.end();return}
  const bytes=await readFile(path.join(root,relative)),mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(relative)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(bytes);
 }catch{res.writeHead(404);res.end()}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(8790,'127.0.0.1',resolve)});
 console.log('PORTAL PREVIEW http://127.0.0.1:8790 — synthetic identity and temporary R2 only');
 await new Promise(resolve=>process.once('SIGINT',resolve));
 await new Promise(resolve=>server.close(resolve));
}
