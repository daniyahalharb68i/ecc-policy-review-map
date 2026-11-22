// ECC Policy Review Map — offline support. Caches the app and its libraries so it opens without internet.
// Nothing the user enters passes through here: assessment data lives in the browser storage, not in this cache.
const CACHE="ecc-map-v1";
const CORE=["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
const LIBS=[
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(async c=>{
  await c.addAll(CORE).catch(()=>{});
  await Promise.all(LIBS.map(u=>fetch(u,{mode:"cors"}).then(r=>{if(r.ok)return c.put(u,r)}).catch(()=>{})))}).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  if(/goatcounter\.com$|(^|\.)zgo\.at$/.test(u.hostname))return; // visit counting: never cached
  if(r.mode==="navigate"){ // the app page: newest from the network, the cached copy when offline
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put("./index.html",cp));return res}).catch(()=>caches.match("./index.html").then(m=>m||caches.match("./"))));return}
  const ok=u.origin===self.location.origin||/^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname);if(!ok)return;
  e.respondWith(caches.match(r).then(hit=>{const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==="opaque")){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res}).catch(()=>hit);return hit||net}))});
