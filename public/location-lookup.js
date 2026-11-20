/* Local NJ suggestions use recorded ZIP associations and municipality centers, not street/GPS data. */
(function(root){
 const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 function find(query,locations=[],{prefix=false}={}){
  if(typeof query!=='string'||!Array.isArray(locations))return [];
  const text=query.trim().replace(/\s+/g,' ');
  if(text.length<2||text.length>80||!(/^\d{5}$/.test(text)||/^[\p{L}\p{M} .,'’\-]+$/u.test(text)))return [];
  const zip=/^\d{5}$/.test(text);let term=normalize(text);
  if(!zip){term=normalize(text.replace(/[,\s]+(?:united states|usa|us)$/i,'')).replace(/(?:newjersey|nj)$/,'').replace(/^(?:cityof|townshipof|boroughof)/,'').replace(/(?:township|borough)$/,'');}
  if(!term)return [];
  const aliases=entry=>{const name=normalize(entry.name).replace(/(?:township|borough)$/,'');return [name,...(name==='parsippany'?['parsippanytroyhills']:[])];};
  const valid=locations.filter(entry=>typeof entry.name==='string'&&Number.isFinite(entry.lat)&&Math.abs(entry.lat)<=90&&Number.isFinite(entry.lon)&&Math.abs(entry.lon)<=180);
  let matches=valid.filter(entry=>zip?entry.postcodes?.includes(text):aliases(entry).includes(term));
  if(prefix&&!matches.length&&!zip&&term.length>=3)matches=valid.filter(entry=>aliases(entry).some(name=>name.startsWith(term)));
  return matches.slice(0,12).map(entry=>({id:'nj-'+normalize(entry.name),town:entry.name,label:`${entry.name}, New Jersey${zip?' · ZIP '+text:''} · town center`,lat:entry.lat,lon:entry.lon,local:true}));
 }
 const api={find};if(typeof module==='object'&&module.exports)module.exports=api;else root.LocationLookup=api;
})(typeof globalThis==='object'?globalThis:this);
