'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
function readDocumentation(root){return {html:fs.readFileSync(path.join(root,'index.html'),'utf8'),welcome:JSON.parse(fs.readFileSync(path.join(root,'info_txt/welcome_message.json'),'utf8')),walkthrough:JSON.parse(fs.readFileSync(path.join(root,'info_txt/walkthrough.json'),'utf8')),checklist:fs.readFileSync(path.join(root,'tests/BROWSER-CHECKLIST.md'),'utf8'),changelog:fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8'),manifest:JSON.parse(fs.readFileSync(path.join(root,'js/app-version.json'),'utf8'))}}
function fallbackDocument(html,name){
 const start=html.indexOf('function '+name+'(');assert(start>=0,`Missing ${name}`);
 const end=html.indexOf('\nfunction ',start);assert(end>start,`Cannot isolate ${name}`);
 const code=html.slice(start,end);new vm.Script(code);
 return JSON.parse(JSON.stringify(vm.runInNewContext(code+';'+name+'()',{}, {timeout:1000})));
}
function validateDocumentation({html,welcome,walkthrough,checklist,changelog,manifest}){
 const version=html.match(/^const VERSION='(\d+(?:\.\d+)*)';$/m)?.[1];assert(version,'Missing release VERSION');const major=version.split('.')[0];
 assert(html.includes('<title>Lampy Paperwork V'+version+'</title>'),'Page title must match VERSION');
 assert.equal(manifest.version,version,'Update metadata must match VERSION');
 assert.match(changelog,new RegExp('^## V'+version.replaceAll('.','\\.')+' — '),'Latest changelog must match VERSION');
 for(const match of html.matchAll(/(?:src|href)="js\/[^"\s]+\?v=([^"\s]+)"/g))assert.equal(match[1],version,'JavaScript/CSS cache version must match VERSION');
 assert.equal(welcome.title,`Welcome to Lampy Paperwork V${major}`,'Welcome must match the current major release');
 assert.equal(walkthrough.title,`Lampy Paperwork V${major} Walk-through`,'Walk-through must match the current major release');
 assert.equal(checklist.split(/\r?\n/)[0],`# V${major} browser release checks`,'Browser checklist must match the current major release');
 assert(Array.isArray(welcome.paragraphs)&&welcome.paragraphs.length&&welcome.paragraphs.every(p=>typeof p==='string'&&p.trim()),'Welcome paragraphs must be populated');
 assert(welcome.paragraphs.some(p=>new RegExp('\\bV'+major+'\\b').test(p)),'Welcome must describe the current major release');
 assert(Array.isArray(walkthrough.sections)&&walkthrough.sections.length,'Walk-through sections must be populated');
 assert(walkthrough.sections[0].title.startsWith(`New in V${major}:`),'Walk-through must lead with the current major release');
 for(const section of walkthrough.sections){assert(section.title?.trim(),'Missing section title');assert(['ordered','unordered'].includes(section.type),'Invalid section type');assert(Array.isArray(section.items)&&section.items.length&&section.items.every(item=>typeof item==='string'&&item.trim()),'Empty walkthrough section')}
 assert.deepEqual(fallbackDocument(html,'fallbackWelcomeMessage'),welcome,'Welcome fallback must match the complete JSON content');
 assert.deepEqual(fallbackDocument(html,'fallbackWalkthrough'),walkthrough,'Walk-through fallback must match the complete JSON content');
 return {version,major};
}
module.exports={readDocumentation,validateDocumentation,fallbackDocument};
