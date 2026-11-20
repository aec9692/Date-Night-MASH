/* Cents-only allowances and bounded, device-derived preferences. */
(function(root){
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 function cents(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=10000&&value===Number(value.toFixed(2))?Math.round(value*100):null;}
 function reserve(value={},budgetCents=1000000){
  if(!object(value)||Object.keys(value).some(key=>!['parking','transport','extras'].includes(key)))return null;
  const result={parking:0,transport:0,extras:0,...value},amounts=Object.values(result).map(cents);
  if(amounts.some(amount=>amount===null)||amounts.reduce((a,b)=>a+b,0)>budgetCents)return null;
  return result;
 }
 const reserveTotal=value=>['parking','transport','extras'].reduce((sum,key)=>sum+cents(value[key]),0);
 function taste(value={},options=[]){
  if(!object(value)||Object.keys(value).some(key=>!['liked','less'].includes(key)))return null;
  const result={liked:[],less:[],...value},known=new Set(options.map(o=>o.id));
  for(const list of [result.liked,result.less])if(!Array.isArray(list)||list.length>16||new Set(list).size!==list.length||list.some(id=>typeof id!=='string'||!known.has(id)))return null;
  if(result.liked.some(id=>result.less.includes(id)))return null;
  return result;
 }
 function preferenceScore(id,value){if(!value||!value.liked.length&&!value.less.length)return 0;return value.liked.includes(id)?4:value.less.includes(id)?0:1;}
 function presets(now=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  const today=`${parts.year}-${parts.month}-${parts.day}`,day=new Date(today+'T12:00:00Z'),weekday=day.getUTCDay();
  if(weekday!==0&&weekday!==6)day.setUTCDate(day.getUTCDate()+6-weekday);
  return {tonight:today,weekend:day.toISOString().slice(0,10)};
 }
 function validDate(value){return typeof value==='string'&&(!value||/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value);}
 function rating(value){
  if(!object(value)||Object.keys(value).some(key=>!['ids','date','rating','wouldAgain'].includes(key))||!Array.isArray(value.ids)||value.ids.length<2||value.ids.length>4||new Set(value.ids).size!==value.ids.length||value.ids.some(id=>typeof id!=='string'||!/^[a-z0-9-]{1,100}$/.test(id))||!validDate(value.date)||!Number.isInteger(value.rating)||value.rating<1||value.rating>5||!['yes','no','unsure'].includes(value.wouldAgain))return null;
  return {ids:[...value.ids],date:value.date,rating:value.rating,wouldAgain:value.wouldAgain};
 }
 const signature=value=>value.date+'|'+value.ids.join('|');
 function signals(records,options){
  const known=new Set(options.map(o=>o.id)),scores=new Map();
  for(const item of records.slice(0,100)){const record=rating(item);if(!record)continue;
   const direction=record.wouldAgain==='no'||record.rating<=2?-1:record.rating>=4||record.wouldAgain==='yes'?1:0;
   for(const id of record.ids)if(known.has(id))scores.set(id,(scores.get(id)||0)+direction*(record.rating===1||record.rating===5?2:1));
  }
  const ranked=[...scores].sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));return {liked:ranked.filter(([,value])=>value>0).slice(0,16).map(([id])=>id),less:ranked.filter(([,value])=>value<0).slice(0,16).map(([id])=>id)};
 }
 const api={cents,reserve,reserveTotal,taste,preferenceScore,presets,rating,signature,signals};if(typeof module==='object'&&module.exports)module.exports=api;else root.DatePlanning=api;
})(typeof globalThis==='object'?globalThis:this);
