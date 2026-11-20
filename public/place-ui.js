/* One discovery card per place; individual source-priced examples stay in details. */
window.DatePlaceUI=(()=>{
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,cls,action)=>{const b=node('button',text,cls);b.type='button';b.addEventListener('click',action);return b;};
 function render({options,area,setting,date,deck,query,town,tier,kind,excluded,busy,onToggle,onPreview,onRemove}){
  const container=document.querySelector('#catalog');container.replaceChildren();
  const inArea=options.filter(o=>o.custom||area==='all'||(area==='paterson'?Boolean(o.venue):!o.venue));
  const allGroups=DatePlaces.group(inArea);
  document.querySelector('#catalog-size').textContent=`${allGroups.length} places & ideas in ${area==='paterson'?'the NJ collection':area==='general'?'original ideas':'the full collection'}.`;
  for(const [category,label]of Object.entries({dinner:'Dinner',activity:'Activity',treat:'Treat',entertainment:'Entertainment'})){
   const section=node('section',undefined,`category ${category}`);section.dataset.category=category;section.id='category-'+category;section.hidden=deck!=='all'&&deck!==category;
   const head=node('div',undefined,'category-head'),heading=node('h3',label);heading.id=section.id+'-title';section.setAttribute('aria-labelledby',heading.id);
   const visible=DatePlaces.visible(inArea.filter(o=>o.category===category),{query,town,tier,kind});
   const list=node('ul',undefined,'option-list place-list');list.tabIndex=0;list.setAttribute('aria-label',label+' places and ideas');
   head.append(heading,node('p',`${visible.length} ${visible.length===1?'place':'places / ideas'} shown`));
   if(!visible.length)list.append(node('li','No places match these filters. Try another town or price range.','empty-category'));
   for(const group of visible){
    const item=node('li',undefined,'place-card');item.dataset.venueId=group.venue?.id||group.options[0].id;
    const eligible=group.options.some(o=>MashPlanner.eligible(o,area,date)&&(setting==='any'||o.settings.includes(setting)));
    const included=group.options.filter(o=>!excluded.has(o.id)).length;
    item.append(node('h4',group.venue?.name||group.options[0].name,'place-name'),node('p',DatePlaces.range(group)+(group.venue?' · sample total for two':' · estimated for two'),'place-range'));
    if(group.venue){
     item.append(node('p',group.venue.city+', NJ','place-town'),node('p',group.venue.address,'place-address'),node('p',group.venue.hoursNote,'place-hours'));
     item.append(button('Location & price details','secondary idea-details',event=>onPreview(group,event.currentTarget)));
    }else item.append(node('p',group.options[0].description,'place-address'));
    if(!eligible)item.append(node('p','Check your selected date or setting.','helper'));
    const toggle=button(included===group.options.length?'✓ Included in the mix':included?'Some examples included':'Include this place','option-choice place-toggle',()=>onToggle(group));
    toggle.dataset.id=group.options[0].id;toggle.setAttribute('aria-pressed',included===group.options.length?'true':included?'mixed':'false');toggle.disabled=busy;
    item.append(toggle);
    if(group.options[0].custom)item.append(button('Remove personal idea','text-button remove-custom',()=>onRemove(group.options[0])));
    list.append(item);
   }
   section.append(head,list);container.append(section);
  }
 }
 return {render};
})();
