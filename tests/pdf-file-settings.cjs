'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),moduleText=fs.readFileSync(path.join(root,'js/pdf-filenames.js'),'utf8'),names=require('../js/pdf-filenames.js');
function source(name){let start=html.indexOf('function '+name+'(');assert(start>=0,name);if(html.slice(start-6,start)==='async ')start-=6;for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){const code=html.slice(start,end+1);try{new vm.Script('('+code+')');return code}catch{}}throw Error(name)}
const project={file:{version:'7',projectName:'Tour Name',projectOwner:'Owner'},production:{lightingVendor:'Vendor'}};
assert.equal(names.filename({},'patch',project),'V7_Fixture Patch_Tour Name.pdf');
for(const [mode,label] of names.documents)assert.equal(names.filename({},mode,project),'V7_'+label+'_Tour Name.pdf');
const custom=fields=>({parts:fields.map(field=>typeof field==='string'?{field}:field)});
assert.equal(names.filename(custom(['vendor','owner','date']),'looms',project,new Date(2026,9,27)),'Vendor_Owner_2026-10-27.pdf');
assert.equal(names.filename(custom(['blank','project','blank']),'patch',project),'Tour Name.pdf');
assert.equal(names.filename(custom(['blank','blank','blank']),'power',project),'Power Calculations.pdf');
assert.equal(names.filename({},'patch',{file:{version:'V3'}}),'V3_Fixture Patch.pdf');
assert.equal(names.filename(custom([{field:'custom',custom:'../CON: a/b\\c?*\n'},'blank','blank']),'patch',project),'-CON- a-b-c--.pdf');
assert.equal(names.filename(custom([{field:'custom',custom:'CON'},'blank','blank']),'patch',project),'_CON.pdf');
assert.equal(names.filename(custom([{field:'custom',custom:'Example.pdf'},'blank','blank']),'patch',project),'Example.pdf');
const unicode=names.filename(custom([{field:'custom',custom:'照'.repeat(300)},'blank','blank']),'patch',project);assert(Buffer.byteLength(unicode)<=224);assert(!unicode.includes('\ufffd'));
let config=names.normalise({separate:true,structures:[{id:'one',document:'power',parts:[{field:'custom',custom:'POWER'}]}]});
assert.equal(names.filename(config,'power',project),'POWER.pdf');assert.equal(names.filename(config,'patch',project),'V7_Fixture Patch_Tour Name.pdf');
config.selections.patch='one';assert.equal(names.filename(config,'patch',project),'POWER.pdf');
config.selections.power='default';assert.equal(names.filename(config,'power',project),'V7_Power Calculations_Tour Name.pdf');
config.separate=false;assert.equal(names.filename(config,'patch',project),'V7_Fixture Patch_Tour Name.pdf');
config.separate=true;assert.equal(names.filename(JSON.parse(JSON.stringify(config)),'patch',project),'POWER.pdf');
const invalid=names.normalise({structures:[{id:'bad" onclick=',document:'patch'},{id:'two',document:'patch'},{id:'bad',document:'unknown'}],selections:{patch:'missing'}});assert.equal(invalid.structures.length,1);assert.equal(invalid.structures[0].id,'document_patch');assert.equal(invalid.selections.patch,undefined);
// Actual handlers save the selection once and do not change another document's choice.
let saves=0,renders=0,previewRefreshes=0;project.projectSettings={pdf:{fileNames:config}};
const ctx=vm.createContext({TextEncoder,Date,console,ensureProjectInfo:()=>project,escapeHtml:s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),escapeAttr:s=>String(s).replaceAll('"','&quot;'),persist(){saves++},renderExportSettings(){renders++},loomId:()=> 'stable',pdfPreviewLogoState:{mode:'looms'}});
vm.runInContext(moduleText,ctx);ctx.syncPdfFilenamePreview=()=>{previewRefreshes++};ctx.selectPdfFilenameStructure('one');assert.equal(saves,1);assert.equal(project.projectSettings.pdf.fileNames.selections.looms,'one');assert.equal(project.projectSettings.pdf.fileNames.selections.power,'default');assert.equal(renders,1);assert.equal(previewRefreshes,1);
ctx.selectPdfFilenameStructure('missing');assert.equal(saves,1);ctx.removePdfFilenameStructure('one');assert.equal(project.projectSettings.pdf.fileNames.selections.looms,undefined);assert.equal(project.projectSettings.pdf.fileNames.structures.length,0);
ctx.addPdfFilenameStructure();assert.equal(project.projectSettings.pdf.fileNames.structures[0].id,'stable');assert.equal(project.projectSettings.pdf.fileNames.selections.patch,'stable');
for(const name of ['normalisePdfSize','defaultPdfTextStyle','defaultProjectSettings','normaliseProjectFont','normalisePdfTextStyle','limitPdfTemplateLines','normaliseProjectSettings'])vm.runInContext(source(name),ctx);
Object.assign(ctx,{PROJECT_DEFAULT_FONT:'Arial',APP_FONT_OPTIONS:[{value:'Arial'},{value:'Georgia'}],PDF_TITLE_SIZES:[10,12,14,16,18,20,22,24,26,28,30],PDF_FOOTER_SIZES:[5,6,7,8,9,10]});
const settings=ctx.normaliseProjectSettings({pdf:{fileNames:project.projectSettings.pdf.fileNames,footer:{style:{font:'Georgia',size:5,bold:true,italic:true,underline:true,colour:'#123456'}}}});
assert.equal(settings.pdf.fileNames.structures[0].id,'stable');assert.equal(settings.pdf.footer.style.size,5);assert.equal(settings.pdf.footer.style.font,'Georgia');
const vars={};ctx.ensureProjectInfo=()=>({projectSettings:settings});vm.runInContext(source('applyPdfProjectSettings'),ctx);ctx.applyPdfProjectSettings({style:{setProperty:(k,v)=>vars[k]=v},dataset:{}},false);
assert.equal(vars['--pdf-footer-font'],'Georgia');assert.equal(vars['--pdf-footer-size'],'5pt');assert.equal(vars['--pdf-footer-style'],'italic');assert.equal(vars['--pdf-footer-decoration'],'underline');assert.equal(vars['--pdf-footer-colour'],'#123456');assert.equal(vars['--pdf-later-font'],'Arial');
// The attachment's card order and the nested preview's collapse ownership.
const markup=source('renderExportSettings');const order=['PDF Page Settings','pdfFilenameSettingsMarkup()','First-page Header','First-page Preview','Remaining-page Header','Remaining-page Preview','<summary>Footer'];
for(let i=1;i<order.length;i++)assert(markup.indexOf(order[i])>markup.indexOf(order[i-1]),order[i]);
const first=markup.slice(markup.indexOf('<summary>First-page Header'),markup.indexOf('<summary>Remaining-page Header'));
assert(first.indexOf('projectSettingsPdfPreview')<first.indexOf('</details>'));assert(markup.includes('cardStates'));assert(markup.includes('pdfFooterStyleControlsMarkup(footer.style)'));
assert(source('beginPdfLogoPreview').includes('syncPdfFilenamePreview()'));assert(source('organisePdfPreviewSidePane').includes('data-pdf-filename-control'));
for(const [fn,mode] of [['downloadFixturePatchPdf','patch'],['downloadPositionSummary','position'],['downloadDeviceConfigPdf','deviceConfig'],['downloadExportLayoutPdf','distro']])assert(source(fn).includes("pdfExportFilename('"+mode+"')"));
assert(source('downloadPowerPdf').includes("pdfExportFilename(fanOut?'fanOut':'power')"));assert(fs.readFileSync(path.join(root,'js/loom-pdf.js'),'utf8').includes("link.download=pdfExportFilename('looms')"));
assert(html.includes('.exportLogoStack{position:absolute;top:5mm;right:5mm;display:flex;gap:3mm;align-items:flex-start;justify-content:flex-end;z-index:3;scale:2}'));assert(html.includes('.pdfUnifiedHeaderRight{justify-content:center}'));assert(html.includes('padding:9mm 0;min-height:36mm'));
// Vector chrome retains two lines, independent colour, italic/bold and underline.
const vector=vm.createContext({getComputedStyle:()=>({fontSize:'10px',fontWeight:'700',fontStyle:'italic',fontFamily:'Georgia',color:'#123456',textAlign:'left',textDecorationLine:'underline'}),patchPdfDomTextSize:()=>7.5,pdfFontFromStyle:()=>'/F8',pdfCssColour:c=>c,pdfWrapText:t=>[t],pdfTextWidth:t=>t.length*4,pdfSetFill(d,c){d.fill=c},pdfSetStroke(d,c){d.stroke=c},pdfLine(d,...args){d.lines.push(args)},pdfPt:n=>n,pdfText:t=>t});vm.runInContext(source('pdfDrawChromeText'),vector);const doc={cmd:[],lines:[],h:800};vector.pdfDrawChromeText(doc,{textContent:'Line 1\nLine 2'},{x:10,y:10,w:200,h:30},.75);assert.equal(doc.cmd.length,2);assert(doc.cmd.every(c=>c.includes('/F8 7.5 Tf')));assert.equal(doc.lines.length,2);assert.equal(doc.stroke,'#123456');assert(doc.cmd[0].includes('(Line 1)'));assert(doc.cmd[1].includes('(Line 2)'));
console.log('PASS: V55 filename defaults, per-document persistence, safe names, seven exporters, ordered settings, linked collapse, independent footer styles and vector chrome.');

// Captured PDFs use the equivalent transform supported by html2canvas.
vm.runInContext(source('preparePdfCaptureLogoScale'),ctx);
const captureStyles={};ctx.preparePdfCaptureLogoScale({querySelectorAll:()=>[{style:{setProperty:(key,value)=>captureStyles[key]=value}}]});
assert.equal(captureStyles.scale,'none');assert.equal(captureStyles.transform,'scale(2)');assert(source('patchPdfPageToJpeg').includes('onclone:preparePdfCaptureLogoScale'));
