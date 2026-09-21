'use strict';
const api = window.vinyl;
const $ = (id) => document.getElementById(id);

const audio=$('audio'), disc=$('disc'), platter=$('platter'), tonearm=$('tonearm');
const coverImg=$('coverImg'), label=$('label'), titleEl=$('title'), subEl=$('sub');
const seek=$('seek'), curEl=$('cur'), durEl=$('dur'), volume=$('volume');
const playIcon=$('playIcon'), pauseIcon=$('pauseIcon');
const favBtn=$('favBtn'), favIcon=$('favIcon');
const sourceSel=$('source'), shuffleBtn=$('shuffleBtn');
const repeatBtn=$('repeatBtn'), repeatIcon=$('repeatIcon'), repeatOneIcon=$('repeatOneIcon');
const brand=$('brand'), toastEl=$('toast');
const gridBtn=$('gridBtn'), folderBtn=$('folderBtn');
const sheet=$('sheet'), sheetTitle=$('sheetTitle'), sheetList=$('sheetList'), sheetEmpty=$('sheetEmpty');
const changeFolderBtn=$('changeFolderBtn'), selectMusicBtn=$('selectMusicBtn');

let allTracks=[], favorites=[], queue=[], currentPath='';
let shuffle=false, repeat='off', source='folder', sheetMode='', history=[], musicFolder='';
let themeIdx=0, seeking=false;

/* themes */
const THEMES=[
  {name:'Amber Walnut',vars:{'--cabinet':'#17110d','--cabinet-hi':'#2a1f16','--cabinet-2':'#1e160f','--panel':'#241a12','--panel-2':'#2c2016','--accent':'#c8963e','--accent-lite':'#e7c079','--vinyl':'#0b0b0c','--ivory':'#f0e7d8','--muted':'#a4917b','--line':'rgba(200,150,62,.16)','--label-a':'#e7c079','--label-b':'#9c7326','--glow':'rgba(200,150,62,.5)'}},
  {name:'Cobalt Night',vars:{'--cabinet':'#0b1020','--cabinet-hi':'#16253f','--cabinet-2':'#0e1428','--panel':'#131c33','--panel-2':'#1a2542','--accent':'#4f8cff','--accent-lite':'#9cc0ff','--vinyl':'#07090f','--ivory':'#e8eefc','--muted':'#8c9bc0','--line':'rgba(79,140,255,.2)','--label-a':'#6ea0ff','--label-b':'#2440a0','--glow':'rgba(79,140,255,.55)'}},
  {name:'Emerald Jazz',vars:{'--cabinet':'#0a1512','--cabinet-hi':'#15271f','--cabinet-2':'#0d1a15','--panel':'#12231c','--panel-2':'#193026','--accent':'#37c08f','--accent-lite':'#82e6c2','--vinyl':'#050b09','--ivory':'#e6f2ec','--muted':'#83a99a','--line':'rgba(55,192,143,.2)','--label-a':'#82e6c2','--label-b':'#1c7a5a','--glow':'rgba(55,192,143,.5)'}},
  {name:'Rose Gold',vars:{'--cabinet':'#1a1214','--cabinet-hi':'#2c1c22','--cabinet-2':'#1f1519','--panel':'#271a20','--panel-2':'#31232b','--accent':'#e39aa6','--accent-lite':'#f7cdd4','--vinyl':'#0c0709','--ivory':'#f7eaee','--muted':'#b596a0','--line':'rgba(227,154,166,.22)','--label-a':'#f2b8b6','--label-b':'#b06a78','--glow':'rgba(227,154,166,.5)'}},
  {name:'Neon Violet',vars:{'--cabinet':'#100a1c','--cabinet-hi':'#1f1440','--cabinet-2':'#130c24','--panel':'#191030','--panel-2':'#23174c','--accent':'#b06bff','--accent-lite':'#dcb6ff','--vinyl':'#08050f','--ivory':'#ece6fb','--muted':'#9d8cc4','--line':'rgba(176,107,255,.22)','--label-a':'#c98bff','--label-b':'#6a2fb0','--glow':'rgba(176,107,255,.6)'}},
  {name:'Mono Frost',vars:{'--cabinet':'#121315','--cabinet-hi':'#24272c','--cabinet-2':'#151619','--panel':'#1c1e22','--panel-2':'#24272c','--accent':'#d7dde6','--accent-lite':'#ffffff','--vinyl':'#0a0b0c','--ivory':'#eef1f5','--muted':'#97a0ab','--line':'rgba(215,221,230,.18)','--label-a':'#dfe4ea','--label-b':'#7c8590','--glow':'rgba(215,221,230,.4)'}},
  {name:'Snowfall',fx:'snow',cls:'theme-snowy',vars:{'--cabinet':'#0f1e2e','--cabinet-hi':'#1b3147','--cabinet-2':'#122234','--panel':'rgba(30,52,74,.55)','--panel-2':'rgba(44,70,98,.62)','--accent':'#8fc3ec','--accent-lite':'#e2f1ff','--vinyl':'#0a0f16','--ivory':'#eef5fc','--muted':'#a6bcd2','--line':'rgba(180,210,240,.20)','--label-a':'#dcefff','--label-b':'#5f8fb8','--glow':'rgba(150,200,240,.55)'}},
  {name:'Rainy Night',fx:'rain',cls:'theme-rainy',vars:{'--cabinet':'#0b1119','--cabinet-hi':'#132234','--cabinet-2':'#0d1520','--panel':'rgba(24,42,60,.55)','--panel-2':'rgba(36,58,80,.62)','--accent':'#7aa6cc','--accent-lite':'#c8ddf0','--vinyl':'#070b10','--ivory':'#e7eef6','--muted':'#96abc0','--line':'rgba(150,185,215,.18)','--label-a':'#c8ddf0','--label-b':'#4a6f92','--glow':'rgba(130,175,215,.5)'}},
  {name:'Autumn Leaves',fx:'leaves',cls:'theme-autumn',vars:{'--cabinet':'#1c1108','--cabinet-hi':'#3a2410','--cabinet-2':'#24160a','--panel':'#2c1c0e','--panel-2':'#38240f','--accent':'#d97a2b','--accent-lite':'#f2b566','--vinyl':'#0c0703','--ivory':'#f6e9d6','--muted':'#b79470','--line':'rgba(217,122,43,.20)','--label-a':'#f2b566','--label-b':'#9c5a1e','--glow':'rgba(230,140,60,.55)'}},
  {name:'Neon Glow',cls:'theme-neon',vars:{'--cabinet':'#0a0410','--cabinet-hi':'#1b0a2e','--cabinet-2':'#100418','--panel':'#170826','--panel-2':'#210e37','--accent':'#ff3df0','--accent-lite':'#66f6ff','--vinyl':'#05020a','--ivory':'#f4e9ff','--muted':'#b98bd6','--line':'rgba(255,61,240,.28)','--label-a':'#66f6ff','--label-b':'#c01fb0','--glow':'rgba(255,61,240,.75)'}},
  {name:'Cyberpunk',cls:'theme-cyber',vars:{'--cabinet':'#0a0618','--cabinet-hi':'#14103a','--cabinet-2':'#0d0722','--panel':'#141033','--panel-2':'#1c1547','--accent':'#f7e017','--accent-lite':'#25e0e0','--vinyl':'#05030f','--ivory':'#eafcff','--muted':'#8fa6c9','--line':'rgba(37,224,224,.26)','--label-a':'#f7e017','--label-b':'#b81f8a','--glow':'rgba(247,224,23,.6)'}}
];
function applyTheme(i,announce){
  themeIdx=((i%THEMES.length)+THEMES.length)%THEMES.length;
  const t=THEMES[themeIdx], root=document.documentElement;
  for(const k in t.vars) root.style.setProperty(k,t.vars[k]);
  root.classList.remove('theme-snowy','theme-rainy','theme-autumn','theme-neon','theme-cyber');
  if(t.cls) root.classList.add(t.cls);
  root.classList.toggle('has-fx', !!t.fx);
  if(t.fx) fxStart(t.fx); else fxStop();
  if(announce) showToast(t.name);
}

