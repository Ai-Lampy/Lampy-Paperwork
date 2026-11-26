'use strict';
// Node DOM doubles exercise the real portal buttons; this is not a browser test.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Sync=require('../js/account-sync.js');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.classList={add(){},remove(){}}}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children}
 setAttribute(name,value){this.attributes[name]=value}
 addEventListener(name,handler){this.listeners[name]=handler}
 before(){} focus(){} remove(){} reportValidity(){return true}
}
function find(root,text){if(root.textContent===text)return root;for(const child of root.children){const result=find(child,text);if(result)return result}}
async function run(){
 const document={body:new Element('body'),createElement:tag=>new Element(tag),querySelector:()=>new Element('div')};
 let href='https://ailampy.com/paperwork/?account=owner&project=project-a&portal=details',flushCount=0,confirmLeave=true,flushError=null,releaseFlush;
 const destinations=[],alerts=[],cleared=[],workspace={state:()=>({active:{id:'project-a'}}),flush:async()=>{flushCount++;if(flushError)throw flushError;if(releaseFlush)await releaseFlush.promise}};
 let signOutCount=0;const api={...Sync.client({baseURL:'https://paperwork-api.ailampy.com/paperwork/account-api/',validate:()=>{}}),signOut:async()=>{signOutCount++}};
 const context=vm.createContext({document,URL,URLSearchParams,location:{get href(){return href},get search(){return new URL(href).search},assign:url=>destinations.push(url)},history:{replaceState:(_state,_title,url)=>{href=url.href}},alert:text=>alerts.push(text),confirm:()=>confirmLeave,clearTimeout:id=>cleared.push(id)});
 const source=fs.readFileSync(require.resolve('../js/account-manager.js'),'utf8');
 // Expose closure state only inside the isolated test copy, never in production.
 vm.runInContext(source.replace('})(globalThis);',`root.test={signInPage,signInCodePage,show,get panel(){return dialog},configure(value){api=value.api;workspace=value.workspace;user=value.user;profileDirty=!!value.dirty;syncTimers.set('pending',123)}};})(globalThis);`),context);
 const portal=context.test;
 portal.configure({api,workspace,user:null});portal.signInPage();
 const signup=find(portal.panel,'Create your account');
 assert.equal(signup.tagName,'button');assert.equal(signup.href,undefined);
 await signup.listeners.click();assert.deepEqual(alerts,['Accounts are coming soon.']);assert.deepEqual(destinations,[]);
 assert.equal(find(portal.panel,'Projects'),undefined,'signed-out Account page has no project navigation');
 assert.equal(find(portal.panel,'Defaults & Templates'),undefined);
 assert.equal(find(portal.panel,'Email address').children[0].type,'email');
 assert.equal(find(portal.panel,'Password'),undefined,'password sign-in is deferred');
 assert.equal(find(portal.panel,'Send sign-in code').type,'submit');
 const brand=find(portal.panel,'Sign in to Lampy Paperwork.');assert(brand);
 assert.equal(find(portal.panel,'Sign in with email'),undefined,'no external login link');
 assert.equal(find(portal.panel,'New here? Verify your email, then complete your sign-up details.'),undefined);

 const sentEmails=[],attempts=[],formApi={...api,sendSignInCode:async email=>sentEmails.push(email),signIn:async(email,otp)=>{attempts.push({email,otp});throw Object.assign(Error('Wrong code'),{status:401})}};
 portal.configure({api:formApi,workspace,user:null});portal.signInPage();
 find(portal.panel,'Email address').children[0].value='owner@example.test';
 function tag(node,name){if(node.tagName===name)return node;for(const child of node.children){const found=tag(child,name);if(found)return found}}
 await tag(portal.panel,'form').listeners.submit({preventDefault(){}});
 assert.deepEqual(sentEmails,['owner@example.test']);
 const code=find(portal.panel,'Six-digit sign-in code').children[0];assert.equal(code.autocomplete,'one-time-code');code.value='123456';
 await tag(portal.panel,'form').listeners.submit({preventDefault(){}});
 assert.deepEqual(attempts,[{email:'owner@example.test',otp:'123456'}]);assert(find(portal.panel,'Email or sign-in code is incorrect.'));assert.deepEqual(destinations,[],'email/code entry never navigates to Cloudflare');

 portal.configure({api,workspace,user:{id:'owner'}});portal.show('Account Details');
 let resolve;releaseFlush={promise:new Promise(done=>{resolve=done})};
 const pending=find(portal.panel,'Sign out').listeners.click();
 assert.equal(flushCount,1);assert.deepEqual(destinations,[],'logout waits for the local save');
 resolve();await pending;releaseFlush=null;
 assert.equal(signOutCount,1);assert.deepEqual(destinations,[]);assert.deepEqual(cleared,[123]);
 assert.equal(new URL(href).search,'?portal=signin','logout stays inside Lampy and clears project URL');

 portal.configure({api,workspace,user:{id:'owner'}});portal.show('Account Details');
 flushError=Error('Local save failed');await find(portal.panel,'Sign out').listeners.click();
 assert.equal(signOutCount,1,'failed saving must not sign out');assert(find(portal.panel,'Local save failed'));
 flushError=null;
 portal.configure({api,workspace,user:{id:'owner'}});portal.show('Account Details');
 portal.configure({api,workspace,user:{id:'owner'},dirty:true});confirmLeave=false;
 await find(portal.panel,'Sign out').listeners.click();
 assert.equal(flushCount,2);assert.equal(signOutCount,1,'cancel preserves unsaved profile edits');
 console.log('PASS: account portal registration notice, native sign-in form, logout save ordering, failed-save and cancellation guards.');

 // Run real startup with enabled online accounts. Normal loads must not make
 // authentication requests or cover Home with the portal; explicit routes do.
 for(const query of ['', '?portal=signin', '?portal=details', '?account=device&project=saved']){
  let pageURL='https://ailampy.com/paperwork/'+query,authCalls=0,opened=null;
  const classes=new Set(),doc={body:new Element('body'),createElement:tag=>new Element(tag),querySelector:()=>new Element('div'),getElementById:()=>null,addEventListener(){}};
  doc.body.classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)};
  const startup=vm.createContext({document:doc,URL,URLSearchParams,AbortSignal,navigator:{onLine:true},window:{addEventListener(){}},location:{get href(){return pageURL},get search(){return new URL(pageURL).search}},history:{replaceState:(_state,_title,url)=>{pageURL=url.href}},fetch:async()=>({ok:true,json:async()=>({enabled:true})}),LampyProjectStore:{open:async()=>({})},LampyAccountSync:{client:()=>({...api,session:async()=>{authCalls++;throw Error('Sign in required')}})},LampyAccountWorkspace:{create:()=>({state:()=>({active:null}),open:async(owner,id)=>{opened={owner,id}}})}});
  vm.runInContext(source,startup);
  await startup.LampyAccounts.setup({render(){}});
  assert.equal(classes.has('accountPortalOpen'),query.includes('portal='),query||'Normal load stays on Home');
  assert.equal(authCalls,query==='?portal=details'?1:0);
  if(query.includes('account='))assert.deepEqual(opened,{owner:'device',id:'saved'},'saved project links still open');
  if(!query){await startup.LampyAccounts.showAccount();assert.equal(authCalls,1);assert(classes.has('accountPortalOpen'),'Account navigation still opens sign-in');}
 }
 console.log('PASS: normal startup keeps Home, explicit account/logout links open the portal, and saved project links remain intact.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
