'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.indexOf('function '+name+'(');assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
const project={production:{lightingVendor:'A',vendorRep:'Personal rep',vendorDetails:'Saved address'},logoVisibility:{vendor:true},exportLogos:{vendor:true}};
let saves=0;const c=vm.createContext({ensureProjectInfo:()=>project,lightingVendorReference:[],persist:()=>saves++,updateProjectHeaderLogos(){},renderProductionInfo(){},renderLogoInfo(){},renderExportSettings(){},refreshHomeIfActive(){},refreshOpenPdfPreview(){},renderProjectSettingsPdfPreview(){},$:()=>null});
for(const name of ['normaliseLightingVendors','syncLightingVendorFields','updateProjectProductionField'])vm.runInContext(source(name),c);
c.lightingVendorReference=c.normaliseLightingVendors({vendors:[{name:'A',address:'New address',phoneNumber:'01234',rep:'Do not import',details:'Obsolete'},{name:'B',address:'B address',phoneNumber:'0987'}]});
assert.equal(c.lightingVendorReference[0].rep,undefined);assert.equal(c.lightingVendorReference[0].details,undefined);
c.syncLightingVendorFields(project);assert.equal(project.production.vendorDetails,'New address');assert.equal(project.production.vendorContact,'01234');assert.equal(project.production.vendorRep,'Personal rep');
c.updateProjectProductionField({dataset:{projectProduction:'lightingVendor'},value:'B'});assert.equal(project.production.vendorContact,'0987');assert.equal(project.production.vendorDetails,'B address');assert.equal(project.production.vendorRep,'');assert.equal(project.production.vendorRepEmail,'');assert.equal(saves,1);
c.updateProjectProductionField({dataset:{projectProduction:'vendorRep'},value:'My contact'});assert.equal(project.production.vendorRep,'My contact');
c.updateProjectProductionField({dataset:{projectProduction:'lightingVendor'},value:''});assert.equal(project.production.vendorContact,'');assert.equal(project.production.vendorDetails,'');assert.equal(project.production.vendorRep,'');
project.production={lightingVendor:'Unavailable',vendorDetails:'Retain legacy details',vendorContact:'777',vendorRep:'Rep'};c.syncLightingVendorFields(project);assert.equal(project.production.vendorDetails,'Retain legacy details');assert.equal(project.production.vendorContact,'777');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../json/lighting_vendors.json'),'utf8'));const vendors=c.normaliseLightingVendors(catalog);assert.equal(vendors.length,catalog.vendors.length);vendors.forEach((v,i)=>{assert.equal(v.address,catalog.vendors[i].address);assert.equal(v.phoneNumber,catalog.vendors[i].phoneNumber)});
assert(source('normaliseProjectInfo').includes('syncLightingVendorFields(base)'));
assert(source('renderProductionInfo').includes("field('vendorDetails','Vendor Address'"));assert(source('renderProductionInfo').includes('type="tel" readonly'));
assert(source('pdfLinkedFieldDefinitions').includes("['vendorDetails','Vendor Address','production']"));assert(source('pdfLinkedFieldDefinitions').includes("['vendorContact','Vendor Contact','production']"));
console.log('PASS: vendor address/contact catalogue mapping, selected-vendor refresh, saved compatibility and manual rep editing and vendor-change reset.');
