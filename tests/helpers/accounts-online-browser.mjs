// Temporary local HTTP harness. Test identity is injected only here, never in app code.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export async function run({mf,jwt,api,user}){
 const root=fileURLToPath(new URL('../../',import.meta.url)),origin='http://127.0.0.1:8790',prefix='/paperwork/account-api/';let signedIn=true;
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,origin);
  if(url.pathname=== '/js/account-config.json'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({enabled:true,apiURL:origin+prefix}));return}
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
 const {webkit}=require(process.env.LAMPY_PLAYWRIGHT_PATH||'playwright'),browser=await webkit.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
 const manager=async p=>{await p.locator('.menuButton').click();await p.getByRole('button',{name:'Projects & Account',exact:true}).click()};
 const welcome=async p=>{await p.getByRole('button',{name:'Continue',exact:true}).click();await p.waitForFunction(()=>LampyAccounts.enabled)};
 const until=async(fn,label)=>{for(let i=0;i<80;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+label)};
 try{
  await page.goto(origin);await welcome(page);await manager(page);await page.getByRole('button',{name:'Connect account',exact:true}).click();await page.getByText('Signed in as owner@example.test',{exact:true}).waitFor();
  await page.getByRole('button',{name:'New project',exact:true}).click();await page.getByLabel('Project name',{exact:true}).fill('Online browser project');await page.getByRole('button',{name:'Create project',exact:true}).click();await page.waitForFunction(()=>LampyAccounts.active?.owner!=='device'&&!!LampyAccounts.active);
  const id=await page.evaluate(()=>LampyAccounts.active.id);await page.waitForFunction(()=>document.getElementById('accountSaveStatus').textContent.includes('Saved online'));
  assert.equal((await api.download('project',id)).payload.app.projectInfo.file.projectName,'Online browser project');
  await page.locator('button[aria-label="Project Settings"]').click();await page.locator('[data-project-file="projectOwner"]').fill('Owner one');await page.locator('[data-project-file="projectOwner"]').press('Tab');
  await manager(page);await page.getByRole('button',{name:'Defaults & Templates',exact:true}).click();await page.getByRole('button',{name:'Save current as template',exact:true}).click();await page.getByLabel('Template name',{exact:true}).fill('Browser Tour');await page.getByRole('button',{name:'Review template',exact:true}).click();await page.getByRole('button',{name:'Save template',exact:true}).click();
  await until(async()=> (await api.list('template')).some(t=>t.name==='Browser Tour'),'template upload alongside project');
  await until(async()=> (await api.download('project',id)).payload.app.projectInfo.file.projectOwner==='Owner one','project upload alongside template');
  const template=(await api.list('template')).find(t=>t.name==='Browser Tour'),remote=await api.download('template',template.id);
  const remotePayload=structuredClone(remote.payload);remotePayload.project.app.projectInfo.file.projectOwner='Owner on another device';remotePayload.revision++;
  await api.upload({kind:'template',id:template.id,name:'Browser Tour',deleted:false,payload:remotePayload},{writeId:crypto.randomUUID(),baseEtag:remote.manifest.etag});
  await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('button[aria-label="Project Settings"]').click();await page.locator('[data-project-file="projectOwner"]').fill('Local template owner');await page.locator('[data-project-file="projectOwner"]').press('Tab');
  await manager(page);await page.getByRole('button',{name:'Defaults & Templates',exact:true}).click();await page.locator('.accountRecord').filter({hasText:'Browser Tour'}).getByRole('button',{name:'Update from current project',exact:true}).click();await page.getByRole('button',{name:'Review template',exact:true}).click();await page.getByRole('button',{name:'Save template',exact:true}).click();
  await page.waitForFunction(async()=>{const s=await LampyProjectStore.open();try{return (await s.list(LampyAccounts.active.owner,'template')).some(t=>t.name==='Browser Tour'&&t.conflict)}finally{s.close()}});
  await page.getByRole('button',{name:'Defaults & Templates',exact:true}).click();await page.locator('.accountRecord').filter({hasText:'Browser Tour'}).getByRole('button',{name:'Review conflict',exact:true}).click();await page.getByRole('button',{name:'Keep both',exact:true}).click();
  await page.locator('.accountRecord').filter({hasText:'Browser Tour — local copy'}).waitFor();
  assert.equal(await page.evaluate(()=>projectFilePayload().app.projectInfo.file.projectOwner),'Local template owner','resolving a template must not modify the current project');
  const recovered=await page.evaluate(async()=>{const s=await LampyProjectStore.open();try{return (await s.list(LampyAccounts.active.owner,'template')).filter(t=>t.name.startsWith('Browser Tour')).map(t=>({name:t.name,owner:t.payload.project.app.projectInfo.file.projectOwner,conflict:t.conflict}))}finally{s.close()}});
  assert(recovered.some(t=>t.name==='Browser Tour'&&t.owner==='Owner on another device'&&!t.conflict));assert(recovered.some(t=>t.name.endsWith('local copy')&&t.owner==='Local template owner'));
  const secondContext=await browser.newContext(),second=await secondContext.newPage();try{
   await second.goto(origin);await welcome(second);await manager(second);await second.getByRole('button',{name:'Connect account',exact:true}).click();await second.locator('.accountRecord').filter({hasText:'Online browser project'}).getByRole('button',{name:'Open',exact:true}).click();await second.waitForFunction(()=>!!LampyAccounts.active);assert.equal(await second.title(),'Online browser project');assert.equal(await second.evaluate(()=>LampyAccounts.active.owner),user.id);
  }finally{await secondContext.close()}
  await page.getByRole('button',{name:'Close',exact:true}).click();signedIn=false;
  await page.locator('button[aria-label="Project Settings"]').click();await page.locator('[data-project-file="projectOwner"]').fill('Retained after expiry');await page.locator('[data-project-file="projectOwner"]').press('Tab');await page.waitForFunction(()=>!LampyAccounts.hasUnsaved());
  await until(async()=> (await page.locator('#accountSaveStatus').innerText()).includes('Waiting to sync'),'expired authentication status');
  assert.equal(await page.evaluate(async()=>{const s=await LampyProjectStore.open();try{return (await s.read(LampyAccounts.active.owner,'project',LampyAccounts.active.id)).payload.app.projectInfo.file.projectOwner}finally{s.close()}}),'Retained after expiry');
  assert.deepEqual(errors,[]);console.log('PASS: WebKit UI with real Worker/R2: account projects, concurrent template/project sync, template conflict Keep both, unchanged current project, fresh-device download and retained edits after authentication expiry.');
 }catch(error){console.error('Templates:',await page.evaluate(async()=>{const s=await LampyProjectStore.open();try{return (await s.list(LampyAccounts.active.owner,'template')).map(t=>({name:t.name,revision:t.revision,dirty:t.dirty,conflict:t.conflict,error:t.syncError}))}finally{s.close()}}));console.error(await page.evaluate(()=>({status:document.getElementById('accountSaveStatus')?.textContent,detail:document.getElementById('accountSaveStatus')?.title,dialog:document.getElementById('accountManager')?.innerText,active:LampyAccounts.active})));throw error}
 finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve))}
}
