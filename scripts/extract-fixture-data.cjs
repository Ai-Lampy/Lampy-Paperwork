/* One-time catalogue extraction. Delete sources only after validate-fixture-data passes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function source(name){const start=html.indexOf('function '+name+'(');if(start<0)throw Error(name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const s=html.slice(start,end+1);try{new Function('return ('+s+')')}catch{continue}return s}throw Error(name)}
function documentTree(raw){const doc={};function wrap(raw){const n={localName:raw.tag,tagName:raw.tag,ownerDocument:doc,textContent:raw.text||'',getAttribute:k=>raw.attrs[k]??null};n.children=raw.children.map(wrap);n.getElementsByTagName=k=>n.children.flatMap(c=>[...(k==='*'||c.tagName===k?[c]:[]),...c.getElementsByTagName(k)]);return n}doc.documentElement=wrap(raw);doc.getElementsByTagName=k=>[...(k==='*'||doc.documentElement.tagName===k?[doc.documentElement]:[]),...doc.documentElement.getElementsByTagName(k)];return doc}
const c=vm.createContext({DOMParser:class{parseFromString(raw){return documentTree(JSON.parse(raw))}}});
for(const n of ['normaliseImportMatch','xmlChildrenByName','gdtfDirectChildren','gdtfAttr','gdtfOffsetValues','gdtfGeometryNode','parseGdtfModeChannelCount','parseGdtfModeParameterCount','gdtfModeChannelList','parseGdtfFixtureInfo'])vm.runInContext(source(n),c);
const docs=fs.readdirSync(path.join(root,'json/fixtures')).filter(n=>n.endsWith('.json')).map(n=>({path:path.join(root,'json/fixtures',n),data:JSON.parse(fs.readFileSync(path.join(root,'json/fixtures',n)))}));
const paths=[...new Set(docs.flatMap(d=>d.data.fixtures.map(f=>f.gdtf?.file).filter(Boolean)))];
if(!paths.length)throw Error('No source archives remain in the catalogue.');
if(docs.some(d=>d.data.fixtures.some(f=>f.details)))throw Error('One-time migration already applied; do not rerun against a migrated catalogue.');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lampy-extract-'));
try{
 const jobs=paths.map((p,i)=>({source:path.join(root,'gdtf',p),imageRoot:'images/fixtures',output:path.join(temp,i+'.json')}));
 execFileSync('python3',[path.join(__dirname,'extract-fixture-archive.py')],{cwd:root,input:JSON.stringify(jobs),maxBuffer:1024*1024});
 const records=new Map(),audit={format:'lampy-fixture-extraction-v1',archives:[],fixtures:[],missing:[],modeDiscrepancies:[]};
 fs.mkdirSync(path.join(root,'json/fixture-details'),{recursive:true});
 for(let i=0;i<paths.length;i++){
  const raw=JSON.parse(fs.readFileSync(jobs[i].output)),detail=c.parseGdtfFixtureInfo(JSON.stringify(raw.tree),raw.fileName);
  const nodes=[];const walk=n=>{if(n.tag==='DMXMode')nodes.push(n);n.children.forEach(walk)};walk(raw.tree);
  detail.modes.forEach((m,i)=>m.definition=nodes[i]);
  const collect=tag=>{const found=[];const walk=n=>{if(n.tag===tag)found.push(n);n.children.forEach(walk)};walk(raw.tree);return found};
  detail.geometries=collect('Geometries');detail.physicalDescriptions=collect('PhysicalDescriptions');
  detail.image=Object.entries(raw.media).find(([n])=>!n.toLowerCase().startsWith('wheels/'))?.[1]||'';
  detail.provenance={fileName:raw.fileName,sha256:raw.sha256,extractedAt:'2026-11-05',weightCandidates:raw.weightCandidates,wattCandidates:raw.wattCandidates,beamWattCandidates:raw.beamWattCandidates};
  const file='json/fixture-details/'+raw.sha256+'.json';fs.writeFileSync(path.join(root,file),JSON.stringify(detail)+'\n');
  records.set(paths[i],{raw,detail,file});audit.archives.push({source:'gdtf/'+paths[i],sha256:raw.sha256,detail:file,images:Object.values(raw.media)});
 }
 for(const d of docs)for(const f of d.data.fixtures){
  const r=records.get(f.gdtf?.file),modes={};
  for(const [key,value] of Object.entries(f.modes)){
   const mode=typeof value==='number'?{channels:value}:{...value},ref=f.gdtf?.modes?.[key];
   const exact=r?.detail.modes.find(m=>m.name===(ref?.gdtfMode||key)&&m.channels===mode.channels);
   const named=r?.detail.modes.find(m=>m.name===(ref?.gdtfMode||key));
   if(ref?.status==='matched'&&!named)throw Error('Missing source mode: '+f.fixture+' / '+key);
   if(ref?.status==='matched'&&named&&!exact){audit.modeDiscrepancies.push({fixture:f.fixture,mode:key,catalogueChannels:mode.channels,sourceChannels:named.channels});mode.parameters=ref.parameters??named.parameters;mode.sourceMode=named.name;mode.sourceChannels=named.channels;}
   if(exact){mode.parameters=exact.parameters;mode.sourceMode=exact.name}
   else if(mode.channels===0)mode.parameters=0;
   else if(!Number.isFinite(mode.parameters))mode.parameters=null;
   modes[key]=mode;
  }
  f.modes=modes;
  if(r){f.image=r.detail.image;f.details=r.file;f.provenance={fileName:r.raw.fileName,sha256:r.raw.sha256,extractedAt:'2026-11-05'};
   if(f.weight==null&&r.raw.weightCandidates.length===1&&r.raw.weightCandidates[0]>0)f.weight=r.raw.weightCandidates[0];
   if(f.watts==null&&r.raw.wattCandidates.length===1)f.watts=r.raw.wattCandidates[0];
  }else{f.image=f.image||'';f.details=''}
  delete f.gdtf;
  const missing=['image','details','watts','weight'].filter(k=>f[k]==null||f[k]==='');
  if(missing.length)audit.missing.push({manufacturer:d.data.manufacturer,fixture:f.fixture,fields:missing});
  audit.fixtures.push({manufacturer:d.data.manufacturer,fixture:f.fixture,modes:Object.keys(modes).length,details:f.details});
 }
 // All mode matches checked before any catalogue is replaced.
 for(const d of docs)fs.writeFileSync(d.path,JSON.stringify(d.data,null,2)+'\n');
 fs.mkdirSync(path.join(root,'outputs/fixture-data'),{recursive:true});
 fs.writeFileSync(path.join(root,'outputs/fixture-data/extraction-audit.json'),JSON.stringify(audit,null,2)+'\n');
 execFileSync('python3',[path.join(__dirname,'fixture_image_names.py')],{cwd:root,stdio:'inherit'});
 execFileSync('python3',[path.join(__dirname,'fixture_detail_names.py')],{cwd:root,stdio:'inherit'});
 console.log(JSON.stringify({archives:paths.length,fixtures:audit.fixtures.length,missing:audit.missing.length}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
