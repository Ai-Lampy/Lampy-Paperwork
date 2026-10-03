/* Session-only patch undo: reverse recorded changes without replacing unrelated data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LampyPatchHistory=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const object=value=>value!==null&&typeof value==='object'&&!ArrayBuffer.isView(value);
 function clone(value){if(ArrayBuffer.isView(value))return value; // Asset bytes are immutable and shared across snapshots.
  if(Array.isArray(value))return value.map(clone);if(object(value))return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clone(item)]));return value}
 function equal(a,b){if(a===b)return true;if(ArrayBuffer.isView(a)||ArrayBuffer.isView(b))return false;if(!object(a)||!object(b)||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]))}
 function identity(rows){for(const key of ['id','name','port'])if(rows.length&&rows.every(row=>object(row)&&row[key]!==undefined&&row[key]!=='')&&new Set(rows.map(row=>String(row[key]))).size===rows.length)return key;return null}
 function reverse(before,after,current){
  if(equal(before,after))return clone(current);
  if(equal(current,after))return clone(before);
  if(Array.isArray(before)&&Array.isArray(after)&&Array.isArray(current)){
   const key=identity(before)||identity(after);
   if(key&&[before,after,current].every(rows=>!rows.length||identityFor(rows,key))){
    const old=new Map(before.map(row=>[String(row[key]),row])),next=new Map(after.map(row=>[String(row[key]),row])),now=new Map(current.map(row=>[String(row[key]),row]));
    for(const id of new Set([...old.keys(),...next.keys()])){
     if(equal(old.get(id),next.get(id)))continue;
     const value=reverse(old.get(id),next.get(id),now.get(id));if(value===undefined)now.delete(id);else now.set(id,value);
    }
    const orderChanged=!equal(before.map(row=>String(row[key])),after.map(row=>String(row[key]))),order=(orderChanged?before:current).map(row=>String(row[key]));
    return [...new Set([...order,...now.keys()])].filter(id=>now.has(id)).map(id=>now.get(id));
   }
   if(before.length===after.length&&after.length===current.length)return current.map((row,index)=>reverse(before[index],after[index],row));
   return clone(current);
  }
  if(object(before)&&object(after)&&object(current)&&!Array.isArray(before)&&!Array.isArray(after)&&!Array.isArray(current)){
   const result=clone(current);for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
    if(equal(before[key],after[key]))continue;const value=reverse(before[key],after[key],current[key]);if(value===undefined)delete result[key];else result[key]=value;
   }return result;
  }
  // A later independent edit owns a conflicting field; do not overwrite it.
  return clone(current);
 }
 function identityFor(rows,key){return rows.every(row=>object(row)&&row[key]!==undefined)&&new Set(rows.map(row=>String(row[key]))).size===rows.length}
 return {clone,equal,reverse};
});