/* weather fx: falling snow / rain / leaves drawn on the #weather canvas */
let fxCanvas=null,fxCtx=null,fxRaf=null,fxParticles=[],fxMode=null,fxW=0,fxH=0;
const LEAF_COLORS=['#d1652f','#c9852a','#a83a20','#e0a63c','#8a5a2b','#c25324'];
function fxInit(){ if(fxCanvas)return true; fxCanvas=document.getElementById('weather'); if(!fxCanvas)return false;
  fxCtx=fxCanvas.getContext('2d'); window.addEventListener('resize',()=>{ if(fxMode)fxResize(); }); return true; }
function fxResize(){ if(!fxCanvas)return; const dpr=window.devicePixelRatio||1; const r=fxCanvas.getBoundingClientRect();
  fxW=fxCanvas.width=Math.max(1,Math.floor(r.width*dpr)); fxH=fxCanvas.height=Math.max(1,Math.floor(r.height*dpr)); }
function fxSpawn(mode,initial){ const dpr=window.devicePixelRatio||1;
  if(mode==='snow') return {x:Math.random()*fxW,y:initial?Math.random()*fxH:-8*dpr,r:(0.8+Math.random()*2.1)*dpr,
    spd:(0.35+Math.random()*0.8)*dpr,drift:(Math.random()*0.5-0.25)*dpr,sway:Math.random()*6.28,o:0.45+Math.random()*0.5};
  if(mode==='leaves') return {x:Math.random()*fxW,y:initial?Math.random()*fxH:-14*dpr,size:(6+Math.random()*7)*dpr,
    spd:(0.5+Math.random()*0.9)*dpr,drift:(Math.random()*0.8-0.4)*dpr,sway:Math.random()*6.28,swaySpd:0.02+Math.random()*0.03,
    rot:Math.random()*6.28,rotSpd:(Math.random()*0.06-0.03),o:0.75+Math.random()*0.25,color:LEAF_COLORS[(Math.random()*LEAF_COLORS.length)|0]};
  return {x:Math.random()*fxW,y:initial?Math.random()*fxH:-24*dpr,len:(9+Math.random()*13)*dpr,
    spd:(7+Math.random()*7)*dpr,drift:-1.1*dpr,o:0.12+Math.random()*0.22}; }
function fxTargetCount(mode){ const base=mode==='snow'?66:mode==='leaves'?24:118; return Math.max(6,Math.round(base*(0.35+precip*1.3))); }
function fxSetIntensity(v){ precip=v; if(!fxMode)return; const target=fxTargetCount(fxMode);
  while(fxParticles.length<target)fxParticles.push(fxSpawn(fxMode,true)); if(fxParticles.length>target)fxParticles.length=target; }
function fxStop(){ if(fxRaf)cancelAnimationFrame(fxRaf); fxRaf=null; fxParticles=[]; fxMode=null;
  if(fxCtx&&fxW)fxCtx.clearRect(0,0,fxW,fxH); }
