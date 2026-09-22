/* سرویس‌ورکر: بازی کاملاً آفلاین اجرا می‌شود */
const CACHE = 'bc-v5';
const ASSETS = ['./', './index.html', './css/style.css', './privacy-policy.html',
  './js/data.js', './js/engine.js', './js/mapview.js', './js/audio.js',
  './js/cloud.js', './js/ui.js', './js/main.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-192-maskable.png', './icons/icon-512-maskable.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const url=new URL(e.request.url);
  if(url.origin===location.origin){
    e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request).then(res=>{
      const cp=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return res;
    }).catch(()=>caches.match('./index.html'))));
  } else {
    // منابع خارجی (فونت): کش با به‌روزرسانی پس‌زمینه
    e.respondWith(caches.match(e.request).then(r=>{
      const net=fetch(e.request).then(res=>{ const cp=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return res; }).catch(()=>r);
      return r || net;
    }));
  }
});
