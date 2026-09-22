/* ===== جلوه‌های صوتی و موسیقی پس‌زمینه (WebAudio — بدون فایل خارجی) ===== */
const Sfx = {
  ctx:null, master:null, musicGain:null,
  musicTimer:null, musicOn:false, bar:0,

  ensure(){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return null;
    if(!this.ctx){
      try{
        this.ctx=new AC();
        this.master=this.ctx.createGain(); this.master.gain.value=0.6; this.master.connect(this.ctx.destination);
        this.musicGain=this.ctx.createGain(); this.musicGain.gain.value=0.14; this.musicGain.connect(this.master);
      }catch(e){ console.warn('audio', e); return null; }
    }
    if(this.ctx.state==='suspended') this.ctx.resume();
    return this.ctx;
  },
  /* جلوه‌ها با کلید sound و موسیقی با کلید music کنترل می‌شوند */
  enabled(){ return !!(Engine.S && Engine.S.meta.sound); },
  musicWanted(){ return !!(Engine.S && Engine.S.meta.music); },

  note(freq, dur, type, vol, when, dest){
    const c=this.ctx; if(!c) return;
    const t=(when!==undefined? when : c.currentTime);
    const o=c.createOscillator(), g=c.createGain();
    o.type=type||'sine'; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001,vol||0.2), t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(dest||this.master);
    o.start(t); o.stop(t+dur+0.05);
  },
  seq(freqs, step, type, vol){
    if(!this.ctx) return;
    const t0=this.ctx.currentTime;
    freqs.forEach((f,i)=> this.note(f, step*1.7, type, vol, t0+i*step));
  },

  /* --- جلوه‌های صوتی --- */
  play(name){
    if(!this.enabled()) return;
    if(!this.ensure()) return;
    switch(name){
      case 'click':   this.note(660, 0.06, 'square', 0.06); break;
      case 'coin':    this.seq([880, 1320], 0.07, 'sine', 0.14); break;
      case 'build':   this.note(170, 0.16, 'triangle', 0.22);
                      this.note(90, 0.22, 'sine', 0.18, this.ctx.currentTime+0.02);
                      this.note(540, 0.12, 'triangle', 0.1, this.ctx.currentTime+0.12); break;
      case 'chest':   this.seq([523, 659, 784, 1047], 0.09, 'triangle', 0.16); break;
      case 'win':     this.seq([392, 523, 659, 784], 0.12, 'triangle', 0.2);
                      this.note(1047, 0.5, 'triangle', 0.18, this.ctx.currentTime+0.5); break;
      case 'lose':    this.seq([330, 262, 208, 165], 0.15, 'sawtooth', 0.1); break;
      case 'levelup': this.seq([523, 659, 784, 988, 1319], 0.08, 'square', 0.1); break;
      case 'daily':   this.seq([784, 988, 1175, 1568], 0.11, 'sine', 0.16); break;
      case 'war':     this.note(95, 0.25, 'square', 0.26);
                      this.note(62, 0.35, 'sine', 0.28, this.ctx.currentTime+0.14); break;
    }
  },

  /* --- موسیقی پس‌زمینه (تولیدی، پنتاتونیک ملایم) --- */
  startMusic(){
    if(!this.ctx || this.musicTimer) return;
    this.musicOn=true; this.bar=0;
    const scale=[0,3,5,7,10,12,15,17];           // پنتاتونیک
    const bassLine=[110, 87.31, 98, 82.41];      // A2 F2 G2 E2
    const beat=()=>{
      if(!this.musicOn || !this.ctx) return;
      const t=this.ctx.currentTime;
      this.note(bassLine[this.bar%bassLine.length], 1.9, 'triangle', 0.09, t, this.musicGain);
      if(this.bar%4===2) this.note(bassLine[this.bar%bassLine.length]*2, 0.9, 'triangle', 0.05, t+1.0, this.musicGain);
      for(let i=0;i<4;i++){
        if(Math.random()<0.72){
          const st=scale[Math.floor(Math.random()*scale.length)];
          const f=220*Math.pow(2, st/12);
          this.note(f, 0.42, 'sine', 0.09, t+i*0.5, this.musicGain);
          if(Math.random()<0.25) this.note(f*2, 0.3, 'sine', 0.04, t+i*0.5+0.06, this.musicGain);
        }
      }
      this.bar++;
    };
    beat();
    this.musicTimer=setInterval(beat, 2000);
  },
  stopMusic(){
    this.musicOn=false;
    if(this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer=null; }
  },
  setMusic(on){
    Engine.S.meta.music=!!on;
    if(on){ if(this.ensure()) this.startMusic(); }
    else this.stopMusic();
  },

  /* راه‌اندازی: اولین لمس/کلیک سیاست autoplay مرورگر را حل می‌کند */
  init(){
    const kick=()=>{
      if(this.ensure() && this.musicWanted()) this.startMusic();
      document.removeEventListener('pointerdown', kick);
      document.removeEventListener('touchstart', kick);
      document.removeEventListener('keydown', kick);
    };
    document.addEventListener('pointerdown', kick);
    document.addEventListener('touchstart', kick);
    document.addEventListener('keydown', kick);
    document.addEventListener('visibilitychange', ()=>{
      if(!this.ctx) return;
      if(document.hidden) this.ctx.suspend();
      else if(this.ctx.state==='suspended') this.ctx.resume();
    });
  },
};