function fxStart(mode){ if(!fxInit())return; fxStop(); fxMode=mode; fxResize();
  const n=fxTargetCount(mode); fxParticles=[]; for(let i=0;i<n;i++)fxParticles.push(fxSpawn(mode,true)); fxLoop(); }
function fxLoop(){ fxRaf=requestAnimationFrame(fxLoop); if(!fxCtx)return; const dpr=window.devicePixelRatio||1;
  fxCtx.clearRect(0,0,fxW,fxH);
  if(fxMode==='snow'){ fxCtx.fillStyle='#ffffff';
    for(const p of fxParticles){ p.sway+=0.02; p.y+=p.spd; p.x+=p.drift+Math.sin(p.sway)*0.45*dpr;
      if(p.y>fxH+6)Object.assign(p,fxSpawn('snow',false)); if(p.x<-8)p.x=fxW; if(p.x>fxW+8)p.x=0;
      fxCtx.globalAlpha=p.o; fxCtx.beginPath(); fxCtx.arc(p.x,p.y,p.r,0,6.283); fxCtx.fill(); }
    fxCtx.globalAlpha=1; }
  else if(fxMode==='rain'){ fxCtx.strokeStyle='rgba(196,218,238,1)'; fxCtx.lineWidth=Math.max(1,1.1*dpr); fxCtx.lineCap='round';
    for(const p of fxParticles){ p.y+=p.spd; p.x+=p.drift;
      if(p.y>fxH+6)Object.assign(p,fxSpawn('rain',false)); if(p.x<-12)p.x=fxW;
      fxCtx.globalAlpha=p.o; fxCtx.beginPath(); fxCtx.moveTo(p.x,p.y); fxCtx.lineTo(p.x+p.drift*0.7,p.y+p.len); fxCtx.stroke(); }
    fxCtx.globalAlpha=1; }
  else if(fxMode==='leaves'){
    for(const p of fxParticles){ p.sway+=p.swaySpd; p.rot+=p.rotSpd; p.y+=p.spd; p.x+=p.drift+Math.sin(p.sway)*0.7*dpr;
      if(p.y>fxH+14*dpr)Object.assign(p,fxSpawn('leaves',false)); if(p.x<-14)p.x=fxW; if(p.x>fxW+14)p.x=0;
      fxCtx.save(); fxCtx.globalAlpha=p.o; fxCtx.translate(p.x,p.y); fxCtx.rotate(p.rot); fxCtx.fillStyle=p.color;
      fxCtx.beginPath(); fxCtx.ellipse(0,0,p.size,p.size*0.5,0,0,6.283); fxCtx.fill();
      fxCtx.strokeStyle='rgba(0,0,0,.28)'; fxCtx.lineWidth=Math.max(1,0.8*dpr);
      fxCtx.beginPath(); fxCtx.moveTo(-p.size,0); fxCtx.lineTo(p.size,0); fxCtx.stroke(); fxCtx.restore(); }
    fxCtx.globalAlpha=1; } }

/* ambience: procedural rain / thunder / fire / wind mixed on top of the music */
let AC=null, ambMaster=null, ambVol=0.5, precip=0.5;
const ambNodes={};
function ac(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); } if(AC.state==='suspended')AC.resume(); return AC; }
function ambCtx(){ const ctx=ac(); if(!ambMaster){ ambMaster=ctx.createGain(); ambMaster.gain.value=ambVol; ambMaster.connect(ctx.destination); } return ctx; }
function ambNoise(ctx,sec){ const len=Math.floor(ctx.sampleRate*sec); const b=ctx.createBuffer(1,len,ctx.sampleRate);
  const d=b.getChannelData(0); for(let i=0;i<len;i++)d[i]=Math.random()*2-1; return b; }
