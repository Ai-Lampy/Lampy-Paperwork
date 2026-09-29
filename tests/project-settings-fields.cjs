'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,name);for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new Function('return ('+code+')');return code}catch{}}throw Error(name)}
function add(c,...names){names.forEach(name=>vm.runInContext(source(name),c))}
const plain=v=>JSON.parse(JSON.stringify(v)),escape=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const project={file:{projectName:'Show',jobType:'Tour',jobSubtype:'Arena',dateFrom:'2026-09-28',version:'3',projectOwner:'Owner',email:'private@example.test',phoneNumber:'123',includeOwnerDetailsInPdfFooters:false},production:{lightingDesigner:'Designer',vendorDetails:'Line 1\nLine 2'},customFields:[{id:'abc',name:'Venue',value:'A--B <Hall>'}],projectSettings:{pdf:{footer:{left:'',centre:'',right:''},laterHeader:{left:'',centre:'',right:''}}}};
let saves=0,refreshes=0;const c=vm.createContext({ensureProjectInfo:()=>project,formatDisplayDate:v=>v||'',escapeHtml:escape,escapeAttr:escape,persist:()=>saves++,refreshOpenPdfPreview:()=>refreshes++,renderProjectSettingsPdfPreview(){},renderExportSettings(){},renderFileInfo(){},refreshHomeIfActive(){},updateApplicationChrome(){},activeProjectTab:'file',loomId:()=> 'field_new',$:()=>null});
vm.runInContext(html.match(/const PDF_FOOTER_TEMPLATE_PRESETS=([^;]+);/)[0],c);
add(c,'projectJobTypes','projectJobTypeText','normaliseProjectExtraFields','projectJobControls','pdfProductionContactFields','pdfLinkedFieldDefinitions','pdfLinkedTemplateValues','pdfTemplateValues','expandPdfTemplate','pdfTemplateFieldOptions','pdfTemplateMissingFields','footerTemplatePresetKey','pdfTemplateControlMarkup','limitPdfTemplateLines','pdfTemplateSettingsGroup','updatePdfCustomTemplate','insertPdfTemplateField','updateProjectFileField','updateProjectCustomField','removeProjectCustomField','addProjectCustomField','projectCustomFieldsMarkup');
assert.deepEqual(plain(c.projectJobTypes()),{Tour:['Arena','Academy','Concert Hall/Theatre','Stadium'],Festival:['House','Tour'],'1 Off':['Arena','Academy','Concert Hall','Theatre','Stadium'],Corporate:['Conference','Party','Exhibit']});
const legacy={file:{}};c.normaliseProjectExtraFields(legacy,{});assert.deepEqual(plain(legacy),{file:{jobType:'',jobSubtype:''},customFields:[]});
c.updateProjectFileField({dataset:{projectFile:'jobType'},value:'Festival'});assert.equal(project.file.jobSubtype,'');
c.updateProjectFileField({dataset:{projectFile:'jobSubtype'},value:'House'});assert.equal(c.projectJobTypeText(project.file),'Festival — House');
const loaded={file:{...project.file}};c.normaliseProjectExtraFields(loaded,plain(project));assert.equal(loaded.customFields[0].id,'abc');assert.equal(loaded.file.jobSubtype,'House');
const malformed={file:{jobType:'Invented',jobSubtype:'Arena'}};c.normaliseProjectExtraFields(malformed,{customFields:[{id:'bad"id',name:'X'},{id:'good',value:'A'},{id:'good',value:'B'}]});assert.equal(malformed.file.jobType,'');assert.equal(new Set(malformed.customFields.map(f=>f.id)).size,3);
assert(source('renderHomeView').indexOf('projectJobTypeText(info)')<source('renderHomeView').indexOf('dateText&&'));
let values=c.pdfTemplateValues('Patch',2,8);
assert.equal(c.expandPdfTemplate('{project} • Version {version}\n{production.lightingDesigner} | {custom.abc}',values),'Show • Version 3\nDesigner | A--B <Hall>');
assert.equal(c.expandPdfTemplate('{owner}\n{email} \\ {phone}',values),'');assert.equal(c.expandPdfTemplate('{file.projectOwner}',values),'','raw aliases cannot bypass owner visibility');
assert.equal(c.expandPdfTemplate('{production.vendorDetails}',values),'Line 1 Line 2');
for(const separator of [' • ',' | ',' / ',' — ',' - ',', ','; ',' \\ ']){
 assert.equal(c.expandPdfTemplate('{project}'+separator+'{custom.missing}'+separator+'{version}',values),'Show'+separator+'3');
 assert.equal(c.expandPdfTemplate('{custom.missing}'+separator+'{project}',values),'Show');
 assert.equal(c.expandPdfTemplate('{project}'+separator+'{custom.missing}',values),'Show');
}
assert.equal(c.expandPdfTemplate('{custom.missing}\n{project}',values),'Show');
project.file.includeOwnerDetailsInPdfFooters=true;assert.equal(c.pdfTemplateValues('').owner,'Owner');
c.updateProjectCustomField({dataset:{customId:'abc',customKey:'name'},value:'Renamed'});assert.equal(project.customFields[0].id,'abc');assert(c.pdfTemplateFieldOptions().includes('Renamed'));assert.equal(c.expandPdfTemplate('{custom.abc}',c.pdfTemplateValues('')),'A--B <Hall>');
assert.equal(c.pdfTemplateMissingFields('{custom.abc}'),'');assert.match(c.pdfTemplateMissingFields('{custom.gone}'),/gone/);
c.addProjectCustomField();assert.equal(project.customFields.at(-1).id,'field_new');c.removeProjectCustomField('field_new');assert.equal(project.customFields.length,1);assert(saves>0&&refreshes>0);
const markup=c.pdfTemplateControlMarkup('footer','left','Left','{project} | {custom.abc}');assert(markup.includes('textarea rows="2" class="footerCustomTemplate"'));assert(!markup.includes('footerCustomTemplate hidden'));assert(markup.includes('Insert Field'));assert(markup.includes('Add Custom Field'));
// Cursor insertion and custom choice synchronization do not replace surrounding content.
{
 const choice={},warning={};let focused=false,selection;
 const wrap={querySelector:q=>q==='[data-pdf-template-choice]'?choice:q==='.pdfTemplateWarning'?warning:editor};
 const editor={dataset:{pdfTemplateGroup:'footer',pdfTemplateCustom:'left'},value:'Before  after',selectionStart:7,selectionEnd:7,focus(){focused=true},setSelectionRange:(a,b)=>selection=[a,b],closest:()=>wrap};
 const select={value:'{custom.abc}',closest:()=>wrap};c.insertPdfTemplateField(select);assert.equal(editor.value,'Before {custom.abc} after');assert.equal(project.projectSettings.pdf.footer.left,editor.value);assert.equal(choice.value,'custom');assert(focused);assert.deepEqual(selection,[19,19]);assert.equal(select.value,'');
 editor.value='one\ntwo\nthree';c.updatePdfCustomTemplate(editor);assert.equal(editor.value,'one\ntwo');assert.equal(project.projectSettings.pdf.footer.left,editor.value);
 editor.value='{custom.missing}';c.updatePdfCustomTemplate(editor);assert.match(warning.textContent,/missing/);
}
// Actual logo renderer retains controls and stores each disclosure independently.
{
 const cards=['tour','vendor','personal'].map(key=>({dataset:{logoSection:key},open:true,addEventListener(type,fn){this.toggle=fn}}));
 const host={querySelectorAll:q=>q==='[data-logo-section]'?cards:[]};
 const p=vm.createContext({projectLogoSectionOpen:{tour:true,vendor:true,personal:true},$:id=>id==='projectLogoTab'?host:null,ensureProjectInfo:()=>({...project,exportLogos:{vendor:true,secondary:true},logoVisibility:{vendor:true,secondary:true}}),projectLogo:()=>({dataUrl:''}),secondaryLogo:()=>({dataUrl:''}),selectedLightingVendor:()=>null,selectedVendorLogo:()=>null,escapeHtml:escape,logoToggleButton:label=>label});
 add(p,'renderLogoInfo');p.renderLogoInfo();const out=host.innerHTML;assert(out.indexOf('<summary>Tour Logo')<out.indexOf('First-page Header Preview'));assert(out.indexOf('First-page Header Preview')<out.indexOf('<summary>Lighting Vendor Logo'));assert(out.indexOf('<summary>Lighting Vendor Logo')<out.indexOf('<summary>Personal Logo'));
 for(const id of ['tourLogoUpload','secondaryLogoUpload','vendorLogoOverrideUpload'])assert(out.includes(id));
 cards[1].open=false;cards[1].toggle();p.renderLogoInfo();assert(host.innerHTML.includes('data-logo-section="vendor" >'));assert.equal(p.projectLogoSectionOpen.tour,true);
 assert.equal((out.match(/<details /g)||[]).length,3);assert.equal((out.match(/<\/details>/g)||[]).length,3);
}
assert(html.includes('.projectLogoCards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'));
assert(html.includes('@media(max-width:900px){.projectLogoCards,.customProjectField{grid-template-columns:1fr}}'));
assert(source('finalisePdfPageChrome').includes('expandPdfTemplate(template,values)'));
assert(source('pdfPageFooterMarkup').includes('expandPdfTemplate'));
console.log('PASS: V50.8 Job Type, logo disclosures, linked/custom fields, cursor insertion, persistence and two-line PDF templates.');
