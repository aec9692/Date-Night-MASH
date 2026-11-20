const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function runtime(){
 const listeners={},stores=new Map(),origin='https://mash.example';let offline=false;
 const key=r=>typeof r==='string'?new URL(r,origin).href:r.url;
 const caches={
  async open(name){if(!stores.has(name))stores.set(name,new Map());const cache=stores.get(name);return {async addAll(paths){for(const path of paths)cache.set(key(path),new Response('cached '+path));},async put(req,res){cache.set(key(req),res);},async match(req){return cache.get(key(req))?.clone();}};},
  async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);},async match(req){for(const cache of stores.values())if(cache.has(key(req)))return cache.get(key(req)).clone();}
 };
 const self={location:{origin},clients:{async claim(){}},addEventListener(name,fn){listeners[name]=fn;}};
 const context=vm.createContext({self,caches,URL,Response,fetch:async req=>{if(offline)throw Error('offline');return new Response('fresh '+key(req));}});
 vm.runInContext(fs.readFileSync('public/sw.js','utf8'),context);
 async function event(name,request){let promise=null;listeners[name]({request,waitUntil(p){promise=p;},respondWith(p){promise=p;}});return promise?await promise:null;}
 return {event,stores,caches,setOffline(v){offline=v;},req:(path,method='GET')=>new Request(origin+path,{method})};
}
test('offline shell serves saved public assets/catalog after install without caching generated plans',async()=>{
 const r=runtime();await r.event('install');r.setOffline(true);
 for(const path of ['/','/app.js','/journey.js','/smart-ui.js','/nearby.js','/count-worker.js','/api/options','/vendor/jspdf.umd.min.js']){
  const response=await r.event('fetch',r.req(path));assert.equal(response.status,200);assert.equal(await response.text(),'cached '+path);
 }
 assert.equal(await r.event('fetch',r.req('/api/generate','POST')),null);
 assert.equal(await r.event('fetch',new Request('https://images.example/photo.jpg')),null);
});
test('service worker refreshes from network and removes only its own old caches',async()=>{
 const r=runtime();await r.event('install');await r.caches.open('mash-shell-old');await r.caches.open('other-app');await r.event('activate');
 assert.ok(!r.stores.has('mash-shell-old'));assert.ok(r.stores.has('other-app'));
 const fresh=await r.event('fetch',r.req('/api/options'));assert.match(await fresh.text(),/^fresh /);
 r.setOffline(true);const cached=await r.event('fetch',r.req('/api/options'));assert.match(await cached.text(),/^fresh /);
});
test('uncached offline catalog produces a readable 503 rather than an invented result',async()=>{
 const r=runtime();r.setOffline(true);const response=await r.event('fetch',r.req('/api/options'));
 assert.equal(response.status,503);assert.match((await response.json()).error,/Connect once/);
});