const RAIN_CFG={
  rain:     {lpBase:1500, lpSpan:1900, wash:0.32, rate:1.0, drop:0.10, ring:false},
  drizzle:  {lpBase:1000, lpSpan:1000, wash:0.22, rate:0.5, drop:0.06, ring:false},
  downpour: {lpBase:2200, lpSpan:2400, wash:0.48, rate:1.9, drop:0.12, ring:false},
  rooftop:  {lpBase:1300, lpSpan:1500, wash:0.20, rate:1.2, drop:0.17, ring:true}
};
function ambStartRainKind(ctx, kind){
  const cfg=RAIN_CFG[kind]||RAIN_CFG.rain;
  const out=ctx.createGain(); out.gain.value=1; out.connect(ambMaster);
  const src=ctx.createBufferSource(); src.buffer=ambNoise(ctx,4); src.loop=true;
  const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=300;
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=cfg.lpBase+precip*cfg.lpSpan;
  const wash=ctx.createGain(); wash.gain.value=cfg.wash;
  src.connect(hp); hp.connect(lp); lp.connect(wash); wash.connect(out); src.start();
  let stopped=false;
  (function drop(){ if(stopped)return;
    const count=Math.max(1,Math.round((1+precip*5)*cfg.rate));
    for(let k=0;k<count;k++){
      const b=ctx.createBufferSource(); b.buffer=ambNoise(ctx,0.03);
      const bp=ctx.createBiquadFilter(); bp.type='bandpass';
      bp.frequency.value=cfg.ring?(850+Math.random()*1500):(1700+Math.random()*3200);
      bp.Q.value=cfg.ring?7:1.1;
      const dg=ctx.createGain(); const t=ctx.currentTime+Math.random()*0.04;
      const peak=cfg.drop*(0.6+Math.random()*0.8);
      dg.gain.setValueAtTime(0.0001,t); dg.gain.linearRampToValueAtTime(peak,t+0.002);
      dg.gain.exponentialRampToValueAtTime(0.0001,t+(cfg.ring?0.07:0.03));
      b.connect(bp); bp.connect(dg); dg.connect(out); b.start(t); b.stop(t+0.12);
    }
    const base=(95-precip*72)/cfg.rate; setTimeout(drop, base+Math.random()*base); })();
  function setIntensity(v){
    lp.frequency.setTargetAtTime(cfg.lpBase+v*cfg.lpSpan, ctx.currentTime, 0.12);
    wash.gain.setTargetAtTime(cfg.wash*(0.75+v*0.5), ctx.currentTime, 0.12);
  }
  return {stop(){ stopped=true; try{src.stop();}catch(_){} }, setIntensity};
}
function ambStartWind(ctx){ const src=ctx.createBufferSource(); src.buffer=ambNoise(ctx,4); src.loop=true;
  const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=500; bp.Q.value=0.6;
  const g=ctx.createGain(); g.gain.value=0.5;
  const lfo=ctx.createOscillator(); lfo.frequency.value=0.08; const lg=ctx.createGain(); lg.gain.value=320;
  lfo.connect(lg); lg.connect(bp.frequency);
  const lfo2=ctx.createOscillator(); lfo2.frequency.value=0.05; const lg2=ctx.createGain(); lg2.gain.value=0.28;
  lfo2.connect(lg2); lg2.connect(g.gain);
  src.connect(bp); bp.connect(g); g.connect(ambMaster); src.start(); lfo.start(); lfo2.start();
  return {stop(){ try{src.stop();lfo.stop();lfo2.stop();}catch(_){} }}; }
function ambStartFire(ctx){ const src=ctx.createBufferSource(); src.buffer=ambNoise(ctx,3); src.loop=true;
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=760;
  const g=ctx.createGain(); g.gain.value=0.3;
  src.connect(lp); lp.connect(g); g.connect(ambMaster); src.start();
  let stopped=false;
  (function crackle(){ if(stopped)return;
    const b=ctx.createBufferSource(); b.buffer=ambNoise(ctx,0.06);
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1500+Math.random()*3200; bp.Q.value=2;
    const cg=ctx.createGain(); const t=ctx.currentTime;
    cg.gain.setValueAtTime(0.0001,t); cg.gain.linearRampToValueAtTime(0.35+Math.random()*0.5,t+0.006);
    cg.gain.exponentialRampToValueAtTime(0.0001,t+0.09);
    b.connect(bp); bp.connect(cg); cg.connect(ambMaster); b.start(t); b.stop(t+0.11);
    setTimeout(crackle,35+Math.random()*240); })();
  return {stop(){ stopped=true; try{src.stop();}catch(_){} }}; }
function ambStartThunder(ctx){ let stopped=false;
  (function boom(){ if(stopped)return;
    const t0=ctx.currentTime+0.03; const distant=Math.random()<0.45;
    if(!distant){ // sharp initial crack
      const c=ctx.createBufferSource(); c.buffer=ambNoise(ctx,0.5);
      const cf=ctx.createBiquadFilter(); cf.type='lowpass'; cf.frequency.value=2400;
      const cg=ctx.createGain();
      cg.gain.setValueAtTime(0.0001,t0); cg.gain.linearRampToValueAtTime(0.85,t0+0.008);
      cg.gain.exponentialRampToValueAtTime(0.03,t0+0.28);
      c.connect(cf); cf.connect(cg); cg.connect(ambMaster); c.start(t0); c.stop(t0+0.5); }
    // long rolling rumble with wavering amplitude
    const dur=(distant?2.6:2.2)+Math.random()*2.6;
    const r=ctx.createBufferSource(); r.buffer=ambNoise(ctx,dur+0.6);
    const rf=ctx.createBiquadFilter(); rf.type='lowpass'; rf.frequency.value=distant?110:200;
    const rf2=ctx.createBiquadFilter(); rf2.type='lowpass'; rf2.frequency.value=distant?110:200;
    const rg=ctx.createGain(); const s=distant?t0+0.05:t0+0.14;
    rg.gain.setValueAtTime(0.0001,s); rg.gain.linearRampToValueAtTime(distant?0.45:0.9,s+0.18);
    let tt=s+0.25; while(tt<s+dur){ rg.gain.linearRampToValueAtTime((0.15+Math.random()*0.5)*(distant?0.6:1),tt); tt+=0.12+Math.random()*0.28; }
    rg.gain.exponentialRampToValueAtTime(0.0006,s+dur);
    r.connect(rf); rf.connect(rf2); rf2.connect(rg); rg.connect(ambMaster); r.start(s); r.stop(s+dur+0.1);
    setTimeout(boom,6000+Math.random()*11000); })();
  return {stop(){ stopped=true; }}; }
const AMB={rain:c=>ambStartRainKind(c,'rain'), drizzle:c=>ambStartRainKind(c,'drizzle'),
  downpour:c=>ambStartRainKind(c,'downpour'), rooftop:c=>ambStartRainKind(c,'rooftop'),
  thunder:ambStartThunder, fire:ambStartFire, wind:ambStartWind};
