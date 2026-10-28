/* Gruppe 2.1 – Service Worker: Seite und Bibliotheken für die Nutzung ohne Netz zwischenspeichern.
   Live-Daten (Supabase) werden nie zwischengespeichert. */
const CACHE='g21-app-v2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);
  await self.clients.claim();
})()));
const put=(req,res)=>{if(res&&res.ok&&(res.type==='basic'||res.type==='cors')){const c=res.clone();caches.open(CACHE).then(ca=>ca.put(req,c)).catch(()=>{})}return res};
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(/supabase\.(co|in)$/.test(url.hostname)||url.hostname==='api.github.com')return;
  /* Seite: immer zuerst aus dem Netz (neueste Version), ohne Netz aus dem Speicher */
  if(req.mode==='navigate'||(url.origin===self.location.origin&&/(\/|index\.html)$/.test(url.pathname))){
    e.respondWith(fetch(req).then(r=>put(new Request(url.origin+url.pathname),r)).catch(async()=>
      (await caches.match(url.origin+url.pathname,{ignoreSearch:true}))||(await caches.match(new URL('./',self.registration.scope).href,{ignoreSearch:true}))||Response.error()));
    return;
  }
  /* Bibliotheken (Supabase-JS, Excel, PDF …): aus dem Speicher, im Hintergrund aktualisieren */
  if(url.hostname==='cdn.jsdelivr.net'||url.hostname==='unpkg.com'||url.hostname==='cdnjs.cloudflare.com'||url.origin===self.location.origin){
    e.respondWith(caches.match(req).then(hit=>{const net=fetch(req).then(r=>put(req,r)).catch(()=>hit);return hit||net}));
  }
});

/* Push-Benachrichtigungen (Gruppe 2.1 ab Version 2.8.0) */
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(_){d={title:'Gruppe 2.1',body:e.data?e.data.text():''}}
  const title=d.title||'Gruppe 2.1';
  e.waitUntil(self.registration.showNotification(title,{body:d.body||'',tag:d.tag||undefined,renotify:!!d.tag,
    icon:new URL('icon-192.png',self.registration.scope).href,badge:new URL('icon-192.png',self.registration.scope).href,
    data:{url:d.url||''},lang:'de'}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=new URL(self.registration.scope);const u=String(e.notification.data?.url||'');if(/^#[\w-]*$/.test(u))target.hash=u;
  e.waitUntil((async()=>{
    const wins=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const w of wins){if(w.url.startsWith(self.registration.scope)){try{await w.focus();w.postMessage({type:'g21-open',hash:target.hash});return}catch(_){}}}
    await self.clients.openWindow(target.href);
  })());
});
/* Abo vom Browser erneuert → Seite beim nächsten Öffnen neu anmelden lassen */
self.addEventListener('pushsubscriptionchange',()=>{});
