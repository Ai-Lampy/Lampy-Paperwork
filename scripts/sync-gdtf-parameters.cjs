// Recalculate matched library counts using the application's own GDTF parser.
// Python's standard library reads ZIP/XML; no browser or additional packages.
const fs=require('fs'),path=require('path'),vm=require('vm'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..');
function parserContext(){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),context=vm.createContext({});
 for(const name of ['gdtfAttr','gdtfDirectChildren','xmlChildrenByName','parseGdtfModeParameterCount']){
  const start=html.indexOf('function '+name+'(');if(start<0)throw Error(name);
  let found=false;
  for(let end=html.indexOf('}',start);end>=0;end=html.indexOf('}',end+1)){
   const code=html.slice(start,end+1);try{new Function('return ('+code+')')}catch{continue}
   vm.runInContext(code,context);found=true;break;
  }
  if(!found)throw Error('Cannot extract '+name);
 }
 return context;
}
function documentTree(data){
 const doc={};
 function wrap(raw){const node={localName:raw.tag,tagName:raw.tag,ownerDocument:doc,getAttribute:name=>raw.attrs[name]??null};node.children=raw.children.map(wrap);node.getElementsByTagName=name=>node.children.flatMap(child=>[...(name==='*'||child.tagName===name?[child]:[]),...child.getElementsByTagName(name)]);return node}
 doc.children=[wrap(data)];doc.getElementsByTagName=name=>doc.children.flatMap(child=>[...(name==='*'||child.tagName===name?[child]:[]),...child.getElementsByTagName(name)]);return doc;
}
function readArchives(files){
 const python=String.raw`
import sys,json,zipfile,xml.etree.ElementTree as E
# Parameter counts need geometry and logical-channel structure, not meshes or wheels.
keep={'GDTF','FixtureType','Geometries','DMXModes','DMXMode','DMXChannels','DMXChannel','Channel','LogicalChannel'}
def tree(n,geometry=False):
 tag=n.tag.split('}')[-1]
 return {'tag':tag,'attrs':dict(n.attrib),'children':[tree(c,geometry or tag=='Geometries') for c in n if geometry or tag=='Geometries' or c.tag.split('}')[-1] in keep]}
out={}
for name in json.load(sys.stdin):
 with zipfile.ZipFile(name) as z:
  key=next(k for k in z.namelist() if k.lower().endswith('description.xml'))
  out[name]=tree(E.fromstring(z.read(key)))
json.dump(out,sys.stdout)
`;
 return JSON.parse(execFileSync('python3',['-c',python],{input:JSON.stringify(files),maxBuffer:200*1024*1024}).toString());
}
function sync(write=false){
 const documents=fs.readdirSync(path.join(root,'json/fixtures')).filter(n=>n.endsWith('.json')).map(n=>{const file=path.join(root,'json/fixtures',n),text=fs.readFileSync(file,'utf8');return {file,text,data:JSON.parse(text)}});
 const fixtures=d=>Array.isArray(d)?d:d.fixtures||[];
 const files=[...new Set(documents.flatMap(d=>fixtures(d.data).filter(f=>f.gdtf?.file).map(f=>path.join(root,'gdtf',f.gdtf.file))))];
 const archives=readArchives(files),context=parserContext(),counts=new Map();
 for(const [file,data] of Object.entries(archives)){const doc=documentTree(data);counts.set(file,new Map(doc.getElementsByTagName('DMXMode').map(m=>[m.getAttribute('Name'),context.parseGdtfModeParameterCount(m)])))}
 let total=0;const changed=[];
 for(const d of documents){let text=d.text,n=0;
  for(const fixture of fixtures(d.data)){
   const modes=counts.get(path.join(root,'gdtf',fixture.gdtf?.file||''));if(!modes)continue;
   for(const [name,mode] of Object.entries(fixture.gdtf.modes||{})){
    if(mode.status!=='matched'||!modes.has(mode.gdtfMode))continue;
    const count=modes.get(mode.gdtfMode);if(mode.parameters===count)continue;
    const start=text.indexOf('"fixture": '+JSON.stringify(fixture.fixture)),gdtf=text.indexOf('"gdtf":',start),key=text.indexOf(JSON.stringify(name)+':',gdtf),end=text.indexOf('}',key);
    if(start<0||gdtf<0||key<0||end<0)throw Error('Missing JSON location: '+fixture.fixture+' / '+name);
    const block=text.slice(key,end),updated=block.replace(/("parameters"\s*:\s*)\d+/,(_,prefix)=>prefix+count);
    if(block===updated)throw Error('Missing parameter field: '+fixture.fixture+' / '+name);
    text=text.slice(0,key)+updated+text.slice(end);n++;
   }
  }
  if(n){JSON.parse(text);if(write)fs.writeFileSync(d.file,text);changed.push(path.relative(root,d.file));console.log(path.relative(root,d.file)+': '+n+' corrected modes');total+=n}
 }
 console.log(`${total} parameter counts ${write?'updated':'need updating'} across ${changed.length} files.`);return {total,changed};
}
module.exports={parserContext,documentTree,readArchives,sync};
if(require.main===module){const result=sync(process.argv.includes('--write'));if(result.total&&!process.argv.includes('--write'))process.exitCode=1}