function ambSetChip(name,on){ const c=document.querySelector('.amb-chip[data-amb="'+name+'"]'); if(c)c.classList.toggle('active',on); }
function ambToggle(name){ const ctx=ambCtx();
  if(ambNodes[name]){ ambNodes[name].stop(); delete ambNodes[name]; ambSetChip(name,false); }
  else if(AMB[name]){ ambNodes[name]=AMB[name](ctx); ambSetChip(name,true); }
  api.setSetting('ambient',Object.keys(ambNodes)); }
function ambSetVolume(v){ ambVol=v; if(ambMaster)ambMaster.gain.value=v; api.setSetting('ambientVol',v); }

/* equalizer (Web Audio, routes the <audio> through biquad bands) */
const EQ_FREQS=[60,150,400,1000,2500,8000];
const EQ_PRESETS={ flat:[0,0,0,0,0,0], pop:[-1,2,4,4,2,0], classic:[4,3,1,0,2,3], rock:[5,3,-2,-1,3,5], jazz:[2,1,0,2,3,2] };
let eqBuilt=false, eqSrc=null, eqBands=[], eqActive='flat', eqCustom1=[0,0,0,0,0,0], eqCustom2=[0,0,0,0,0,0];
function eqValuesFor(id){ if(id==='custom1')return eqCustom1.slice(); if(id==='custom2')return eqCustom2.slice(); return (EQ_PRESETS[id]||EQ_PRESETS.flat).slice(); }
function buildEq(){ if(eqBuilt)return; const ctx=ac();
  try{ eqSrc=ctx.createMediaElementSource(audio); }catch(e){ return; }
  let node=eqSrc;
  eqBands=EQ_FREQS.map((f,i)=>{ const b=ctx.createBiquadFilter();
    b.type=i===0?'lowshelf':(i===EQ_FREQS.length-1?'highshelf':'peaking'); b.frequency.value=f; b.Q.value=1; b.gain.value=0;
    node.connect(b); node=b; return b; });
  node.connect(ctx.destination); eqBuilt=true; applyEqGains(eqValuesFor(eqActive)); }
function applyEqGains(arr){ if(!eqBuilt)return; eqBands.forEach((b,i)=>{ try{ b.gain.setTargetAtTime(arr[i]||0, ac().currentTime, 0.04); }catch(_){ b.gain.value=arr[i]||0; } }); }
function eqPv(s,v){ s.style.setProperty('--pv', ((v+12)/24*100)+'%'); }
function updateEqUI(arr){ document.querySelectorAll('.eq-band').forEach(s=>{ const i=+s.dataset.b; const v=arr[i]||0; s.value=v; eqPv(s,v); });
  document.querySelectorAll('.eq-db').forEach(d=>{ const i=+d.dataset.b; const v=arr[i]||0; d.textContent=(v>0?'+':'')+v; }); }
function setEqChip(id){ document.querySelectorAll('.eq-preset').forEach(c=>c.classList.toggle('active',c.dataset.eq===id)); }
function selectEqPreset(id){ eqActive=id; const arr=eqValuesFor(id); buildEq(); applyEqGains(arr); updateEqUI(arr); setEqChip(id); api.setSetting('eqPreset',id); }
function onEqBand(i,val){ buildEq(); if(eqBuilt&&eqBands[i]){ try{ eqBands[i].gain.setTargetAtTime(val,ac().currentTime,0.04);}catch(_){ eqBands[i].gain.value=val; } }
  const db=document.querySelector('.eq-db[data-b="'+i+'"]'); if(db)db.textContent=(val>0?'+':'')+val;
  const s=document.querySelector('.eq-band[data-b="'+i+'"]'); if(s)eqPv(s,val);
  if(eqActive==='custom1'){ eqCustom1[i]=val; api.setSetting('eqCustom1',eqCustom1); }
  else if(eqActive==='custom2'){ eqCustom2[i]=val; api.setSetting('eqCustom2',eqCustom2); } }

let toastTimer;
function showToast(msg){ toastEl.textContent=msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),1300); }

/* helpers */
const fmt=(s)=>{ if(!isFinite(s)||s<0)s=0; const m=Math.floor(s/60),sec=Math.floor(s%60); return m+':'+String(sec).padStart(2,'0'); };
const nameFor=(p)=>{ const t=allTracks.find(x=>x.path===p); if(t)return t.name;
  const b=p.split(/[\\/]/).pop()||p; return b.replace(/\.[^.]+$/,'').replace(/_+/g,' '); };
const folderShort=(p)=>{ if(!p)return 'Music folder'; const a=p.split(/[\\/]/).filter(Boolean); return a.slice(-2).join(' / ')||p; };

