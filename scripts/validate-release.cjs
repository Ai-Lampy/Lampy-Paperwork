const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
const version=html.match(/const VERSION='([^']+)'/)[1];assert(html.includes('<title>Lampy Paperwork V'+version+'</title>'));assert(fs.readFileSync(path.join(root,'README.md'),'utf8').includes('**V'+version+'**'));assert(fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8').includes('V'+version));
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){const src=match[1].match(/src="([^"]+)"/);new vm.Script(src?fs.readFileSync(path.join(root,src[1]),'utf8'):match[2])}
let count=0;
function refs(value){if(Array.isArray(value))return value.forEach(refs);if(value&&typeof value==='object')return Object.values(value).forEach(refs);if(typeof value!=='string')return;let ref=value;if(ref.startsWith('fixtures/')&&ref.endsWith('.gdtf'))ref='gdtf/'+ref;if(/^(images|json|gdtf|info_txt)\//.test(ref)&&!ref.includes('://'))assert(fs.existsSync(path.join(root,ref)),'Missing asset: '+ref)}
for(const file of walk(path.join(root,'json')).filter(f=>f.endsWith('.json'))){refs(JSON.parse(fs.readFileSync(file,'utf8')));count++}
for(const file of walk(path.join(root,'info_txt')).filter(f=>f.endsWith('.json')))JSON.parse(fs.readFileSync(file,'utf8'));
assert(!/on(?:click|change|input)="[^"\n]*escapeAttr\(/.test(html),'HTML encoding used inside JavaScript handler');
console.log(`PASS: V${version}, script syntax, ${count} JSON references and local asset paths`);
