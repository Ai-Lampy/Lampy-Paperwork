/* Explicitly invoked browser check; never part of unattended Node regression runs. */
'use strict';
const assert=require('node:assert/strict'),{webkit}=require(process.env.LAMPY_PLAYWRIGHT_PATH||'playwright');
const base=process.env.LAMPY_TEST_URL||'http://127.0.0.1:8765/';
(async()=>{
 const browser=await webkit.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
 context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
 const page=await context.newPage();
 async function welcome(p){await p.getByRole('button',{name:'Continue',exact:true}).click();await p.waitForFunction(()=>globalThis.LampyAccounts?.enabled)}
 async function manager(p){await p.locator('.menuButton').click();await p.getByRole('button',{name:'Projects & Account',exact:true}).click()}
 async function newProject(p,name){await manager(p);await p.getByRole('button',{name:'New project',exact:true}).click();await p.getByLabel('Project name',{exact:true}).fill(name);await p.getByRole('button',{name:'Create project',exact:true}).click();await p.waitForFunction(()=>!!LampyAccounts.active);await p.waitForFunction(()=>!document.getElementById('accountManager').open)}
 async function rename(p,name){await p.getByRole('button',{name:'Project Settings',exact:true}).click();await p.locator('[data-project-file="projectName"]').fill(name);await p.locator('[data-project-file="projectName"]').press('Tab');await p.waitForFunction(name=>document.title===name,name);await p.waitForFunction(()=>!LampyAccounts.hasUnsaved())}
 try{
  await page.goto(base);await welcome(page);
  await rename(page,'Legacy project kept');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('lampyPaperworkDataV1'))?.projectInfo?.file?.projectName==='Legacy project kept');
  const legacy=await page.evaluate(()=>localStorage.getItem('lampyPaperworkDataV1'));
  await newProject(page,'Project A');const aURL=page.url(),aId=await page.evaluate(()=>LampyAccounts.active.id);
  await rename(page,'Project A edited');assert.equal(await page.evaluate(()=>localStorage.getItem('lampyPaperworkDataV1')),legacy,'account work must not replace the legacy project');
  const defaultRadius=await page.locator('#radius').inputValue();await page.evaluate(()=>{document.getElementById('radius').value='9';saveSettings()});await page.waitForFunction(()=>!LampyAccounts.hasUnsaved());
  await newProject(page,'Project B');const bId=await page.evaluate(()=>LampyAccounts.active.id);assert.notEqual(aId,bId);
  assert.equal(await page.locator('#radius').inputValue(),defaultRadius,'blank projects must not inherit the previous project label settings');
  const other=await context.newPage();await other.goto(aURL);await welcome(other);assert.equal(await other.title(),'Project A edited');
  assert.equal(await other.locator('#radius').inputValue(),'9','saved project restores its own label settings');
  await rename(other,'A in another tab');await rename(page,'B unchanged by A');
  await page.reload();await welcome(page);assert.equal(await page.title(),'B unchanged by A');await other.reload();await welcome(other);assert.equal(await other.title(),'A in another tab');
  console.log('PASS: real WebKit UI project creation, editing, isolated tabs, URL restore and unchanged legacy storage.');
  await manager(page);await page.getByRole('button',{name:'Defaults & Templates',exact:true}).click();await page.getByRole('button',{name:'Save current as template',exact:true}).click();await page.getByLabel('Template name',{exact:true}).fill('Tour');
  await page.getByRole('button',{name:'Review template',exact:true}).click();assert((await page.locator('#accountManager').innerText()).includes('No existing projects')||(await page.locator('#accountManager').innerText()).includes('new saved template'));
  await page.getByRole('button',{name:'Save template',exact:true}).click();await page.locator('.accountRecord').filter({hasText:'Tour'}).waitFor();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await manager(page);await page.getByRole('button',{name:'New project',exact:true}).click();await page.getByLabel('Project name',{exact:true}).fill('From Tour');await page.getByLabel('Starting template',{exact:true}).selectOption({label:'Tour'});await page.getByRole('button',{name:'Create project',exact:true}).click();await page.waitForFunction(()=>document.title==='From Tour');
  assert.equal(await page.evaluate(()=>projectFilePayload().templateHistory[0].name),'Tour');
  await manager(page);await page.getByRole('button',{name:'Import selected data',exact:true}).click();await page.getByLabel('Source',{exact:true}).selectOption({label:'A in another tab'});await page.getByLabel('Contacts',{exact:true}).selectOption('replace');await page.getByRole('button',{name:'Review changes',exact:true}).click();assert((await page.locator('#accountManager').innerText()).includes('Nothing changes until'));
  const before=await page.evaluate(()=>LampyAccountWorkspace.fingerprint(projectFilePayload()));await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.evaluate(()=>LampyAccountWorkspace.fingerprint(projectFilePayload())),before,'cancelled review changed the project');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  console.log('PASS: template UI capture/review/save, new project from template, provenance and cancelled cross-project review.');
  // Same-project simultaneous tabs: one wins; the other must retain a recoverable copy.
  const stale=await context.newPage();await stale.goto(other.url());await welcome(stale);await rename(other,'A latest saved');
  await stale.getByRole('button',{name:'Project Settings',exact:true}).click();await stale.locator('[data-project-file="projectName"]').fill('A competing edit');await stale.locator('[data-project-file="projectName"]').press('Tab');
  await stale.waitForFunction(()=>document.getElementById('accountSaveStatus').dataset.error==='true');
  await manager(stale);await stale.getByRole('button',{name:'Keep my edits as a new project',exact:true}).click();await stale.waitForFunction(id=>LampyAccounts.active.id!==id,aId);
  assert.notEqual(await stale.evaluate(()=>LampyAccounts.active.id),aId);await stale.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await stale.title(),'A competing edit');
  assert.equal(await other.title(),'A latest saved');console.log('PASS: conflicting tabs preserve the losing edits and recover them as a separate project.');
  if(process.env.LAMPY_TEST_SCREENSHOT){await manager(page);await page.screenshot({path:process.env.LAMPY_TEST_SCREENSHOT})}
  assert.deepEqual(errors,[],'browser JavaScript errors');
 }finally{await context.close();await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