/* init */
async function init(){
  const st=await api.getState();
  precip=(st.precip??0.5);
  applyTheme(st.theme||0,false);
  favorites=st.favorites||[]; shuffle=!!st.shuffle; repeat=st.repeat||'off'; source=st.source||'folder';
  volume.value=Math.round((st.volume??0.85)*100); audio.volume=st.volume??0.85;
  volume.style.setProperty('--pv',volume.value+'%');
  sourceSel.value=source; shuffleBtn.classList.toggle('active',shuffle); applyRepeatUI();

  ambVol=(st.ambientVol??0.5); if(ambMaster)ambMaster.gain.value=ambVol;
  const av=document.getElementById('ambVolume'); if(av){ av.value=Math.round(ambVol*100); av.style.setProperty('--pv',av.value+'%'); }
  const pr=document.getElementById('precipRange'); if(pr){ pr.value=Math.round(precip*100); pr.style.setProperty('--pv',pr.value+'%'); }
  if(st.background) applyBackground(st.background);
  eqCustom1=Array.isArray(st.eqCustom1)&&st.eqCustom1.length===6?st.eqCustom1.slice():[0,0,0,0,0,0];
  eqCustom2=Array.isArray(st.eqCustom2)&&st.eqCustom2.length===6?st.eqCustom2.slice():[0,0,0,0,0,0];
  eqActive=st.eqPreset||'flat'; updateEqUI(eqValuesFor(eqActive)); setEqChip(eqActive);
  if(st.pinned){ const pb=document.getElementById('pinBtn'); if(pb)pb.classList.add('active'); }

  const res=await api.listTracks(); allTracks=res.tracks||[]; musicFolder=res.folder||'';
  subEl.textContent=folderShort(musicFolder);
  rebuildQueue();
  let opened=null;
  try{ opened=await api.getPendingFile(); }catch(_){}
  if(opened){ loadTrack(opened,true); }
  else{
    const last=st.lastTrack&&queue.includes(st.lastTrack)?st.lastTrack:(queue[0]||'');
    if(last) loadTrack(last,false);
    else titleEl.textContent=allTracks.length?'Tap the record to play':'No music found in this folder';
  }
}
function rebuildQueue(){ queue=source==='favorites'?favorites.slice():allTracks.map(t=>t.path); }

async function loadTrack(pth,autoplay){
  if(!pth)return;
  currentPath=pth; audio.src=api.mediaUrl(pth);
  history.push(pth); if(history.length>200)history.shift();
  titleEl.textContent=nameFor(pth); applyMarquee();
  label.classList.remove('has-cover'); coverImg.removeAttribute('src');
  seek.value=0; seek.style.setProperty('--p','0%'); curEl.textContent='0:00'; durEl.textContent='0:00';
  updateFavIcon(); markSheetPlaying();
  await api.setSetting('lastTrack',pth);
  try{
    const meta=await api.trackMeta(pth);
    if(currentPath!==pth)return;
    if(meta.title){ titleEl.textContent=meta.title; applyMarquee(); }
    subEl.textContent=meta.artist?(meta.album?meta.artist+' · '+meta.album:meta.artist):folderShort(musicFolder);
    if(meta.cover){ coverImg.src=meta.cover; label.classList.add('has-cover'); }
  }catch(_){}
  if(autoplay)play();
}

/* playback */
function play(){ if(!currentPath){ if(queue.length)loadTrack(queue[0],true); return; }
  buildEq();
  const r=audio.play(); if(r&&r.then)r.then(()=>setPlaying(true)).catch(()=>setPlaying(false)); }
function pause(){ audio.pause(); setPlaying(false); }
function togglePlay(){ audio.paused?play():pause(); }
function setPlaying(on){ disc.classList.toggle('spinning',on); tonearm.classList.toggle('on',on);
  playIcon.classList.toggle('hidden',on); pauseIcon.classList.toggle('hidden',!on); }
function currentIndex(){ return queue.indexOf(currentPath); }
function randomLoad(){ let i; do{i=Math.floor(Math.random()*queue.length);}while(queue[i]===currentPath&&queue.length>1); loadTrack(queue[i],true); }
function next(){ if(!queue.length)return; if(shuffle&&queue.length>1){randomLoad();return;}
  let i=currentIndex()+1; if(i>=queue.length)i=0; loadTrack(queue[i],true); }
function prev(){ if(!queue.length)return; if(audio.currentTime>3){audio.currentTime=0;return;}
  if(history.length>1){history.pop();const p=history.pop();if(p){loadTrack(p,true);return;}}
  let i=currentIndex()-1; if(i<0)i=queue.length-1; loadTrack(queue[i],true); }
function advanceAuto(){ if(!queue.length)return; if(shuffle&&queue.length>1){randomLoad();return;}
  let i=currentIndex()+1; if(i>=queue.length){ if(repeat==='all')i=0; else{setPlaying(false);return;} } loadTrack(queue[i],true); }

/* repeat */
function applyRepeatUI(){ const on=repeat!=='off';
  repeatBtn.classList.toggle('active',on);
  repeatIcon.classList.toggle('hidden',repeat==='one');
  repeatOneIcon.classList.toggle('hidden',repeat!=='one');
  repeatBtn.title=repeat==='one'?'Repeat this song':repeat==='all'?'Repeat folder':'Repeat off'; }

/* favorites */
function isFav(p){ return favorites.includes(p); }
function updateFavIcon(){ const on=isFav(currentPath); favBtn.classList.toggle('active',on); favIcon.classList.toggle('fav-on',on); }
async function toggleFav(p){ if(!p)return; const i=favorites.indexOf(p); if(i>=0)favorites.splice(i,1); else favorites.push(p);
  updateFavIcon();
  if(source==='favorites')rebuildQueue();
  if(sheetMode==='favorites')renderSheet();
  else if(sheetMode==='library')refreshSheetHearts();
  await api.setSetting('favorites',favorites); }
function refreshSheetHearts(){ sheetList.querySelectorAll('.row').forEach(row=>{ const on=isFav(row.dataset.path);
  const h=row.querySelector('.rheart'); if(h){ h.classList.toggle('on',on); const pth=h.querySelector('path'); if(pth)pth.setAttribute('fill',on?'currentColor':'none'); } }); }

/* sheet */
function openSheet(mode){ sheetMode=mode; sheet.classList.add('open');
  ['ambSheet','bgSheet','eqSheet','aboutSheet'].forEach(id=>{ const el=document.getElementById(id); if(el)el.classList.remove('open'); });
  gridBtn.classList.toggle('active',mode==='favorites'); folderBtn.classList.toggle('active',mode==='library'); renderSheet(); }
