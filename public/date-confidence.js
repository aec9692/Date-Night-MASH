(function(root){
 function info(option,now=Date.now()){
  if(option.venue&&option.pricing?.sourceUrl){const date=option.pricing.checkedOn,stamp=Date.parse(date+'T00:00:00Z'),days=Math.floor((now-stamp)/86400000);
   return {kind:'source',label:'Source-priced example',detail:`Checked ${date}. ${days>30?'Review due; ':days<0?'Check date needs review; ':''}Reconfirm menu/admission, tax, fees and availability.`,sourceUrl:option.pricing.sourceUrl};
  }
  if(option.custom)return {kind:'personal',label:'Your price estimate',detail:option.place?'Community map details and your estimated cost need confirmation.':'Personal allowance for two; confirm the actual cost.'};
  if(option.home)return {kind:'home',label:'Home shopping estimate',detail:'Additional-spend allowance for two; compare the actual basket and quantities.'};
  return {kind:'general',label:'General planning allowance',detail:'An idea to arrange, with no verified local venue or price.'};
 }
 if(typeof module==='object'&&module.exports)module.exports={info};else root.DateConfidence={info};
})(typeof globalThis==='object'?globalThis:this);
