/* Cache only this app's public assets and read-only catalog. Never cache generated requests. */
const CACHE='mash-shell-v2';
const ASSETS=['/','/styles.css','/planner.js','/journey.js','/smart-ui.js','/nearby.js','/count-worker.js','/show.js','/companion.js','/download.js','/app.js','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/icon.svg','/vendor/jspdf.umd.min.js','/api/options'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mash-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!ASSETS.includes(url.pathname))return;
 event.respondWith(fetch(event.request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;}).catch(async()=>await caches.match(event.request)||(url.pathname==='/api/options'?new Response(JSON.stringify({error:'No offline catalog yet. Connect once to save the app.'}),{status:503,headers:{'Content-Type':'application/json'}}):Response.error())));
});