function closeSheet(){ sheet.classList.remove('open'); sheetMode=''; gridBtn.classList.remove('active'); folderBtn.classList.remove('active'); }
function renderSheet(){
  const isFavMode=sheetMode==='favorites';
  sheetTitle.textContent=isFavMode?'Favorites':'Music folder';
  changeFolderBtn.classList.toggle('hidden',isFavMode);
  selectMusicBtn.classList.toggle('hidden',isFavMode);
  const list=isFavMode?favorites.map(p=>({path:p,name:nameFor(p)})):allTracks;
  sheetList.innerHTML='';
  if(!list.length){ sheetEmpty.classList.remove('hidden');
    sheetEmpty.textContent=isFavMode?'No favorites yet. Tap the heart on a track to add it here.':'No music in this folder. Use “Change folder” to pick another.'; return; }
  sheetEmpty.classList.add('hidden');
  const frag=document.createDocumentFragment();
  list.forEach((t,i)=>{
    const row=document.createElement('div'); row.className='row'+(t.path===currentPath?' playing':''); row.dataset.path=t.path;
    const idx=document.createElement('div'); idx.className='idx'; idx.textContent=t.path===currentPath?'♪':(i+1);
    const name=document.createElement('div'); name.className='rname'; name.textContent=t.name;
    const heart=document.createElement('div'); heart.className='rheart'+(isFav(t.path)?' on':'');
    heart.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.7C19 15.6 12 20 12 20z" fill="'+(isFav(t.path)?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    heart.addEventListener('click',(e)=>{e.stopPropagation();toggleFav(t.path);});
    row.addEventListener('click',()=>{
      if(isFavMode&&source!=='favorites'){source='favorites';sourceSel.value='favorites';api.setSetting('source','favorites');}
      else if(!isFavMode&&source!=='folder'){source='folder';sourceSel.value='folder';api.setSetting('source','folder');}
      rebuildQueue();
      loadTrack(t.path,true);
    });
    row.append(idx,name,heart); frag.appendChild(row);
  });
  sheetList.appendChild(frag);
}
function markSheetPlaying(){ sheetList.querySelectorAll('.row').forEach(r=>{ const on=r.dataset.path===currentPath;
  r.classList.toggle('playing',on); const idx=r.querySelector('.idx'); if(idx&&on)idx.textContent='♪'; }); }

/* marquee */
function applyMarquee(){ titleEl.classList.remove('marquee'); titleEl.style.removeProperty('--marq-x');
  requestAnimationFrame(()=>{ const wrap=titleEl.parentElement; const over=titleEl.scrollWidth-wrap.clientWidth;
    if(over>8){ titleEl.style.setProperty('--marq-x','-'+(over+12)+'px'); titleEl.style.animationDuration=Math.max(6,over/22)+'s'; titleEl.classList.add('marquee'); } }); }

/* progress / seek */
function updateProgress(){
  const d=isFinite(audio.duration)?audio.duration:0;
  curEl.textContent=fmt(audio.currentTime);
  durEl.textContent=d?fmt(d):'0:00';
  if(!seeking){ const p=d?Math.min(1,audio.currentTime/d):0; seek.value=p*1000; seek.style.setProperty('--p',(p*100)+'%'); }
}

/* events */
platter.addEventListener('click',togglePlay);
$('playBtn').addEventListener('click',togglePlay);
$('prevBtn').addEventListener('click',prev);
$('nextBtn').addEventListener('click',next);
favBtn.addEventListener('click',()=>toggleFav(currentPath));
$('closeBtn').addEventListener('click',()=>api.hideWindow());
brand.addEventListener('click',async()=>{ applyTheme(themeIdx+1,true); await api.setSetting('theme',themeIdx); });
shuffleBtn.addEventListener('click',async()=>{ shuffle=!shuffle; shuffleBtn.classList.toggle('active',shuffle); await api.setSetting('shuffle',shuffle); });
repeatBtn.addEventListener('click',async()=>{ repeat=repeat==='off'?'all':repeat==='all'?'one':'off'; applyRepeatUI();
  showToast(repeat==='one'?'Repeat: this song':repeat==='all'?'Repeat: folder':'Repeat: off'); await api.setSetting('repeat',repeat); });
gridBtn.addEventListener('click',()=>sheetMode==='favorites'?closeSheet():openSheet('favorites'));
folderBtn.addEventListener('click',()=>sheetMode==='library'?closeSheet():openSheet('library'));
$('sheetClose').addEventListener('click',closeSheet);
changeFolderBtn.addEventListener('click',async()=>{ const f=await api.pickFolder(); if(f)await reloadFolder(); });
selectMusicBtn.addEventListener('click',async()=>{ const r=await api.pickTracks();
  if(!r||!r.files||!r.files.length)return;
  // quick play: don't change the library folder — just play the picked file(s)
  queue=r.files.slice(); loadTrack(r.files[0],true); markSheetPlaying(); });
sourceSel.addEventListener('change',async()=>{ source=sourceSel.value; await api.setSetting('source',source); rebuildQueue(); if(sheetMode)renderSheet(); });

async function reloadFolder(){ const res=await api.listTracks(); allTracks=res.tracks||[]; musicFolder=res.folder||'';
  subEl.textContent=folderShort(musicFolder); rebuildQueue(); if(sheetMode)renderSheet();
  if(queue.length&&!queue.includes(currentPath))loadTrack(queue[0],false); }
