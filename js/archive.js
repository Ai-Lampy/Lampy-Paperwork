/* Bounded ZIP reader for GDTF, MVR and spreadsheet imports. */
(function(root){
  'use strict';
  const LIMIT=256*1024*1024, ENTRY_LIMIT=64*1024*1024, MAX_ENTRIES=10000;
  function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0;}
  async function inflate(data,limit=ENTRY_LIMIT){
    if(!root.DecompressionStream)throw Error('This browser does not support compressed imports');
    const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('Archive entry exceeds extraction limit')}chunks.push(value)}}finally{reader.releaseLock()}
    const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length}return out;
  }
  async function read(buffer,matcher=null){
    const bytes=new Uint8Array(buffer);if(bytes.length>LIMIT)throw Error('Archive exceeds 256 MiB limit');
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder(),files=Object.create(null),names=new Set();
    const bounds=(offset,size)=>{if(offset<0||offset+size>bytes.length)throw Error('Truncated ZIP archive')};
    const u16=offset=>{bounds(offset,2);return view.getUint16(offset,true)},u32=offset=>{bounds(offset,4);return view.getUint32(offset,true)};
    let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(i)===0x06054b50&&i+22+u16(i+20)===bytes.length){end=i;break}
    if(end<0)throw Error('Invalid ZIP archive');
    const count=u16(end+10),centralSize=u32(end+12),central=u32(end+16);
    if(u16(end+4)||u16(end+6)||u16(end+8)!==count||count>MAX_ENTRIES||central+centralSize!==end)throw Error('Unsupported ZIP structure');
    let cursor=central,total=0;
    for(let i=0;i<count;i++){
      bounds(cursor,46);if(u32(cursor)!==0x02014b50)throw Error('Invalid ZIP directory');
      const flags=u16(cursor+8),method=u16(cursor+10),checksum=u32(cursor+16),compressed=u32(cursor+20),size=u32(cursor+24),nameLength=u16(cursor+28),extra=u16(cursor+30),comment=u16(cursor+32),local=u32(cursor+42);
      bounds(cursor+46,nameLength+extra+comment);const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));
      if(flags&1||![0,8].includes(method)||size>ENTRY_LIMIT||(total+=size)>LIMIT)throw Error('Unsupported or oversized ZIP entry');
      if(!name||name.includes('\\')||name.startsWith('/')||name.includes('\0')||name.split('/').some(part=>['..','__proto__','constructor','prototype'].includes(part))||names.has(name))throw Error('Unsafe or duplicate ZIP path');
      names.add(name);bounds(local,30);if(u32(local)!==0x04034b50||u16(local+8)!==method)throw Error('Invalid ZIP entry header');
      const localName=u16(local+26),start=local+30+localName+u16(local+28);bounds(start,compressed);
      if(start+compressed>central||decoder.decode(bytes.subarray(local+30,local+30+localName))!==name)throw Error('Invalid ZIP entry range');
      if(!name.endsWith('/')&&(!matcher||matcher(name))){const raw=bytes.subarray(start,start+compressed),data=method===0?raw:await inflate(raw,size);if(data.length!==size||crc32(data)!==checksum)throw Error('ZIP entry integrity check failed');files[name]=data}
      cursor+=46+nameLength+extra+comment;
    }
    if(cursor!==end)throw Error('Invalid ZIP directory size');return files;
  }
  root.LampyArchive={read,inflate,crc32};if(typeof module!=='undefined')module.exports=root.LampyArchive;
})(globalThis);
