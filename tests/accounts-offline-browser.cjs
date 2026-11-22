/* Explicit browser check against a built isolated pilot, never the live public app. */
'use strict';
const assert=require('node:assert/strict'),playwright=require(process.env.LAMPY_PLAYWRIGHT_PATH||'playwright');
const base=process.env.LAMPY_TEST_URL||'http://127.0.0.1:8766/pilot/';
(async()=>{
 let server=null;
 async function startServer(){
  if(!process.env.LAMPY_TEST_SITE)return;
  const url=new URL(base);assert.equal(url.hostname,'127.0.0.1');
  server=require('node:child_process').spawn('python3',['-m','http.server',url.port,'--bind','127.0.0.1'],{cwd:process.env.LAMPY_TEST_SITE,stdio:'ignore'});
  for(let n=0;n<100;n++){if(server.exitCode!==null)throw Error('Test server could not start');try{const r=await fetch(base);if(r.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,50))}
  throw Error('Test server did not become ready');
 }
 async function stopServer(){if(!server)return;const exited=require('node:events').once(server,'exit');server.kill('SIGTERM');await exited;server=null}
 await startServer();
 const browser=await (process.env.LAMPY_BROWSER==='chrome'?playwright.chromium.launch({headless:true,channel:'chrome'}):playwright.webkit.launch({headless:true})),context=await browser.newContext(),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 async function welcome(){await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>LampyAccounts.enabled)}
 async function manager(){await page.locator('.menuButton').click();await page.getByRole('button',{name:'Projects & Account',exact:true}).click()}
 try{
  await page.goto(base);await welcome();await manager();
  await page.getByRole('button',{name:'New project',exact:true}).click();await page.getByLabel('Project name',{exact:true}).fill('Offline retained project');await page.getByRole('button',{name:'Create project',exact:true}).click();
  await page.waitForFunction(()=>document.title==='Offline retained project');const projectURL=page.url();
  await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration(location.href);return r?.active?.state==='activated'},{},{timeout:90000});
  await page.reload();await welcome();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const registration=await page.evaluate(async()=>({scope:(await navigator.serviceWorker.getRegistration(location.href)).scope,script:navigator.serviceWorker.controller.scriptURL}));
  assert.equal(registration.scope,new URL('./',base).href);assert.equal(registration.script,new URL('sw.js',base).href);
  // WebKit's offline emulation rejects even literal service-worker responses
  // (Playwright #42775). Stop our own origin for a real network-failure check.
  if(process.env.LAMPY_TEST_SITE)await stopServer();else await context.setOffline(true);
  await page.reload();await welcome();assert.equal(await page.title(),'Offline retained project');await page.close();
  const offline=await context.newPage();offline.on('pageerror',error=>errors.push(error.message));await offline.goto(projectURL);await offline.getByRole('button',{name:'Continue',exact:true}).click();await offline.waitForFunction(()=>LampyAccounts.enabled);
  assert.equal(await offline.title(),'Offline retained project');
  await offline.getByRole('button',{name:'Project Settings',exact:true}).click();await offline.locator('[data-project-file="projectName"]').fill('Edited without network');await offline.locator('[data-project-file="projectName"]').press('Tab');await offline.waitForFunction(()=>!LampyAccounts.hasUnsaved());
  await offline.reload();await offline.getByRole('button',{name:'Continue',exact:true}).click();await offline.waitForFunction(()=>LampyAccounts.enabled);assert.equal(await offline.title(),'Edited without network');
  await offline.waitForFunction(()=>Object.keys(fixturePatchReference.manufacturers||{}).length>20);
  assert.equal(await offline.evaluate(()=>new URL(bundledAssetUrl('images/check.png')).pathname),new URL('../images/check.png',base).pathname,'bundled images must resolve to the shared public assets');
  assert.equal(await offline.evaluate(async()=>{try{await fetch('/paperwork/account-api/session');return true}catch{return false}}),false,'private API must never be served from offline cache');
  if(process.env.LAMPY_TEST_SITE)await startServer();else await context.setOffline(false);
  const publicPage=await context.newPage();await publicPage.goto(new URL('../',base).href);await publicPage.getByRole('button',{name:'Continue',exact:true}).click();
  assert.equal(await publicPage.evaluate(()=>VERSION),'58.4');assert.equal(await publicPage.evaluate(()=>navigator.serviceWorker.controller),null,'pilot worker must not control public app');
  assert.equal(await publicPage.evaluate(()=>typeof LampyAccounts),'undefined');
  assert.deepEqual(errors,[]);
  console.log('PASS: verified offline installation, closed-tab offline reopening, offline edits/reload, uncached private API, isolated worker scope and unchanged public V58.4.');
 }finally{await context.close();await browser.close();await stopServer()}
})().catch(error=>{console.error(error);process.exitCode=1});
