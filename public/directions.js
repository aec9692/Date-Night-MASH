/* Maps resolves the device origin. MASH never requests or stores GPS coordinates. */
(function(root){
 function url(destination,{origin,waypoints=[]}={}){
  const target=new URL('https://www.google.com/maps/dir/');
  target.search=new URLSearchParams({api:'1',destination,travelmode:'driving',...(origin?{origin}:{}),...(waypoints.length?{waypoints:waypoints.slice(0,3).join('|')}:{})});
  return target.href;
 }
 function to(destination,{town,waypoints=[]}={}){
  const useTown=typeof document!=='undefined'&&document.querySelector('#drive-origin')?.value==='town';
  return url(destination,{origin:useTown?`${town||document.querySelector('#start-town')?.value||'Paterson'}, NJ`:undefined,waypoints});
 }
 const api={url,to};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.DateDirections=api;
})(typeof globalThis==='object'?globalThis:this);
