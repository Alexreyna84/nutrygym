/* NutriGym Planner: permite abrir la app rápido con señal lenta y sin internet */
const V="nutrigym-v1";
const CORE=["./","index.html","config.js","manifest.webmanifest","icon-192.png","icon-512.png"];
const SDK=["https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js","https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js","https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.concat(SDK).map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
function timeout(ms){return new Promise((_,rej)=>setTimeout(()=>rej(new Error("lento")),ms))}
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  // Archivos de la app: primero internet (para recibir actualizaciones); si no hay o está lento, la copia guardada
  if(url.origin===self.location.origin){
    e.respondWith((async()=>{
      const cache=await caches.open(V);
      const net=fetch(req).then(r=>{if(r&&r.ok)cache.put(req,r.clone());return r});
      try{return await Promise.race([net,timeout(4000)])}
      catch(err){const hit=await cache.match(req,{ignoreSearch:true})||(req.mode==="navigate"?await cache.match("index.html"):null);if(hit){net.catch(()=>{});return hit}return net}
    })());
    return;
  }
  // Librerías de Firebase y fuentes: primero la copia guardada
  if(url.href.startsWith("https://www.gstatic.com/firebasejs/")||url.hostname==="fonts.googleapis.com"||url.hostname==="fonts.gstatic.com"){
    e.respondWith(caches.open(V).then(c=>c.match(req).then(hit=>hit||fetch(req).then(r=>{if(r&&(r.ok||r.type==="opaque"))c.put(req,r.clone());return r}))));
  }
  // Todo lo demás (datos de Firebase) pasa directo
});
