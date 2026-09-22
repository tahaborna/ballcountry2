/* ===== رابط کاربری «کشورهای توپی» ===== */
const $=(q,el)=> (el||document).querySelector(q);
const $$=(q,el)=> Array.from((el||document).querySelectorAll(q));

const UI = {
  currentScreen:null, manageTab:'capital', openModalEl:null,

  /* ---------- توست ---------- */
  toast(msg, kind){
    const t=document.createElement('div');
    t.className='toast '+(kind||'');
    t.textContent=msg;
    $('#toast-root').appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),320); }, 2600);
  },

  /* ---------- مودال ---------- */
  modal(title, bodyHTML, opts){
    this.close();
    const ov=document.createElement('div');
    ov.className='overlay'+((opts&&opts.center)?' center':'');
    ov.innerHTML=`<div class="sheet">
      <div class="sheethead"><h3>${title}</h3><button class="xbtn">✕</button></div>
      <div class="sheetbody">${bodyHTML}</div>
    </div>`;
    ov.addEventListener('click', e=>{ if(e.target===ov) this.close(); });
    ov.querySelector('.xbtn').onclick=()=>this.close();
    $('#modal-root').appendChild(ov);
    this.openModalEl=ov;
    return ov;
  },
  close(){ if(this.openModalEl){ this.openModalEl.remove(); this.openModalEl=null; } },

  /* ---------- دیپ‌لینک (شورت‌کات PWA / TWA) ---------- */
  openLink(key){
    const hasRun=!!Engine.S.runs[Engine.S.scenario];
    key=String(key||'').toLowerCase();
    if(key==='map' && hasRun) this.show('game');
    else if(key==='chests') this.showChests();
    else if(key==='daily') this.showDaily();
    else if(key==='season') this.showSeason();
    else if(key==='diplo' && hasRun) this.showDiplo();
  },

  /* ---------- صفحه‌ها ---------- */
  show(id){
    $$('.screen').forEach(s=>s.remove());
    const sc=document.createElement('div');
    sc.className='screen'; sc.id='screen-'+id;
    $('#app').appendChild(sc);
    this.currentScreen=id;
    if(id==='menu') this.renderMenu(sc);
    if(id==='select') this.renderSelect(sc);
    if(id==='game') this.renderGame(sc);
  },

  /* ---------- منوی اصلی ---------- */
  renderMenu(sc){
    const m=Engine.S.meta;
    const hasRun=!!Engine.S.runs[Engine.S.scenario];
    const scBtns=Object.keys(SCENARIOS).map(k=>{
      const s=SCENARIOS[k]; const locked=m.level<s.lv;
      return `<button class="btn sec wide" data-sc="${k}" ${locked?'data-locked="1"':''}>${s.ic} ${s.n} ${locked?`<span class="muted">(سطح ${fa(s.lv)})</span>`:''}</button>`;
    }).join('');
    sc.innerHTML=`
      <div class="menu-balls">
        ${flagBall(countryById('iran'),44,'mm1')}${flagBall(countryById('france'),44,'mm2')}${flagBall(countryById('brazil'),44,'mm3')}${flagBall(countryById('japan'),44,'mm4')}${flagBall(countryById('mongol'),44,'mm5')}
      </div>
      <div class="logo">کشورهای توپی<small>فرمانروایی جهان</small></div>
      <div class="chip">سطح بازیکن: <b class="num">${fa(m.level)}</b> · سکه: <b class="num">${fa(m.coins)}</b></div>
      <div class="menu-col">
        ${hasRun?'<button class="btn wide" id="btn-continue">▶️ ادامه بازی</button>':''}
        <button class="btn ${hasRun?'sec':''} wide" id="btn-new">🌍 ${hasRun?'بازی جدید':'شروع بازی'}</button>
        <div class="row" style="gap:6px">${scBtns.replace(/class="btn sec wide"/g,'class="btn sec" style="flex:1;font-size:12.5px"')}</div>
        <div class="row" style="gap:8px">
          <button class="btn sec" style="flex:1" id="btn-editor">🗺️ ویرایشگر نقشه</button>
          <button class="btn sec" style="flex:1" id="btn-help">📖 راهنما</button>
        </div>
        <div class="row" style="gap:8px">
          <button class="btn sec" style="flex:1" id="btn-shop">🛒 فروشگاه</button>
          <button class="btn sec" style="flex:1" id="btn-account">☁️ حساب</button>
        </div>
        <div class="row" style="gap:8px">
          <button class="btn sec" style="flex:1" id="btn-settings">⚙️ تنظیمات</button>
          <button class="btn sec" style="flex:1" id="btn-dev">🛠️ سازنده برنامه</button>
        </div>
      </div>
      <div class="ver">نسخه ۰٫۱ · پیش‌نمایش بازی</div>`;
    const scSel=(k)=>{
      if(Engine.S.meta.level<SCENARIOS[k].lv){ UI.toast('این سناریو در سطح '+fa(SCENARIOS[k].lv)+' باز می‌شود','bad'); return; }
      Engine.S.scenario=k; Engine.save();
      if(Engine.S.runs[k]) this.show('game');
      else this.show('select');
    };
    sc.querySelectorAll('[data-sc]').forEach(b=> b.onclick=()=>scSel(b.dataset.sc));
    $('#btn-new',sc).onclick=()=>this.show('select');
    const cont=$('#btn-continue',sc); if(cont) cont.onclick=()=>this.show('game');
    $('#btn-editor',sc).onclick=()=>{ Engine.S.meta.editor=true; Engine.save();
      if(!Engine.R()) Engine.newRun(unlockedIds()[0]); this.show('game'); };
    $('#btn-help',sc).onclick=()=>this.showHelp();
    $('#btn-settings',sc).onclick=()=>this.showSettings();
    $('#btn-shop',sc).onclick=()=>this.showShop();
    $('#btn-account',sc).onclick=()=>this.showAccount();
    $('#btn-dev',sc).onclick=()=>this.showDeveloper();
  },

  /* ---------- انتخاب کشور ---------- */
  renderSelect(sc){
    const m=Engine.S.meta; const scen=SCENARIOS[Engine.S.scenario];
    sc.innerHTML=`<div class="tophead">
        <button class="xbtn" id="back">‹</button><h2>${scen.ic} انتخاب کشور — ${scen.n}</h2>
        <span class="chip">سطح ${fa(m.level)}</span>
      </div>
      <div class="scroll"><p class="hintline">کشور خود را انتخاب کن. کشورهای قفل‌شده با بالا رفتن سطح یا جمع‌کردن ۵ قطعه از صندوق کشورها باز می‌شوند.</p>
      <div class="cgrid" id="cgrid"></div></div>`;
    $('#back',sc).onclick=()=>this.show('menu');
    const grid=$('#cgrid',sc);
    countriesOf(Engine.S.scenario).filter(c=>c.cities.length>0).forEach(c=>{
      const unlocked = m.level>=c.lv || m.unlocked.includes(c.id) || fragCount(c.id)>=5;
      const d=document.createElement('div');
      d.className='ccard '+(unlocked?'playable':'locked');
      d.innerHTML=`${unlocked?'':'<div class="lockbadge">🔒 سطح '+fa(c.lv)+'</div>'}
        ${flagBall(c,52,'cs-'+c.id)}
        <div class="nm">${c.n}</div>
        <div class="info">★ پایتخت: ${c.cap}</div>
        <div class="info">قدرت: ${'●'.repeat(c.tier)} · جمعیت: ${fa(c.pop)}م</div>
        ${fragCount(c.id)>0&&!unlocked?`<div class="info" style="color:var(--gold)">🧩 قطعه: ${fa(fragCount(c.id))}/۵</div>`:''}`;
      if(unlocked) d.onclick=()=>{
        Engine.newRun(c.id);
        Engine.S.meta.tutorial || this.showTutorial(()=>this.show('game'));
        this.show('game');
        this.toast('🏳️ فرمانروایی '+c.n+' آغاز شد!','gold');
      };
      grid.appendChild(d);
    });
  },

  /* ---------- صفحه بازی ---------- */
  renderGame(sc){
    const r=Engine.R();
    if(!r){ this.show('select'); return; }
    const c=countryById(r.countryId); const m=Engine.S.meta;
    sc.innerHTML=`
      <div class="hud">
        <div class="hud-top">
          <div class="ballmini" id="hud-ball">${flagBall(c,34,'hud')}</div>
          <div class="pname">${c.n}<div class="lvlbar">
            <div class="bar"><i id="hud-xp" style="width:${Math.round(100*m.xp/Engine.xpForNext(m.level))}%"></i></div>
            <div class="muted" style="font-size:10px">سطح ${fa(m.level)} · تجربه ${fa(m.xp)}/${fa(Engine.xpForNext(m.level))}</div>
          </div></div>
          <div class="chip" style="margin-right:auto">🪙 <b class="num" id="hud-coins">${fa(m.coins)}</b></div>
        </div>
        <div class="resbar" id="hud-res"></div>
      </div>
      <div class="mapwrap">
        <svg id="mapsvg" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice"></svg>
        ${m.editor?'<div class="editorbar"><span class="hint">حالت ویرایش: توپ‌ها را بکشید و رها کنید.</span><button class="btn sm blue" id="ed-add">＋ کشور جدید</button><button class="btn sm sec" id="ed-exit">پایان ویرایش</button></div>':''}
      </div>
      <div class="nav">
        <button class="navbtn" data-a="manage"><span class="ic">🏛️</span>مدیریت</button>
        <button class="navbtn" data-a="diplo"><span class="ic">🕊️</span>دیپلماسی</button>
        <button class="navbtn" data-a="army"><span class="ic">⚔️</span>ارتش</button>
        <button class="navbtn" data-a="chests"><span class="ic">📦</span>صندوق‌ها</button>
        <button class="navbtn" data-a="daily"><span class="ic">📅</span>پاداش روزانه</button>
        <button class="navbtn" data-a="missions"><span class="ic">📜</span>مأموریت‌ها</button>
        <button class="navbtn" data-a="season"><span class="ic">🎊</span>فصل${Engine.seasonClaimables()>0?'<span class="dot"></span>':''}</button>
        <button class="navbtn" data-a="shop"><span class="ic">🛒</span>فروشگاه</button>
        <button class="navbtn" data-a="menu"><span class="ic">🏠</span>منو</button>
      </div>`;
    MapView.init($('#mapsvg',sc));
    MapView.onTap=(id)=>this.onBallTap(id);
    MapView.rebuild();
    if(r && !m.editor) setTimeout(()=>MapView.centerOn(r.countryId),50);
    this.buildResBar();
    sc.querySelectorAll('.navbtn').forEach(b=>{
      b.onclick=()=>{
        const a=b.dataset.a;
        if(a==='manage') this.showManage();
        else if(a==='diplo') this.showDiplo();
        else if(a==='army') this.showArmy();
        else if(a==='chests') this.showChests();
        else if(a==='daily') this.showDaily();
        else if(a==='missions') this.showMissions();
        else if(a==='season') this.showSeason();
        else if(a==='shop') this.showShop();
        else if(a==='menu'){ Engine.S.meta.editor=false; Engine.save(); this.show('menu'); }
      };
    });
    if(m.editor){ $('#ed-exit',sc).onclick=()=>{ m.editor=false; Engine.save(); this.show('game'); };
      $('#ed-add',sc).onclick=()=>this.addCustomCountry(); }
    this.refresh();
  },

  buildResBar(){
    const r=Engine.R(); if(!r) return;
    const bar=$('#hud-res'); if(!bar) return;
    bar.innerHTML=Object.keys(r.res).map(k=>{
      const meta=RES_META[k];
      return `<div class="res" title="${meta.n}">${meta.ic} <b id="res-${k}">${fa(Math.floor(r.res[k]))}</b><span class="rate" id="rate-${k}"></span></div>`;
    }).join('');
  },

  tickHUD(rates){
    const r=Engine.R(); const m=Engine.S.meta;
    if(!r || this.currentScreen!=='game') return;
    const coinsEl=$('#hud-coins'); if(coinsEl) coinsEl.textContent=fa(m.coins);
    for(const k in r.res){
      const el=$('#res-'+k); if(el) el.textContent=fa(Math.floor(r.res[k]));
      const rt=$('#rate-'+k); if(rt){ const v=rates[k]||0; rt.textContent=(v>=0.05? '+'+fa(Math.round(v*100)/100)+'/ث' : (v<=-0.05? '−'+fa(Math.round(-v*100)/100)+'/ث':'')); }
    }
  },

  refresh(){
    if(this.currentScreen!=='game') return;
    const r=Engine.R(); if(!r) return;
    const m=Engine.S.meta;
    const xp=$('#hud-xp'); if(xp) xp.style.width=Math.round(100*m.xp/Engine.xpForNext(m.level))+'%';
    MapView.rebuild();
  },

  /* ---------- ضربه روی توپ کشور ---------- */
  onBallTap(id){
    const r=Engine.R(); if(!r) return;
    if(id===r.countryId){ this.showManage(); return; }
    this.showCountryModal(id);
  },

  showCountryModal(id){
    const r=Engine.R(); const c=countryById(id);
    const rel=r.relations[id]||0; const st=relStatus(rel);
    const isAlly=r.allies.includes(id), isTrade=r.trade.includes(id), isWar=r.wars.includes(id), isSanct=r.sanctions.includes(id);
    const taken=r.territories.filter(t=>t.id===id);
    const ov=this.modal(c.n, `
      <div class="row" style="gap:14px">
        ${flagBall(c,64,'cm-'+id)}
        <div style="flex:1">
          <div><span class="tag ${st.c}">${st.n}</span> ${isAlly?'<span class="tag friend">🛡️ متحد</span>':''}${isWar?'<span class="tag enemy">⚔️ در جنگ</span>':''}${isTrade?'<span class="tag neutral">🤝 تجاری</span>':''}${isSanct?'<span class="tag tension">🚫 تحریم</span>':''}</div>
          <div class="muted" style="margin-top:6px">روابط: <b class="num">${fa(rel)}</b> · قدرت دفاعی: ${fa(Engine.enemyPower(id))} · جمعیت: ${fa(c.pop)} میلیون</div>
          <div class="muted">★ پایتخت: ${c.cap} · شهرها: ${c.cities.join('، ')||'—'}</div>
          ${taken.length?`<div class="muted" style="color:#7dedab">⚑ قلمروهای تصرف‌شده: ${taken.map(t=>t.city).join('، ')}</div>`:''}
        </div>
      </div>
      <div class="hintline">${relStatusHint(rel)}</div>
      <div class="acts" style="display:flex;flex-wrap:wrap;gap:8px">
        <button class="btn sm sec" data-d="gift">🎁 هدیه (${fa(Engine.diploCost(200))} سکه)</button>
        ${!isTrade?`<button class="btn sm sec" data-d="trade">🤝 قرارداد تجاری (${fa(Engine.diploCost(100))})</button>`:''}
        ${!isAlly?`<button class="btn sm blue" data-d="alliance">🛡️ اتحاد</button>`:`<button class="btn sm sec" data-d="aid">🎖️ درخواست کمک نظامی</button>`}
        ${!isSanct&&rel<=-10?`<button class="btn sm sec" data-d="sanction">🚫 تحریم</button>`:''}
        ${!isWar&&rel<=-20?`<button class="btn sm red" data-d="war">⚔️ اعلام جنگ</button>`:''}
        ${isWar?`<button class="btn sm red" id="btn-attack">⚔️ حمله (نبرد)</button><button class="btn sm green" data-d="peace">🕊️ پیمان صلح (${fa(Engine.diploCost(250*c.tier))})</button>`:''}
        ${!isWar&&rel>=25&&Engine.remainingCities(id).length?`<button class="btn sm green" data-d="buy">🕊️ خرید منطقه با مذاکره (${fa(Engine.diploCost(Math.round(500*c.tier)))}+)</button>`:''}
      </div>`);
    ov.querySelectorAll('[data-d]').forEach(b=> b.onclick=()=>{ Engine.diploAction(id, b.dataset.d); if(this.openModalEl) this.showCountryModal(id); });
    const at=$('#btn-attack',ov); if(at) at.onclick=()=>{ this.close(); this.showBattle(id); };
  },

  /* ---------- مدیریت کشور ---------- */
  showManage(){
    const tabs=[['capital','🏛️ پایتخت'],['cities','🏙️ شهرها'],['econ','💰 اقتصاد'],['tech','🔬 فناوری'],['territory','🗺️ قلمرو']];
    const ov=this.modal('مدیریت کشور', `
      <div class="tabs">${tabs.map(t=>`<button class="tab ${t[0]===this.manageTab?'on':''}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
      <div id="manage-body"></div>`);
    ov.querySelectorAll('.tab').forEach(b=> b.onclick=()=>{ this.manageTab=b.dataset.t; ov.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b)); this.renderManageBody(); });
    this.renderManageBody();
  },
  renderManageBody(){
    const r=Engine.R(); const body=$('#manage-body'); if(!body) return;
    if(this.manageTab==='capital'){
      const cap=r.cities[0];
      body.innerHTML=`<div class="cityrow"><div class="spread"><b>★ پایتخت: ${cap.name}</b><span class="chip">سطح ${fa(cap.lvl)}</span></div>
        <div class="muted" style="margin:4px 0">رضایت عمومی: <b style="color:${r.sat>60?'var(--green)':r.sat>35?'var(--gold)':'var(--red)'}">${fa(Math.round(r.sat))}٪</b> · اعتبار دیپلماتیک: <b>${fa(Math.round(r.credibility))}</b></div>
        <div class="bar" style="height:10px"><i style="width:${Math.round(r.sat)}%;background:linear-gradient(90deg,var(--green),#9bf0be)"></i></div>
        ${this.buildingRows(cap)}</div>
      <p class="hintline">در پایتخت ۴ جای ساختمان داری. ساختمان‌ها منابع تولید می‌کنند و شاخص ثبات را بالا می‌برند.</p>`;
    } else if(this.manageTab==='cities'){
      body.innerHTML=r.cities.slice(1).map(city=>`
        <div class="cityrow"><div class="spread"><b>🏙️ ${city.name}</b>
          <span class="row"><span class="chip">سطح ${fa(city.lvl)}</span><button class="btn sm" data-city="${city.id}">ارتقا (${fa(Math.round(300*Math.pow(1.7,city.lvl-1)))} سکه)</button></span></div>
          ${this.buildingRows(city)}</div>`).join('')||'<p class="hintline">شهر دیگری نداری — با تصرف یا مذاکره قلمرو جدید به دست بیاور.</p>';
      body.querySelectorAll('[data-city]').forEach(b=> b.onclick=()=>{ Engine.upgradeCity(b.dataset.city); this.renderManageBody(); });
    } else if(this.manageTab==='econ'){
      const taxBtns=Object.keys(TAXES).map(k=>`<button class="btn sm ${r.tax===k?'':'sec'}" data-tax="${k}">${TAXES[k].n}</button>`).join('');
      const units=Object.values(r.army).reduce((a,b)=>a+b,0);
      body.innerHTML=`
        <div class="card"><b>سیاست مالی</b><div class="row" style="margin-top:8px;flex-wrap:wrap">${taxBtns}</div>
        <p class="hintline">مالیات سنگین سکه بیشتری می‌دهد اما رضایت عمومی را کم می‌کند.</p></div>
        <div class="card" style="margin-top:10px"><b>بازار مبادله (سکه ⇄ منابع)</b>
          <div class="row" style="flex-wrap:wrap;margin-top:8px;gap:6px">
            <button class="btn sm sec" data-buy="food">🌾 ۱۰۰ غذا ↔ ۸۰ سکه</button>
            <button class="btn sm sec" data-buy="wood">🪵 ۱۰۰ چوب ↔ ۸۰ سکه</button>
            <button class="btn sm sec" data-buy="metal">⚙️ ۱۰۰ فلز ↔ ۱۲۰ سکه</button>
            <button class="btn sm sec" data-buy="energy">⚡ ۱۰۰ انرژی ↔ ۱۰۰ سکه</button>
          </div>
          <div class="row" style="flex-wrap:wrap;margin-top:6px;gap:6px">
            <button class="btn sm sec" data-sell="food">فروش ۱۰۰ غذا +۸۰</button>
            <button class="btn sm sec" data-sell="wood">فروش ۱۰۰ چوب +۸۰</button>
            <button class="btn sm sec" data-sell="metal">فروش ۱۰۰ فلز +۱۲۰</button>
          </div></div>
        <div class="card" style="margin-top:10px"><b>خلاصه اقتصاد</b>
          <div class="muted">نیروهای فعال: ${fa(units)} (نگهداری: ${fa(Math.round(units*0.06*60))} سکه در دقیقه)</div>
          <div class="muted">قراردادهای تجاری فعال: ${fa(r.trade.length)} (${r.trade.map(nameOf).join('، ')||'—'})</div></div>`;
      body.querySelectorAll('[data-tax]').forEach(b=> b.onclick=()=>{ Engine.setTax(b.dataset.tax); this.renderManageBody(); });
      body.querySelectorAll('[data-buy]').forEach(b=> b.onclick=()=>{
        const price={food:80,wood:80,metal:120,energy:100}[b.dataset.buy];
        if(Engine.canPay({coins:price})){ Engine.pay({coins:price}); r.res[b.dataset.buy]+=100; this.toast('خرید انجام شد','good'); Engine.save(); } else this.toast('سکه کافی نداری','bad');
        this.renderManageBody();
      });
      body.querySelectorAll('[data-sell]').forEach(b=> b.onclick=()=>{
        const gain={food:80,wood:80,metal:120}[b.dataset.sell];
        if(r.res[b.dataset.sell]>=100){ r.res[b.dataset.sell]-=100; Engine.addCoins(gain); this.toast('فروش انجام شد','good'); Engine.save(); } else this.toast('مقدار کافی نداری','bad');
        this.renderManageBody();
      });
    } else if(this.manageTab==='tech'){
      body.innerHTML=`<p class="hintline">فناوری انباشته‌شده: <b class="num">${fa(Math.floor(r.res.tech))}</b> — از دانشگاه‌ها به دست می‌آید.</p>`+
        Object.keys(TECHS).map(k=>{ const t=TECHS[k]; const lv=Engine.techLv(k); const cost=Math.round(60*Math.pow(1.8,lv));
          return `<div class="mrow"><span class="ic">${t.ic}</span><div class="mid"><div class="tt">${t.n} — سطح ${fa(lv)}/۵</div><div class="muted">${t.desc}</div></div>
          <button class="btn sm" data-tech="${k}" ${lv>=5?'disabled':''}>${lv>=5?'کامل':fa(cost)+' 🔬'}</button></div>`; }).join('');
      body.querySelectorAll('[data-tech]').forEach(b=> b.onclick=()=>{ Engine.research(b.dataset.tech); this.renderManageBody(); });
    } else {
      const terr=r.territories;
      body.innerHTML=`<p class="hintline">قلمرو کشور شما: پایتخت و ${fa(r.cities.length-1)} شهر + <b>${fa(terr.length)}</b> قلمرو تصرف‌شده از کشورهای دیگر.</p>`+
        (terr.length? terr.map(t=>`<div class="mrow"><span class="ic">⚑</span><div class="mid"><div class="tt">${t.city}</div><div class="muted">از ${nameOf(t.id)}</div></div></div>`).join(''):'')
        +(r.annexed.length? '<p class="hintline" style="color:#7dedab">👑 کشورهای الحاق‌شده: '+r.annexed.map(nameOf).join('، ')+'</p>':'')
        +`<p class="hintline">گسترش قلمرو با دو راه ممکن است: <b>مذاکره و خرید</b> (دوستی لازم دارد) یا <b>جنگ استراتژیک</b>.</p>`;
    }
  },
  buildingRows(city){
    const used=Object.keys(city.b).filter(k=>city.b[k]>0).length;
    const slots=CITY_SLOTS(city.cap);
    let html=`<div class="muted" style="margin-top:6px">جای‌های ساختمان: ${fa(used)}/${fa(slots)}</div>`;
    html+=Object.keys(BUILDINGS).map(k=>{
      const b=BUILDINGS[k]; const lvl=city.b[k]||0;
      const cost=Engine.buildCost(k,lvl);
      const full=!city.b[k]&&used>=slots;
      return `<div class="bslot"><span class="bi">${b.ic}</span><span class="bn">${b.n}<br><span class="muted" style="font-size:10.5px">${b.desc}</span></span>
        <span class="bl">${lvl?'سطح '+fa(lvl):''}</span>
        <button class="btn sm ${full?'':'sec'}" data-b="${k}" ${full?'disabled':''}>${lvl?'⬆ '+fa(cost):'＋ '+fa(cost)}</button></div>`;
    }).join('');
    return html;
  },

  /* ---------- ارتش ---------- */
  showArmy(){
    const r=Engine.R();
    const rows=UNIT_KEYS.map(k=>{ const u=UNITS[k]; const mult=1-0.05*cityLvlOf(r,'barracks');
      const cost={coins:Math.round(u.cost.coins*mult), manpower:u.cost.manpower};
      for(const key in u.cost){ if(key!=='coins'&&key!=='manpower') cost[key]=u.cost[key]; }
      const costTxt=Object.keys(cost).map(c=>fa(cost[c])+' '+RES_META[c].ic).join(' ');
      return `<div class="mrow"><span class="ic">${u.ic}</span>
        <div class="mid"><div class="tt">${u.n} <span class="chip">داری: ${fa(r.army[k])}</span></div>
        <div class="muted">قدرت: ${fa(u.pow)} · هزینه: ${costTxt}</div></div>
        <span class="row"><button class="btn sm sec" data-u="${k}" data-n="1">＋۱</button><button class="btn sm" data-u="${k}" data-n="5">＋۵</button></span></div>`;
    }).join('');
    const total=Object.keys(r.army).map(k=>`${UNITS[k].ic}${fa(r.army[k])}`).join(' · ');
    const ov=this.modal('ارتش', `<div class="card" style="margin-bottom:10px">قدرت کل ارتش: <b class="num" style="font-size:18px">${fa(Engine.armyPower())}</b>
      <div class="muted" style="margin-top:4px">${total}</div>
      <div class="muted">نیروی انسانی آماده: ${fa(Math.floor(r.res.manpower))} ${RES_META.manpower.ic}</div></div>${rows}`);
    ov.querySelectorAll('[data-u]').forEach(b=> b.onclick=()=>{ if(Engine.trainUnit(b.dataset.u, +b.dataset.n)) this.showArmy(); });
  },

  /* ---------- دیپلماسی ---------- */
  showDiplo(){
    const r=Engine.R();
    const ids=listOthers();
    const rows=ids.map(id=>{
      const c=countryById(id); const rel=r.relations[id]||0; const st=relStatus(rel);
      const isWar=r.wars.includes(id), isAlly=r.allies.includes(id), isTrade=r.trade.includes(id);
      return `<div class="drow">${flagBall(c,38,'dp-'+id)}
        <div class="mid"><div class="nm">${c.n}</div>
        <div><span class="tag ${st.c}">${st.n}</span> <span class="muted">${fa(rel)}</span>${isWar?' <span class="tag enemy">⚔️</span>':''}${isAlly?' <span class="tag friend">🛡️</span>':''}${isTrade?' <span class="tag neutral">🤝</span>':''}</div></div>
        <button class="btn sm sec" data-id="${id}">اقدامات</button></div>`;
    }).join('');
    const ov=this.modal('دیپلماسی', `<p class="hintline">چهار وضعیت رابطه: <span class="tag friend">دوستی</span> <span class="tag neutral">بی‌طرفی</span> <span class="tag tension">تنش</span> <span class="tag enemy">دشمنی</span> — اعتبار دیپلماتیک فعلی: <b>${fa(Math.round(r.credibility))}</b></p>${rows}`);
    ov.querySelectorAll('[data-id]').forEach(b=> b.onclick=()=>{ this.close(); this.showCountryModal(b.dataset.id); });
  },

  /* ---------- صندوق‌ها ---------- */
  showChests(){
    const m=Engine.S.meta;
    const probs=Object.keys(CHEST_TYPES).filter(k=>CHEST_TYPES[k].w>0).map(k=>{ const t=CHEST_TYPES[k]; const tot=Object.keys(CHEST_TYPES).filter(x=>CHEST_TYPES[x].w>0).reduce((a,x)=>a+CHEST_TYPES[x].w,0);
      return `<span class="chip">${t.ic} ${t.n}: ${fa(Math.round(100*t.w/tot))}٪</span>`; }).join(' ');
    let body='';
    if(m.cycle){
      const left=9-m.cycle.opened;
      body=`<div class="spread"><b>از ۱۰ صندوق، ${fa(left)} بازکردن باقی مانده</b><span class="chip">باز‌شده: ${fa(m.cycle.opened)}/۹</span></div>
        <div class="chestgrid" style="margin-top:12px">
        ${m.cycle.chests.map((ch,i)=>{ const t=CHEST_TYPES[ch.type];
          return `<div class="chest ${ch.opened?'opened':''}" data-ch="${i}">
            <span class="em">${ch.opened?'📭':t.ic}</span>
            <span class="tn">${ch.opened?'باز شد':t.n}</span>
            ${(!ch.opened&&m.cycle.opened===9)?'<span style="color:var(--gold)">🔒 ویژه بعدی</span>':''}
          </div>`; }).join('')}</div>`;
    } else if(m.pendingSpecial){
      body=`<div class="centerbox"><div class="bigicon">👑</div><b>صندوق ویژه باقی‌مانده ذخیره شد</b>
        <p class="hintline">با پر شدن مجدد انرژی صندوق، این صندوق با جایزه دوبرابر باز می‌شود.</p>
        ${meterHTML(m)}</div>`;
    } else {
      body=`<div class="centerbox"><div class="bigicon">📦</div><b>چرخه صندوق فعال نیست</b>
        <p class="hintline">با ساخت ساختمان، مأموریت، نبرد و پاداش روزانه، «انرژی صندوق» را پر کن. در هر چرخه ۱۰ صندوق می‌بینی و ۹ تا را باز می‌کنی؛ صندوق دهم ویژه چرخه بعد می‌شود.</p>
        ${meterHTML(m)}</div>`;
    }
    function meterHTML(mm){ return `<div class="bar" style="height:12px;margin:12px 0"><i style="width:${mm.chestMeter}%"></i></div>
      <div class="muted">انرژی صندوق: ${fa(mm.chestMeter)}/۱۰۰</div>`; }
    const ov=this.modal('صندوق‌ها', body+`<p class="hintline">احتمال انواع صندوق (شفاف): ${probs}</p>`);
    ov.querySelectorAll('[data-ch]').forEach(el=>{
      el.onclick=()=>{
        const i=+el.dataset.ch; const ch=m.cycle&&m.cycle.chests[i]; if(!ch||ch.opened) return;
        const loot=Engine.openChest(i);
        if(loot) this.showLoot(CHEST_TYPES[ch.type].n, loot, ch.type);
        if(this.openModalEl===ov) this.showChests(); else ov.remove();
      };
    });
  },
  showLoot(title, loot, type){
    Sfx.play(loot.t==='coins'?'coin':'chest');
    const ic={coins:'🪙',xp:'⭐',res:'🧰',manpower:'🧑‍🤝‍🧑',unit:UNITS[Object.keys(UNITS)[0]].ic,frag:'🧩',ticket:'🎟️',skin:'🎌'};
    let val='';
    if(loot.t==='coins') val=fa(loot.v)+' سکه';
    else if(loot.t==='xp') val=fa(loot.v)+' تجربه';
    else if(loot.t==='res') val='بسته منابع ('+fa(loot.v/2)+' از هر یک)';
    else if(loot.t==='manpower') val=fa(loot.v)+' نیروی انسانی';
    else if(loot.t==='unit') val='۱ '+ (loot.detail||'نیروی نظامی');
    else if(loot.t==='frag') val=fa(loot.v)+' قطعه — '+(loot.detail||'کشور');
    else if(loot.t==='ticket') val=fa(loot.v)+' بلیت جبران';
    else if(loot.t==='skin') val='ظاهر «'+(loot.detail||'فصلی')+'» باز شد!';
    this.modal('🎉 '+title, `<div class="lootcard"><div class="em">${ic[loot.t]||'🎁'}</div>
      <div class="big">${val}</div><div class="muted">${CHEST_TYPES[type]?CHEST_TYPES[type].n:''}</div></div>`, {center:true});
    this.toast('🎁 جوایز صندوق دریافت شد','gold');
  },

  /* ---------- پاداش روزانه ---------- */
  showDaily(){
    const m=Engine.S.meta; const today=todayStr();
    const claimedToday=m.daily.last===today;
    const curDay=((m.daily.streak-1)%30)+1;
    const days=Array.from({length:30},(_,i)=>{
      const d=i+1; const done=claimedToday? d<=curDay : d<curDay || (d===curDay&&false);
      const isToday=d===curDay&&!claimedToday;
      const c=100+d*40+(d===30?2000:0);
      return `<div class="dday ${d<=curDay&&claimedToday?'done':''} ${isToday?'today':''}">
        <div class="d">روز ${fa(d)}</div><div class="r">${fa(c)}🪙${d%5===0?'<br>📦':''}${d===30?'<br>👑':''}</div></div>`;
    }).join('');
    const ov=this.modal('📅 پاداش روزانه', `
      <div class="spread"><span class="chip">زنجیره ورود: ${fa(m.daily.streak)} روز</span>
      <span class="chip">🎟️ بلیت جبران: ${fa(m.tickets)}</span></div>
      <div class="dgrid" style="margin:12px 0">${days}</div>
      <button class="btn wide" id="claim" ${claimedToday?'disabled':''}>${claimedToday?'✓ پاداش امروز گرفته شد':'دریافت پاداش امروز'}</button>
      <p class="hintline">اگر یک روز غیبت کنی، زنجیره قطع می‌شود؛ اما با «بلیت جبران» می‌توانی ادامه‌اش بدهی. هر ۵ روز یک جایزه صندوق اضافه است و روز ۳۰ جایزه بزرگ در انتظار توست.</p>`);
    const btn=$('#claim',ov); if(btn) btn.onclick=()=>{
      const res=Engine.claimDaily(false);
      if(res&&res.missed){
        this.close();
        const ov2=this.modal('روزانه از دست رفت!', `<div class="centerbox"><div class="bigicon">🎟️</div>
          <p class="hintline">یک روز غیبت داشتی. زنجیره ${fa(m.daily.streak)} روزه‌ات در خطر است!</p>
          ${m.tickets>0?`<button class="btn wide" id="useTicket">استفاده از بلیت جبران (${fa(m.tickets)} عدد داری)</button>
          <button class="btn sec wide" style="margin-top:8px" id="noTicket">از روز اول شروع کن</button>`:
          `<button class="btn sec wide" id="noTicket">از روز اول شروع کن</button>`}</div>`,{center:true});
        const ut=$('#useTicket',ov2); if(ut) ut.onclick=()=>{ const rr=Engine.claimDaily(true); ov2.remove(); if(rr) this.dailyResult(rr); };
        $('#noTicket',ov2).onclick=()=>{ const rr=Engine.claimDaily(false); ov2.remove(); if(rr) this.dailyResult(rr); };
        return;
      }
      if(res) this.dailyResult(res);
    };
  },
  dailyResult(res){
    Engine.save();
    this.modal('🎁 پاداش روز '+fa(res.day), `<div class="lootcard"><div class="em">🪙</div>
      <div class="big">${fa(res.coins)} سکه</div>
      <div class="muted">${res.extra?res.extra.join(' · '):''}</div></div>`,{center:true});
    if(this.currentScreen==='game') this.refresh();
  },

  /* ---------- مأموریت و دستاورد ---------- */
  showMissions(){
    const r=Engine.R(); const m=Engine.S.meta;
    const cur=MISSIONS[r.missionIdx];
    const curHTML= cur? `<div class="mrow" style="border-color:var(--gold)"><span class="ic">${cur.ic}</span>
      <div class="mid"><div class="tt">مأموریت فعلی: ${cur.n}</div><div class="rr">پاداش: ${fa(cur.rc.coins||0)} سکه ${cur.xp?'+ '+fa(cur.xp)+' تجربه':''}</div></div></div>`
      : `<div class="card" style="text-align:center"><b>🏆 همه مأموریت‌ها انجام شد!</b></div>`;
    const achHTML=ACHIEVEMENTS.map(a=>{ const got=m.achievements[a.id];
      return `<div class="mrow ${got?'done':''}"><span class="ic">${a.ic}</span>
      <div class="mid"><div class="tt">${a.n}</div><div class="muted">${a.d}</div></div>
      ${got?'<span class="tag friend">✓ گرفته شد</span>':'<span class="tag neutral">قفل</span>'}</div>`; }).join('');
    this.modal('📜 مأموریت‌ها و دستاوردها', `<b>مأموریت‌ها (ترتیبی)</b><div style="margin:8px 0">${curHTML}</div>
      <div class="muted">انجام‌شده: ${fa(r.missionIdx)} از ${fa(MISSIONS.length)}</div>
      <hr style="border-color:var(--line);margin:12px 0"><b>دستاوردها</b><div style="margin-top:8px">${achHTML}</div>`);
  },

  /* ---------- رویداد فصلی ---------- */
  showSeason(){
    const info=Engine.seasonInfo();
    const s=Engine.S.meta.season; const th=info.theme;
    const rewardText=r=>({coins:fa(r.v)+' سکه 🪙', chest:fa(r.v)+' صندوق فصلی 🎊', ticket:'بلیت جبران 🎟️', frag:fa(r.v)+' قطعه کشور 🧩', xp:fa(r.v)+' تجربه ⭐', skin:'ظاهر «پرچم فصلی» 🎌'})[r.t]||'';
    const missionsHTML=th.missions.map((ms,i)=>{
      const cur=Math.min(s.stats[ms.key]||0, ms.target); const done=cur>=ms.target; const claimed=s.claimedM.includes(i);
      return `<div class="mrow ${claimed?'done':''}"><span class="ic">${ms.ic}</span>
        <div class="mid"><div class="tt">${ms.n}</div>
        <div class="bar" style="margin-top:5px"><i style="width:${Math.round(100*cur/ms.target)}%"></i></div>
        <div class="muted">${fa(cur)}/${fa(ms.target)} · پاداش: ${fa(ms.rc)} 🪙 + ${fa(ms.pts)} امتیاز</div></div>
        ${claimed?'<span class="tag friend">✓</span>': done?`<button class="btn sm" data-sm="${i}">دریافت</button>`:'<span class="tag neutral">در جریان</span>'}</div>`;
    }).join('');
    const trackHTML=SEASON_TRACK.map(t=>{
      const claimed=s.claimedTiers.includes(t.pts); const can=s.pts>=t.pts;
      return `<div class="mrow ${claimed?'done':''}" style="padding:8px"><span class="ic">${claimed?'✅':can?'🎁':'🔒'}</span>
        <div class="mid"><div class="tt">${fa(t.pts)} امتیاز فصل</div><div class="muted">${rewardText(t.r)}</div></div>
        ${claimed?'':can?`<button class="btn sm" data-st="${t.pts}">دریافت</button>`:'<span class="tag neutral">قفل</span>'}</div>`;
    }).join('');
    const ov=this.modal('🎊 رویداد فصلی', `
      <div class="card" style="text-align:center">
        <div class="bigicon">${th.ic}</div>
        <b style="font-size:16px">فصل ${fa(info.num)}: ${th.n}</b>
        <div class="muted" style="margin-top:4px">${th.desc}</div>
        <div class="row" style="justify-content:center;margin-top:8px">
          <span class="chip">⏳ ${fa(info.remain)} روز مانده</span>
          <span class="chip">⭐ امتیاز فصل: ${fa(s.pts)}</span>
        </div>
      </div>
      <b style="display:block;margin:12px 0 8px">📜 مأموریت‌های محدود فصل</b>${missionsHTML}
      <b style="display:block;margin:14px 0 8px">🏅 مسیر جایزه فصل</b>${trackHTML}
      <div class="card" style="margin-top:12px"><div class="spread">
        <div><b>🎊 صندوق فصلی</b><div class="muted">غنایم بزرگ؛ از تکمیل چرخه صندوق‌ها و مسیر جایزه به دست می‌آید</div></div>
        <button class="btn ${s.chests>0?'':'sec'}" id="sc" ${s.chests<1?'disabled':''}>باز کن (${fa(s.chests)})</button></div></div>
      <p class="hintline">⚠️ با پایان فصل، مأموریت‌ها، امتیازها و صندوق‌های فصلی تازه می‌شوند — قبل از پایان، جوایز را دریافت کن! شمارش فصل با تاریخ واقعی است و آفلاین هم کار می‌کند.</p>`);
    ov.querySelectorAll('[data-sm]').forEach(b=> b.onclick=()=>{ if(Engine.claimSeasonMission(+b.dataset.sm)) this.showSeason(); });
    ov.querySelectorAll('[data-st]').forEach(b=> b.onclick=()=>{ if(Engine.claimSeasonTier(+b.dataset.st)) this.showSeason(); });
    const sc=$('#sc',ov); if(sc) sc.onclick=()=>{ const loot=Engine.openSeasonChest(); if(loot) this.showLoot('🎊 صندوق فصلی', loot, 'season'); };
  },

  /* ---------- فروشگاه ---------- */
  showShop(){
    const m=Engine.S.meta;
    const skins=SKINS.map(s=>{ const owned=m.skins.includes(s.id);
      return `<div class="scard ${m.skin===s.id?'eq':''}">${flagBall(countryById(Engine.R().countryId),56,'sk-'+s.id)}
        <div class="nm">${s.ic} ${s.n}</div>
        ${m.skin===s.id?'<span class="tag friend">در حال استفاده</span>'
          : owned?`<button class="btn sm" data-eq="${s.id}">استفاده</button>`
          : s.c<0?`<span class="tag tension">🎊 جایزه فصلی</span>`
          :`<button class="btn sm" data-buy="${s.id}">${fa(s.c)} 🪙</button>`}</div>`; }).join('');
    const ov=this.modal('🛒 فروشگاه', `
      <b>ظاهرهای توپ کشور شما</b><div class="sgrid" style="margin-top:8px">${skins}</div>
      <hr style="border-color:var(--line);margin:12px 0">
      <div class="sgrid"><div class="scard"><div class="bigicon">🎟️</div><div class="nm">بلیت جبران روزانه</div>
        <button class="btn sm" id="buy-ticket">${fa(1000)} 🪙</button><div class="muted">داری: ${fa(m.tickets)}</div></div>
      <div class="scard"><div class="bigicon">🪙</div><div class="nm">بسته سکه</div>
        <button class="btn sm sec" disabled>به‌زودی در نسخه نهایی</button><div class="muted">خرید درون‌برنامه‌ای</div></div></div>`);
    ov.querySelectorAll('[data-buy]').forEach(b=> b.onclick=()=>{
      const s=SKINS.find(x=>x.id===b.dataset.buy);
      if(Engine.canPay({coins:s.c})){ Engine.pay({coins:s.c}); m.skins.push(s.id); this.toast('ظاهر «'+s.n+'» خریداری شد','gold'); Engine.save(); this.showShop(); }
      else this.toast('سکه کافی نداری','bad');
    });
    ov.querySelectorAll('[data-eq]').forEach(b=> b.onclick=()=>{ m.skin=b.dataset.eq; Engine.save(); this.toast('ظاهر عوض شد','good'); this.showShop(); if(this.currentScreen==='game') this.refresh(); });
    const bt=$('#buy-ticket',ov); if(bt) bt.onclick=()=>{ if(Engine.canPay({coins:1000})){ Engine.pay({coins:1000}); m.tickets++; this.toast('بلیت جبران خریداری شد','good'); Engine.save(); this.showShop(); } else this.toast('سکه کافی نداری','bad'); };
  },

  /* ---------- نبرد تاکتیکی نوبتی ---------- */
  showBattle(id, capital){
    const r=Engine.R(); const c=countryById(id); const me=countryById(r.countryId);
    const rem=Engine.remainingCities(id);
    const isNeighbor=c.nb.includes(r.countryId)||me.nb.includes(id);
    const naval=!isNeighbor;
    const canNaval=r.army.navy>=5;
    let formation='assault', commander='none', useCapital=!!capital;
    const ov=this.modal('⚔️ نبرد با '+c.n, `<div id="bs-setup"></div><div id="bs-combat" style="display:none"></div>`);
    const setup=$('#bs-setup',ov), combat=$('#bs-combat',ov);
    const renderSetup=()=>{
      const P=Engine.armyPower(); const D=Engine.enemyPower(id, useCapital);
      setup.innerHTML=`
        <div class="battlestage">
          <div class="bfighter">${flagBall(me,64,'bf-me')}<div class="nm">${me.n}</div>
            <div class="pbar"><div class="bar"><i id="bme" style="width:100%"></i></div></div>
            <div class="muted">قدرت ارتش: <b class="num">${fa(P)}</b></div></div>
          <div class="vs">VS</div>
          <div class="bfighter">${flagBall(c,64,'bf-en')}<div class="nm">${c.n}</div>
            <div class="pbar"><div class="bar"><i id="ben" style="width:100%;background:linear-gradient(90deg,#e74c3c,#ff9c8d)"></i></div></div>
            <div class="muted">دفاع هدف: <b class="num">${fa(D)}</b></div></div>
        </div>
        ${naval?`<p class="hintline">🚢 حمله دریایی: ${canNaval?'امکان‌پذیر (هزینه ۱۵۰ انرژی).':'نیاز به ۵ نیروی دریایی داری.'}</p>`:''}
        <b style="display:block;margin:12px 0 6px">آرایش نبرد</b>
        <div class="optgrid">${Object.keys(FORMATIONS).map(k=>{ const f=FORMATIONS[k];
          return `<div class="optcard ${k===formation?'on':''}" data-f="${k}"><span class="ic">${f.ic}</span><b>${f.n}</b><span class="muted">${f.desc}</span></div>`; }).join('')}</div>
        <b style="display:block;margin:12px 0 6px">فرمانده نبرد</b>
        ${Object.keys(COMMANDERS).map(k=>{ const cm=COMMANDERS[k]; const locked=Engine.S.meta.level<cm.lv;
          return `<div class="crow ${k===commander?'on':''} ${locked?'lock':''}" data-c="${k}"><span class="ci">${cm.ic}</span>
            <div style="flex:1"><b>${cm.n}</b><div class="muted">${cm.desc}</div></div>
            ${locked?`<span class="tag neutral">🔒 سطح ${fa(cm.lv)}</span>`:''}</div>`; }).join('')}
        <div class="row" style="margin-top:12px">
          <button class="btn sm sec" id="capT" ${rem.length<=1?'disabled':''}>${useCapital?'👑 هدف: پایتخت (دفاع بیشتر)':'🏳️ هدف: منطقه مرزی'}</button>
          <button class="btn green" style="flex:1" id="goB" ${naval&&!canNaval?'disabled':''}>💥 شروع نبرد</button>
        </div>
        <p class="hintline">آرایش و فرمانده کل نبرد را شکل می‌دهند؛ در هر دور هم تاکتیک انتخاب می‌کنی. مهندسان دیوار دشمن را از قبل ضعیف می‌کنند.</p>`;
      setup.querySelectorAll('[data-f]').forEach(el=> el.onclick=()=>{ formation=el.dataset.f; renderSetup(); });
      setup.querySelectorAll('[data-c]').forEach(el=> el.onclick=()=>{
        const cm=COMMANDERS[el.dataset.c];
        if(Engine.S.meta.level<cm.lv){ UI.toast('این فرمانده در سطح '+fa(cm.lv)+' باز می‌شود','bad'); return; }
        commander=el.dataset.c; renderSetup(); });
      const ct=$('#capT',setup); if(ct) ct.onclick=()=>{ if(rem.length<=1) return; useCapital=!useCapital; renderSetup(); };
      $('#goB',setup).onclick=start;
    };
    const start=()=>{
      const st=Engine.battleInit(id, useCapital, formation, commander);
      if(!st){ ov.remove(); return; }
      if(naval){ r.res.energy=Math.max(0,r.res.energy-150); }
      Sfx.play('war');
      setup.style.display='none'; combat.style.display='';
      renderCombat(st);
    };
    const renderCombat=(st)=>{
      combat.innerHTML=`
        <div class="battlestage">
          <div class="bfighter" id="bw-me">${flagBall(me,64,'bf-me2')}<div class="nm">${me.n}</div>
            <div class="pbar"><div class="bar"><i id="cme" style="width:100%"></i></div></div>
            <div class="muted">توان: <b class="num" id="cpv">${fa(Math.round(st.p))}</b> / ${fa(st.pMax)}</div></div>
          <div class="vs"><div id="cround" style="font-size:14px">دور ${fa(st.round)}/۸</div></div>
          <div class="bfighter" id="bw-en">${flagBall(c,64,'bf-en2')}<div class="nm">${c.n}</div>
            <div class="pbar"><div class="bar"><i id="cen" style="width:100%;background:linear-gradient(90deg,#e74c3c,#ff9c8d)"></i></div></div>
            <div class="muted">دفاع: <b class="num" id="cev">${fa(Math.round(st.e))}</b> / ${fa(st.eMax)}</div></div>
        </div>
        <div class="chip" style="margin-top:8px">${st.f.ic} ${st.f.n} · ${st.cm.ic} ${st.cm.n} ${st.isCap?'· 👑 پایتخت':''}</div>
        <div class="combatlog" id="clog">نبرد آغاز شد! هر دور یک تاکتیک انتخاب کن.</div>
        <div class="optgrid" style="margin-top:10px" id="cacts">
          ${Object.keys(BATTLE_ACTIONS).map(k=>{ const a=BATTLE_ACTIONS[k];
            return `<div class="optcard ${k==='retreat'?'':'on-lite'}" data-a="${k}" ${k==='retreat'?'style="border-color:#7a3b32"':''}><span class="ic">${a.ic}</span><b>${a.n}</b><span class="muted">${a.desc}</span></div>`; }).join('')}
        </div>`;
      combat.querySelectorAll('[data-a]').forEach(el=> el.onclick=()=>{
        const k=el.dataset.a;
        if(k==='retreat'){ finish(st, true); return; }
        const lines=Engine.battleRound(st, k);
        const lg=$('#clog',ov);
        lines.forEach(l=>{ lg.innerHTML+=l+'<br>'; });
        lg.scrollTop=lg.scrollHeight;
        // انیمیشن کارتونی ضربه
        $('#bw-en',ov).classList.add('hit'); setTimeout(()=>$('#bw-en',ov)?.classList.remove('hit'),400);
        if(lines.some(l=>l.includes('دریافتی شما')) && !lines.some(l=>l.includes('مانور'))){ $('#bw-me',ov).classList.add('hit'); setTimeout(()=>$('#bw-me',ov)?.classList.remove('hit'),400); }
        updateBars(st);
        if(st.over) finish(st, false);
      });
    };
    const updateBars=(st)=>{
      $('#cme',ov).style.width=Math.max(0,Math.round(100*st.p/st.pMax))+'%';
      $('#cen',ov).style.width=Math.max(0,Math.round(100*st.e/st.eMax))+'%';
      $('#cpv',ov).textContent=fa(Math.round(st.p));
      $('#cev',ov).textContent=fa(Math.round(st.e));
      $('#cround',ov).textContent='دور '+fa(st.round)+'/۸';
    };
    const finish=(st, retreat)=>{
      const res=Engine.battleFinish(st, {retreat});
      const acts=$('#cacts',ov); if(acts){ acts.style.opacity='.35'; acts.style.pointerEvents='none'; }
      const lg=$('#clog',ov); if(lg){
        const msg= res.retreat? '🏳️ عقب‌نشینی سازمان‌یافته انجام شد — تلفات حداقلی.'
          : res.win? '🏳️ پیروزی! منطقه «'+res.target+'» تصرف شد. (تلفات ~'+fa(res.lossPct)+'٪)'
          : '🛡️ شکست! نیروهای باقی‌مانده عقب کشیدند. (تلفات ~'+fa(res.lossPct)+'٪)';
        lg.innerHTML+='<b style="color:'+(res.win&&!res.retreat?'var(--gold)':'var(--dim)')+'">'+msg+'</b><br>';
        lg.scrollTop=lg.scrollHeight;
      }
      Sfx.play(res.win&&!res.retreat?'win':'lose');
      const btn=document.createElement('button'); btn.className='btn wide'; btn.style.marginTop='10px'; btn.textContent='ادامه';
      btn.onclick=()=>{ ov.remove(); this.refresh(); };
      combat.appendChild(btn);
    };
    renderSetup();
  },

  /* ---------- ویرایشگر: افزودن کشور ---------- */
  addCustomCountry(){
    const ov=this.modal('＋ کشور سفارشی جدید', `
      <p class="hintline">کشور توپی جدید روی نقشه بساز. برای انتخاب جای توپ، بعد از ذخیره آن را با انگشت روی نقشه بکش.</p>
      <div class="card">
        <div class="spread" style="margin-bottom:8px"><span>نام کشور</span><input id="cc-n" style="background:#0b1322;border:1px solid var(--line);border-radius:8px;color:var(--txt);padding:6px 10px" placeholder="مثلاً: سرزمین رنگین‌کمان"></div>
        <div class="spread" style="margin-bottom:8px"><span>پایتخت</span><input id="cc-cap" style="background:#0b1322;border:1px solid var(--line);border-radius:8px;color:var(--txt);padding:6px 10px" placeholder="مثلاً: شهر نو"></div>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          ${[1,2,3].map(i=>`<label style="flex:1;text-align:center">رنگ ${fa(i)}<br><input type="color" id="cc-c${i}" value="${['#3fa7f5','#ffffff','#e74c3c'][i-1]}" style="width:100%;height:34px;background:none;border:none"></label>`).join('')}
        </div>
        <div class="spread" style="margin-top:8px"><span>نوع پرچم</span>
          <select id="cc-t" style="background:#0b1322;color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:6px">
            <option value="h">راه‌راه افقی</option><option value="v">راه‌راه عمودی</option><option value="b">تک‌رنگ</option>
          </select></div>
        <div class="spread" style="margin-top:8px"><span>نشان مرکزی</span>
          <select id="cc-e" style="background:#0b1322;color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:6px">
            <option value="">بدون نشان</option><option value="circle">دایره</option><option value="star">ستاره</option><option value="crescent">هلال</option><option value="cross">صلیب</option><option value="bar">نوار</option>
          </select></div>
      </div>
      <button class="btn wide" style="margin-top:12px" id="cc-save">ایجاد کشور روی نقشه</button>`);
    $('#cc-save',ov).onclick=()=>{
      const n=$('#cc-n',ov).value.trim()||'کشور نو';
      const cap=$('#cc-cap',ov).value.trim()||'پایتخت نو';
      const f={t:$('#cc-t',ov).value, c:[$('#cc-c1',ov).value,$('#cc-c2',ov).value,$('#cc-c3',ov).value]};
      const e=$('#cc-e',ov).value; if(e) f.e={k:e, c:'#f0b429'};
      const p=this.worldCenter();
      const cust={id:'u'+Date.now(), n, cap, cities:['شهر نو'], tier:1, lv:1, nb:[], f, pos:p, pop:5, sc:Engine.S.scenario, custom:true};
      // نزدیک‌ترین ۳ کشور به‌عنوان همسایه
      const others=countriesOf(Engine.S.scenario).filter(c=>c.id!==cust.id)
        .map(c=>({id:c.id, d:Math.hypot(c.pos[0]-p[0], c.pos[1]-p[1])})).sort((a,b)=>a.d-b.d).slice(0,3);
      cust.nb=others.map(o=>o.id);
      Engine.S.meta.custom.push(cust);
      Engine.save(); MapView.rebuild(); ov.remove();
      this.toast('🗺️ کشور «'+n+'» به نقشه افزوده شد — جای آن را بکش','gold');
      Engine.checkAchievements();
    };
  },
  worldCenter(){
    const svg=$('#mapsvg'); const vb=svg.viewBox.baseVal; const rect=svg.getBoundingClientRect();
    const cx=vb.x+(rect.width/2)/rect.width*vb.width, cy=vb.y+(rect.height/2)/rect.height*vb.height;
    return [Math.round((cx-MapView.tx)/MapView.k), Math.round((cy-MapView.ty)/MapView.k)];
  },

  /* ---------- حساب کاربری و ذخیره ابری ---------- */
  showAccount(){
    const acc=Engine.S.meta.account;
    if(!acc.user){
      const ov=this.modal('☁️ حساب کاربری و ذخیره ابری', `
        <div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <button class="btn sm ${acc.adapter==='local'?'':'sec'}" data-ad="local">📱 دستگاه (شبیه‌ساز ابری)</button>
          <button class="btn sm ${acc.adapter==='http'?'':'sec'}" data-ad="http">🌐 سرور ابری (HTTP)</button>
        </div>
        ${acc.adapter==='http'?`<div class="spread" style="margin-bottom:8px"><span class="muted">آدرس سرور</span><input class="inp" id="ac-ep" placeholder="http://192.168.1.5:8787" value="${acc.endpoint||''}"></div>`:''}
        <div class="card">
          <div class="spread" style="margin-bottom:8px"><span>نام کاربری</span><input class="inp" id="ac-u" placeholder="حداقل ۳ نویسه"></div>
          <div class="spread"><span>رمز عبور</span><input class="inp" id="ac-p" type="password" placeholder="حداقل ۴ نویسه"></div>
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn" style="flex:1" id="ac-login">ورود</button>
          <button class="btn sec" style="flex:1" id="ac-reg">ثبت‌نام</button>
        </div>
        <p class="hintline">📦 نسخه ابری دقیقاً همان «کد پشتیبان» بازی است؛ پس با بخش پشتیبان‌گیری تنظیمات و انتقال دستی هم سازگار است.
        🔐 رمز به‌صورت هش SHA-256 ذخیره/ارسال می‌شود. برای استفاده واقعی روی اینترنت، سرور را با HTTPS منتشر کن (سرور نمونه در پوشه server).</p>`);
      ov.querySelectorAll('[data-ad]').forEach(b=> b.onclick=()=>{ acc.adapter=b.dataset.ad; Engine.save(); this.showAccount(); });
      const doAuth=async(kind)=>{
        const ep=$('#ac-ep',ov); if(ep){ acc.endpoint=ep.value.trim(); }
        const u=$('#ac-u',ov).value.trim(), p=$('#ac-p',ov).value;
        try{
          if(kind==='login') await Cloud.login(u,p); else await Cloud.register(u,p);
          UI.toast('☁️ خوش آمدی، '+u+'!','good'); Engine.save(); this.showAccount();
        }catch(e){ UI.toast('☁️ '+e.message,'bad'); }
      };
      $('#ac-login',ov).onclick=()=>doAuth('login');
      $('#ac-reg',ov).onclick=()=>doAuth('reg');
      return;
    }
    const adName=Cloud.adapter().name;
    const ov=this.modal('☁️ حساب کاربری', `
      <div class="card" style="text-align:center">
        <div class="bigicon">👤</div>
        <b style="font-size:16px">${acc.user}</b>
        <div class="row" style="justify-content:center;margin-top:8px">
          <span class="chip">${adName}</span>
          <span class="chip">⏱️ آخرین همگام‌سازی: ${Cloud.timeAgo(acc.lastSync)}</span>
        </div>
        ${Cloud._mem.lastError?`<div class="muted" style="color:var(--red);margin-top:6px">آخرین خطا: ${Cloud._mem.lastError}</div>`:''}
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn" style="flex:1" id="ac-up">⬆️ بارگذاری در ابری</button>
        <button class="btn blue" style="flex:1" id="ac-down">⬇️ بازیابی از ابری</button>
      </div>
      <div class="setrow" style="margin-top:8px"><span>🔄 همگام‌سازی خودکار</span>
        <button class="btn sm ${acc.autoSync?'green':'sec'}" id="ac-auto">${acc.autoSync?'روشن':'خاموش'}</button></div>
      <div class="setrow"><span>🚪 خروج از حساب</span><button class="btn sm red" id="ac-out">خروج</button></div>
      <p class="hintline">با همگام‌سازی خودکار، پس از رویدادهای مهم و هر دو دقیقه، وضعیت به ابری فرستاده می‌شود؛ هنگام خروج از بازی هم آخرین وضعیت ارسال می‌شود.
      برای انتقال به گوشی دیگر: وارد همان حساب شو و «بازیابی از ابری» را بزن.</p>`);
    $('#ac-up',ov).onclick=async()=>{
      try{ await Cloud.upload(true); UI.toast('☁️ پیشرفت در ابری ذخیره شد','good'); this.showAccount(); }
      catch(e){ Cloud._mem.lastError=e.message; UI.toast('☁️ '+e.message,'bad'); this.showAccount(); }
    };
    $('#ac-down',ov).onclick=()=>this.cloudRestoreFlow();
    $('#ac-auto',ov).onclick=()=>{ acc.autoSync=!acc.autoSync; Engine.save(); this.showAccount(); };
    $('#ac-out',ov).onclick=()=>{ Cloud.logout(); UI.toast('از حساب خارج شدی (پیشرفت محلی دست‌نخورده ماند)'); this.showAccount(); };
  },
  async cloudRestoreFlow(){
    try{
      const env=await Cloud.download();
      const core=(s)=>{ try{ const j=JSON.parse(decodeURIComponent(escape(atob(s)))); if(j.meta){ delete j.meta.lastSaveAt; delete j.meta.account; } return JSON.stringify(j); }catch(e){ return s; } };
      if(core(env.snapshot)===core(Engine.export())){ UI.toast('☁️ نسخه ابری و دستگاه یکسان است — همگام!','good'); return; }
      const cl=Cloud.summarize(env) || {level:'؟',coins:'؟',territory:'؟',savedAt:env.savedAt};
      const lo={level:Engine.S.meta.level, coins:Engine.S.meta.coins,
        territory: Engine.R()? Engine.R().territories.length:0, savedAt:Engine.S.meta.lastSaveAt};
      const card=(t,d,hl)=>`<div class="card ${hl?'':''}" style="flex:1;text-align:center;${hl?'border-color:var(--gold)':''}">
        <b>${t}</b><div class="muted" style="margin-top:6px;line-height:2.2">سطح: ${fa(d.level)}<br>سکه: ${fa(d.coins)}<br>قلمرو: ${fa(d.territory)}<br>${Cloud.timeAgo(d.savedAt)}</div></div>`;
      this.close();
      const ov=this.modal('☁️ انتخاب نسخه پیشرفت', `
        <p class="hintline">نسخه ابری با نسخه دستگاه تفاوت دارد. کدام را نگه می‌داری؟</p>
        <div class="row" style="align-items:stretch">${card('☁️ ابری',cl,true)}${card('📱 دستگاه',lo)}</div>
        <div class="row" style="margin-top:12px">
          <button class="btn blue" style="flex:1" id="cf-cloud">بازیابی نسخه ابری</button>
          <button class="btn sec" style="flex:1" id="cf-local">نگه‌داشتن دستگاه (بارگذاری در ابری)</button>
        </div>
        <p class="hintline">نسخه‌ای که انتخاب نکنی، جایگزین می‌شود؛ برای اطمینان می‌توانی اول از تنظیمات «کد پشتیبان» را کپی کنی.</p>`, {center:true});
      $('#cf-cloud',ov).onclick=()=>{
        Engine.import(env.snapshot);
        Engine.save();
        ov.remove(); this.close();
        UI.toast('☁️ نسخه ابری بازیابی شد — '+fa(Engine.S.meta.coins)+' سکه، سطح '+fa(Engine.S.meta.level),'good');
        this.show('menu');
      };
      $('#cf-local',ov).onclick=async()=>{
        ov.remove();
        try{ await Cloud.upload(true); UI.toast('☁️ نسخه دستگاه در ابری ذخیره شد','good'); }
        catch(e){ UI.toast('☁️ '+e.message,'bad'); }
        this.showAccount();
      };
    }catch(e){ UI.toast('☁️ '+e.message,'bad'); }
  },

  /* ---------- تنظیمات ---------- */
  showSettings(){
    const m=Engine.S.meta;
    const ov=this.modal('⚙️ تنظیمات', `
      <div class="setrow"><span>🔊 جلوه‌های صوتی</span><button class="btn sm ${m.sound?'green':'sec'}" id="snd">${m.sound?'روشن':'خاموش'}</button></div>
      <div class="setrow"><span>🎵 موسیقی پس‌زمینه</span><button class="btn sm ${m.music?'green':'sec'}" id="mus">${m.music?'روشن':'خاموش'}</button></div>
      <div class="setrow"><span>💾 ذخیره‌سازی</span><span class="muted">خودکار در دستگاه</span></div>
      <div class="setrow"><span>☁️ حساب کاربری و ذخیره ابری</span><button class="btn sm sec" id="acc">مدیریت</button></div>
      <div class="setrow" style="display:block"><span>📤 پشتیبان‌گیری (کپی این کد جایی امن نگه دار — برای انتقال یا ذخیره ابری):</span>
        <textarea class="savebox" id="exp" readonly>${Engine.export()}</textarea>
        <button class="btn sm sec" id="copy">📋 کپی</button></div>
      <div class="setrow" style="display:block"><span>📥 بازیابی از کد پشتیبان:</span>
        <textarea class="savebox" id="imp" placeholder="کد پشتیبان را اینجا بچسبان"></textarea>
        <button class="btn sm" id="impBtn">بازیابی کن</button></div>
      <div class="setrow"><span>🗑️ پاک‌کردن همه پیشرفت‌ها</span><button class="btn sm red" id="wipe">پاک کن</button></div>
      <p class="hintline">بازی به‌صورت خودکار هنگام رویدادهای مهم و هر ۱۵ ثانیه ذخیره می‌کند. برای ذخیره ابری، کد پشتیبان را در فضای ابری خود (یادداشت، ایمیل و…) نگه دارید.</p>`);
    $('#acc',ov).onclick=()=>{ this.close(); this.showAccount(); };
    $('#snd',ov).onclick=()=>{ m.sound=!m.sound; Engine.save(); if(m.sound) Sfx.play('click'); this.showSettings(); };
    $('#mus',ov).onclick=()=>{ m.music=!m.music; Sfx.setMusic(m.music); Engine.save(); this.showSettings(); };
    $('#copy',ov).onclick=()=>{ const ta=$('#exp',ov); ta.select(); try{ document.execCommand('copy'); }catch(e){} if(navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(()=>{}); this.toast('کد پشتیبان کپی شد','good'); };
    $('#impBtn',ov).onclick=()=>{ try{ Engine.import($('#imp',ov).value); this.toast('پیشرفت بازیابی شد','good'); this.close(); this.show('menu'); }catch(e){ this.toast('کد نامعتبر است','bad'); } };
    $('#wipe',ov).onclick=()=>{ this.close(); const c=this.modal('مطمئنی؟','<div class="centerbox"><p class="hintline">همه پیشرفت برای همیشه پاک می‌شود.</p><button class="btn red wide" id="yes">بله، پاک کن</button><button class="btn sec wide" style="margin-top:8px" id="no">نه، پشیمونم</button></div>',{center:true});
      $('#yes',c).onclick=()=>{ Engine.reset(); c.remove(); this.show('menu'); this.toast('داده‌ها پاک شد'); };
      $('#no',c).onclick=()=>c.remove(); };
  },

  /* ---------- راهنما ---------- */
  showHelp(){
    this.modal('📖 راهنمای بازی', `
      <p class="hintline"><b>🎯 هدف:</b> کشور توپی خودت را به ابرقدرت برسان — با اقتصاد، دیپلماسی یا جنگ.</p>
      <p class="hintline"><b>💰 اقتصاد:</b> در پایتخت و شهرها ساختمان بساز (مزرعه، معدن، بازار و…). سکه از بازار، تجارت و مأموریت‌ها می‌آید. مالیات را از بخش اقتصاد تنظیم کن.</p>
      <p class="hintline"><b>🕊️ دیپلماسی:</b> با هر کشور رابطه‌ات در چهار وضعیت است: دوستی، بی‌طرفی، تنش، دشمنی. هدیه بفرست، تجارت کن، اتحاد بساز — یا تحریم و جنگ! شکستن پیمان، اعتبار دیپلماتیک را کم می‌کند.</p>
      <p class="hintline"><b>⚔️ جنگ:</b> فقط در تنش یا دشمنی قابل اعلام است. نبرد کارتونی است و بر اساس قدرت ارتش، فناوری، روحیه، دیوار شهر و متحدان حل می‌شود. پیروزی روی همه قلمروها = الحاق کشور.</p>
      <p class="hintline"><b>📦 صندوق‌ها:</b> با پر شدن انرژی صندوق، چرخه‌ای با ۱۰ صندوق باز می‌شود؛ ۹ صندوق را باز کن و صندوق دهم ویژه چرخه بعد می‌شود.</p>
      <p class="hintline"><b>📅 پاداش روزانه:</b> زنجیره ۳۰ روزه با جایزه فزاینده؛ با بلیت جبران غیبت را جبران کن.</p>
      <p class="hintline"><b>🗺️ ویرایشگر:</b> از منوی اصلی، کشورهای توپی جدید بساز و جای آن‌ها را روی نقشه جابه‌جا کن.</p>
      <p class="hintline"><b>📜 سناریوی تاریخی:</b> کشورهای تاریخی در سناریوی جداگانه «عصر امپراتوری‌ها» (سطح ۵) ارائه می‌شوند تا مرزهای تاریخی و امروز قاطی نشوند.</p>`);
  },

  /* ---------- سازنده برنامه ---------- */
  showDeveloper(){
    this.modal('🛠️ سازنده برنامه', `
      <div class="centerbox">
        <div class="menu-balls" style="justify-content:center;margin-bottom:6px">
          ${flagBall(countryById('iran'),40,'dv1')}${flagBall(countryById('brazil'),40,'dv2')}${flagBall(countryById('japan'),40,'dv3')}
        </div>
        <div class="bigicon">👑</div>
        <b style="font-size:17px;display:block;margin-top:8px">ساخته شده توسط امیرعلی برنا</b>
        <p class="hintline">بازی «کشورهای توپی: فرمانروایی جهان»<br>نسخه ۰٫۱ · پیش‌نمایش</p>
      </div>`, {center:true});
  },

  /* ---------- آموزش ---------- */
  showTutorial(done){
    const steps=[
      {em:'🪧', t:'به قدرت رسیدن', p:'تو فرمانروای یک کشور توپی هستی! منابع را مدیریت کن، شهرها را بساز و قوی شو.'},
      {em:'🕊️', t:'دو راه پیشرفت', p:'هم مذاکره و تجارت و اتحاد، هم جنگ استراتژیک — انتخاب با توست.'},
      {em:'📦', t:'جایزه‌های هر روز', p:'پاداش روزانه بگیر، صندوق‌ها را باز کن و کشورهای جدید باز کن. پیشرفتت خودکار ذخیره می‌شود.'},
    ];
    let i=0;
    const el=document.createElement('div'); el.className='tut';
    const render=()=>{
      const s=steps[i];
      el.innerHTML=`<div class="tutcard"><div class="em">${s.em}</div><h3>${s.t}</h3><p>${s.p}</p>
        <div class="tutdots">${steps.map((_,j)=>`<i class="${j===i?'on':''}"></i>`).join('')}</div>
        <button class="btn wide" id="tnext">${i===steps.length-1?'شروع می‌کنم!':'بعدی'}</button></div>`;
      $('#tnext',el).onclick=()=>{ i++; if(i>=steps.length){ el.remove(); Engine.S.meta.tutorial=true; Engine.save(); done&&done(); } else render(); };
    };
    render(); document.body.appendChild(el);
  },
};

function relStatusHint(rel){
  const st=relStatus(rel).k;
  if(st==='friend') return '🤝 دوستی: تجارت بهتر و امکان اتحاد. احتمال کمک منابع بالا است.';
  if(st==='neutral') return '😐 بی‌طرفی: نه پاداش، نه جریمه؛ اما مذاکره ممکن است.';
  if(st==='tension') return '😠 تنش: هزینه تجارت بیشتر است؛ احتمال تحریم و درگیری مرزی.';
  return '🔥 دشمنی: روابط به شدت بد است؛ جنگ ممکن است.';
}
