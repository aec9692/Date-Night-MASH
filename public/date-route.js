/* Approximate geography only: town centers/map pins, never traffic or drive times. */
(function(root){
 let towns={};
 function setTowns(data){towns=data?.towns||data||{};}
 function miles(a,b){if(!a||!b)return null;const rad=n=>n*Math.PI/180,dlat=rad(b[0]-a[0]),dlon=rad(b[1]-a[1]);return 3958.8*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dlon/2)**2)));}
 function point(o){return o.place?[o.place.lat,o.place.lon]:o.venue?towns[o.venue.city]||null:null;}
 function origin(plan){return plan.location?[plan.location.lat,plan.location.lon]:towns[plan.mash?.origin||plan.journey?.origin]||null;}
 const close=d=>d===null?0:d<=3?3:d<=7?2:d<=15?1:0;
 function nearScore(o,context){return context.setting==='home'?0:close(miles(origin(context),point(o)));}
 function pairScore(a,b,context){return !context.mash||context.setting==='home'?0:close(miles(point(a),point(b)));}
 function length(picks,start){let from=start,total=0,unknown=0,legs=[];for(const o of picks){const to=point(o),d=miles(from,to);if(d===null){unknown++;legs.push({id:o.id,miles:null});}else{total+=d;legs.push({id:o.id,miles:Math.round(d*10)/10});}from=to;}return {total,unknown,legs};}
 function permutations(items){if(items.length<2)return [items];return items.flatMap((o,i)=>permutations(items.filter((_,j)=>i!==j)).map(rest=>[o,...rest]));}
 function analyze(plan){
  const picks=plan.journey?plan.journey.order.map(c=>plan.picks.find(o=>o.category===c)):plan.picks;
  if(picks.every(o=>o.home||o.settings?.includes('home'))&&!picks.some(point))return {order:picks.map(o=>o.category),legs:[],unknown:0,totalMiles:0,savedMiles:0,backtracking:false,home:true,notice:'At-home plan: no travel route needed.'};
  const start=origin(plan),original=length(picks,start);let best=picks,bestDistance=original.total;
  // Keep dinner first. Untimed MASH can reorder the remaining stops; timed Scene retains its validated order.
  if(!original.unknown&&!plan.journey)for(const rest of permutations(picks.slice(1))){const candidate=[picks[0],...rest],distance=length(candidate,start).total;if(distance<bestDistance-.01){best=candidate;bestDistance=distance;}}
  const selected=length(best,start),saved=original.total-bestDistance;
  let reversal=false;
  for(let i=0;i<picks.length-2;i++){const a=point(picks[i]),b=point(picks[i+1]),c=point(picks[i+2]);if(a&&b&&c&&miles(a,b)+miles(b,c)-miles(a,c)>5)reversal=true;}
  return {order:best.map(o=>o.category),legs:selected.legs,unknown:selected.unknown,totalMiles:Math.round(selected.total*10)/10,savedMiles:Math.round(saved*10)/10,backtracking:saved>=5||reversal,home:false,notice:'Approximate straight-line legs use town centers or recorded map pins. These are not driving distances or live travel times. Return travel is excluded. Confirm the route and opening times in Maps.'};
 }
 function explain(pick,plan,taste={liked:[]}){
  const reasons=[],d=miles(origin(plan),point(pick));
  if(d!==null)reasons.push(`About ${d.toFixed(1)} straight-line miles from your planning area`);
  if(taste.liked?.includes(pick.id))reasons.push('Matches your past positive ratings');
  if(plan.mood&&plan.mood!=='surprise'&&pick.moods?.includes(plan.mood))reasons.push(`Matches the ${plan.mood} vibe`);
  if(plan.date)reasons.push('Passes recorded date restrictions; confirm live availability');
  if(pick.home)reasons.push('Uses your selected at-home supplies and preferences');
  if(!reasons.length)reasons.push('Fits your selected preferences and budget');
  return reasons;
 }
 const api={setTowns,miles,point,origin,nearScore,pairScore,analyze,explain};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.DateRoute=api;
})(typeof globalThis==='object'?globalThis:this);
