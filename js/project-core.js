/* Pure project rules shared by the browser and regression tests. */
(function(root){
  'use strict';
  const MAX_PROJECT_BYTES=64*1024*1024;
  function supplyRating(input){const match=/^\s*(\d+(?:\.\d+)?)\s*A\b/i.exec(String(input||''));return match?Number(match[1]):null;}
  function singlePhase(input){return /1\s*[øφ]|single\s*phase/i.test(String(input||''));}
  function phaseIndex(distro,index,aux=false){
    if(singlePhase(distro?.input))return 0;
    return !aux&&singlePhase(distro?.phasing)?Math.floor(index/6)%3:index%3;
  }
  function validSubnet(value){
    const parts=String(value||'').split('.');
    if(parts.length!==4||parts.some(p=>!/^\d{1,3}$/.test(p)||Number(p)>255))return false;
    const bits=parts.map(p=>Number(p).toString(2).padStart(8,'0')).join('');
    return /^1*0*$/.test(bits);
  }
  function validateProject(data){
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid project object');
    const source=data.app||data.project||data;
    if(!source||typeof source!=='object'||Array.isArray(source)||!['labels','distros','fixturePatch'].some(k=>Array.isArray(source[k])))throw Error('Not a Lampy project');
    let nodes=0;
    function visit(value,depth=0){
      if(++nodes>1000000||depth>60)throw Error('Project exceeds supported complexity');
      if(!value||typeof value!=='object')return;
      for(const [key,item] of Object.entries(value)){
        if(['__proto__','prototype','constructor'].includes(key))throw Error('Unsafe project key');
        if(/^(id|sourceKey)$/i.test(key)&&typeof item==='string'&&/[<>"'`\\\x00-\x1f]/.test(item))throw Error('Unsafe project identifier');
        if(typeof item==='string'&&/(?:url|path|src)$/i.test(key)&&/^\s*(?:javascript|vbscript):/i.test(item))throw Error('Unsafe project URL');
        visit(item,depth+1);
      }
    }
    visit(data);
    for(const key of ['labels','socaNames','socaMeta','distros','fixturePatch','patchSheets']){
      if(source[key]!==undefined&&!Array.isArray(source[key]))throw Error(key+' must be an array');
      if(source[key]?.length>100000)throw Error(key+' exceeds the supported size');
    }
    for(const key of ['projectInfo','controlNetwork','gdtfFiles','gdtfMatches','collapsed'])if(source[key]!==undefined&&(!source[key]||typeof source[key]!=='object'||Array.isArray(source[key])))throw Error(key+' must be an object');
    for(const key of ['distros','fixturePatch','patchSheets','labels','socaMeta'])for(const item of source[key]||[])if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid '+key+' entry');
    for(const distro of source.distros||[])if(distro.count!==undefined&&(!Number.isInteger(Number(distro.count))||Number(distro.count)<1||Number(distro.count)>1000))throw Error('Invalid distro circuit count');
    return source;
  }
  root.LampyCore={MAX_PROJECT_BYTES,supplyRating,singlePhase,phaseIndex,validSubnet,validateProject};
  if(typeof module!=='undefined')module.exports=root.LampyCore;
})(globalThis);
