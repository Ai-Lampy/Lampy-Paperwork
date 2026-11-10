/* Truck Pack data, measurements, placement rules and camera geometry. No DOM. */
(function(root){
  'use strict';
  const EPS=.01,MAX_CASES=10000,MAX_ITEMS=2000;
  const source={url:'https://stagetruck.com/fleet',checked:'2026-11-07'};
  const presets=[
    {id:'12-tonne',name:'12 Tonne',width:2440,length:6100,height:2440,payload:5500},
    {id:'18-tonne',name:'18 Tonne',width:2440,length:7850,height:2850,payload:8000},
    {id:'26-tonne',name:'26 Tonne',width:2440,length:7850,height:2850,payload:5500,note:'Stagetruck publishes a 5,500 kg payload for this vehicle. Confirm the actual vehicle payload.'},
    {id:'30-ft-urban',name:'30 FT Urban with Ramp',width:2490,length:9140,height:2790,payload:null,note:'Stagetruck does not publish a payload for this trailer. Enter the confirmed payload.'},
    {id:'mega-box',name:'Mega Box with Ramp',width:2450,length:13450,height:2900,payload:21000}
  ];
  const perspectives=['plan','top','left','right','back','front','leftIso','rightIso','orbit'];
  const cameras={plan:[0,90],top:[0,90],left:[-90,0],right:[90,0],back:[0,0],front:[180,0],leftIso:[-35,30],rightIso:[35,30]};
  let sequence=0;
  function id(prefix='tp'){return prefix+'_'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+(++sequence).toString(36))}
  function text(value,max=300){return String(value??'').trim().slice(0,max)}
  function number(value,label,zero=false){const n=Number(value);if(value===null||value===''||!Number.isFinite(n)||n<(zero?0:EPS)||n>1000000)throw Error(label+' must be a '+(zero?'non-negative':'positive')+' number.');return n}
  function fraction(value){const s=value.trim(),mixed=/^(\d+)\s+(\d+)\/(\d+)$/.exec(s),simple=/^(\d+)\/(\d+)$/.exec(s);if(mixed)return Number(mixed[1])+Number(mixed[2])/Number(mixed[3]);if(simple)return Number(simple[1])/Number(simple[2]);return /^\d+(?:\.\d+)?$/.test(s)?Number(s):NaN}
  function parseLength(value,allowZero=false){
    const s=text(value).replace(/[′’]/g,"'").replace(/[″“”]/g,'"').toLowerCase();
    const metric=/^(\d+(?:\.\d+)?)\s*(mm|cm|m)$/.exec(s);
    if(metric)return number(Number(metric[1])*({mm:1,cm:10,m:1000}[metric[2]]),'Dimension',allowZero);
    const imperial=/^(?:(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*(?:'|ft|feet))?\s*(?:(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*(?:"|in|inches))?$/.exec(s);
    if(imperial&&(imperial[1]||imperial[2]))return number((imperial[1]?fraction(imperial[1])*304.8:0)+(imperial[2]?fraction(imperial[2])*25.4:0),'Dimension',allowZero);
    throw Error('Include a dimension unit: mm, cm, m, feet (\') or inches (").');
  }
  function parseWeight(value,defaultUnit='kg',optional=false){
    if(!text(value)&&optional)return null;
    const m=/^(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|lb|lbs|pounds?)?$/i.exec(text(value));
    if(!m)throw Error('Weight must be a number in kg or lb.');
    return number(Number(m[1])*(/^(lb|pound)/i.test(m[2]||defaultUnit)?.45359237:1),'Weight',true);
  }
  function formatLength(mm,units='metric'){if(!Number.isFinite(mm))return '';if(units!=='imperial')return Number(mm.toFixed(3))+' mm';const inches=mm/25.4,feet=Math.floor(inches/12),rest=Number((inches-feet*12).toFixed(4));return feet+"' "+rest+'"'}
  function formatWeight(kg,unit='kg'){return kg===null||!Number.isFinite(kg)?'':Number((kg/(unit==='lb'?.45359237:1)).toFixed(4))+' '+unit}
  function identity(value,label){const v=text(value,100);if(!v||!/^[a-zA-Z0-9_-]+$/.test(v))throw Error('Invalid '+label+' identifier.');return v}
  function colour(value,fallback='#7799bb'){const v=text(value);return /^#[0-9a-f]{6}$/i.test(v)?v:fallback}
  function normaliseCase(raw){
    if(!raw||typeof raw!=='object')throw Error('Invalid case.');
    const name=text(raw.name);if(!name)throw Error('Enter a case name.');
    const result={id:identity(raw.id,'case'),name,type:text(raw.type)||'Case',width:number(raw.width,'Width'),length:number(raw.length,'Length'),height:number(raw.height,'Height'),heightIncludesWheels:raw.heightIncludesWheels!==false,casterHeight:raw.casterHeight==null?null:number(raw.casterHeight,'Castor height',true),weight:raw.weight==null?null:number(raw.weight,'Weight',true),department:text(raw.department)};
    if(result.type.toLowerCase()!=='truss'&&!result.heightIncludesWheels&&!(result.casterHeight>0))throw Error(name+': enter castor height when Height excludes wheels.');
    if(result.heightIncludesWheels&&result.casterHeight>=result.height)throw Error(name+': castor height must be less than total height.');
    return result;
  }
  function normaliseItem(raw){return {id:identity(raw.id,'placed case'),caseId:identity(raw.caseId,'inventory case'),name:text(raw.name),department:text(raw.department),colour:colour(raw.colour,''),colour2:colour(raw.colour2,''),colour3:colour(raw.colour3,''),rideOnWheels:raw.rideOnWheels!==false,lifter:raw.lifter===true,rotation:Number(raw.rotation)===90?90:0,packed:raw.packed===true,x:number(raw.x??0,'X',true),y:number(raw.y??0,'Y',true),z:number(raw.z??0,'Z',true)}}
  function normaliseTruck(raw){
    if(!raw||typeof raw!=='object')throw Error('Invalid truck.');
    const result={id:identity(raw.id,'truck'),preset:text(raw.preset)||'custom',company:text(raw.company),name:text(raw.name)||'Truck',registration:text(raw.registration),driver:text(raw.driver),email:text(raw.email),phone:text(raw.phone),width:number(raw.width,'Trailer width'),length:number(raw.length,'Trailer length'),height:number(raw.height,'Trailer height'),payload:raw.payload==null?null:number(raw.payload,'Payload'),snapToGrid:raw.snapToGrid===true,items:[]};
    if(!Array.isArray(raw.items)||raw.items.length>MAX_ITEMS)throw Error('A truck supports up to '+MAX_ITEMS+' case instances.');
    result.items=raw.items.map(normaliseItem);return result;
  }
  function view(raw={},index=0){const fallback=['plan','leftIso','back','rightIso'][index%4],mode=perspectives.includes(raw.mode)?raw.mode:fallback,pair=cameras[mode]||cameras.leftIso;return {mode,yaw:Number.isFinite(raw.yaw)?raw.yaw:pair[0],pitch:Math.max(-80,Math.min(90,Number.isFinite(raw.pitch)?raw.pitch:pair[1])),zoom:Math.max(.25,Math.min(8,Number(raw.zoom)||1)),panX:Number.isFinite(raw.panX)?Math.max(-100000,Math.min(100000,raw.panX)):0,panY:Number.isFinite(raw.panY)?Math.max(-100000,Math.min(100000,raw.panY)):0,tool:['select','pan','rotate'].includes(raw.tool)&&!(mode==='plan'&&raw.tool==='rotate')?raw.tool:'select'}}
  function empty(){return {cases:[],trucks:[],activeTruckId:'',layout:1,views:Array.from({length:4},(_,i)=>view({},i))}}
  function unique(rows,label){const seen=new Set();for(const row of rows){if(seen.has(row.id))throw Error('Duplicate '+label+' identifier.');seen.add(row.id)}}
  function normalise(raw){
    if(raw==null)return empty();
    if(!raw||typeof raw!=='object'||!Array.isArray(raw.cases)||!Array.isArray(raw.trucks)||raw.cases.length>MAX_CASES||raw.trucks.length>100)throw Error('Invalid Truck Pack data.');
    const result={cases:raw.cases.map(normaliseCase),trucks:raw.trucks.map(normaliseTruck),activeTruckId:text(raw.activeTruckId),layout:[1,2,4].includes(raw.layout)?raw.layout:1,views:Array.from({length:4},(_,i)=>view(raw.views?.[i],i))};
    unique(result.cases,'case');unique(result.trucks,'truck');unique(result.trucks.flatMap(t=>t.items),'placed case');
    if(!result.trucks.some(t=>t.id===result.activeTruckId))result.activeTruckId=result.trucks[0]?.id||'';
    for(const truck of result.trucks){const error=truckError(result,truck);if(error)throw Error(truck.name+': '+error)}
    return result;
  }
  function definition(state,item){const base=state.cases.find(c=>c.id===item.caseId);if(!base)throw Error('A placed case has no inventory record.');return {...base,name:item.name||base.name,department:item.department||base.department,colour:item.colour,colour2:item.colour2,colour3:item.colour3}}
  function dimensions(state,item){const base=definition(state,item),truss=base.type.toLowerCase()==='truss',caster=truss?0:base.casterHeight??Math.min(100,base.height*.1),total=base.height+(base.heightIncludesWheels||truss?0:caster);let width=base.width,length=item.rideOnWheels?base.length:total,height=item.rideOnWheels?total:base.length;if(item.rotation===90)[width,length]=[length,width];return {width,length,height,total,caster,bodyHeight:total-caster,truss}}
  function box(state,item){return {...dimensions(state,item),x:item.x,y:item.y,z:item.z}}
  function overlaps(a,b){return a.x<b.x+b.width-EPS&&a.x+a.width>b.x+EPS&&a.y<b.y+b.length-EPS&&a.y+a.length>b.y+EPS&&a.z<b.z+b.height-EPS&&a.z+a.height>b.z+EPS}
  function supported(a,b){return Math.abs(a.z-(b.z+b.height))<=EPS&&a.x>=b.x-EPS&&a.x+a.width<=b.x+b.width+EPS&&a.y>=b.y-EPS&&a.y+a.length<=b.y+b.length+EPS}
  function truckError(state,truck){
    const boxes=[];
    for(const item of truck.items){let b;try{b=box(state,item)}catch(e){return e.message}if(!item.packed)continue;
      if(b.x<0||b.y<0||b.z<0||b.x+b.width>truck.width+EPS||b.y+b.length>truck.length+EPS||b.z+b.height>truck.height+EPS)return definition(state,item).name+' extends outside the trailer.';
      boxes.push({item,b});
    }
    for(let i=0;i<boxes.length;i++){const {item,b}=boxes[i];for(let j=i+1;j<boxes.length;j++)if(overlaps(b,boxes[j].b))return 'Cases cannot overlap.';
      if(b.z>EPS&&(!item.lifter||!boxes.some(other=>other.item!==item&&supported(b,other.b))))return 'A raised case must be a lifter and fully supported by another case.';
    }
    return '';
  }
  function snapPosition(state,truck,item,position){
    const d=dimensions(state,item),step=truck.width/4,front=truck.length-d.length;
    if(d.width>truck.width+EPS||front<0)return {...position};
    const col=Math.max(0,Math.min(Math.floor((truck.width-d.width+EPS)/step),Math.round(position.x/step))),row=Math.max(0,Math.min(Math.floor(front/step),Math.round((front-position.y)/step)));
    return {...position,x:Number((col*step).toFixed(6)),y:Number((front-row*step).toFixed(6))};
  }
  function firstGridPosition(state,truck,item){
    const d=dimensions(state,item),step=truck.width/4,front=truck.length-d.length;
    if(d.width>truck.width+EPS||front<0||d.height>truck.height+EPS)return null;
    const occupied=truck.items.filter(other=>other.id!==item.id&&other.packed).map(other=>box(state,other)),rows=[...new Set([0,...occupied.map(b=>Math.max(0,Math.ceil((truck.length-b.y-EPS)/step)))])].sort((a,b)=>a-b);
    // Only the front and rows immediately behind occupied cases can be the first free row.
    for(const row of rows){const y=Number((front-row*step).toFixed(6));if(y<0)break;for(let col=0;col<4;col++){
      const x=Number((col*step).toFixed(6));if(x+d.width>truck.width+EPS)break;
      if(!occupied.some(b=>overlaps({...d,x,y,z:0},b)))return {x,y,z:0};
    }}return null;
  }
  function placement(state,truck,item,position,autoStack=true){
    const candidate={...item,...position,packed:true},others=truck.items.filter(i=>i.id!==item.id),trial={...truck,items:[...others,candidate]};
    if(truck.snapToGrid)Object.assign(candidate,snapPosition(state,truck,candidate,candidate));
    const precision=truck.snapToGrid?6:0;candidate.x=Number(candidate.x.toFixed(precision));candidate.y=Number(candidate.y.toFixed(precision));candidate.z=Number((candidate.z||0).toFixed(precision));
    let error=truckError(state,trial);if(!error)return {item:candidate,error:''};
    if(autoStack&&candidate.lifter){const heights=[...new Set(others.filter(i=>i.packed).map(i=>i.z+dimensions(state,i).height))].sort((a,b)=>a-b);for(const z of heights){candidate.z=z;error=truckError(state,trial);if(!error)return {item:{...candidate},error:''}}}
    return {item:null,error};
  }
  function totals(state,truck){let packed=0,staged=0,unknown=0;for(const item of truck.items){const weight=definition(state,item).weight;if(weight==null){unknown++;continue}if(item.packed)packed+=weight;else staged+=weight}return {packed,staged,unknown,overPayload:truck.payload!=null&&packed>truck.payload}}
  function addItems(state,truckId,caseId,quantity){
    const truck=state.trucks.find(t=>t.id===truckId),base=state.cases.find(c=>c.id===caseId),count=Number(quantity);if(!truck||!base)throw Error('Select a truck and an inventory case.');if(!Number.isInteger(count)||count<1||truck.items.length+count>MAX_ITEMS)throw Error('Enter a whole quantity within the '+MAX_ITEMS+' cases per truck limit.');
    const added=Array.from({length:count},()=>({id:id('load'),caseId:base.id,name:'',department:base.department,colour:'',colour2:'',colour3:'',rideOnWheels:true,lifter:false,rotation:0,packed:false,x:0,y:0,z:0}));
    for(const item of added){if(truck.snapToGrid){const position=firstGridPosition(state,truck,item);if(position)Object.assign(item,position,{packed:true})}truck.items.push(item)}return added;
  }
  function removeInventoryCases(state,caseIds){
    const ids=new Set(caseIds),before=state.cases.length;let removed=0,waiting=0;
    state.cases=state.cases.filter(c=>!ids.has(c.id));
    for(const truck of state.trucks){
      const count=truck.items.length;truck.items=truck.items.filter(item=>!ids.has(item.caseId));removed+=count-truck.items.length;
      let changed=true;while(changed){changed=false;for(const item of truck.items){if(!item.packed||item.z<=EPS)continue;const b=box(state,item);if(!truck.items.some(other=>other!==item&&other.packed&&supported(b,box(state,other)))){item.packed=false;waiting++;changed=true}}}
    }
    return {inventory:before-state.cases.length,removed,waiting};
  }
  function parseImportLength(value,dimensionUnit='',allowZero=false){
    if(!['','mm','cm','m','ft','in'].includes(dimensionUnit))throw Error('Choose a valid dimension unit.');
    const raw=text(value),bare=/^\d+(?:\.\d+)?$|^\d+(?:\s+\d+)?\/\d+$/.test(raw);
    if(!raw)throw Error('A numeric measurement is required.');
    if(bare&&!dimensionUnit)throw Object.assign(Error('Select Dimension units for numbers without units, or include units in each dimension value.'),{unitRequired:true});
    try{return parseLength(bare?raw+' '+dimensionUnit:raw,allowZero)}catch{
      throw Error('"'+raw+'" is not a valid measurement. Enter a '+(allowZero?'non-negative':'positive')+' number'+(dimensionUnit?' in '+dimensionUnit:' with units')+'.');
    }
  }
  function importDimensionIssues(rows,mapping,dimensionUnit=''){
    const issues=[];
    rows.forEach((row,index)=>{if(!row.some(v=>text(v)))return;for(const [field,label] of [['width','Width'],['length','Length'],['height','Height'],['casterHeight','Castor Height']]){
      if(!(mapping[field]>=0))continue;const value=row[mapping[field]]??'';if(field==='casterHeight'&&!text(value))continue;
      try{parseImportLength(value,dimensionUnit,field==='casterHeight')}catch(error){issues.push({row:index+2,field,label,value:text(value),message:error.message,unitRequired:error.unitRequired===true})}
    }});return issues;
  }
  function importRows(rows,mapping,weightUnit='kg',dimensionUnit=''){
    if(!['','mm','cm','m','ft','in'].includes(dimensionUnit))throw Error('Choose a valid dimension unit.');
    const dimension=(value,label,allowZero=false)=>{try{return parseImportLength(value,dimensionUnit,allowZero)}catch(error){throw Error(label+': '+error.message)}};
    const result=[],errors=[];
    rows.forEach((row,index)=>{if(!row.some(v=>text(v)))return;try{const get=key=>row[mapping[key]]??'',flag=text(get('heightIncludesWheels')).toLowerCase();if(flag&&!['yes','no','true','false','1','0','y','n'].includes(flag))throw Error('Height Inc Wheels? must be Yes or No.');result.push(normaliseCase({id:id('case'),name:get('name'),type:get('type')||'Case',width:dimension(get('width'),'Width'),length:dimension(get('length'),'Length'),height:dimension(get('height'),'Height'),heightIncludesWheels:!['no','false','0','n'].includes(flag),casterHeight:text(get('casterHeight'))?dimension(get('casterHeight'),'Castor Height',true):null,weight:parseWeight(get('weight'),weightUnit,true),department:get('department')}))}catch(error){errors.push('Row '+(index+2)+': '+error.message)}});
    if(errors.length)throw Error(errors.slice(0,20).join('\n')+(errors.length>20?'\n… '+(errors.length-20)+' more errors.':''));
    if(!result.length)throw Error('No case rows were found.');if(result.length>MAX_CASES)throw Error('Too many inventory cases.');return result;
  }
  function suggestMapping(headers){const aliases={name:['name','case name'],type:['type'],width:['w','width'],length:['l','length','depth'],height:['h','height'],heightIncludesWheels:['height inc wheels','height includes wheels','height incl wheels'],casterHeight:['castor height','caster height','wheel height'],weight:['weight','weight kg','weight lbs','weight lb'],department:['department']};return Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,headers.findIndex(v=>names.includes(text(v).toLowerCase().replace(/[?()]/g,'').replace(/\s+/g,' ').trim()))]))}
  function project(point,camera){const yaw=camera.yaw*Math.PI/180,pitch=camera.pitch*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);return {x:point.x*c+point.y*s,y:point.x*s*sp-point.y*c*sp-point.z*cp,depth:point.x*s*cp-point.y*c*cp+point.z*sp}}
  function unprojectDelta(dx,dy,camera,plane='xy'){
    const axes={xy:[{x:1,y:0,z:0},{x:0,y:1,z:0}],xz:[{x:1,y:0,z:0},{x:0,y:0,z:1}],yz:[{x:0,y:1,z:0},{x:0,y:0,z:1}]}[plane],a=project(axes[0],camera),b=project(axes[1],camera),det=a.x*b.y-a.y*b.x;if(Math.abs(det)<1e-6)return null;const u=(dx*b.y-dy*b.x)/det,v=(a.x*dy-a.y*dx)/det;return {x:axes[0].x*u+axes[1].x*v,y:axes[0].y*u+axes[1].y*v,z:axes[0].z*u+axes[1].z*v};
  }
  const api={EPS,MAX_CASES,MAX_ITEMS,source,presets,perspectives,cameras,id,parseLength,parseWeight,formatLength,formatWeight,normaliseCase,normaliseItem,normaliseTruck,normalise,empty,view,definition,dimensions,box,overlaps,supported,truckError,snapPosition,firstGridPosition,placement,totals,addItems,removeInventoryCases,parseImportLength,importDimensionIssues,importRows,suggestMapping,project,unprojectDelta};
  root.LampyTruckPack=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
