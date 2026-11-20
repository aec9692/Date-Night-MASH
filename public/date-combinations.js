/* Exact pair counting: shared baskets and conflicting ideas, without retaining full dates. */
(function(root){
 function prepare(groups,context,includePlans,drawTicket){
  const costs=typeof module==='object'&&module.exports?require('./date-costs'):root.DateCosts;
  const planning=typeof module==='object'&&module.exports?require('./date-planning'):root.DatePlanning;
  const {budgetCents,mood,spending,pantry=[],recent=[],previous=[]}=context;
  const shared=[];
  const details=new Map(groups.flat().map(option=>{
   const p=costs.profile(option,pantry);p.shared.forEach((value,index)=>{if(value!==undefined)shared[index]=value;});
   return [option.id,{option,...p,score:(mood==='surprise'?0:Number(option.moods.includes(mood)))+planning.preferenceScore(option.id,context.taste),tokens:[costs.theme(option),option.venue?'venue:'+option.venue.id:option.place?'venue:'+option.place.sourceUrl:null].filter(Boolean),indoor:Number(costs.settingMatches(option,'indoor')),outdoor:Number(costs.settingMatches(option,'outdoor'))}];
  }));
  const sharedCost=mask=>shared.reduce((sum,value,index)=>sum+((mask&(1<<index))?value:0),0);
  function pairs(first,second){const result=[];for(const a of first)for(const b of second){
   if(!costs.compatible([a,b]))continue;
   const x=details.get(a.id),y=details.get(b.id);
   result.push({picks:[a,b],cost:x.exclusive+y.exclusive,mask:x.mask|y.mask,score:x.score+y.score,tokens:[...x.tokens,...y.tokens],indoor:x.indoor|y.indoor,outdoor:x.outdoor|y.outdoor});
  }return result;}
  const left=pairs(groups[0],groups[1]),right=pairs(groups[2],groups[3]);
  const leftTokens=new Set(left.flatMap(pair=>pair.tokens));
  const rightGroups=new Map();
  for(const pair of right){const tokens=pair.tokens.filter(token=>leftTokens.has(token)).sort();
   const key=JSON.stringify([pair.mask,tokens,pair.indoor,pair.outdoor]);
   if(!rightGroups.has(key))rightGroups.set(key,{mask:pair.mask,tokens,indoor:pair.indoor,outdoor:pair.outdoor,pairs:[]});
   rightGroups.get(key).pairs.push(pair);
  }
  for(const group of rightGroups.values()){
   group.pairs.sort((a,b)=>a.cost-b.cost);group.prefix=[0];
   group.pairs.forEach(pair=>group.prefix.push(group.prefix.at(-1)+pair.score));
  }
  function boundary(pairs,cost,inclusive){let low=0,high=pairs.length;while(low<high){const middle=(low+high)>>>1;
   if(pairs[middle].cost<cost||inclusive&&pairs[middle].cost===cost)low=middle+1;else high=middle;
  }return low;}
  const recentKeys=new Set([...recent,...(previous.length?[previous]:[])].map(ids=>ids.join('|')));
  const repeats=[];
  for(const key of recentKeys){const ids=key.split('|');if(ids.length!==4)continue;
   const picks=ids.map((id,index)=>groups[index].find(option=>option.id===id));
   if(picks.some(p=>!p)||!costs.compatible(picks))continue;
   if(context.setting==='mixed'&&!(picks.some(p=>p.settings.includes('indoor'))&&picks.some(p=>p.settings.includes('outdoor'))))continue;
   const total=costs.resolve(picks,pantry).totalCents;
   if(total<=budgetCents)repeats.push({key,picks,total,score:picks.reduce((sum,p)=>sum+details.get(p.id).score,0)});
  }
  const repeatedByLeft=new Map();for(const repeat of repeats){const key=repeat.picks.slice(0,2).map(p=>p.id).join('|');
   if(!repeatedByLeft.has(key))repeatedByLeft.set(key,[]);repeatedByLeft.get(key).push(repeat);
  }
  let combinationCount=0,maximumCents=0,maximumWithRepeats=0,minimumCents=Infinity;
  function visitBands(callback){for(const pair of left){const repeatsHere=repeatedByLeft.get(pair.picks.map(p=>p.id).join('|'))||[];
   for(const group of rightGroups.values()){
    if(group.tokens.some(token=>pair.tokens.includes(token)))continue;
    if(context.setting==='mixed'&&(!(pair.indoor|group.indoor)||!(pair.outdoor|group.outdoor)))continue;
    const fixed=pair.cost+sharedCost(pair.mask|group.mask),end=boundary(group.pairs,budgetCents-fixed,true);
    minimumCents=Math.min(minimumCents,fixed+group.pairs[0].cost);
    if(end)callback(pair,group,fixed,end,repeatsHere);
   }
  }}
  visitBands((pair,group,fixed,end,repeatsHere)=>{
   combinationCount+=end;maximumWithRepeats=Math.max(maximumWithRepeats,fixed+group.pairs[end-1].cost);
   let index=end-1;while(index>=0&&repeatsHere.some(repeat=>repeat.key===[...pair.picks,...group.pairs[index].picks].map(p=>p.id).join('|')))index--;
   if(index>=0)maximumCents=Math.max(maximumCents,fixed+group.pairs[index].cost);
  });
  if(!combinationCount)return {error:Number.isFinite(minimumCents)?`These choices need at least $${(minimumCents/100).toFixed(2)} for two. Check owned supplies, unlock a pick, or change the setting.`:'No varied four-pick date fits these choices. Unlock a category or include more ideas.',status:422,...(Number.isFinite(minimumCents)?{minimumCents}:{})};
  const omitRecent=combinationCount>repeats.length;
  if(!omitRecent)maximumCents=maximumWithRepeats;
  const targetCents=spending==='treat'?(maximumCents>=Math.ceil(budgetCents*.9)?Math.ceil(budgetCents*.9):Math.ceil(maximumCents*.95)):0;
  const weight=(a,b)=>1+3*(a.score+b.score);
  let weightTotal=0;
  function tickets(pair,group,fixed,end,repeatsHere){const start=boundary(group.pairs,targetCents-fixed,false);
   if(start>=end)return {start,count:0};
   let count=(end-start)*(1+3*pair.score)+3*(group.prefix[end]-group.prefix[start]);
   if(omitRecent)for(const repeat of repeatsHere)if(repeat.total>=targetCents&&group.pairs.some(p=>p.picks[0].id===repeat.picks[2].id&&p.picks[1].id===repeat.picks[3].id))count-=1+3*repeat.score;
   return {start,count};
  }
  visitBands((pair,group,fixed,end,repeatsHere)=>{weightTotal+=tickets(pair,group,fixed,end,repeatsHere).count;});
  let ticket=drawTicket?drawTicket(weightTotal):0,selectedPicks=null;const plans=[];
  visitBands((pair,group,fixed,end,repeatsHere)=>{
   if(selectedPicks)return;
   const band=tickets(pair,group,fixed,end,repeatsHere);if(drawTicket&&ticket>=band.count){ticket-=band.count;return;}
   if(!drawTicket&&!includePlans)return;
   for(let index=band.start;index<end;index++){
    const candidate=[...pair.picks,...group.pairs[index].picks];
    if(omitRecent&&recentKeys.has(candidate.map(p=>p.id).join('|')))continue;
    if(drawTicket){ticket-=weight(pair,group.pairs[index]);if(ticket<0){selectedPicks=costs.resolve(candidate,pantry).picks;return;}}
    else plans.push(costs.resolve(candidate,pantry).picks);
   }
  });
  return {...context,plans,selectedPicks,combinationCount,maximumCents,targetCents,unchanged:previous.length===4&&combinationCount===1&&repeats.some(repeat=>repeat.key===previous.join('|')),recentExhausted:!omitRecent&&repeats.length>0};
 }
 if(typeof module==='object'&&module.exports)module.exports={prepare};else root.DateCombinations={prepare};
})(typeof globalThis==='object'?globalThis:this);
