/* One discovery card per place; individual source-priced examples stay in details. */
window.DatePlaceUI=(()=>{
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,cls,action)=>{const b=node('button',text,cls);b.type='button';b.addEventListener('click',action);return b;};
 let filterKey='',shown=new Map();
 function render({options,area,setting,date,deck,query,town,tier,kind,excluded,busy,onToggle,onPreview,onRemove,onLock}){
  const args=arguments[0],nextKey=JSON.stringify([area,setting,date,query,town,tier,kind,options.map(o=>o.id)]);
  if(nextKey!==filterKey){shown=new Map();filterKey=nextKey;}
  const container=document.querySelector('#catalog'),positions=new Map([...container.querySelectorAll('.category')].map(section=>[section.dataset.category,section.querySelector('ul')?.scrollTop||0]));container.replaceChildren();
  const inArea=options.filter(o=>o.custom||area==='all'||(area==='paterson'?Boolean(o.venue):!o.venue));
  const allGroups=DatePlaces.group(inArea);
  document.querySelector('#catalog-size').textContent=`${allGroups.length} places & ideas in ${area==='paterson'?'the NJ collection':area==='general'?'original ideas':'the full collection'}.`;
  for(const [category,label]of Object.entries({dinner:'Dinner',activity:'Activity',treat:'Treat',entertainment:'Entertainment'})){
   const section=node('section',undefined,`category ${category}`);section.dataset.category=category;section.id='category-'+category;section.hidden=deck!=='all'&&deck!==category;
   const head=node('div',undefined,'category-head'),heading=node('h3',label);heading.id=section.id+'-title';section.setAttribute('aria-labelledby',heading.id);
   const visible=DatePlaces.visible(inArea.filter(o=>o.category===category),{query,town,tier,kind}).sort((a,b)=>Number(Boolean(b.options[0].custom))-Number(Boolean(a.options[0].custom)));
   const limit=shown.get(category)||12;
   const list=node('ul',undefined,'option-list place-list');list.tabIndex=0;list.setAttribute('aria-label',label+' places and ideas');
   head.append(heading,node('p',`${Math.min(limit,visible.length)} of ${visible.length} places / ideas shown`));
   if(!visible.length)list.append(node('li','No places match these filters. Try another town or price range.','empty-category'));
   for(const group of visible.slice(0,limit)){
    const item=node('li',undefined,'place-card');item.dataset.venueId=group.venue?.id||group.options[0].id;
    const eligible=group.options.some(o=>MashPlanner.eligible(o,area,date)&&DateCosts.settingMatches(o,setting));
    const included=group.options.filter(o=>!excluded.has(o.id)).length;
    item.append(node('h4',group.venue?.name||group.options[0].name,'place-name'),node('p',DatePlaces.range(group)+(group.venue?' · sample total for two':' · estimated for two'),'place-range'));
    const confidence=DateConfidence.info(group.options[0]);item.append(node('span',confidence.label,'confidence-badge '+confidence.kind));
    if(group.venue)item.append(node('p',confidence.detail,'helper'));
    if(group.venue){
     item.append(node('p',group.venue.city+', NJ','place-town'),node('p',group.venue.address,'place-address'),node('p',group.venue.hoursNote,'place-hours'));
     item.append(button('Location & price details','secondary idea-details',event=>onPreview(group,event.currentTarget)));
    }else {
     const option=group.options[0];item.append(node('p',option.description,'place-address'));
     if(option.home||option.instructions?.length)item.append(DateExtras.homeDetails(option));
    }
    if(!eligible)item.append(node('p','Check your selected date or setting.','helper'));
    const toggle=button(included===group.options.length?'✓ Included in the mix':included?'Some examples included':'Include this place','option-choice place-toggle',()=>onToggle(group));
    toggle.dataset.id=group.options[0].id;toggle.setAttribute('aria-pressed',included===group.options.length?'true':included?'mixed':'false');toggle.disabled=busy;
    item.append(toggle);
    if(group.options[0].custom){item.append(button('Keep this personal idea','secondary',()=>onLock?.(group.options[0])));item.append(button('Remove personal idea','text-button remove-custom',()=>onRemove(group.options[0])));}
    list.append(item);
   }
   section.append(head,list);
   if(limit<visible.length){const more=button(`Show more ${label.toLowerCase()} ideas`,'secondary show-more',()=>{shown.set(category,limit+12);render({...args,deck:container.dataset.deck||args.deck});document.querySelector(`[data-show-more="${category}"]`)?.focus({preventScroll:true});});more.dataset.showMore=category;more.disabled=busy;section.append(more);}
   container.append(section);list.scrollTop=positions.get(category)||0;
  }
 }
 return {render};
})();
