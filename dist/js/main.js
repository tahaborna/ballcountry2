/* ===== راه‌اندازی بازی ===== */
Engine.toast = (m,k)=>UI.toast(m,k); // برای رویدادهای data.js

function boot(){
  Engine.load();
  Engine.seasonInfo(); // تشخیص شروع فصل جدید (تقویم واقعی)
  Cloud.init();        // ثبت آداپتورهای ذخیره ابری
  Sfx.init();
  // صدای کلیک برای همه دکمه‌ها (صفحه‌ها و مودال‌ها)
  document.addEventListener('click', e=>{ if(e.target.closest('button,.navbtn,.tab,.chest')) Sfx.play('click'); }, true);
  UI.show('menu');
  setInterval(()=>{ try{ Engine.tick(); }catch(e){ console.warn('tick', e); } }, 1000);
  setInterval(()=>Engine.save(), 15000); // ذخیره خودکار
  setInterval(()=>{ Cloud.maybeSync(); }, 30000); // همگام‌سازی خودکار ابری (در صورت ورود)
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ Engine.save(); Cloud.upload(true).catch(()=>{}); } // سرخوردن آخرین وضعیت هنگام خروج
  });
  // نصب‌شدن به‌عنوان اپ اندروید (PWA) — فقط روی وب/HTTPS، نه داخل Capacitor
  if('serviceWorker' in navigator && !window.Capacitor && location.protocol.startsWith('http')){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  // دیپ‌لینک از شورت‌کات‌های PWA و بسته PWABuilder — «.../#/map» یا «.../?open=daily»
  const params=new URLSearchParams(location.search);
  const seg=(location.hash||'').replace(/^#\/?/,'').trim();
  const target=params.get('open')||seg;
  if(target) setTimeout(()=>{ try{ UI.openLink(decodeURIComponent(target)); }catch(e){ console.warn('deeplink', e); } }, 450);

  window.addEventListener('beforeunload', ()=>Engine.save());
  window.addEventListener('blur', ()=>Engine.save());
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
