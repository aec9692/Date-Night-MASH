/* Practical preferences, not dietary or access guarantees. No medical information. */
(function(root){
 const equipment=['stove','oven','microwave','blender','fridge','craftTools','phone'];
 const defaults={diet:'any',effort:'any',cooking:'any',equipment:null,accessChecklist:false,verifiedOnly:false};
 function normalize(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!Object.hasOwn(defaults,key)))return null;
  const fit={...defaults,...value};
  if(!['any','vegetarian','vegan','dairyFree','glutenFree'].includes(fit.diet)||!['any','gentle'].includes(fit.effort)||!['any','beginner'].includes(fit.cooking)||typeof fit.accessChecklist!=='boolean'||typeof fit.verifiedOnly!=='boolean')return null;
  if(fit.equipment!==null&&(!Array.isArray(fit.equipment)||fit.equipment.length>equipment.length||new Set(fit.equipment).size!==fit.equipment.length||fit.equipment.some(key=>!equipment.includes(key))))return null;
  return fit;
 }
 function matches(option,fit){
  const journey=typeof module==='object'&&module.exports?require('./journey'):root.MashJourney;
  const food=['dinner','treat'].includes(option.category)||option.home?.ingredients?.length>0;
  if(fit.verifiedOnly&&!option.home&&!(option.venue&&option.pricing?.sourceUrl&&option.pricing?.checkedOn))return false;
  if(fit.diet!=='any'&&food){
   const supported=option.guide?.dietary||[];
   if(!supported.includes(fit.diet)&&!(fit.diet==='vegetarian'&&option.venue&&journey.meta(option).vegetarian))return false;
  }
  if(fit.cooking==='beginner'&&option.home&&food&&option.guide?.difficulty!=='beginner')return false;
  if(fit.equipment!==null&&option.home){
   if(!option.guide)return false;
   if(option.guide.equipment.some(key=>key!=='none'&&!fit.equipment.includes(key)))return false;
   if(option.guide.equipmentAlternatives?.length&&!option.guide.equipmentAlternatives.some(group=>group.every(key=>fit.equipment.includes(key))))return false;
  }
  if(fit.effort==='gentle'&&(journey.meta(option).physical||/just dance|yoga|fitness|exercise|dance competition/i.test(option.name)))return false;
  return true;
 }
 const api={equipment,defaults,normalize,matches};if(typeof module==='object'&&module.exports)module.exports=api;else root.DateFit=api;
})(typeof globalThis==='object'?globalThis:this);
