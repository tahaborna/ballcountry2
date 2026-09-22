/* ===== هسته بازی «کشورهای توپی» ===== */
const SAVE_KEY = 'ballCountries.save.v1';

const RES_META = {
  coins:{n:'سکه', ic:'🪙'}, food:{n:'غذا', ic:'🌾'}, energy:{n:'انرژی', ic:'⚡'},
  metal:{n:'فلز', ic:'⚙️'}, wood:{n:'چوب', ic:'🪵'}, tech:{n:'فناوری', ic:'🔬'}, manpower:{n:'نیروی انسانی', ic:'🧑‍🤝‍🧑'},
};
const TAXES = {low:{n:'مالیات سبک', coin:0.8, sat:6}, med:{n:'مالیات متعادل', coin:1, sat:0}, high:{n:'مالیات سنگین', coin:1.3, sat:-10}};

/* ---------- کمکی‌های سراسری ---------- */
function cityLvlOf(S, bkey){ const r=S; let s=0; (r.cities||[]).forEach(c=> s += (c.b[bkey]||0)); return s; }
function hasBuilding(S, bkey){ return (S.cities||[]).some(c=> (c.b[bkey]||0) > 0); }
function bumpAllRel(run, d){ const rel=run.relations; for(const k in rel){ rel[k]=clamp(rel[k]+d,-100,100); } }
function pickOther(run){ const ids=listOthers(); return ids.length? ids[Math.floor(Math.random()*ids.length)] : null; }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function rnd(a,b){ return a + Math.random()*(b-a); }
function ri(a,b){ return Math.floor(rnd(a,b+1)); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dayDiff(s1,s2){ if(!s1||!s2) return 999; const t=new Date(s1+'T12:00:00'), u=new Date(s2+'T12:00:00'); return Math.round((u-t)/86400000); }
function listOthers(){
  const r=Engine.R(); if(!r) return [];
  return countriesOf(Engine.S.scenario).filter(c=> c.id!==r.countryId && !r.annexed.includes(c.id)).map(c=>c.id);
}
function unlockedIds(){ const m=Engine.S.meta; return COUNTRIES.filter(c=> c.cities.length>0 && (m.level>=c.lv || m.unlocked.includes(c.id) || fragCount(c.id)>=5)).map(c=>c.id); }
function fragCount(id){ return Engine.S.meta.fragments[id]||0; }

/* ---------- موتور ---------- */
const Engine = {
  S: null,

  /* --- بارگذاری/ذخیره --- */
  defaultState(){
    return {
      v:1,
      meta:{
        level:1, xp:0, coins:1500, tickets:0,
        fragments:{}, unlocked:[], skins:['default'], skin:'default',
        daily:{last:null, streak:0},
        chestMeter:0, cycle:null, pendingSpecial:null,
        sound:true, music:true, season:null, positions:{}, custom:[], achievements:{},
        account:{user:null, adapter:'local', endpoint:'', autoSync:true, lastSync:null},
        tutorial:false, editor:false, seenScenarios:{modern:true},
      },
      scenario:'modern',
      runs:{ modern:null, empires:null },
    };
  },
  load(){
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      this.S = raw ? this.merge(this.defaultState(), JSON.parse(raw)) : this.defaultState();
    }catch(e){ console.warn('load failed', e); this.S=this.defaultState(); }
  },
  merge(base, saved){
    const out = base;
    for(const k in saved){ if(saved[k]===null) continue;
      if(typeof saved[k]==='object' && !Array.isArray(saved[k]) && typeof base[k]==='object' && !Array.isArray(base[k])) out[k]=this.merge(base[k]||{}, saved[k]);
      else out[k]=saved[k];
    }
    return out;
  },
  save(){
    try{
      this.S.meta.lastSaveAt=Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.S));
      if(typeof Cloud!=='undefined') Cloud.markDirty(); // برای همگام‌سازی خودکار ابری
    }catch(e){}
  },
  reset(){ localStorage.removeItem(SAVE_KEY); this.S=this.defaultState(); },
  export(){ return btoa(unescape(encodeURIComponent(JSON.stringify(this.S)))); },
  import(str){
    const prevAcc=this.S.meta && this.S.meta.account;
    const j=JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    this.S=this.merge(this.defaultState(), j);
    // نشست حساب ابری حفظ می‌شود (نام کاربری/آداپتور/سرور) و فقط زمان همگام‌سازی صفر می‌شود
    if(prevAcc && this.S.meta.account){
      this.S.meta.account={...this.S.meta.account, user:prevAcc.user, adapter:prevAcc.adapter,
        endpoint:prevAcc.endpoint, autoSync:prevAcc.autoSync, lastSync:null};
    }
    this.save();
  },

  /* --- وضعیت جاری --- */
  R(){ return this.S.runs[this.S.scenario]; },
  meta(){ return this.S.meta; },

  /* --- شروع بازی جدید برای سناریو --- */
  newRun(countryId){
    const c = countryById(countryId);
    const cities = [{id:'c0', name:c.cap, cap:true, lvl:1, b:{market:1}}];
    c.cities.forEach((n,i)=> cities.push({id:'c'+(i+1), name:n, cap:false, lvl:1, b:{}}));
    const run = {
      countryId, cities,
      res:{food:200, energy:120, metal:100, wood:100, tech:0, manpower:500},
      army:{infantry:15, recon:5, engineers:0, armor:0, navy:0, air:0},
      sat:70, tax:'med',
      relations:{}, allies:[], trade:[], wars:[], sanctions:[], agreedPeace:[],
      territories:[], annexed:[], credibility:0,
      missionIdx:0,
      stats:{built:0, chests:0, wins:0, battles:0, gifts:0, bought:0, capTaken:0},
    };
    // روابط اولیه
    countriesOf(this.S.scenario).forEach(o=>{
      if(o.id===countryId) return;
      const a=countryId, b=o.id;
      let rel = (REL0[a+'|'+b] !== undefined) ? REL0[a+'|'+b] : (REL0[b+'|'+a] !== undefined ? REL0[b+'|'+a] : 0);
      run.relations[b]=clamp(rel,-100,100);
    });
    this.S.runs[this.S.scenario]=run;
    this.save();
    return run;
  },

  /* --- سکه/تجربه/سطح --- */
  addCoins(n){ this.S.meta.coins = Math.max(0, Math.round(this.S.meta.coins+n)); },
  xpForNext(lv){ return 150 + (lv-1)*130; },
  addXP(n){
    const m=this.S.meta; m.xp+=Math.round(n);
    let leveled=false;
    while(m.xp >= this.xpForNext(m.level)){ m.xp -= this.xpForNext(m.level); m.level++; leveled=true; }
    if(leveled){ UI.toast('🎉 سطح جدید! به سطح '+fa(m.level)+' رسیدی — کشورها و امکان‌های تازه باز شد','gold'); Sfx.play('levelup'); this.save(); }
  },

  /* --- هزینه‌ها --- */
  canPay(cost){ const m=this.S.meta, r=this.R(); if(!r) return false;
    if((cost.coins||0) > m.coins) return false;
    for(const k in cost){ if(k!=='coins' && (cost[k]||0) > r.res[k]) return false; }
    return true;
  },
  pay(cost){ if(!this.canPay(cost)) return false; const r=this.R();
    this.addCoins(-(cost.coins||0));
    for(const k in cost){ if(k!=='coins') r.res[k]-=cost[k]; }
    return true;
  },
  buildCost(key, lvl){
    const b=BUILDINGS[key]; const r=this.R();
    const civil=1 - 0.1*((r&&r.techLv&&r.techLv.civil)||0);
    return Math.round(b.base * Math.pow(1.6, lvl) * civil);
  },
  buildingIncome(key, lvl){ // به ازای هر ثانیه
    const b=BUILDINGS[key]; if(!b.out) return 0;
    return lvl*b.out;
  },

  /* --- ساخت و ارتقا --- */
  build(cityId, key){
    const r=this.R(); const city=r.cities.find(c=>c.id===cityId); if(!city) return false;
    const lvl=city.b[key]||0;
    const slots=CITY_SLOTS(city.cap);
    const used=Object.keys(city.b).filter(k=>city.b[k]>0).length;
    if(lvl===0 && used>=slots){ UI.toast('ظرفیت این شهر پر است — ابتدا ساختمانی را حذف کن','bad'); return false; }
    const cost={coins:this.buildCost(key, lvl)};
    if(!this.canPay(cost)){ UI.toast('سکه کافی نداری','bad'); return false; }
    this.pay(cost);
    city.b[key]=lvl+1;
    r.stats.built++;
    this.seasonStat('builds');
    this.addXP(10*(lvl+1));
    this.addMeter(5);
    UI.toast((lvl===0?'🏗️ ':'⬆️ ')+BUILDINGS[key].n+(lvl===0?' ساخته شد':' به سطح '+fa(lvl+1)+' رسید'),'good');
    Sfx.play('build');
    this.checkMissions(); this.checkAchievements(); this.save();
    return true;
  },
  upgradeCity(cityId){
    const r=this.R(); const city=r.cities.find(c=>c.id===cityId); if(!city) return;
    const cost={coins:Math.round(300*Math.pow(1.7,city.lvl-1))};
    if(!this.canPay(cost)){ UI.toast('سکه کافی نداری','bad'); return; }
    this.pay(cost); city.lvl++; this.addXP(25); UI.toast('🏙️ '+city.name+' به سطح '+fa(city.lvl)+' ارتقا یافت — تولید +۱۰٪','good'); this.save();
  },
  setTax(t){ const r=this.R(); r.tax=t; UI.toast('🏛️ سیاست مالی: '+TAXES[t].n); this.save(); },

  /* --- فناوری --- */
  techLv(branch){ const r=this.R(); return (r.techLv&&r.techLv[branch])||0; },
  research(branch){
    const r=this.R(); const lv=this.techLv(branch); if(lv>=5){ UI.toast('این شاخه کامل است','good'); return; }
    const cost=Math.round(60*Math.pow(1.8,lv));
    if(r.res.tech<cost){ UI.toast('فناوری کافی نداری (نیاز: '+fa(cost)+')','bad'); return; }
    r.res.tech-=cost; r.techLv=r.techLv||{}; r.techLv[branch]=lv+1;
    this.addXP(30); this.addMeter(8); UI.toast('🔬 '+TECHS[branch].n+' به سطح '+fa(lv+1)+' رسید','good'); this.save();
  },

  /* --- ارتش --- */
  armyPower(run){
    run=run||this.R(); if(!run) return 0;
    let p=0; for(const k in run.army) p += UNITS[k].pow*run.army[k];
    p *= 1 + 0.1*this.techLv('army');
    p *= 0.7 + run.sat/100*0.5;              // روحیه از رضایت عمومی
    if(run.wars.length) p*=1.05;             // بسیج
    return Math.round(p);
  },
  trainUnit(key, n=1){
    const r=this.R(); const u=UNITS[key];
    const mult = 1 - 0.05*cityLvlOf(r,'barracks');
    const cost={coins:Math.round(u.cost.coins*n*mult), manpower:u.cost.manpower*n};
    for(const k in u.cost){ if(k!=='coins'&&k!=='manpower') cost[k]=u.cost[k]*n; }
    if(!this.canPay(cost)){ UI.toast('منابع کافی نداری','bad'); return false; }
    this.pay(cost); r.army[key]+=n;
    this.addXP(3*n); this.addMeter(2);
    UI.toast((u.ic)+' '+fa(n)+' '+u.n+' آموزش دید','good'); Sfx.play('build'); this.save();
    return true;
  },

  /* --- قدرت دشمن --- */
  enemyPower(id, capital){
    const c=countryById(id); const r=this.R();
    const total=1+c.cities.length;
    const left = total - r.territories.filter(t=>t.id===id).length;
    let p = tierPower(c.tier) * (0.55 + 0.45*(left/total));
    if(r.sanctions.includes(id)) p*=0.85;
    p *= (capital?1.15:1.10); // دفاع از خانه
    return Math.round(p);
  },
  enemyCities(id){ const c=countryById(id); return [c.cap, ...c.cities]; },
  remainingCities(id){ const r=this.R(); const all=this.enemyCities(id); const taken=r.territories.filter(t=>t.id===id).map(t=>t.city); return all.filter(x=>!taken.includes(x)); },

  /* --- دیپلماسی --- */
  diploMult(){ return 1 + 0.2*this.techLv('diplo'); },
  diploCost(base){ const r=this.R(); const red=1-0.1*cityLvlOf(r,'diploc'); return Math.round(base*red*(1+Math.max(0,-r.credibility)/200)); },
  hasPact(id){ const r=this.R(); return r.trade.includes(id)||r.allies.includes(id); },
  breakPactPenalty(id){
    const r=this.R();
    if(this.hasPact(id)){
      r.credibility-=25; r.trade=r.trade.filter(x=>x!==id); r.allies=r.allies.filter(x=>x!==id);
      bumpAllRel(r,-8);
      UI.toast('⚠️ شکستن پیمان! اعتبار دیپلماتیک شما کاهش یافت و کشورها نسبت به شما بدبین شدند','bad');
    }
  },
  diploAction(id, act){
    const r=this.R(); const rel=r.relations[id]; const st=relStatus(rel).k;
    const M=this.diploMult();
    switch(act){
      case 'gift':{
        const cost=this.diploCost(200);
        if(!this.canPay({coins:cost})){ UI.toast('سکه کافی نداری','bad'); break; }
        this.pay({coins:cost}); this._rel(id, Math.round(8*M)); r.stats.gifts++; this.seasonStat('gifts');
        UI.toast('🎁 هدیه ارسال شد؛ روابط بهتر شد ('+fa(Math.round(8*M))+')','good'); this.addXP(20); break;
      }
      case 'trade':{
        if(r.trade.includes(id)){ UI.toast('قرارداد از قبل فعال است'); break; }
        if(!['neutral','friend'].includes(st)){ UI.toast('برای تجارت به بی‌طرفی یا دوستی نیاز است','bad'); break; }
        const cost=this.diploCost(100);
        if(!this.canPay({coins:cost})){ UI.toast('سکه کافی نداری','bad'); break; }
        this.pay({coins:cost}); r.trade.push(id); this._rel(id, Math.round(12*M)); this.seasonStat('trades');
        UI.toast('🤝 قرارداد تجاری با '+nameOf(id)+' امضا شد','good'); this.addXP(40); this.addMeter(10); break;
      }
      case 'alliance':{
        if(r.allies.includes(id)){ UI.toast('اتحاد از قبل برقرار است'); break; }
        if(!r.trade.includes(id)){ UI.toast('ابتدا قرارداد تجاری امضا کن','bad'); break; }
        const need=60 - (r.credibility>0? Math.round(r.credibility/10):0);
        if(rel<need){ UI.toast('برای اتحاد به روابط '+fa(need)+'+ نیاز است (فعلی '+fa(rel)+')','bad'); break; }
        r.allies.push(id); this._rel(id, Math.round(20*M));
        UI.toast('🛡️ اتحاد با '+nameOf(id)+' تشکیل شد!','gold'); this.addXP(120); this.addMeter(15); break;
      }
      case 'aid':{
        if(!r.allies.includes(id)){ UI.toast('فقط متحدان کمک نظامی می‌فرستند','bad'); break; }
        r.res.manpower+=600; r.res.food+=100; this._rel(id,3);
        UI.toast('🎖️ '+nameOf(id)+' کمک نظامی فرستاد: ۶۰۰ نیروی انسانی','good'); break;
      }
      case 'sanction':{
        if(r.sanctions.includes(id)){ UI.toast('تحریم از قبل فعال است'); break; }
        if(rel>-10){ UI.toast('تحریم فقط در تنش یا دشمنی معنا دارد','bad'); break; }
        r.sanctions.push(id); this._rel(id,-20);
        UI.toast('🚫 تحریم اقتصادی علیه '+nameOf(id)+' اعمال شد','bad'); this.addXP(30); break;
      }
      case 'buy':{
        const rem=this.remainingCities(id);
        if(!rem.length){ UI.toast('چیزی برای خرید نمانده','bad'); break; }
        if(rel<25){ UI.toast('با روابط '+fa(rel)+' فروش منطقه ممکن نیست (نیاز: ۲۵+)','bad'); break; }
        const c=countryById(id); const cost=this.diploCost(Math.round(500*c.tier*(rem.length/ (1+c.cities.length) +0.5)));
        if(!this.canPay({coins:cost})){ UI.toast('سکه کافی نداری (نیاز: '+fa(cost)+')','bad'); break; }
        this.pay({coins:cost}); const city=rem[0];
        r.territories.push({id, city}); r.stats.bought++; this.seasonStat('bought');
        if(this.remainingCities(id).length===0 && !r.annexed.includes(id)) r.annexed.push(id);
        UI.toast('🕊️ منطقه «'+city+'» با مذاکره به قلمرو شما افزوده شد','gold'); this.addXP(150); this.addMeter(15); break;
      }
      case 'war':{
        if(r.wars.includes(id)){ UI.toast('جنگ از قبل جریان دارد','bad'); break; }
        if(rel>-20){ UI.toast('برای اعلام جنگ حداقل وضعیت «تنش» لازم است','bad'); break; }
        this.declareWar(id); break;
      }
      case 'peace':{
        if(!r.wars.includes(id)){ UI.toast('با این کشور در جنگ نیستی'); break; }
        const cost=this.diploCost(Math.round(250*countryById(id).tier));
        if(!this.canPay({coins:cost})){ UI.toast('پرداخت غرامت ممکن نیست (نیاز: '+fa(cost)+')','bad'); break; }
        this.pay({coins:cost}); r.wars=r.wars.filter(x=>x!==id); r.agreedPeace.push(id); this._rel(id,15);
        UI.toast('🕊️ پیمان صلح با '+nameOf(id)+' امضا شد','good'); this.addXP(60); break;
      }
    }
    this.checkMissions(); this.checkAchievements(); this.save(); UI.refresh();
  },
  _rel(id, d){ const r=this.R(); r.relations[id]=clamp((r.relations[id]||0)+d, -100, 100); },

  /* --- جنگ --- */
  declareWar(id){
    const r=this.R();
    this.breakPactPenalty(id);
    if(!r.wars.includes(id)) r.wars.push(id);
    this._rel(id,-25);
    r.allies.filter(a=>a!==id).forEach(()=>this._rel(id,-5));
    UI.toast('⚔️ جنگ با '+nameOf(id)+' اعلام شد!','bad');
    Sfx.play('war');
    this.save(); UI.refresh();
  },
  /* --- نبرد تاکتیکی نوبتی --- */
  battleInit(id, capital, formation, commander){
    const r=this.R(); if(!r.wars.includes(id)){ UI.toast('ابتدا جنگ را اعلام کن','bad'); return null; }
    const rem=this.remainingCities(id); if(!rem.length){ UI.toast('همه قلمرو این کشور تصرف شده','bad'); return null; }
    const target = capital? rem[0] : rem[Math.min(1, rem.length-1)];
    const isCap = target===countryById(id).cap;
    const P=this.armyPower();
    const engineers=clamp(0.05*r.army.engineers,0,0.30);
    const wall=Math.max(0, 0.12-engineers);
    const D=Math.round(this.enemyPower(id, isCap) * (1+wall));
    const f=FORMATIONS[formation]||FORMATIONS.assault;
    const cm=COMMANDERS[commander]||COMMANDERS.none;
    return {id, target, capital, isCap, f, cm, P, D, pMax:P, eMax:D, p:P, e:D,
      round:0, wallShred:0, pLoss:0, over:false, win:null};
  },
  battleRound(st, actionKey){
    if(st.over) return [];
    const act=BATTLE_ACTIONS[actionKey]||BATTLE_ACTIONS.strike;
    const f=st.f, cm=st.cm;
    st.round++;
    const lines=[];
    // آسیب بازیکن به دشمن
    let pd = st.p * 0.22 * act.dmg * f.dmg * cm.dmg * (1+0.1*st.wallShred) * rnd(0.85,1.15);
    if(cm.first){ pd*=1.05; }
    // آسیب دشمن
    let edmg = st.e * 0.22 * act.taken * f.dmgTaken * cm.dmgTaken * rnd(0.85,1.15);
    if(cm.first){ edmg*=0.88; lines.push('🐎 ضربه نخست سردار تندرو! پاسخ دشمن کم شد'); }
    if(f.dodge && Math.random()<f.dodge){ edmg=0; lines.push('🎯 مانور آرایش پخش! آسیب این دور به دیوار خورد'); }
    if(act.shred){ st.wallShred=Math.min(1, st.wallShred+0.12); lines.push('🎯 دیوار دفاعی دشمن '+fa(Math.round(st.wallShred*100))+'٪ تضعیف شد'); }
    if(act.heal){ const h=Math.round(st.pMax*act.heal); st.p=Math.min(st.pMax, st.p+h); lines.push('🧱 بازسازی صفوف: +'+fa(h)+' توان'); }
    st.e=Math.max(0, st.e-pd);
    st.p=Math.max(0, st.p-edmg);
    st.pLoss += edmg/st.pMax;
    lines.push('💥 دور '+fa(st.round)+': به دشمن '+fa(Math.round(pd))+' آسیب — دریافتی شما '+fa(Math.round(edmg))+' (توان شما '+fa(Math.round(st.p))+' | دشمن '+fa(Math.round(st.e))+')');
    if(st.e<=0){ st.over=true; st.win=true; }
    else if(st.p<=0){ st.over=true; st.win=false; }
    else if(st.round>=8){ st.over=true; st.win = (st.p/st.pMax) > (st.e/st.eMax); lines.push('⏳ پایان دورها! مقایسه توان باقی‌مانده…'); }
    return lines;
  },
  battleFinish(st, opts){
    const r=this.R(); const id=st.id; const c=countryById(id);
    const retreat = !!(opts&&opts.retreat);
    const win = retreat? false : st.win;
    r.stats.battles++;
    if(retreat){
      UI.toast('🏳️ عقب‌نشینی سازمان‌یافته از نبرد','bad');
    } else if(win){
      r.stats.wins++;
      this.seasonStat('wins');
      r.territories.push({id, city:st.target});
      const coins=150*c.tier+120;
      this.addCoins(coins); this.addXP(120+30*c.tier); this.addMeter(10);
      if(st.isCap) r.stats.capTaken++;
      if(this.remainingCities(id).length===0 && !r.annexed.includes(id)){
        r.annexed.push(id); r.wars=r.wars.filter(x=>x!==id);
        this.seasonStat('annex');
        this.addCoins(400*c.tier);
        bumpAllRel(r,-4);
        UI.toast('👑 '+nameOf(id)+' کاملاً به قلمرو شما الحاق شد!','gold');
      } else {
        this._rel(id,-30); bumpAllRel(r,-2);
        UI.toast('🏳️ پیروزی! منطقه «'+st.target+'» تصرف شد','gold');
      }
    } else {
      UI.toast('🛡️ شکست در نبرد! نیروهای باقی‌مانده عقب کشیدند','bad');
      r.sat=clamp(r.sat-8,0,100);
    }
    // تلفات کارتونی بر پایه نتیجه، آرایش و روند نبرد
    const base = retreat? 0.10 : win? 0.15 : 0.30;
    const lossPct = clamp(base*st.f.lossMod + st.pLoss*0.12, 0.05, 0.45);
    for(const k in r.army){ r.army[k]=Math.max(0, Math.round(r.army[k]*(1-lossPct))); }
    this.checkMissions(); this.checkAchievements(); this.save();
    return {win, retreat, target:st.target, lossPct:Math.round(lossPct*100), rounds:st.round};
  },

  /* --- صندوق‌ها --- */
  addMeter(n){ const m=this.S.meta; m.chestMeter=clamp(m.chestMeter+n,0,100); if(m.chestMeter>=100 && !m.cycle){ this.startCycle(); } },
  startCycle(){
    const m=this.S.meta;
    if(m.pendingSpecial){ // صندوق باقی‌مانده چرخه قبل
      const specialType='special';
      const loot=this.rollLoot(specialType, true);
      UI.showLoot('صندوق ویژه باقی‌مانده', loot, specialType);
      this.applyLoot(loot, true);
      m.pendingSpecial=null;
    }
    const types=Object.keys(CHEST_TYPES).filter(t=>CHEST_TYPES[t].w>0);
    const chests=[];
    for(let i=0;i<10;i++){
      const tw=types.map(t=>CHEST_TYPES[t].w);
      let x=Math.random()*tw.reduce((a,b)=>a+b,0), pick=types[0];
      for(let j=0;j<types.length;j++){ x-=tw[j]; if(x<=0){ pick=types[j]; break; } }
      chests.push({type:pick, opened:false});
    }
    m.cycle={chests, opened:0}; m.chestMeter=100;
    UI.toast('📦 چرخه صندوق‌ها آماده است! از ۱۰ صندوق، ۹ تا را باز کن','gold');
  },
  rollLoot(type, dbl){
    const table=CHEST_LOOT[type]||CHEST_LOOT_SEASON; const tw=table.map(x=>x.w).reduce((a,b)=>a+b,0);
    let x=Math.random()*tw, item=table[0];
    for(const it of table){ x-=it.w; if(x<=0){ item=it; break; } }
    const mult=dbl?2:1;
    const v = item.t==='unit' ? 1 : ri(item.v[0],item.v[1])*mult;
    const loot={t:item.t, v, n:item.n, type};
    if(item.skinId) loot.skinId=item.skinId;
    return loot;
  },
  openChest(i){
    const m=this.S.meta; if(!m.cycle) return;
    const ch=m.cycle.chests[i]; if(!ch||ch.opened) return;
    if(m.cycle.opened>=9){ UI.toast('صندوق دهم به‌عنوان جایزه ویژه برای چرخه بعد نگه داشته می‌شود','gold'); return; }
    ch.opened=true; m.cycle.opened++;
    const r=this.R(); if(r){ r.stats.chests++; }
    this.seasonStat('chests');
    const loot=this.rollLoot(ch.type,false);
    this.applyLoot(loot,false);
    Sfx.play('chest');
    m.chestMeter=0;
    if(m.cycle.opened>=9){
      const last=m.cycle.chests.findIndex(c=>!c.opened);
      m.pendingSpecial={type:m.cycle.chests[last].type};
      m.cycle=null;
      if(m.season){ m.season.chests++; UI.toast('🎊 پاداش تکمیل چرخه: یک صندوق فصلی گرفتی!','gold'); }
      UI.toast('🔒 صندوق باقی‌مانده برای چرخه بعد ویژه شد','gold');
    }
    this.S.meta; this.checkMissions(); this.checkAchievements(); this.save();
    return loot;
  },
  applyLoot(loot, dbl){
    const r=this.R(); const m=this.S.meta;
    switch(loot.t){
      case 'coins': this.addCoins(loot.v); break;
      case 'xp': this.addXP(loot.v); break;
      case 'res': { const ks=['food','wood','metal','energy']; ks.forEach(k=> r.res[k]+=Math.round(loot.v/2)); break; }
      case 'manpower': if(r) r.res.manpower+=loot.v; break;
      case 'unit': { const k=['armor','air','navy'][ri(0,2)]; if(r) r.army[k]+=1; loot.detail=UNITS[k].n; break; }
      case 'frag': { const locked=COUNTRIES.filter(c=> c.cities.length>0 && !unlockedIds().includes(c.id)); const pick=locked.length? locked[ri(0,locked.length-1)] : null;
        if(pick){ m.fragments[pick.id]=(m.fragments[pick.id]||0)+loot.v; loot.detail=pick.n; if(fragCount(pick.id)>=5){ m.unlocked.push(pick.id); UI.toast('🧩 کشور '+pick.n+' با قطعه‌ها باز شد!','gold'); } }
        else { this.addCoins(300); loot.t='coins'; loot.v=300; loot.n='سکه'; }
        break; }
      case 'ticket': m.tickets+=loot.v; break;
      case 'skin': { if(!m.skins.includes(loot.skinId)) m.skins.push(loot.skinId);
        loot.detail=(SKINS.find(x=>x.id===loot.skinId)||{}).n; break; }
    }
  },

  /* --- پاداش روزانه --- */
  claimDaily(useTicket){
    const m=this.S.meta; const today=todayStr();
    if(m.daily.last===today){ UI.toast('پاداش امروز گرفته شده؛ فردا برگرد!'); return null; }
    const diff = m.daily.last ? dayDiff(m.daily.last, today) : 1;
    if(diff>1){
      if(!useTicket){ return {missed:true, tickets:m.tickets}; }
      if(m.tickets<1){ UI.toast('بلیت جبران نداری','bad'); return null; }
      m.tickets--; UI.toast('🎟️ بلیت جبران مصرف شد؛ زنجیره حفظ شد','good');
    }
    m.daily.streak = (diff===1||useTicket)? m.daily.streak+1 : 1;
    m.daily.last=today;
    const day=((m.daily.streak-1)%30)+1;
    let coins=100+day*40, extra=[];
    if(day%5===0){ this.addMeter(30); extra.push('انرژی صندوق +۳۰'); }
    if(day===30){ coins+=2000; extra.push('صندوق تاریخی ویژه'); this.addXP(300); }
    this.addCoins(coins); this.addXP(40+day);
    this.addMeter(20);
    Sfx.play('daily');
    this.checkAchievements(); this.save();
    return {day, coins, extra};
  },

  /* --- رویداد فصلی --- */
  seasonInfo(){
    const now=Date.now();
    const idx=Math.max(0, Math.floor((now-SEASON_ANCHOR)/86400000/SEASON_DAYS));
    const m=this.S.meta;
    if(!m.season || m.season.idx!==idx){
      if(m.season) UI.toast('🎊 فصل جدید آغاز شد! مأموریت‌ها و امتیازهای فصلی تازه شدند','gold');
      m.season={idx, pts:0, chests:0, claimedTiers:[], claimedM:[], notifiedM:[],
        stats:{wins:0,trades:0,chests:0,builds:0,gifts:0,annex:0,bought:0}};
      this.save();
    }
    const day=Math.min(SEASON_DAYS, Math.floor((now-SEASON_ANCHOR)/86400000 - idx*SEASON_DAYS)+1);
    const theme=SEASON_THEMES[idx % SEASON_THEMES.length];
    return {idx, num:idx+1, theme, day, total:SEASON_DAYS, remain:SEASON_DAYS-day+1};
  },
  seasonStat(key, n=1){
    const s=this.S.meta.season; if(!s || !(key in s.stats)) return;
    s.stats[key]+=n;
    const th=SEASON_THEMES[s.idx % SEASON_THEMES.length];
    th.missions.forEach((ms,i)=>{
      if(!s.claimedM.includes(i) && !s.notifiedM.includes(i) && (s.stats[ms.key]||0)>=ms.target){
        s.notifiedM.push(i);
        UI.toast('🎊 مأموریت فصلی «'+ms.n+'» آماده دریافت جایزه است!','gold');
      }
    });
  },
  addSeasonPoints(n){
    const s=this.S.meta.season; if(!s) return;
    const before=s.pts; s.pts+=n;
    const newTier=SEASON_TRACK.some(t=> s.pts>=t.pts && before<t.pts);
    if(newTier) UI.toast('🏅 جایزه تازه‌ای در مسیر فصل باز شد!','gold');
  },
  claimSeasonMission(i){
    const s=this.S.meta.season; const th=SEASON_THEMES[s.idx % SEASON_THEMES.length];
    const ms=th.missions[i]; if(!ms || s.claimedM.includes(i)) return false;
    if((s.stats[ms.key]||0)<ms.target){ UI.toast('مأموریت هنوز کامل نشده','bad'); return false; }
    s.claimedM.push(i);
    this.addCoins(ms.rc); this.addSeasonPoints(ms.pts); this.addXP(30);
    Sfx.play('daily');
    UI.toast('🎊 جایزه مأموریت فصلی: '+fa(ms.rc)+' سکه + '+fa(ms.pts)+' امتیاز','gold');
    this.save(); return true;
  },
  claimSeasonTier(pts){
    const s=this.S.meta.season;
    const tier=SEASON_TRACK.find(t=>t.pts===pts);
    if(!tier || s.claimedTiers.includes(pts)) return false;
    if(s.pts<pts){ UI.toast('امتیاز کافی نداری','bad'); return false; }
    s.claimedTiers.push(pts);
    this.grantReward(tier.r);
    Sfx.play('chest');
    UI.toast('🏅 جایزه مسیر فصل دریافت شد!','gold');
    this.save(); return true;
  },
  grantReward(r){
    const m=this.S.meta; const s=m.season;
    switch(r.t){
      case 'coins': this.addCoins(r.v); break;
      case 'chest': if(s) s.chests+=r.v; break;
      case 'ticket': m.tickets+=r.v; break;
      case 'frag': { const locked=COUNTRIES.filter(c=> c.cities.length>0 && !unlockedIds().includes(c.id));
        if(locked.length){ const p=locked[ri(0,locked.length-1)]; m.fragments[p.id]=(m.fragments[p.id]||0)+r.v;
          if(fragCount(p.id)>=5 && !m.unlocked.includes(p.id)){ m.unlocked.push(p.id); UI.toast('🧩 کشور '+p.n+' با قطعه‌ها باز شد!','gold'); } }
        else this.addCoins(300); break; }
      case 'xp': this.addXP(r.v); break;
      case 'skin': if(!m.skins.includes(r.skin)) m.skins.push(r.skin); break;
    }
  },
  openSeasonChest(){
    const s=this.S.meta.season; if(!s || s.chests<1){ UI.toast('صندوق فصلی نداری — از مسیر جایزه فصل به دستش بیاور','bad'); return null; }
    s.chests--;
    const loot=this.rollLoot('season',false);
    this.applyLoot(loot,false);
    Sfx.play('chest');
    this.save();
    return loot;
  },
  seasonClaimables(){
    const s=this.S.meta.season; if(!s) return 0;
    const th=SEASON_THEMES[s.idx % SEASON_THEMES.length];
    let n=0;
    th.missions.forEach((ms,i)=>{ if(!s.claimedM.includes(i) && (s.stats[ms.key]||0)>=ms.target) n++; });
    SEASON_TRACK.forEach(t=>{ if(s.pts>=t.pts && !s.claimedTiers.includes(t.pts)) n++; });
    if(s.chests>0) n++;
    return n;
  },

  /* --- مأموریت/دستاورد --- */
  checkMissions(){
    const r=this.R(); if(!r) return;
    while(r.missionIdx<MISSIONS.length){
      const m=MISSIONS[r.missionIdx];
      let ok=false; try{ ok=m.chk(r); }catch(e){ ok=false; }
      if(!ok) break;
      const rc=m.rc; this.addCoins(rc.coins||0); if(m.xp) this.addXP(m.xp);
      this.addMeter(15);
      UI.toast('📜 مأموریت «'+m.n+'» انجام شد! پاداش: '+fa(rc.coins||0)+' سکه','gold');
      r.missionIdx++; this.save();
    }
  },
  checkAchievements(){
    const m=this.S.meta; const r=this.R();
    ACHIEVEMENTS.forEach(a=>{
      if(m.achievements[a.id]) return;
      let ok=false; try{ ok=a.chk(r); }catch(e){}
      if(ok){ m.achievements[a.id]=todayStr(); this.addMeter(15); this.addCoins(300);
        UI.toast('🏅 دستاورد «'+a.n+'» باز شد! (+۳۰۰ سکه)','gold'); }
    });
  },

  /* --- تیک اصلی (هر ثانیه) --- */
  tick(){
    const S=this.S, r=this.R(); if(!r) return;
    const te=1+0.1*this.techLv('econ');
    const tax=TAXES[r.tax]||TAXES.med;
    const satM=0.8 + r.sat/100*0.4;
    const buff=r.buffIncome||1;
    const rates={coins:0,food:0,energy:0,metal:0,wood:0,tech:0};
    let treasury=1, ports=0, markets=0;
    r.cities.forEach(city=>{
      const mult=1+0.1*(city.lvl-1);
      for(const k in city.b){
        const lvl=city.b[k]; if(!lvl) continue;
        const b=BUILDINGS[k];
        if(k==='treasury'){ treasury+=0.1*lvl; continue; }
        if(k==='port'){ ports+=lvl; rates.coins+=0.25*lvl*mult; continue; }
        const amt=this.buildingIncome(k,lvl)*mult;
        if(k==='market'){ rates.coins+=amt; markets+=lvl; }
        else rates[b.res]+=amt;
      }
    });
    rates.coins=(rates.coins + r.trade.length*0.45*(1+0.1*ports)) * te * tax.coin * satM * treasury * buff;
    for(const k of ['food','energy','metal','wood','tech']) rates[k]*=te*buff;
    // نگهداری ارتش
    const units=Object.values(r.army).reduce((a,b)=>a+b,0);
    rates.coins -= units*0.06;
    for(const k in rates){
      if(k==='coins'){ // سکه در کیف پول جهانی است (با انباشت کسری)
        if(Math.abs(rates.coins)>0.0001){
          this.S.meta.__cf=(this.S.meta.__cf||0)+rates.coins;
          const whole=Math.trunc(this.S.meta.__cf);
          if(whole){ this.addCoins(whole); this.S.meta.__cf-=whole; }
        }
      }
      else r.res[k]=Math.max(0, r.res[k]+rates[k]);
    }
    r.res.manpower=Math.min(3000, r.res.manpower + r.cities.length*0.08);
    // رضایت عمومی
    const target = clamp(65 + (rates.food>0.3?8:-12) + tax.sat + Math.min(10, r.trade.length*2) - (r.wars.length?12:0), 5, 100);
    r.sat += clamp(target-r.sat, -0.4, 0.4);
    // انرژی صندوق آرام
    this.S.__t=(this.S.__t||0)+1;
    if(this.S.__t%10===0) this.addMeter(1);
    if(this.S.__t%110===0 && Math.random()<0.7){ const ev=EVENTS[ri(0,EVENTS.length-1)]; ev.f(r); UI.toast(ev.t); }
    this.checkMissions(); this.checkAchievements();
    UI.tickHUD(rates);
  },
};

/* نام‌های نمایشی منابع */
function resName(k){ return RES_META[k]?RES_META[k].n:k; }
