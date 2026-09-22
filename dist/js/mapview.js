/* ===== نقشه جهان SVG با زوم/پن و توپ‌های کشور ===== */
const MapView = {
  svg:null, g:null, k:1, tx:0, ty:0, sel:null, onTap:null,
  pointers:{}, dragBall:null, dragMoved:false, panning:false, startPan:null,

  init(svgEl){
    this.svg=svgEl;
    this.svg.innerHTML = `<defs>
      <radialGradient id="oceanG" cx="50%" cy="28%" r="85%">
        <stop offset="0%" stop-color="#1a3560"/><stop offset="100%" stop-color="#0a1322"/>
      </radialGradient>
      <radialGradient id="oceanGh" cx="50%" cy="28%" r="85%">
        <stop offset="0%" stop-color="#4a3b26"/><stop offset="100%" stop-color="#241c10"/>
      </radialGradient>
    </defs>
    <g id="world"></g>`;
    this.g = this.svg.querySelector('#world');
    this.bindEvents();
  },

  palette(){
    return Engine.S.scenario==='empires'
      ? {ocean:'url(#oceanGh)', land:'#4a3b26', coast:'#6b543a', grid:'#5a4630', sub:'#c8b088'}
      : {ocean:'url(#oceanG)', land:'#22345c', coast:'#31518c', grid:'#1b2c4e', sub:'#cdd9ee'};
  },

  CONTINENTS:[
    'M120,70 C170,40 260,35 300,70 C330,95 320,130 300,150 C280,175 285,200 260,225 C235,250 205,255 190,235 C175,215 150,205 130,175 C110,145 90,100 120,70 Z',
    'M310,290 C340,275 365,285 370,315 C375,350 360,395 340,430 C325,455 305,460 300,430 C295,400 285,340 290,315 C292,300 300,295 310,290 Z',
    'M440,95 C470,80 520,78 550,95 C575,110 570,135 555,150 C540,168 545,185 520,195 C495,205 460,205 445,185 C430,165 425,110 440,95 Z',
    'M460,215 C495,200 545,205 570,230 C595,255 585,290 575,320 C565,355 550,385 525,395 C500,405 480,380 470,340 C460,300 445,235 460,215 Z',
    'M565,80 C640,55 770,60 840,95 C890,120 895,160 868,192 C840,222 800,215 780,240 C760,265 730,272 700,257 C670,242 635,250 610,230 C585,210 555,150 565,80 Z',
    'M770,340 C810,325 860,335 875,365 C890,395 870,420 835,425 C800,430 770,420 760,395 C750,370 755,348 770,340 Z',
  ],

  posOf(id){
    const p=Engine.S.meta.positions[id];
    if(p) return p;
    const c=countryById(id); return c?c.pos:[500,280];
  },

  rebuild(){
    const pal=this.palette();
    const run=Engine.R(); const playerId=run?run.countryId:null;
    let s=`<rect x="-200" y="-200" width="1400" height="960" fill="${pal.ocean}"/>`;
    // خطوط طول و عرض
    for(let x=0;x<=1000;x+=100) s+=`<line x1="${x}" y1="0" x2="${x}" y2="560" stroke="${pal.grid}" stroke-width="1" opacity=".5"/>`;
    for(let y=0;y<=560;y+=80) s+=`<line x1="0" y1="${y}" x2="1000" y2="${y}" stroke="${pal.grid}" stroke-width="1" opacity=".5"/>`;
    this.CONTINENTS.forEach(d=> s+=`<path d="${d}" fill="${pal.land}" stroke="${pal.coast}" stroke-width="2.5"/>`);
    const list = countriesOf(Engine.S.scenario).concat(Engine.S.meta.custom.filter(c=>(c.sc||Engine.S.scenario)===Engine.S.scenario));
    list.forEach(c=>{
      s+=this.ballSVG(c, c.id===playerId);
    });
    this.g.innerHTML=s;
    this.applyTransform();
  },

  ballSize(c, isPlayer){ return isPlayer?21 : (c.tier>=4?17 : (c.cities.length?15:12.5)); },

  ballSVG(c, isPlayer){
    const [x,y]=this.posOf(c.id);
    const R=this.ballSize(c,isPlayer);
    const run=Engine.R();
    const atWar = run && run.wars.includes(c.id);
    const annexed = run && run.annexed.includes(c.id);
    const taken = run ? run.territories.filter(t=>t.id===c.id).length : 0;
    const cls = 'ball'+(isPlayer?' mine':'')+(atWar?' war':'')+(annexed?' dead':'');
    let inner = flagInner(c, R, 'm'+c.id);
    inner += eyesSVG(R, isPlayer?Engine.S.meta.skin:null, atWar);
    let badge='';
    if(annexed) badge=`<text y="${R+16}" class="lbl" font-size="9" fill="#8fd6a5">⬇ زیر فرمان</text>`;
    else if(taken>0) badge=`<text x="${R+2}" y="${-R+6}" class="lbl" font-size="10" fill="#7dedab">⚑${fa(taken)}</text>`;
    return `<g class="${cls}" data-id="${c.id}" transform="translate(${x},${y})">
      <circle class="ring" r="${R+5}" fill="none" stroke="${isPlayer?'#f0b429':'#e8eefb'}" stroke-width="2.5" stroke-dasharray="${isPlayer?'0':'4 4'}"/>
      ${inner}
      ${badge}
      <text class="lbl" y="${R+14}" text-anchor="middle">${c.n}</text>
      ${c.cap&&!annexed?`<text class="cap" y="${-R-6}" text-anchor="middle">★</text>`:''}
    </g>`;
  },

  setSel(id){
    this.sel=id;
    this.g.querySelectorAll('.ball').forEach(b=>{
      b.classList.toggle('sel', b.dataset.id===id);
    });
  },

  applyTransform(){
    this.g.setAttribute('transform', `translate(${this.tx},${this.ty}) scale(${this.k})`);
  },

  worldPoint(ev){
    const pt=this.svg.createSVGPoint(); pt.x=ev.clientX; pt.y=ev.clientY;
    const m=this.g.getScreenCTM(); if(!m) return {x:0,y:0};
    const p=pt.matrixTransform(m.inverse());
    return p;
  },

  zoomAt(cx, cy, factor){
    const rect=this.svg.getBoundingClientRect();
    // مختصات نقطه در فضای viewBox
    const vb=this.svg.viewBox.baseVal;
    const sx=vb.x + (cx-rect.left)/rect.width*vb.width;
    const sy=vb.y + (cy-rect.top)/rect.height*vb.height;
    const nk=clamp(this.k*factor, 0.6, 4);
    const wx=(sx-this.tx)/this.k, wy=(sy-this.ty)/this.k;
    this.k=nk;
    this.tx=sx-wx*nk; this.ty=sy-wy*nk;
    this.applyTransform();
  },

  bindEvents(){
    const svg=this.svg;
    svg.addEventListener('wheel', e=>{ e.preventDefault(); this.zoomAt(e.clientX, e.clientY, e.deltaY<0?1.15:0.87); }, {passive:false});
    svg.addEventListener('pointerdown', e=>{
      const ball=e.target.closest('.ball');
      try{ svg.setPointerCapture(e.pointerId); }catch(err){}
      this.pointers[e.pointerId]={x:e.clientX,y:e.clientY};
      if(this.pointersCount()===2){ this.pinchDist=this.pinchDistance(); }
      if(ball && Engine.S.meta.editor && !this.isUIBall(ball)){
        this.dragBall=ball; this.dragMoved=false;
      } else {
        this.panning=true; this.startPan={x:e.clientX,y:e.clientY,tx:this.tx,ty:this.ty};
        svg.classList.add('drag');
      }
    });
    svg.addEventListener('pointermove', e=>{
      if(this.pointers[e.pointerId]) this.pointers[e.pointerId]={x:e.clientX,y:e.clientY};
      if(this.pointersCount()===2){
        const d=this.pinchDistance();
        if(this.pinchDist){ const rect=svg.getBoundingClientRect();
          this.zoomAt(rect.left+rect.width/2, rect.top+rect.height/2, d/this.pinchDist); }
        this.pinchDist=d; return;
      }
      if(this.dragBall){
        const p=this.worldPoint(e);
        const id=this.dragBall.dataset.id;
        Engine.S.meta.positions[id]={x:Math.round(p.x),y:Math.round(p.y)};
        this.dragBall.setAttribute('transform',`translate(${p.x},${p.y})`);
        this.dragMoved=true;
        return;
      }
      if(this.panning && this.startPan){
        this.tx=this.startPan.tx+(e.clientX-this.startPan.x);
        this.ty=this.startPan.ty+(e.clientY-this.startPan.y);
        this.applyTransform();
      }
    });
    const up=e=>{
      delete this.pointers[e.pointerId];
      if(this.dragBall){
        if(this.dragMoved) Engine.save();
        this.dragBall=null;
      }
      if(this.panning){
        const moved=this.startPan && (Math.abs(e.clientX-this.startPan.x)+Math.abs(e.clientY-this.startPan.y)>6);
        this.panning=false; this.startPan=null; svg.classList.remove('drag');
        if(!moved){
          const ball=e.target.closest('.ball');
          if(ball && this.onTap) this.onTap(ball.dataset.id);
        }
      }
      this.pinchDist=null;
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
  },
  pointersCount(){ return Object.keys(this.pointers).length; },
  pinchDistance(){
    const ps=Object.values(this.pointers);
    if(ps.length<2) return 0;
    return Math.hypot(ps[0].x-ps[1].x, ps[0].y-ps[1].y);
  },
  isUIBall(){ return false; },
  centerOn(id){
    if(!this.svg || !this.svg.isConnected) return;
    const [x,y]=this.posOf(id);
    const rect=this.svg.getBoundingClientRect();
    if(!rect.width || !rect.height) return; // صفحه بسته شده
    const vb=this.svg.viewBox.baseVal;
    const cx=vb.x+(rect.width/2)/rect.width*vb.width;
    const cy=vb.y+(rect.height/2)/rect.height*vb.height;
    this.k=Math.max(this.k,1.4);
    this.tx=cx-x*this.k; this.ty=cy-y*this.k;
    this.applyTransform();
  },
};

/* ---------- رندر پرچم داخل دایره ---------- */
function flagInner(c, R, uid){
  const f=c.f||{t:'b',c:['#888']};
  const D=2*R;
  let s=`<clipPath id="clip-${uid}"><circle r="${R}"/></clipPath><g clip-path="url(#clip-${uid})">`;
  const colors=f.c||['#999'];
  const n=f.n||colors.length;
  if(f.t==='h'){
    for(let i=0;i<n;i++){ const h=D/n;
      s+=`<rect x="${-R}" y="${-R+i*h}" width="${D}" height="${h+0.3}" fill="${colors[i%colors.length]}"/>`; }
  } else if(f.t==='v'){
    for(let i=0;i<n;i++){ const w=D/n;
      s+=`<rect x="${-R+i*w}" y="${-R}" width="${w+0.3}" height="${D}" fill="${colors[i%colors.length]}"/>`; }
  } else {
    s+=`<rect x="${-R}" y="${-R}" width="${D}" height="${D}" fill="${colors[0]}"/>`;
  }
  if(f.canton) s+=`<rect x="${-R}" y="${-R}" width="${R}" height="${R*0.8}" fill="${f.canton}"/>`;
  const e=f.e;
  if(e){
    const ec=e.c||'#fff';
    switch(e.k){
      case 'circle': s+=`<circle r="${R*0.26}" fill="${ec}"/>`; break;
      case 'star': s+=starPath(0,0,R*0.3,ec); break;
      case 'star2': s+=starPath(-R*0.14,0,R*0.14,ec)+starPath(R*0.16,0,R*0.14,ec); break;
      case 'crescent': s+=`<circle cx="${-R*0.06}" r="${R*0.3}" fill="${ec}"/><circle cx="${R*0.08}" r="${R*0.26}" fill="${colors[0]}"/>`+starPath(R*0.22,-R*0.1,R*0.1,ec); break;
      case 'cross': s+=`<rect x="${-R*0.09}" y="${-R}" width="${R*0.18}" height="${D}" fill="${ec}"/><rect x="${-R}" y="${-R*0.09}" width="${D}" height="${R*0.18}" fill="${ec}"/>`; break;
      case 'bar': s+=`<rect x="${-R*0.5}" y="${-R*0.08}" width="${R}" height="${R*0.16}" rx="${R*0.08}" fill="${ec}"/>`; break;
      case 'diamond': s+=`<polygon points="0,${-R*0.5} ${R*0.6},0 0,${R*0.5} ${-R*0.6},0" fill="${ec}"/><circle r="${R*0.22}" fill="#002776"/>`; break;
      case 'brazil': s+=`<polygon points="0,${-R*0.52} ${R*0.62},0 0,${R*0.52} ${-R*0.62},0" fill="${ec}"/><circle r="${R*0.22}" fill="#002776"/>`; break;
      case 'taegeuk': s+=`<path d="M ${-R*0.26} 0 A ${R*0.26} ${R*0.26} 0 0 1 ${R*0.26} 0 Z" fill="${ec}"/><path d="M ${-R*0.26} 0 A ${R*0.26} ${R*0.26} 0 0 0 ${R*0.26} 0 Z" fill="#0047A0"/>`; break;
      case 'uk': s+=`<g stroke="#fff" stroke-width="${R*0.22}"><line x1="${-R}" y1="${-R}" x2="${R}" y2="${R}"/><line x1="${R}" y1="${-R}" x2="${-R}" y2="${R}"/></g><rect x="${-R*0.16}" y="${-R}" width="${R*0.32}" height="${D}" fill="#fff"/><rect x="${-R}" y="${-R*0.16}" width="${D}" height="${R*0.32}" fill="#fff"/><rect x="${-R*0.09}" y="${-R}" width="${R*0.18}" height="${D}" fill="${ec}"/><rect x="${-R}" y="${-R*0.09}" width="${D}" height="${R*0.18}" fill="${ec}"/>`; break;
      case 'emblem': s+=`<circle r="${R*0.2}" fill="${ec}"/><path d="M ${-R*0.34} ${-R*0.05} Q 0 ${-R*0.4} ${R*0.34} ${-R*0.05}" stroke="${ec}" stroke-width="${R*0.06}" fill="none"/>`; break;
      case 'lion': {
        // خورشید طلایی با ۱۲ پرتو + شیر ساده (هماهنگ با آیکون بازی)
        s+=`<circle r="${R*0.07}" cy="${-R*0.045}" fill="#E8AA20"/>`;
        let rays='';
        for(let k=0;k<12;k++){
          const a=k*Math.PI/6;
          rays+=`<line x1="${Math.sin(a)*R*0.075}" y1="${-R*0.045-Math.cos(a)*R*0.075}" x2="${Math.sin(a)*R*0.112}" y2="${-R*0.045-Math.cos(a)*R*0.112}" stroke="#E8AA20" stroke-width="${R*0.032}" stroke-linecap="round"/>`;
        }
        s+=rays;
        const L='#AC281E';
        s+=`<g fill="${L}">`
          +`<ellipse cx="${-R*0.055}" cy="${R*0.075}" rx="${R*0.13}" ry="${R*0.05}"/>`
          +`<circle cx="${-R*0.15}" cy="${R*0.065}" r="${R*0.055}"/>`
          +`<circle cx="${R*0.06}" cy="${R*0.015}" r="${R*0.07}"/>`
          +`<rect x="${-R*0.010}" y="${R*0.110}" width="${R*0.017}" height="${R*0.030}"/>`
          +`<rect x="${R*0.050}" y="${R*0.110}" width="${R*0.017}" height="${R*0.030}"/>`
          +`</g>`
          +`<line x1="${-R*0.185}" y1="${R*0.055}" x2="${-R*0.17}" y2="${-R*0.045}" stroke="${L}" stroke-width="${R*0.011}" stroke-linecap="round"/>`
          +`<line x1="${R*0.085}" y1="${R*0.12}" x2="${R*0.135}" y2="${-R*0.09}" stroke="${L}" stroke-width="${R*0.009}" stroke-linecap="round"/>`;
        break;
      }
    }
  }
  s+='</g>';
  // حاشیه توپ
  s+=`<circle r="${R}" fill="none" stroke="#0a1322" stroke-width="2" opacity=".8"/>`;
  s+=`<ellipse cx="${-R*0.35}" cy="${-R*0.55}" rx="${R*0.28}" ry="${R*0.16}" fill="#ffffff" opacity=".18" transform="rotate(-25 ${-R*0.35} ${-R*0.55})"/>`;
  return s;
}
function starPath(cx,cy,r,fill){
  let p=''; for(let i=0;i<10;i++){
    const rad=i%2===0? r : r*0.45;
    const a=-Math.PI/2 + i*Math.PI/5;
    p+=(i===0?'M':'L')+(cx+rad*Math.cos(a)).toFixed(2)+','+(cy+rad*Math.sin(a)).toFixed(2);
  }
  return `<path d="${p}Z" fill="${fill}"/>`;
}
function eyesSVG(R, skin, angry){
  const ex=R*0.32, ey=-R*0.12, rx=R*0.14, ry=R*0.19;
  let s=`<g class="face">`;
  s+=`<ellipse cx="${-ex}" cy="${ey}" rx="${rx}" ry="${ry}" fill="#fff"/><ellipse cx="${ex}" cy="${ey}" rx="${rx}" ry="${ry}" fill="#fff"/>`;
  s+=`<circle cx="${-ex+rx*0.15}" cy="${ey+ry*0.15}" r="${rx*0.5}" fill="#111"/><circle cx="${ex+rx*0.15}" cy="${ey+ry*0.15}" r="${rx*0.5}" fill="#111"/>`;
  if(angry) s+=`<g class="brow" stroke="#111" stroke-width="${R*0.06}" stroke-linecap="round"><line x1="${-ex-rx}" y1="${ey-ry*1.5}" x2="${-ex+rx*0.6}" y2="${ey-ry*0.9}"/><line x1="${ex+rx}" y1="${ey-ry*1.5}" x2="${ex-rx*0.6}" y2="${ey-ry*0.9}"/></g>`;
  if(skin==='glasses') s+=`<g><rect x="${-ex-rx*1.6}" y="${ey-ry*0.9}" width="${rx*3.2}" height="${ry*1.8}" rx="2" fill="#111" opacity=".85"/><rect x="${ex-rx*1.6}" y="${ey-ry*0.9}" width="${rx*3.2}" height="${ry*1.8}" rx="2" fill="#111" opacity=".85"/><line x1="${-ex+rx*1.6}" y1="${ey}" x2="${ex-rx*1.6}" y2="${ey}" stroke="#111" stroke-width="2"/></g>`;
  if(skin==='cap') s+=`<path d="M ${-R*0.75} ${-R*0.55} A ${R*0.78} ${R*0.6} 0 0 1 ${R*0.75} ${-R*0.55} L ${R*0.85} ${-R*0.42} L ${-R*0.85} ${-R*0.42} Z" fill="#c0392b"/><rect x="${-R*0.9}" y="${-R*0.46}" width="${R*1.1}" height="${R*0.1}" rx="3" fill="#8e2620"/>`;
  if(skin==='crown') s+=`<polygon points="${-R*0.5},${-R*0.8} ${-R*0.3},${-R*1.05} ${-R*0.1},${-R*0.85} 0,${-R*1.15} ${R*0.1},${-R*0.85} ${R*0.3},${-R*1.05} ${R*0.5},${-R*0.8} ${R*0.5},${-R*0.55} ${-R*0.5},${-R*0.55}" fill="#f0b429" stroke="#b07d0e" stroke-width="1"/>`;
  if(skin==='beard') s+=`<path d="M ${-R*0.42} ${R*0.15} Q 0 ${R*1.05} ${R*0.42} ${R*0.15} Q 0 ${R*0.6} ${-R*0.42} ${R*0.15} Z" fill="#6b4a2f" opacity=".9"/>`;
  if(skin==='seasonflag') s+=`<line x1="${-R*0.62}" y1="${-R*0.5}" x2="${-R*0.62}" y2="${-R*1.25}" stroke="#b07d0e" stroke-width="2"/><polygon points="${-R*0.62},${-R*1.25} ${R*0.15},${-R*1.05} ${-R*0.62},${-R*0.85}" fill="#e74c3c" stroke="#a83226" stroke-width="1"/>`;
  s+=`</g>`;
  return s;
}
/* پرچم مستقل برای کارت‌ها (دایره‌ای) */
function flagBall(c, sizePx, uid){
  const R=24;
  return `<svg viewBox="-26 -26 52 52" width="${sizePx}" height="${sizePx}">${flagInner(c,R,uid)}${eyesSVG(R,null,false)}</svg>`;
}
