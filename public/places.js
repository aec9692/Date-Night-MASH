/* Venue-level discovery, with source-priced examples retained for budget math. */
(function(root){
 const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
 function group(options){
  const groups=new Map();
  for(const option of options){
   const key=option.category+'|'+(option.venue?.id||option.id);
   if(!groups.has(key))groups.set(key,{key,category:option.category,venue:option.venue,options:[]});
   groups.get(key).options.push(option);
  }
  return [...groups.values()].map(g=>({...g,min:Math.min(...g.options.map(o=>o.costCents)),max:Math.max(...g.options.map(o=>o.costCents))}));
 }
 function priceMatches(cost,tier='all',kind='all',admission=cost){
  if(kind==='paid'&&admission===0||kind==='free'&&admission!==0)return false;
  return tier==='all'||tier==='free'&&cost===0||tier==='under15'&&cost<1500||tier==='under30'&&cost<3000||tier==='low'&&cost<5000||tier==='mid'&&cost>=5000&&cost<=20000||tier==='high'&&cost>20000;
 }
 function visible(options,{query='',town='all',tier='all',kind='all'}={}){
  query=query.trim().toLowerCase();
  return group(options).filter(g=>(town==='all'||g.venue?.city===town)&&
   g.options.some(o=>`${g.venue?.name||''} ${o.name} ${o.description} ${g.venue?.city||''}`.toLowerCase().includes(query))&&
   g.options.some(o=>priceMatches(o.costCents,tier,kind,o.pricing?.baseCents??o.costCents))).sort((a,b)=>{
    // Paid outings lead the discovery lists; free choices remain one filter away.
    const paid=g=>g.options.some(o=>(o.pricing?.baseCents??o.costCents)>0);
    const paidFirst=['activity','entertainment'].includes(a.category)&&kind==='all'?(Number(!paid(a))-Number(!paid(b))):0;
    return paidFirst||(a.venue?.name||a.options[0].name).localeCompare(b.venue?.name||b.options[0].name);
   });
 }
 function range(g){return g.min===g.max?money(g.min):`${money(g.min)}–${money(g.max)}`;}
 function title(option){return option.venue&&['dinner','treat'].includes(option.category)?option.venue.name:option.name;}
 const api={group,visible,priceMatches,range,title};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.DatePlaces=api;
})(typeof globalThis==='object'?globalThis:this);
