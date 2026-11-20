/* Shared cents-only estimates. Ownership is explicit; shared supply baskets are bought once. */
(function(root){
  const ownership=['groceries','seasonings','baking','boardGames','videoGames','art','streaming','craft'];
  const sharedKeys=['pantry-oil','pantry-seasonings','baking-basics','pantry-bread','pantry-pasta','pantry-rice'];
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
  function validPantry(value){return Array.isArray(value)&&value.length<=ownership.length&&new Set(value).size===value.length&&value.every(key=>ownership.includes(key));}
  function enrich(option){
    if(option.home||!option.settings.includes('home'))return option;
    const text=(option.name+' '+option.description).toLowerCase();let requiresOwned=[];
    if(!option.costCents){
      if(['dinner','treat'].includes(option.category))requiresOwned=['groceries'];
      else if(/video game|console/.test(text))requiresOwned=['videoGames'];
      else if(/board game|card game/.test(text))requiresOwned=['boardGames'];
      else if(/movie|streaming/.test(text))requiresOwned=['streaming'];
      else if(/craft|art supplies/.test(text))requiresOwned=['craft'];
    }
    return {...option,costBasis:'Original illustrative allowance for two, not a verified store or booking price. Arrange the experience and confirm the full cost.',home:{theme:theme(option),ingredients:[],supplies:['Equipment and household items described in this idea'],instructions:['Check you have the equipment and access described.',option.tip||'Choose the details together before starting.'],costs:option.costCents?[{key:option.id+'-allowance',name:option.name+' allowance for two',cents:option.costCents}]:[],requiresOwned}};
  }
  function available(option,pantry=[]){return (option.home?.requiresOwned||[]).every(key=>pantry.includes(key));}
  function profile(option,pantry=[]){
    if(!option.home)return {exclusive:option.costCents,mask:0,shared:[]};
    let exclusive=0,mask=0;const shared=[];
    for(const line of option.home.costs){
      if(pantry.includes(line.ownedBy))continue;
      const index=sharedKeys.indexOf(line.key);
      if(index===-1)exclusive+=line.cents;
      else {mask|=1<<index;shared[index]=line.cents;}
    }
    return {exclusive,mask,shared};
  }
  function resolve(picks,pantry=[]){
    const bought=new Set(),shopping=new Map();let ownedSavingsCents=0,sharedSavingsCents=0;
    const priced=picks.map(option=>{
      if(!option.home)return {...option};
      const purchases=[];let costCents=0;
      for(const line of option.home.costs){
        if(sharedKeys.includes(line.key)&&bought.has(line.key)){sharedSavingsCents+=line.cents;continue;}
        bought.add(line.key);
        if(pantry.includes(line.ownedBy)){ownedSavingsCents+=line.cents;continue;}
        costCents+=line.cents;purchases.push({...line});
        const existing=shopping.get(line.key);
        if(existing)existing.cents+=line.cents;else shopping.set(line.key,{...line});
      }
      return {...option,baseCostCents:option.costCents,costCents,purchases};
    });
    return {picks:priced,totalCents:priced.reduce((sum,p)=>sum+p.costCents,0),shoppingList:[...shopping.values()],ownedSavingsCents,sharedSavingsCents};
  }
  function theme(option){
    if(option.home?.theme||option.theme)return option.home?.theme||option.theme;
    const text=(option.name+' '+option.description).toLowerCase();
    for(const [pattern,key]of [[/movie|cinema|film night/,'cinema'],[/bowling/,'bowling'],[/arcade/,'arcade'],[/karaoke/,'karaoke'],[/mini.?golf/,'mini-golf'],[/board game/,'board-games'],[/brownie/,'baking-brownie'],[/cookie/,'baking-cookie']])if(pattern.test(text))return key;
    return null;
  }
  function compatible(picks){
    const themes=new Set(),venues=new Set();
    for(const option of picks){const key=theme(option),venue=option.venue?.id||option.place?.sourceUrl;
      if(key&&themes.has(key)||venue&&venues.has(venue))return false;
      if(key)themes.add(key);if(venue)venues.add(venue);
    }
    return true;
  }
  function settingMatches(option,setting){
    if(setting==='any')return true;
    if(setting==='home')return option.settings.includes('home');
    const homeOnly=Boolean(option.home)||option.settings.includes('home')&&!option.custom;
    if(setting==='mixed')return !homeOnly;
    return option.settings.includes(setting)&&!homeOnly;
  }
  function settingLabel(picks,requested='any'){
    if(requested==='mixed')return 'Mixed indoor & outdoor date';
    if(picks.every(p=>p.settings.includes('home')))return 'Night at home';
    if(picks.every(p=>p.settings.includes('indoor')&&!p.settings.includes('home')))return 'Indoor date';
    if(picks.every(p=>p.settings.includes('outdoor')&&!p.settings.includes('home')))return 'Outdoor date';
    return 'Mixed date';
  }
  const api={ownership,sharedKeys,validPantry,enrich,available,profile,resolve,theme,compatible,settingMatches,settingLabel};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.DateCosts=api;
})(typeof globalThis==='object'?globalThis:this);
