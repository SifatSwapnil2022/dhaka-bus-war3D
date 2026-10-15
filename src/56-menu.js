/* ================================================================= screens, menu, input */
function setScreen(name){
  for (const id of ['menu', 'lobby', 'results', 'pause', 'loading']) $(id).hidden = id !== name;
  const inRace = name === 'hud';
  $('hud').hidden = !(inRace || name === 'pause'); $('hudBtns').hidden = !inRace;
  $('touch').hidden = !(inRace && isTouch);
  if (!inRace) { $('hint').hidden = true; GLOWS.forEach(g => g.visible = false); $('bubble').hidden = true; $('mapView').hidden = true; floaters.forEach(f => f.el.remove()); floaters.length = 0; }
  $('pauseBtn').hidden = W.online;
}
function statRow(lbl, v){ return `<span>${lbl}</span><span class="bar"><i style="width:${Math.round(clamp(v, .05, 1) * 100)}%"></i></span>`; }
function routePreview(cv, ri){
  const g = cv.getContext('2d'), w = cv.width, h = cv.height; g.fillStyle = '#120d14'; g.fillRect(0, 0, w, h);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const n of NET.nodes) { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); z0 = Math.min(z0, n.z); z1 = Math.max(z1, n.z); }
  const sc = Math.min((w - 12) / (x1 - x0), (h - 12) / (z1 - z0)), ox = (w - (x1 - x0) * sc) / 2, oz = (h - (z1 - z0) * sc) / 2; const T = (x, z) => [ox + (x - x0) * sc, oz + (z - z0) * sc];
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(244,234,214,.25)';
  for (const e of NET.edges) { g.beginPath(); for (let k = 0; k < e.n; k += 10) { const [px, py] = T(e.X[k], e.Z[k]); k ? g.lineTo(px, py) : g.moveTo(px, py); } const [px, py] = T(e.X[e.n - 1], e.Z[e.n - 1]); g.lineTo(px, py); g.stroke(); }
  const RP = routePath(ri, false); g.strokeStyle = '#f2b01e'; g.lineWidth = 3.2; g.beginPath(); for (let i = 0; i < RP.n; i += 6) { const [px, py] = T(RP.X[i], RP.Z[i]); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  const [sx, sy] = T(RP.X[0], RP.Z[0]); g.fillStyle = '#2f9a52'; g.beginPath(); g.arc(sx, sy, 4, 0, 7); g.fill();
}
function updateDirText(){ const RP = routePath(Game.route, Game.rev), st = RP.stops; $('dirText').textContent = `${st[0].site.bn} থেকে ${st[st.length - 1].site.bn} · ${bn(st.length)}টা স্টপ · প্রায় ${bn(Math.round(RP.len * GEO.scale / 100) / 10)} কিমি আসল পথ`; }
function buildMenu(){
  const rg = $('routeGrid'); rg.textContent = '';
  ROUTES.forEach((R, i) => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'route-card'; btn.setAttribute('aria-pressed', String(i === Game.route));
    const cv = makeCanvas(128, 168); routePreview(cv, i); btn.appendChild(cv);
    const tx = document.createElement('div'); const b = document.createElement('b'); b.textContent = R.bn; const s1 = document.createElement('span'); s1.textContent = R.sub; const s2 = document.createElement('span'); s2.textContent = R.area; tx.append(b, s1, s2); btn.appendChild(tx);
    btn.addEventListener('click', () => { Game.route = i; [...rg.children].forEach((c, k) => c.setAttribute('aria-pressed', String(k === i))); store('dbw.route', i); updateDirText(); if (Game.mode === 'menu') setupAttract(); });
    rg.appendChild(btn);
  });
  $('dirBtn').addEventListener('click', () => { Game.rev = !Game.rev; store('dbw.rev', Game.rev ? 1 : 0); updateDirText(); if (Game.mode === 'menu') setupAttract(); });
  updateDirText();
  const grid = $('busGrid'); grid.textContent = '';
  BUSES.forEach((b, i) => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'bus-card'; btn.setAttribute('aria-pressed', String(i === Game.mySlot)); btn.id = 'bus-' + b.id;
    const cv = makeCanvas(1024, 280); cv.getContext('2d').drawImage(busCanvases(b).R, 0, 0); btn.appendChild(cv);
    const nm = document.createElement('div'); nm.className = 'nm'; const nb = document.createElement('b'); nb.textContent = b.bn; const ns = document.createElement('span'); ns.textContent = b.en + ' · ' + b.tag; nm.append(nb, ns); btn.appendChild(nm);
    const rt = document.createElement('div'); rt.className = 'rt'; rt.textContent = `${b.route} · ${b.via}`; btn.appendChild(rt);
    const s = document.createElement('div'); s.className = 'stats'; s.innerHTML = statRow('গতি', (b.stats.top - 19.5) / 3.5) + statRow('টান', (b.stats.acc - 8.5) / 4) + statRow('সিট', (b.stats.cap - 26) / 15); btn.appendChild(s);
    btn.addEventListener('click', () => { Game.mySlot = i; [...grid.children].forEach((c, k) => c.setAttribute('aria-pressed', String(k === i))); store('dbw.bus', i); });
    grid.appendChild(btn);
  });
  segInit('durSeg', String(Game.dur), v => { Game.dur = +v; store('dbw.dur', v); });
  segInit('gfxSeg', Game.hq ? '1' : '0', v => { Game.hq = v === '1'; store('dbw.hq', v); applyGfx(); });
  segInit('voiceSeg', Game.voice ? '1' : '0', v => { Game.voice = v === '1'; store('dbw.voice', v); if (!Game.voice) try { speechSynthesis.cancel(); } catch (e) {} });
}
function segInit(id, cur, on){ const el = $(id); [...el.children].forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.v === cur)); b.addEventListener('click', () => { [...el.children].forEach(c => c.setAttribute('aria-pressed', String(c === b))); on(b.dataset.v); }); }); }
function store(k, v){ try { localStorage.setItem(k, String(v)); } catch (e) {} }
let gfxApplied = null;
function applyGfx(){
  if (gfxApplied === Game.hq) return; gfxApplied = Game.hq;
  renderer.shadowMap.enabled = Game.hq; if (sun) sun.castShadow = Game.hq;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Game.hq ? (isTouch ? 1.5 : 1.75) : 1));
  if (scene.fog) { scene.fog.near = Game.hq ? 150 : 100; scene.fog.far = Game.hq ? 560 : 400; } camera.far = Game.hq ? 600 : 440; camera.updateProjectionMatrix();
  scene.traverse(o => { if (o.userData && o.userData.blob) o.visible = !Game.hq; if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
  resize();
}
const cleanNick = t => String(t || '').replace(/[\u0000-\u001f\u007f\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '').trim().slice(0, 14);
$('nick').addEventListener('input', e => { Game.nick = cleanNick(e.target.value); store('dbw.nick', Game.nick); });
$('soloBtn').addEventListener('click', () => { audioInit(); startRace({ seats: soloSeats(), mySlot: Game.mySlot, dur: Game.dur, route: Game.route, rev: Game.rev }); });
$('againBtn').addEventListener('click', () => { if (W.online) toLobby(); else startRace({ seats: soloSeats(), mySlot: Game.mySlot, dur: Game.dur, route: Game.route, rev: Game.rev }); });
$('homeBtn').addEventListener('click', () => { if (W.online) leaveRoom(); goMenu(); });
$('resumeBtn').addEventListener('click', () => togglePause(false));
$('quitBtn').addEventListener('click', () => { Game.paused = false; goMenu(); });
$('pauseBtn').addEventListener('click', e => { e.currentTarget.blur(); togglePause(true); });
$('camBtn').addEventListener('click', e => { e.currentTarget.blur(); Game.cam = (Game.cam + 1) % 3; });
$('mapBtn').addEventListener('click', e => { e.currentTarget.blur(); toggleMap($('mapView').hidden); });
$('mapClose').addEventListener('click', () => toggleMap(false));
$('minimap').addEventListener('click', () => toggleMap(true));
$('muteBtn').addEventListener('click', e => { e.currentTarget.blur(); Snd.on = !Snd.on; $('muteBtn').textContent = Snd.on ? 'শব্দ বন্ধ' : 'শব্দ চালু'; if (!Snd.on) { setEngine(false); try { speechSynthesis.cancel(); } catch (er) {} } else if (Game.mode === 'race') setEngine(true); });
function togglePause(p){ if (W.online || Game.mode !== 'race') return; Game.paused = p; setScreen(p ? 'pause' : 'hud'); if (p) { setEngine(false); try { speechSynthesis.cancel(); } catch (e) {} } else { setEngine(true); last = performance.now(); } }
function goMenu(){ Game.mode = 'menu'; setEngine(false); W.online = false; setupAttract(); setScreen('menu'); }
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (KEYMAP[e.code]) { input[KEYMAP[e.code]] = true; if (Game.mode === 'race') e.preventDefault(); }
  if ((e.code === 'Space' || e.code === 'KeyE') && Game.mode === 'race') { if (!e.repeat) input.item = true; e.preventDefault(); }
  if (e.code === 'KeyH' && Game.mode === 'race' && !e.repeat) input.horn = true;
  if ((e.code === 'Escape' || e.code === 'KeyP') && Game.mode === 'race') { if (!$('mapView').hidden) toggleMap(false); else togglePause(!Game.paused); }
  if (e.code === 'KeyM') $('muteBtn').click();
  if (e.code === 'KeyN' && Game.mode === 'race') toggleMap($('mapView').hidden);
  if (e.code === 'KeyC' && Game.mode === 'race') Game.cam = (Game.cam + 1) % 3;
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for (const k in input) input[k] = false; });
function bindTouch(id, key){
  const el = $(id);
  const on = e => { e.preventDefault(); if (key === 'item' || key === 'horn') input[key] = true; else input[key] = true; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (er) {} };
  const off = () => { if (key !== 'item' && key !== 'horn') input[key] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
bindTouch('tLeft', 'left'); bindTouch('tRight', 'right'); bindTouch('tGas', 'up'); bindTouch('tBrake', 'down'); bindTouch('tItem', 'item'); bindTouch('tHorn', 'horn');
document.addEventListener('visibilitychange', () => { if (document.hidden && Game.mode === 'race' && !W.online) togglePause(true); });
if (isTouch) document.body.classList.add('touch');
function resize(){ const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);
