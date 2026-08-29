const CACHE='nexo-voice-shell-v1';
const SHELL=['/test.html','/manifest.json'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys()){if(key!==CACHE) await caches.delete(key)}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(event.request,{cache:'no-store'});
      const cache=await caches.open(CACHE);
      cache.put(event.request,fresh.clone()).catch(()=>{});
      return fresh;
    }catch{
      return (await caches.match(event.request)) || Response.error();
    }
  })());
});
