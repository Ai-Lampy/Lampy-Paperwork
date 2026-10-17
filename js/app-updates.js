/* Release checks never execute code from a newer deployment. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyUpdates=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function newerVersion(current,next){
  if(!/^\d+(?:\.\d+){0,2}$/.test(current)||!/^\d+(?:\.\d+){0,2}$/.test(next))return false;
  const a=current.split('.').map(Number),b=next.split('.').map(Number);
  for(let i=0;i<3;i++){if((b[i]||0)!==(a[i]||0))return (b[i]||0)>(a[i]||0);}return false;
 }
 function freshURL(current,token=Date.now()){const url=new URL(current);url.searchParams.set('_lampy_update',String(token));return url.href;}
 function watch(current,available,{fetcher=fetch,doc=document,win=window,now=Date.now,interval=300000}={}){
  let busy=false,last=-Infinity,stopped=false,latest=current;
  const base=new URL(doc.baseURI);if(!/^https?:$/.test(base.protocol))return ()=>{};
  const check=async()=>{
   if(stopped||busy||doc.hidden||now()-last<30000)return;
   last=now();busy=true;const controller=new AbortController(),timeout=win.setTimeout(()=>controller.abort(),10000);
   try{const url=new URL('json/app-version.json',base);url.searchParams.set('check',String(last));const r=await fetcher(url,{cache:'no-store',signal:controller.signal});if(r.ok){const data=await r.json();if(!stopped&&data.application==='lampy-paperwork'&&newerVersion(latest,data.version)){latest=data.version;available(latest);}}}catch{/* Offline, missing or incomplete releases do not interrupt work. */}finally{win.clearTimeout(timeout);busy=false;}
  };
  const timer=win.setInterval(check,interval);doc.addEventListener('visibilitychange',check);win.addEventListener('focus',check);check();
  return ()=>{stopped=true;win.clearInterval(timer);doc.removeEventListener('visibilitychange',check);win.removeEventListener('focus',check);};
 }
 function saveAndReload({blocked,save,reload}){const reason=blocked();if(reason)throw new Error(reason);save();const after=blocked();if(after)throw new Error(after);reload();}
 return {newerVersion,freshURL,watch,saveAndReload};
});
