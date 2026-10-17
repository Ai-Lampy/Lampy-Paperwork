(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyCableCatalogue=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const directions=['male-female','female-male','male-male','female-female','bidirectional'];
 const text=value=>String(value??'').trim();
 const key=value=>text(value).toLowerCase();
 function metadata(value={}){
  const direction=directions.includes(value.direction)?value.direction:'',c=value.connectors||{};
  const ends=direction==='female-male'?[c.female,c.male]:direction==='male-male'?[c.male,c.male]:direction==='female-female'?[c.female,c.female]:direction==='bidirectional'?[c.end,c.end]:[c.male,c.female];
  return {direction,connectors:{start:text(c.start||ends[0]),end:text(c.end||ends[1])}};
 }
 function description(value){const {direction,connectors:c}=metadata(value);if(!direction&&!c.start&&!c.end)return '';const genders=direction==='bidirectional'?['','']:direction.split('-');const end=(connector,gender)=>[connector||'Unspecified',gender].filter(Boolean).join(' ');return end(c.start,genders[0])+(direction==='bidirectional'?' ↔ ':' → ')+end(c.end,genders[1])}
 function lengths(value,label){if(!Array.isArray(value)||!value.length)throw Error(label+': lengths are required');const result=value.map(Number);if(result.some(n=>!Number.isFinite(n)||n<=0)||value.some(n=>n===null||typeof n==='boolean'||text(n)===''))throw Error(label+': lengths must be positive numbers');if(new Set(result).size!==result.length)throw Error(label+': duplicate lengths');return result.sort((a,b)=>a-b).map(String)}
 function manifest(value){if(!Array.isArray(value?.catalogues))throw Error('Cable manifest must contain catalogues');const vendors=new Set(),files=new Set();return value.catalogues.map(entry=>{const vendor=text(entry.vendor),file=text(entry.file);if(!vendor||!/^json\/cable\/[a-zA-Z0-9_-]+\.json$/.test(file)||file==='json/cable/manifest.json')throw Error('Invalid cable catalogue vendor or file');if(vendors.has(key(vendor))||files.has(key(file)))throw Error('Duplicate cable catalogue vendor or file');vendors.add(key(vendor));files.add(key(file));return {vendor,file,optional:entry.optional===true}})}
 function normalise(data,fallbackVendor=''){
  const vendor=text(data?.vendor?.name||data?.vendor||fallbackVendor),unit=text(data?.vendor?.lengthUnit||data?.lengthUnit).toLowerCase();
  if(!vendor||!['ft','m'].includes(unit))throw Error('Cable catalogue requires a vendor and lengthUnit (ft or m)');
  if(!data?.cables||typeof data.cables!=='object'||Array.isArray(data.cables))throw Error(vendor+': cables must contain category arrays');
  const byName=new Map(),categories=[],nestedLooms=[];
  for(const [category,items] of Object.entries(data.cables)){
   if(!text(category)||!Array.isArray(items))throw Error('Invalid cable category');
   const reserved=['stock/pre-madelooms','pre-made/stock','fohsnake','fohsnakes'].includes(key(category).replace(/\s/g,''));
   const group={name:text(category),cables:[]};
   for(const item of items){
    if(!item||typeof item!=='object'||Array.isArray(item))throw Error(category+': invalid entry');
    if(reserved||Object.hasOwn(item,'cables')){if(item.direction||item.connectors)throw Error(category+': loom cannot define cable connectors');nestedLooms.push({...item,category:text(category)});continue}
    const name=text(item.name);if(!name||byName.has(key(name)))throw Error('Missing or duplicate cable name: '+name);
    if(!directions.includes(item.direction))throw Error(name+': missing or unknown direction');
    if(!item.connectors||typeof item.connectors!=='object'||Array.isArray(item.connectors)||Object.values(item.connectors).some(v=>typeof v!=='string'))throw Error(name+': invalid connectors');
    const meta=metadata(item);if(!meta.connectors.start||!meta.connectors.end)throw Error(name+': both connectors are required');
    if(item.aliases!==undefined&&(!Array.isArray(item.aliases)||item.aliases.some(alias=>typeof alias!=='string'||!text(alias))))throw Error(name+': aliases must be non-empty strings in an array');
    const aliases=[...new Map((item.aliases||[]).map(alias=>[key(alias),text(alias)])).values()];
    const cable={name,aliases,category:text(category),lengths:lengths(item.lengths,name),loomOnlyLengths:item.loomOnlyLengths?lengths(item.loomOnlyLengths,name+' loom-only'):[],...meta};
    if(cable.loomOnlyLengths.some(n=>cable.lengths.includes(n)))throw Error(name+': loom-only and individual lengths overlap');
    byName.set(key(name),cable);group.cables.push(cable);
   }
   if(group.cables.length)categories.push(group);
  }
  const byReference=new Map(byName);
  for(const cable of byName.values())for(const alias of cable.aliases){const existing=byReference.get(key(alias));if(existing&&existing!==cable)throw Error('Ambiguous cable name or alias '+alias+': '+existing.name+' / '+cable.name);byReference.set(key(alias),cable)}
  if(data.looms!==undefined&&!Array.isArray(data.looms))throw Error('Catalogue looms must be an array');
  const ids=new Set(),names=new Set();
  const looms=[...nestedLooms,...(data.looms||[])].map(loom=>{
   const id=text(loom.id),name=text(loom.name);if(!id||!name||ids.has(id)||names.has(key(name)))throw Error('Missing or duplicate loom ID/name');ids.add(id);names.add(key(name));
   const sizes=lengths(loom.lengths,name);if(!Array.isArray(loom.cables)||!loom.cables.length)throw Error(name+': cables are required');
   const cables=loom.cables.map(part=>{if(!part||typeof part!=='object'||Array.isArray(part))throw Error(name+': invalid cable member');const cable=byReference.get(key(part.cableType));if(!cable)throw Error(name+': unknown cable '+text(part.cableType));if(!Number.isInteger(part.quantity)||part.quantity<1)throw Error(name+': quantity must be a positive integer');for(const length of sizes)if(!cable.lengths.includes(length)&&!cable.loomOnlyLengths.includes(length))throw Error(name+': '+cable.name+' does not list '+length+unit);return {cableType:cable.name,category:cable.category,quantity:part.quantity,...metadata(cable)}});
   return {id,name,category:text(loom.category)||'Pre-Made/Stock',lengths:sizes,cables};
  });
  return {vendor,unit,categories,looms};
 }
 function templateRows(catalogue,id,length){const loom=catalogue?.looms.find(item=>item.id===id),size=text(length);if(!loom||!loom.lengths.includes(size))throw Error('Select a catalogue loom and one of its lengths');return loom.cables.map(cable=>({...cable,...metadata(cable),length:size,unit:catalogue.unit}))}
 return {metadata,description,manifest,normalise,templateRows,directions};
});
