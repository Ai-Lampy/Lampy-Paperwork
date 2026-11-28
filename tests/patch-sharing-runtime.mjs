import assert from 'node:assert/strict';
import {runtime} from './helpers/sharing-server.mjs';
import Core from '../js/patch-sharing-core.js';
const test=await runtime();
try{
 const owner=Core.token(),viewer=Core.token(),id='test-share',origin='https://lampy.example';
 const snapshot={title:'Lighting patch',fixtures:[{id:'fixture-1',fixture:'Wash',fixId:'1',mode:'Extended',channels:30,universe:1,address:1,notes:'Owner note'}],positions:[],secret:'private',profile:{email:'private@example.test'},gdtfFiles:{private:'bytes'}};
 const send=async(route='',method='GET',token=owner,data,viewerMode=false,extra={})=>test.mf.dispatchFetch(origin+'/paperwork/account-api/shares/'+id+route,{method,headers:{Origin:origin,...(token?{[viewerMode?'X-Lampy-Share':'X-Lampy-Owner']:token}:{}),...(data?{'Content-Type':'application/json'}:{}),...extra},body:data?JSON.stringify(data):undefined});
 const value=async(...args)=>{const response=await send(...args);const data=await response.json();assert(response.ok,JSON.stringify(data));return data};
 assert.equal((await send('','GET',null)).status,403);
 assert.equal((await test.mf.dispatchFetch(origin+'/paperwork/account-api/session')).status,410);
 const created=await value('','POST',owner,{viewerToken:viewer,snapshot});assert.equal(created.version,1);assert(!('secret'in created.snapshot));assert(!('profile'in created.snapshot));assert(!('owner_hash'in created));
 assert.equal((await value('','POST',owner,{viewerToken:viewer,snapshot})).version,1,'creation retries keep the published snapshot');
 assert.equal((await send('','GET',Core.token())).status,404);
 assert.equal((await send('','GET',viewer,null,true,{Origin:'https://evil.test'})).status,403);
 let shared=await value('','GET',viewer,null,true);assert.equal(shared.snapshot.fixtures.length,1);assert(!('readSeq'in shared));
 assert.equal((await send('/snapshot','PUT',viewer,{version:1,snapshot},true)).status,403);
 assert.equal((await send('/revoke','POST',viewer,{},true)).status,403);
 const note={requestId:'note-1',fixtureId:'fixture-1',name:'Crew A',jobRole:'Lighting',body:'Check cable',version:1};
 assert.equal((await send('/notes','POST',viewer,{...note,name:''},true)).status,400);
 assert.equal((await send('/notes','POST',viewer,{...note,fixtureId:'missing'},true)).status,400);
 const first=await value('/notes','POST',viewer,note,true);assert.equal((await value('/notes','POST',viewer,note,true)).seq,first.seq);
 assert.equal((await send('/notes','POST',viewer,{...note,body:'Changed'},true)).status,409);
 const concurrent=await Promise.all(Array.from({length:4},(_,n)=>value('/notes','POST',viewer,{...note,requestId:'note-'+(n+2),name:'Crew '+n},true)));assert.equal(new Set(concurrent.map(n=>n.seq)).size,4);
 const ownerState=await value();assert.equal(ownerState.notes.length,5);assert.equal(ownerState.readSeq,0);
 await value('/read','POST',owner,{seq:first.seq});assert.equal((await value()).readSeq,first.seq);
 assert.equal((await send('/snapshot','PUT',owner,{version:99,snapshot})).status,409);
 await value('/snapshot','PUT',owner,{version:1,snapshot:{...snapshot,title:'New publication'}});
 shared=await value('','GET',viewer,null,true);assert.equal(shared.version,2);assert.equal(shared.snapshot.title,'New publication');assert.equal(shared.notes.length,5);
 assert.equal((await send('/notes','POST',viewer,{...note,requestId:'stale'},true)).status,409);
 assert.equal((await send('/notes','POST',owner,{...note,requestId:'owner-note',version:2})).status,403);
 // Large histories are bounded and resumable rather than returned in one response.
 await test.db.batch(Array.from({length:251},(_,n)=>test.db.prepare('INSERT INTO patch_notes(share_id,request_id,fixture_id,fixture_label,name,job_role,body,version,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,'page-'+n,'fixture-1','1 · Wash','Crew','Lighting','Paged note',2,Date.now())));
 const firstPage=await value();assert.equal(firstPage.notes.length,250);assert.equal(firstPage.more,true);
 const next=await value('?after='+firstPage.notes.at(-1).seq);assert.equal(next.notes.length,6);assert.equal(next.more,false);
 await value('/revoke','POST',owner,{});assert.equal((await send('','GET',viewer,null,true)).status,410);assert.equal((await send('/notes','POST',viewer,{...note,version:2},true)).status,410);assert.equal((await value()).revoked,true);
 // Previous account tables/objects have no route in the replacement Worker.
 assert.equal((await test.mf.dispatchFetch(origin+'/paperwork/account-api/projects/private')).status,410);
 const options=await send('','OPTIONS',null);assert(options.headers.get('Access-Control-Allow-Headers').includes('X-Lampy-Share'));
 console.log('PASS: real Worker/D1 sharing, capability isolation, snapshot publication, immutable/idempotent notes, concurrent writers, notification cursors, revocation and retired account routes.');
}finally{await test.close()}
