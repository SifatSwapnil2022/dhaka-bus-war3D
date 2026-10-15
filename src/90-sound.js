/* ================================================================= sound */
const Snd = { ctx: null, on: true, eng: null };
function audioInit(){
  if (Snd.ctx) { if (Snd.ctx.state === 'suspended') Snd.ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; Snd.ctx = new AC();
    const o = Snd.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 45;
    const f = Snd.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const gn = Snd.ctx.createGain(); gn.gain.value = 0; o.connect(f); f.connect(gn); gn.connect(Snd.ctx.destination); o.start(); Snd.eng = { o, f, gn };
  } catch (e) { Snd.ctx = null; }
}
let engineOn = false;
function setEngine(on){ engineOn = on && Snd.on; if (Snd.eng) Snd.eng.gn.gain.setTargetAtTime(engineOn ? .035 : 0, Snd.ctx.currentTime, .1); }
function engineTick(){ if (!Snd.eng || !engineOn || !me) return; const s = Math.abs(me.speed); Snd.eng.o.frequency.setTargetAtTime(42 + s * 3.1, Snd.ctx.currentTime, .08); Snd.eng.f.frequency.setTargetAtTime(220 + s * 20, Snd.ctx.currentTime, .08); }
function horn(vol = .5, pitch = 1){
  if (!Snd.ctx || !Snd.on) return; const t = Snd.ctx.currentTime;
  const out = Snd.ctx.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(.16 * vol, t + .02); out.gain.setValueAtTime(.16 * vol, t + .42); out.gain.linearRampToValueAtTime(0, t + .56); out.connect(Snd.ctx.destination);
  [370, 466].forEach(fq => { const o = Snd.ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(fq * pitch * .93, t); o.frequency.linearRampToValueAtTime(fq * pitch, t + .09); const lp = Snd.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; o.connect(lp); lp.connect(out); o.start(t); o.stop(t + .6); });
}
function playHornAt(v){ if (!me) return horn(.6); const d = Math.hypot(v.x - me.x, v.z - me.z); horn(clamp(1 - d / 120, .08, 1)); }
function blip(f1, f2, dur, vol = .1, type = 'triangle'){
  if (!Snd.ctx || !Snd.on) return; const t = Snd.ctx.currentTime; const o = Snd.ctx.createOscillator(), g = Snd.ctx.createGain(); o.type = type;
  o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(Snd.ctx.destination); o.start(t); o.stop(t + dur + .02);
}
const coin = () => blip(880, 1320, .12, .07);
const tick = () => blip(520, 480, .05, .03, 'square');
function whistle(){ if (!Snd.ctx || !Snd.on) return; const t = Snd.ctx.currentTime; const o = Snd.ctx.createOscillator(), g = Snd.ctx.createGain(), lfo = Snd.ctx.createOscillator(), lg = Snd.ctx.createGain(); o.type = 'sine'; o.frequency.value = 2600; lfo.frequency.value = 28; lg.gain.value = 180; lfo.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + .45); o.connect(g); g.connect(Snd.ctx.destination); o.start(t); lfo.start(t); o.stop(t + .5); lfo.stop(t + .5); }
function thud(vol = .6){
  if (!Snd.ctx || !Snd.on) return; const t = Snd.ctx.currentTime, len = Snd.ctx.sampleRate * .18 | 0; const buf = Snd.ctx.createBuffer(1, len, Snd.ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  const s = Snd.ctx.createBufferSource(); s.buffer = buf; const lp = Snd.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; const g = Snd.ctx.createGain(); g.gain.value = .5 * vol; s.connect(lp); lp.connect(g); g.connect(Snd.ctx.destination); s.start(t);
}
