/* Portable plan links and calendar drafts. No account, calendar write or network side effect. */
(function(root){
  const categories=['dinner','activity','treat','entertainment'];
  const formats={quick:['dinner','treat'],evening:['dinner','activity','treat'],full:categories};
  const fields=['v','ids','budgetCents','setting','mood','spending','area','date','pantry','customOptions','mash','journey','location','fit','when','proposal'];
  const owned=['groceries','seasonings','baking','boardGames','videoGames','art','streaming','craft'];
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const copy=value=>JSON.parse(JSON.stringify(value));
  const fail=message=>{throw new Error(message);};
  const encoder=new TextEncoder();
  function dateValid(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number(value.slice(0,4))<1900)return false;
    const parsed=new Date(value+'T12:00:00Z');
    return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
  }
  function clockValid(value){return typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);}
  function rejectSpecialKeys(value){
    if(!value||typeof value!=='object')return;
    for(const key of Object.keys(value)){
      if(['__proto__','constructor','prototype'].includes(key))fail('This shared date contains unsupported fields.');
      rejectSpecialKeys(value[key]);
    }
  }
  function validate(value){
    if(!object(value)||Object.keys(value).some(key=>!fields.includes(key))||value.v!==1)fail('This shared date format is not supported.');
    rejectSpecialKeys(value);
    if(!Array.isArray(value.ids)||value.ids.length<2||value.ids.length>4||new Set(value.ids).size!==value.ids.length||value.ids.some(id=>typeof id!=='string'||!/^[a-z0-9-]{1,100}$/.test(id)))fail('The shared date must identify two to four distinct catalog choices.');
    if(!Number.isSafeInteger(value.budgetCents)||value.budgetCents<0||value.budgetCents>1000000)fail('The shared date has an invalid budget.');
    if(!['any','indoor','outdoor','home','mixed'].includes(value.setting)||!['surprise','cozy','adventurous','romantic','competitive'].includes(value.mood)||!['treat','flexible'].includes(value.spending)||!['all','general','paterson'].includes(value.area))fail('The shared date has unsupported preferences.');
    if(typeof value.date!=='string'||value.date!==''&&!dateValid(value.date))fail('The shared date has an invalid calendar date.');
    if(!Array.isArray(value.pantry)||value.pantry.length>owned.length||new Set(value.pantry).size!==value.pantry.length||value.pantry.some(key=>!owned.includes(key)))fail('The shared date has invalid owned-supply choices.');
    if(!Array.isArray(value.customOptions)||value.customOptions.length>4||value.customOptions.some(option=>!object(option)))fail('The shared date has invalid personal ideas.');
    for(const key of ['mash','journey','location','fit'])if(value[key]!==undefined&&!object(value[key]))fail('The shared date has invalid '+key+' preferences.');
    if(value.mash&&value.journey)fail('The shared date cannot mix MASH and timed preferences.');
    const active=value.journey?formats[value.journey.format]:categories;
    if(!active||active.length!==value.ids.length)fail('The shared date categories do not match its format.');
    if(value.proposal!==undefined&&value.proposal!==''&&!active.includes(value.proposal))fail('Choose a category from this date to suggest changing.');
    if(value.when!==undefined)normalizeWhen(value.when);
    return value;
  }
  function snapshot(plan,when=null,proposal=''){
    if(!plan||!Array.isArray(plan.picks))fail('Generate a date before sharing it.');
    const data={v:1,ids:plan.picks.map(pick=>pick.id),budgetCents:plan.budgetCents,setting:plan.setting||'any',mood:plan.mood||'surprise',spending:plan.spending||'flexible',area:plan.area||'general',date:plan.date||'',pantry:copy(plan.pantry||[]),customOptions:copy(plan.customOptions||[])};
    for(const key of ['mash','journey','location','fit'])if(plan[key])data[key]=copy(plan[key]);
    // Tried-place history is device-local and is not needed to restore locked picks.
    if(data.journey){delete data.journey.seen;data.journey.fresh=false;}
    if(when)data.when=normalizeWhen(when);
    if(proposal)data.proposal=proposal;
    return validate(data);
  }
  function encode(value){
    validate(value);const bytes=encoder.encode(JSON.stringify(value));
    if(bytes.length>9000)fail('This date is too large for a share link. Share its text note or PDF instead.');
    let encoded;
    if(typeof Buffer!=='undefined')encoded=Buffer.from(bytes).toString('base64');
    else {let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);encoded=btoa(binary);}
    const result=encoded.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    if(result.length>12000)fail('This date is too large for a share link. Share its text note or PDF instead.');
    return result;
  }
  function decode(token){
    if(typeof token!=='string'||!token||token.length>12000||!/^[A-Za-z0-9_-]+$/.test(token)||token.length%4===1)fail('This shared date link is incomplete or too large.');
    try{
      const base=token.replace(/-/g,'+').replace(/_/g,'/'),padded=base+'='.repeat((4-base.length%4)%4);
      const bytes=typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(padded,'base64')):Uint8Array.from(atob(padded),char=>char.charCodeAt(0));
      if(bytes.length>9000)fail('This shared date is too large.');
      const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
      validate(value);
      // Reject noncanonical encodings rather than accepting truncated trailing bits.
      if(encode(value)!==token)fail('This shared date link is malformed.');
      return value;
    }catch(error){throw new Error(error?.message?.startsWith('The shared date')||error?.message?.startsWith('This shared date')||error?.message?.startsWith('Choose a category')?error.message:'This shared date link could not be read.');}
  }
  function preferences(value){
    validate(value);const active=value.journey?formats[value.journey.format]:categories;
    const result={budget:value.budgetCents/100,setting:value.setting,mood:value.mood,spending:value.spending,area:value.area,date:value.date,pantry:copy(value.pantry),customOptions:copy(value.customOptions),locked:Object.fromEntries(active.map((category,index)=>[category,value.ids[index]]))};
    for(const key of ['mash','journey','location','fit'])if(value[key])result[key]=copy(value[key]);
    if(result.journey){delete result.journey.seen;result.journey.fresh=false;}
    return result;
  }
  const formatters=new Map();
  function formatter(timeZone){
    if(!formatters.has(timeZone)){
      if(formatters.size>=40)formatters.delete(formatters.keys().next().value);
      formatters.set(timeZone,new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
    }
    return formatters.get(timeZone);
  }
  function utcStamp(date,time,timeZone){
    const nominal=new Date(date+'T'+time+':00Z').getTime(),match=date+'T'+time,candidates=[];
    const format=formatter(timeZone);
    // Modern IANA offsets fit quarter-hour steps; test each offset to reject DST gaps.
    for(let offset=-14*60;offset<=14*60;offset+=15){
      const milliseconds=nominal-offset*60000,parts=Object.fromEntries(format.formatToParts(milliseconds).map(part=>[part.type,part.value]));
      if(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`===match)candidates.push(milliseconds);
    }
    if(!candidates.length)fail('That local time does not exist in this time zone. Choose another time.');
    // A fall-back clock hour occurs twice. Use its first occurrence consistently.
    return new Date(Math.min(...candidates)).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  }
  function normalizeWhen(value){
    if(!object(value)||Object.keys(value).some(key=>!['date','start','end','timeZone'].includes(key))||!dateValid(value.date)||!clockValid(value.start)||!clockValid(value.end)||value.end<=value.start||typeof value.timeZone!=='string'||value.timeZone.length>80)fail('Choose a valid date, start time, later end time and time zone.');
    try{formatter(value.timeZone);}catch{fail('Choose a supported IANA time zone.');}
    const result={date:value.date,start:value.start,end:value.end,timeZone:value.timeZone};
    const start=utcStamp(result.date,result.start,result.timeZone),end=utcStamp(result.date,result.end,result.timeZone);
    if(end<=start)fail('The end must be after the start in the selected time zone.');
    return result;
  }
  function safeText(value){return String(value??'').replace(/\r\n?/g,'\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'');}
  const money=cents=>'$'+(cents/100).toFixed(2);
  function checkedPlan(plan){
    if(!plan||!Array.isArray(plan.picks)||plan.picks.length<2||plan.picks.length>4||!Number.isSafeInteger(plan.budgetCents)||plan.budgetCents<0||!Number.isSafeInteger(plan.totalCents)||plan.totalCents<0||plan.totalCents>plan.budgetCents||plan.picks.some(pick=>!pick||typeof pick.id!=='string'||typeof pick.name!=='string'||!categories.includes(pick.category)||!Number.isSafeInteger(pick.costCents)||pick.costCents<0)||plan.picks.reduce((sum,pick)=>sum+pick.costCents,0)!==plan.totalCents)fail('Generate a complete affordable date before sharing or adding it to a calendar.');
    return plan;
  }
  function safeLink(value){if(!value)return '';try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
  function summary(plan,when=null,shareUrl='',proposal=''){
    checkedPlan(plan);if(when)when=normalizeWhen(when);
    if(proposal&&!plan.picks.some(pick=>pick.category===proposal))fail('Choose a category from this date to suggest changing.');
    const lines=[safeText(plan.title||'Our Date Night MASH plan').replace(/\n/g,' '),'A date for two'];
    if(when)lines.push(`${when.date} | ${when.start}-${when.end} (${when.timeZone})`);
    else if(plan.date)lines.push('Date: '+safeText(plan.date));
    if(proposal)lines.push('Suggested change: let us replace '+proposal+'.');
    for(const pick of plan.picks){
      const name=pick.venue&&['dinner','treat'].includes(pick.category)?pick.venue.name:pick.name;
      lines.push(`${pick.category[0].toUpperCase()+pick.category.slice(1)}: ${safeText(name)} - ${money(pick.costCents)}`);
      if(pick.venue?.address||pick.place?.address)lines.push(safeText(pick.venue?.address||pick.place.address));
    }
    lines.push(`Estimated total: ${money(plan.totalCents)} | Budget: ${money(plan.budgetCents)} | Remaining: ${money(plan.budgetCents-plan.totalCents)}`,'Estimates for two. Confirm full prices, opening times, access and bookings.');
    const link=safeLink(shareUrl);if(link)lines.push('View or suggest a change: '+link);
    return lines.join('\n');
  }
  function location(plan){return safeText(plan.picks.map(pick=>pick.venue?.address||pick.place?.address||'').filter(Boolean).join(' | ')||'At home / location to arrange');}
  function googleUrl(plan,when,shareUrl=''){
    checkedPlan(plan);when=normalizeWhen(when);
    // Long custom-plan links remain available in the separate share note.
    const details=summary(plan,when,shareUrl.length<=2000?shareUrl:'');
    const url=new URL('https://calendar.google.com/calendar/r/eventedit');
    url.search=new URLSearchParams({action:'TEMPLATE',dates:utcStamp(when.date,when.start,when.timeZone)+'/'+utcStamp(when.date,when.end,when.timeZone),stz:when.timeZone,etz:when.timeZone,text:safeText(plan.title||'Date Night MASH').replace(/\n/g,' '),details,location:location(plan)});
    return url.href;
  }
  const escape=value=>safeText(value).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  function fold(line){let pieces=[],current='',length=0;for(const char of line){const size=encoder.encode(char).length;if(length+size>70){pieces.push(current);current=' ';length=1;}current+=char;length+=size;}pieces.push(current);return pieces.join('\r\n');}
  function fingerprint(value){let hash=2166136261;for(const byte of encoder.encode(value)){hash^=byte;hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
  function ics(plan,when,shareUrl=''){
    checkedPlan(plan);when=normalizeWhen(when);const start=utcStamp(when.date,when.start,when.timeZone),end=utcStamp(when.date,when.end,when.timeZone);
    const uid=fingerprint(JSON.stringify([plan.picks.map(pick=>pick.id),start,end]));
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Date Night MASH//Date Plan//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${uid}-${start}@datenightmash.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}`,`DTSTART:${start}`,`DTEND:${end}`,`SUMMARY:${escape(plan.title||'Date Night MASH')}`,`LOCATION:${escape(location(plan))}`,`DESCRIPTION:${escape(summary(plan,when,shareUrl))}`,'STATUS:TENTATIVE','TRANSP:OPAQUE','END:VEVENT','END:VCALENDAR'];
    return lines.map(fold).join('\r\n')+'\r\n';
  }
  function recommended(nav={}){const ua=String(nav.userAgent||''),platform=String(nav.userAgentData?.platform||nav.platform||'');return /iPhone|iPad|iPod/i.test(ua)||/iPad/i.test(platform)||/Mac/i.test(platform)&&Number(nav.maxTouchPoints)>1?'apple':'google';}
  const api={snapshot,encode,decode,preferences,normalizeWhen,ics,googleUrl,summary,recommended};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.DateInvite=api;
})(typeof globalThis==='object'?globalThis:this);
