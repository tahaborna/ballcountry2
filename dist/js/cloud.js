/* ===== ذخیره ابری با حساب کاربری ساده =====
   معماری: Cloud (احراز هویت + پاکت‌بندی) → آداپتور (local | http) → ذخیره‌گاه.
   پاکت ابری همان «کد پشتیبان» بازی است (Engine.export)؛ پس با سیستم پشتیبان‌گیری
   دستی تنظیمات کاملاً سازگار است و هر دو یک قالب دارند. */
const Cloud = {
  _adapters:{}, _mem:{ lastUpload:0, lastError:null, dirty:false },

  /* ---------- ابزار ---------- */
  async _secret(user, pass){
    const text=user+'::'+pass;
    try{
      if(window.crypto && crypto.subtle){
        const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
      }
    }catch(e){}
    // جایگزین ساده برای محیط‌های بدون WebCrypto
    let h1=0x811c9dc5, h2=0x1000193;
    for(let i=0;i<text.length;i++){ h1=(h1^text.charCodeAt(i))*16777619>>>0; h2=(h2+text.charCodeAt(i)*31)>>>0; }
    return 'fnv'+h1.toString(16)+h2.toString(16);
  },

  adapter(){ const name=(Engine.S.meta.account && Engine.S.meta.account.adapter)||'local'; return this._adapters[name]||this._adapters.local; },
  loggedIn(){ return !!(Engine.S.meta.account && Engine.S.meta.account.user); },

  _envelope(){
    return { app:'ball-countries', v:1, savedAt:Date.now(), snapshot: Engine.export() };
  },
  /* خلاصه نسخه برای نمایش در تعارض */
  summarize(env){
    try{
      const j=JSON.parse(decodeURIComponent(escape(atob(env.snapshot))));
      return { level:(j.meta&&j.meta.level)||1, coins:(j.meta&&j.meta.coins)||0,
        territory: j.runs ? Object.values(j.runs).reduce((a,r)=>a+((r&&r.territories)||[]).length,0) : 0,
        savedAt: env.savedAt };
    }catch(e){ return null; }
  },
  timeAgo(ts){
    if(!ts) return 'هرگز';
    const d=Date.now()-ts;
    if(d<60000) return 'لحظاتی پیش';
    if(d<3600000) return fa(Math.floor(d/60000))+' دقیقه پیش';
    if(d<86400000) return fa(Math.floor(d/3600000))+' ساعت پیش';
    return fa(Math.floor(d/86400000))+' روز پیش';
  },

  /* ---------- همگام‌سازی فرّار: مقایسه محتوای واقعی، بدون فیلدهای متغیر ---------- */
  _coreState(){
    try{
      const j=JSON.parse(decodeURIComponent(escape(atob(Engine.export()))));
      if(j.meta){ delete j.meta.lastSaveAt; delete j.meta.account; }
      return JSON.stringify(j);
    }catch(e){ return null; }
  },

  /* ---------- احراز هویت ---------- */
  async register(user, pass){
    user=(user||'').trim();
    if(user.length<3) throw new Error('نام کاربری باید حداقل ۳ نویسه باشد');
    if(pass.length<4) throw new Error('رمز عبور باید حداقل ۴ نویسه باشد');
    const secret=await this._secret(user, pass);
    await this.adapter().register(user, secret);
    this._loginSession(user);
    return true;
  },
  async login(user, pass){
    user=(user||'').trim();
    const secret=await this._secret(user, pass);
    await this.adapter().login(user, secret);
    this._loginSession(user);
    return true;
  },
  _loginSession(user){
    const acc=Engine.S.meta.account;
    acc.user=user; acc.lastSync=null; this._mem.dirty=false; this._mem.lastError=null;
    Engine.save();
  },
  logout(){
    Engine.S.meta.account.user=null;
    this._mem.dirty=false;
    Engine.save();
  },

  /* ---------- همگام‌سازی ---------- */
  async upload(force){
    if(!this.loggedIn()) throw new Error('وارد حساب نشده‌ای');
    const now=Date.now();
    if(!force && now-this._mem.lastUpload<120000) return false; // محدودسازی ۲ دقیقه‌ای
    const env=this._envelope();
    this._mem.syncing=true; // ذخیره‌های داخل آپلود نباید دوباره «تغییر未经زه‌رسانده» بسازند
    try{
      await this.adapter().upload(Engine.S.meta.account.user, env);
      Engine.S.meta.account.lastSync=Date.now();
      this._mem.lastUpload=now; this._mem.dirty=false; this._mem.lastError=null;
      Engine.save();
    } finally { this._mem.syncing=false; }
    return true;
  },
  async download(){
    if(!this.loggedIn()) throw new Error('وارد حساب نشده‌ای');
    return await this.adapter().download(Engine.S.meta.account.user);
  },
  /* فراخوانی دوره‌ای: اگر تغییر هم‌گام‌نشده وجود دارد، بی‌سروصدا می‌فرستد */
  async maybeSync(){
    if(!this.loggedIn() || !Engine.S.meta.account.autoSync || !this._mem.dirty) return;
    try{ await this.upload(false); }
    catch(e){ this._mem.lastError=e.message||String(e); }
  },
  markDirty(){
    if(this._mem.syncing) return;
    if(this.loggedIn() && Engine.S.meta.account.autoSync) this._mem.dirty=true;
  },

  /* ---------- راه‌اندازی و آداپتورها ---------- */
  registerAdapter(name, impl){ this._adapters[name]=impl; },
  init(){
    /* آداپتور محلی: شبیه‌ساز کامل سرور روی همین دستگاه (چندحسابی) */
    this.registerAdapter('local', {
      name:'دستگاه (شبیه‌ساز ابری)',
      _db(){ try{ return JSON.parse(localStorage.getItem('bcCloud.db')||'{"accts":{},"data":{}}'); }catch(e){ return {accts:{},data:{}}; } },
      _save(db){ try{ localStorage.setItem('bcCloud.db', JSON.stringify(db)); }catch(e){} },
      async register(user, secret){
        const db=this._db();
        if(db.accts[user]) throw new Error('این نام کاربری از قبل ثبت شده است');
        db.accts[user]={secret, createdAt:Date.now()}; this._save(db); return {ok:true};
      },
      async login(user, secret){
        const db=this._db(); const a=db.accts[user];
        if(!a) throw new Error('حسابی با این نام یافت نشد');
        if(a.secret!==secret) throw new Error('رمز عبور نادرست است');
        return {ok:true};
      },
      async upload(user, envelope){ const db=this._db(); db.data[user]=envelope; this._save(db); return {ok:true}; },
      async download(user){ const db=this._db(); const e=db.data[user]; if(!e) throw new Error('هنوز نسخه‌ای در ابری ذخیره نشده'); return e; },
    });
    /* آداپتور HTTP: هر بک‌اند کوچکی با قرارداد /register /login /save /load */
    this.registerAdapter('http', {
      name:'سرور ابری (HTTP)',
      async _post(path, body){
        const base=(Engine.S.meta.account.endpoint||'').replace(/\/+$/,'');
        if(!base) throw new Error('آدرس سرور تنظیم نشده است');
        const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(), 8000);
        try{
          const res=await fetch(base+path, {method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify(body), signal:ctrl.signal});
          let j={}; try{ j=await res.json(); }catch(e){}
          if(!res.ok || j.ok===false) throw new Error(j.error || ('خطای سرور ('+fa(res.status)+')'));
          return j;
        }catch(e){
          if(e.name==='AbortError') throw new Error('پاسخی از سرور دریافت نشد (اتمام زمان)');
          throw new Error('اتصال به سرور برقرار نشد — آدرس یا اتصال را بررسی کن');
        } finally { clearTimeout(t); }
      },
      async register(user, secret){ return this._post('/register', {user, hash:secret}); },
      async login(user, secret){ return this._post('/login', {user, hash:secret}); },
      async upload(user, envelope){ return this._post('/save', {user, envelope}); },
      async download(user){ const j=await this._post('/load', {user}); if(!j.envelope) throw new Error('هنوز نسخه‌ای در ابری ذخیره نشده'); return j.envelope; },
    });
  },
};