api.onFolderChanged(()=>reloadFolder());
api.onPlayFile(async (d)=>{ await reloadFolder(); if(d&&d.file) loadTrack(d.file,true); });

/* panels */
function closePanels(except){ ['ambSheet','bgSheet','eqSheet','aboutSheet'].forEach(id=>{ if(id!==except){ const el=document.getElementById(id); if(el)el.classList.remove('open'); } }); if(sheetMode)closeSheet(); }

/* ambience panel */
const ambBtn=$('ambBtn'), ambSheet=$('ambSheet'), ambVolume=$('ambVolume');
ambBtn.addEventListener('click',()=>{ closePanels('ambSheet'); ambSheet.classList.toggle('open'); });
$('ambClose').addEventListener('click',()=>ambSheet.classList.remove('open'));
document.querySelectorAll('.amb-chip').forEach(chip=>chip.addEventListener('click',()=>ambToggle(chip.dataset.amb)));
ambVolume.addEventListener('input',()=>{ ambVolume.style.setProperty('--pv',ambVolume.value+'%'); ambSetVolume(ambVolume.value/100); });
const precipRange=$('precipRange');
precipRange.addEventListener('input',()=>{ precipRange.style.setProperty('--pv',precipRange.value+'%'); const v=precipRange.value/100;
  fxSetIntensity(v); Object.values(ambNodes).forEach(n=>{ if(n&&n.setIntensity)n.setIntensity(v); }); api.setSetting('precip',v); });

/* background panel */
const bgBtn=$('bgBtn'), bgSheet=$('bgSheet');
function applyBackground(pth){ const root=document.documentElement; const rm=document.getElementById('bgRemove');
  if(pth){ root.style.setProperty('--bg-url','url("'+api.mediaUrl(pth)+'")'); root.classList.add('has-bg'); if(rm)rm.classList.remove('hidden'); }
  else{ root.style.removeProperty('--bg-url'); root.classList.remove('has-bg'); if(rm)rm.classList.add('hidden'); } }
bgBtn.addEventListener('click',()=>{ closePanels('bgSheet'); bgSheet.classList.toggle('open'); });
$('bgClose').addEventListener('click',()=>bgSheet.classList.remove('open'));
$('bgUpload').addEventListener('click',async()=>{ const p=await api.pickBackground(); if(p)applyBackground(p); });
$('bgRemove').addEventListener('click',async()=>{ await api.clearBackground(); applyBackground(null); });

/* equalizer panel */
const eqBtn=$('eqBtn'), eqSheet=$('eqSheet');
eqBtn.addEventListener('click',()=>{ closePanels('eqSheet'); buildEq(); eqSheet.classList.toggle('open'); });
$('eqClose').addEventListener('click',()=>eqSheet.classList.remove('open'));
document.querySelectorAll('.eq-preset').forEach(c=>c.addEventListener('click',()=>selectEqPreset(c.dataset.eq)));
document.querySelectorAll('.eq-band').forEach(s=>s.addEventListener('input',()=>onEqBand(+s.dataset.b,+s.value)));

/* pin */
const pinBtn=$('pinBtn');
pinBtn.addEventListener('click',async()=>{ const on=!pinBtn.classList.contains('active'); pinBtn.classList.toggle('active',on); await api.setPinned(on); });

/* about panel */
const aboutBtn=$('aboutBtn'), aboutSheet=$('aboutSheet');
aboutBtn.addEventListener('click',()=>{ closePanels('aboutSheet'); aboutSheet.classList.toggle('open'); });
$('aboutClose').addEventListener('click',()=>aboutSheet.classList.remove('open'));
$('copyEmail').addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText('mohammadrezasm2@gmail.com'); showToast('Email copied'); }catch(_){}});

audio.addEventListener('timeupdate',updateProgress);
audio.addEventListener('loadedmetadata',updateProgress);
audio.addEventListener('durationchange',updateProgress);
audio.addEventListener('ended',()=>{ if(repeat==='one'){audio.currentTime=0;play();return;} advanceAuto(); });
audio.addEventListener('play',()=>setPlaying(true));
audio.addEventListener('playing',()=>setPlaying(true));
audio.addEventListener('pause',()=>setPlaying(false));
audio.addEventListener('error',()=>setPlaying(false));

let seekWasPlaying=false;
seek.addEventListener('pointerdown',()=>{seeking=true;seekWasPlaying=!audio.paused;});
seek.addEventListener('input',()=>{ const d=isFinite(audio.duration)?audio.duration:0;
  seek.style.setProperty('--p',(seek.value/10)+'%'); if(d)curEl.textContent=fmt((seek.value/1000)*d); });
seek.addEventListener('change',()=>{ const d=isFinite(audio.duration)?audio.duration:0;
  if(d)audio.currentTime=(seek.value/1000)*d; seeking=false;
  if(seekWasPlaying)play();   // keep playing at the new position
});
seek.addEventListener('pointerup',()=>{seeking=false;});

volume.addEventListener('input',async()=>{ audio.volume=volume.value/100; volume.style.setProperty('--pv',volume.value+'%'); await api.setSetting('volume',audio.volume); });

document.addEventListener('keydown',(e)=>{ if(e.code==='Space'){e.preventDefault();togglePlay();}
  else if(e.code==='Escape'){ const op=['ambSheet','bgSheet','eqSheet','aboutSheet'].map(id=>document.getElementById(id)).find(el=>el&&el.classList.contains('open'));
    if(op)op.classList.remove('open'); else if(sheetMode)closeSheet(); else api.hideWindow(); } });

init();
