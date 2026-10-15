/* =================================================================
   the helper: calls passengers, warns the driver, in his own words
   ================================================================= */
const Helper = { last: 0, lastPri: 9, cd: {}, voice: null, tick: 0 };
const CAT_CD = { stop: 4000, board: 7000, call: 9000, drop: 5000, leave: 6000, right: 9000, ahead: 7000, rickshaw: 8000, behind: 10000, side: 5000, turn: 9000, offroute: 9000, pothole: 12000, dig: 12000, water: 10000, wrong: 6000, rail: 6000, rival: 12000, bus: 4000, full: 9000, hump: 8000 };
function helperSay(cat, text, pri = 2, force){
  if (Game.mode !== 'race') return;
  const now = performance.now();
  if (!force && (Helper.cd[cat] || 0) > now) return;
  if (now - Helper.last < 1400 && pri > Helper.lastPri) return;
  Helper.cd[cat] = now + (CAT_CD[cat] || 6000); Helper.last = now; Helper.lastPri = pri;
  $('bubbleText').textContent = text; $('bubble').hidden = false; clearTimeout(Helper.timer);
  Helper.timer = setTimeout(() => { $('bubble').hidden = true; Helper.lastPri = 9; }, 2600);
  speak(text);
}
function pickVoice(){ try { const vs = speechSynthesis.getVoices(); Helper.voice = vs.find(v => /^bn/i.test(v.lang)) || null; } catch (e) { Helper.voice = null; } }
try { if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } } catch (e) {}
function speak(text){
  if (!Game.voice || !Snd.on || !Helper.voice) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[!…]/g, '।')); u.voice = Helper.voice; u.lang = Helper.voice.lang; u.rate = 1.12; u.pitch = 1.15; u.volume = .9; speechSynthesis.speak(u); } catch (e) {}
}
const SHORT = s => s.bn.replace(/ (বিশ্বরোড|কাকলী|মোড়)$/, '');
function helperCall(){
  const RP = W.RP, ns = nextStop(me); const names = [];
  for (let i = ns.i; i < RP.stops.length && names.length < 4; i++) names.push(SHORT(RP.stops[i].site));
  if (names.length >= 2 && Math.random() < .55) return names.map(n => n + '!').join(' ') + ' ওই ওই!';
  const first = names[0] || 'সামনে';
  return pick([`${first}, ${first}! নামবেন? উঠেন, উঠেন!`, 'সামনে যাইব, সামনে! জায়গা আছে, উঠেন!']);
}
function helperWatch(dt){
  if (!me || W.t < 1 || me.finished) return;
  Helper.tick -= dt; if (Helper.tick > 0) return; Helper.tick = .25;
  const RP = W.RP, spd = Math.abs(me.speed), fx = Math.sin(me.h), fz = Math.cos(me.h), lx = fz, lz = -fx;
  // a stop coming up: call the passengers
  const ns = nextStop(me);
  if (me.onRoute && ns.d > 20 && ns.d < 90 && me.pax.length < me.liv.stats.cap && remaining(ns.i) > 0) helperSay('call', helperCall(), 2);
  if (stopZone(me) >= 0 && !curbOK(me) && spd < 8) helperSay('left', pick(HELPER.left), 1);
  // the turn the route takes next
  const t = RP.turns.find(q => q.s > me.rs); if (me.onRoute && t && t.kind !== 'S' && t.s - me.rs < 75 && t.s - me.rs > 20) helperSay('turn', pick((t.kind === 'L' ? HELPER.turnL : HELPER.turnR)(t.toName)), 1);
  me.offT = !me.onRoute && spd > 3 ? me.offT + .25 : 0; if (me.offT > 2) helperSay('offroute', pick(LINES.offroute), 1);
  // what is around the bus
  let ahead = null, ad = 99, right = null, behind = null;
  for (const o of OBS) {
    const dx = o.x - me.x, dz = o.z - me.z; if (Math.abs(dx) > 30 || Math.abs(dz) > 30) continue;
    const al = dx * fx + dz * fz, lt = dx * lx + dz * lz;
    if (al > BUS_HL && al < BUS_HL + 12 && Math.abs(lt) < 2 && al < ad && o.k !== 'dig' && o.k !== 'j') { ad = al; ahead = o; }
    if (lt < -1.8 && lt > -4.2 && Math.abs(al) < BUS_HL && (o.k === 'k' || o.k === 'm') && o.v > 2) right = o;
  }
  for (const u of vehicles) { if (u === me || u.gone) continue; const dx = u.x - me.x, dz = u.z - me.z, al = dx * fx + dz * fz, lt = dx * lx + dz * lz; if (al < -BUS_HL * 2 && al > -32 && Math.abs(lt) < 6 && u.speed > me.speed + 1.5) behind = u; }
  if (ahead && spd > 6) helperSay(ahead.k === 'r' ? 'rickshaw' : 'ahead', pick(ahead.k === 'r' ? HELPER.rickshaw : HELPER.ahead), 1);
  if (right && spd > 4) helperSay('right', pick(HELPER.right), 2);
  if (behind) helperSay('behind', pick(HELPER.behind), 3);
  // broken road ahead in my lane
  if (me.edge && spd > 8) { const E = me.edge; for (const h of E.e.holes) { const d = (h.s - E.s) * E.dir; if (d > 8 && d < 22 && Math.abs(h.lat - E.lat) < 2) { helperSay('pothole', pick(LINES.pothole), 3); break; } } for (const dg of E.e.digs) { const d = ((dg.s0 + dg.s1) / 2 - E.s) * E.dir; if (d > 10 && d < 60 && Math.sign(E.lat) === dg.sd) { helperSay('dig', pick(LINES.dig), 2); break; } } }
}

/* ================================================================= race flow */
function startRace(opt){
  disposeVehicles(); attract = [];
  Game.route = opt.route != null ? opt.route : Game.route; Game.rev = opt.rev != null ? opt.rev : Game.rev;
  W.RP = routePath(Game.route, Game.rev);
  W.online = !!opt.online; W.isHost = opt.online ? opt.isHost : true; W.rid = opt.rid || ''; W.t = opt.t0 != null ? opt.t0 : -3; W.ended = false; W.hostPres = null; W.dur = opt.dur || Game.dur; W.finishN = 0; W.endAt = 0;
  resetPassengers(); setupCrates(); setupStopsVisual(); lastHotShown = -1;
  for (let slot = 0; slot < 4; slot++) {
    const s = opt.seats[slot];
    const v = makeVehicle(slot, s.kind, s.name); v.peer = s.peer || null; vehicles.push(v);
    placeOnGrid(v, opt.online ? slot : (slot - (opt.mySlot || 0) + 4) % 4);
    if (s.kind === 'me') me = v;
  }
  for (const [, p] of PROXY) if (p.mesh) dropMesh(p.k, p.mesh); PROXY.clear();
  if (W.isHost) initTraffic(foci()); else { for (const a of AG) { if (a.mesh) dropMesh(a.k, a.mesh); a.e = null; a.mesh = null; } AG.length = 0; LISTS.clear(); }
  Game.mode = 'race'; Game.paused = false;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  setScreen('hud'); $('toasts').textContent = '';
  const liv = me.liv; const hb = $('hBoard');
  hb.style.setProperty('--busboard', liv.board); hb.style.setProperty('--busink', liv.boardInk);
  $('hBus').textContent = liv.bn; const st = W.RP.stops; $('hRoute').textContent = st[0].site.bn + ' → ' + st[st.length - 1].site.bn;
  buildSeatbar(); applyGfx(); audioInit(); setEngine(true); mmB = null; Game.snap = true;
}
function foci(){ const out = []; for (const v of vehicles) if (!v.gone && (v.kind === 'me' || v.kind === 'remote')) out.push(v); if (!out.length) { if (attract.length) out.push(attract[Game.mySlot] || attract[0]); else if (me) out.push(me); else if (vehicles.length) out.push(vehicles[0]); } return out; }
function endRace(){
  if (W.ended) return; W.ended = true; Game.mode = 'results'; setEngine(false); try { speechSynthesis.cancel(); } catch (e) {}
  const list = vehicles.filter(v => !v.gone || v.kind === 'me').slice().sort((a, b) => b.score - a.score);
  const ol = $('rank'); ol.textContent = '';
  list.forEach((v, i) => {
    const li = document.createElement('li');
    const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = bn(i + 1);
    const chip = document.createElement('span'); chip.className = 'chip'; chip.style.background = v.liv.chip;
    const who = document.createElement('span'); who.className = 'who'; who.textContent = v.kind === 'me' ? (Game.nick || 'আপনি') + ' (আপনি)' : v.name;
    const sm = document.createElement('small'); sm.textContent = `${v.liv.bn} · ${bn(v.delivered)} জন যাত্রী নামিয়েছে` + (v.place ? ` · ${bn(v.place)} নম্বরে শেষ স্টপে` : ''); who.appendChild(sm);
    const tk = document.createElement('span'); tk.className = 'tk num'; tk.textContent = '৳' + bn(v.score);
    if (v.fines > 0) { const f = document.createElement('small'); f.textContent = 'জরিমানা ৳' + bn(v.fines); tk.appendChild(f); }
    li.append(pos, chip, who, tk); ol.appendChild(li);
  });
  $('breakdown').innerHTML = `আপনার হিসাব: ভাড়া আয় <b>৳${bn(me.earn)}</b> · শেষ স্টপ বোনাস <b>৳${bn(me.bonus)}</b> · জরিমানা <b>−৳${bn(me.fines)}</b> = <b>৳${bn(me.score)}</b>`;
  $('resTitle').textContent = list[0] === me ? 'আজকের রাস্তা আপনার!' : `আজ জিতলো ${list[0].name}`;
  $('againBtn').textContent = W.online ? 'লবিতে ফিরুন' : 'আবার খেলুন';
  setScreen('results');
}
function soloSeats(){ const seats = {}; for (let s = 0; s < 4; s++) seats[s] = s === Game.mySlot ? { kind: 'me', name: Game.nick || 'আপনি' } : { kind: 'ai', name: aiName(s) }; return seats; }

/* host: passengers spawn at stops; every ~40 s a crowd forms somewhere */
function hostStep(dt){
  const N = NST();
  for (let i = 0; i < N - 1; i++) {
    const hot = hotAt(i), rate = (.2 + W.RP.stops[i].site.w * .45) * (hot ? 3 : 1), cap = hot ? MAXQ : 16;
    W.spAcc[i] += dt * rate; if (W.spAcc[i] >= 1) { W.spAcc[i] -= 1; if (remaining(i) < cap) W.sp[i]++; }
  }
  if (Game.mode === 'race' && W.t > 0) {
    W.hotNext -= dt;
    if (W.hotNext <= 0) {
      W.hotNext = 36 + Math.random() * 12;
      const cand = W.RP.stops.map((s, i) => [i, s.site.w]).filter(([i]) => i < N - 1 && (!me || W.RP.stops[i].s - me.rs > 120));
      if (cand.length) { let r = Math.random() * cand.reduce((a, c) => a + c[1], 0), pickI = cand[0][0]; for (const [i, w] of cand) { r -= w; if (r <= 0) { pickI = i; break; } } W.hot = { i: pickI, until: W.t + 30 }; announceHot(); }
    }
  }
}
let lastHotShown = -1;
function announceHot(){ if (!W.hot) return; const key = W.hot.i * 1000 + Math.floor(W.hot.until); if (key === lastHotShown) return; lastHotShown = key; toast(W.RP.stops[W.hot.i].site.hot, 'event'); blip(520, 780, .25, .08); }

/* waiting jatri and the glowing bay at the next stop */
let waitBody, waitHead; const WAIT_SLOTS = []; let shownWait = []; let GLOWS = [];
function setupStopsVisual(){
  for (const g of GLOWS) { scene.remove(g); g.geometry.dispose(); } GLOWS = [];
  const RP = W.RP; const N = RP.stops.length; const total = MAXQ * 14;
  if (!waitBody) {
    const bodyG = new THREE.CylinderGeometry(.24, .3, 1.25, 7); bodyG.translate(0, .62, 0); const headG = new THREE.SphereGeometry(.2, 8, 6); headG.translate(0, 1.42, 0);
    waitBody = new THREE.InstancedMesh(bodyG, lam({ color: 0xffffff }), total); waitHead = new THREE.InstancedMesh(headG, lam({ color: 0x5a3a26 }), total);
    const cloth = ['#f4f1ea', '#2f5fa7', '#c22f4a', '#e7a21b', '#0f8a6c', '#7b3fa0', '#d9d2c3', '#3d3d3d', '#e06a2b', '#a3c4e0', '#f2f2f2', '#1d3557'], r = mulberry32(5), col = new THREE.Color();
    for (let i = 0; i < total; i++) { col.set(cloth[Math.floor(r() * cloth.length)]); waitBody.setColorAt(i, col); }
    if (waitBody.instanceColor) waitBody.instanceColor.needsUpdate = true; waitBody.castShadow = true; waitBody.frustumCulled = waitHead.frustumCulled = false; scene.add(waitBody, waitHead);
  }
  WAIT_SLOTS.length = 0; const r = mulberry32(9);
  for (let si = 0; si < 14; si++) for (let k = 0; k < MAXQ; k++) {
    const st = RP.stops[si]; if (!st) { WAIT_SLOTS.push(null); continue; }
    const e = st.e, sd = st.sd; const s = st.es + sd * (-8.4 + (k % 12) * 1.45 + r() * .3), lat = sd * (e.prof.hw + .8 + Math.floor(k / 12) * .62 + r() * .1);
    WAIT_SLOTS.push(eAt(e, s, lat));
  }
  shownWait = new Array(14).fill(-1);
  const m4 = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < total; i++) { waitBody.setMatrixAt(i, m4); waitHead.setMatrixAt(i, m4); } waitBody.instanceMatrix.needsUpdate = waitHead.instanceMatrix.needsUpdate = true;
  for (const st of RP.stops) {
    const B2 = new Batch(); const pr = st.e.prof; edgeRibbon(B2, st.e, st.es - STOP_ZONE, st.es + STOP_ZONE, st.sd * (pr.hw - .3), st.sd * (pr.hw - LW - .5), .055, .055, STOP_ZONE * 2);
    const m = B2.mesh(new THREE.MeshBasicMaterial({ color: 0xf2b01e, transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -5 }), false);
    m.visible = false; GLOWS.push(m);
  }
}
function updateWaiting(){
  const m4 = new THREE.Matrix4(); let dirty = false; const N = NST();
  for (let si = 0; si < Math.min(14, N); si++) {
    const n = si === N - 1 ? 0 : clamp(Math.round(remaining(si)), 0, MAXQ); if (n === shownWait[si]) continue; shownWait[si] = n; dirty = true;
    for (let k = 0; k < MAXQ; k++) {
      const idx = si * MAXQ + k, p = WAIT_SLOTS[idx]; if (!p) continue;
      if (k < n) { const sc = .92 + ((idx * 37) % 10) / 60; m4.makeScale(sc, sc, sc); m4.setPosition(p[0], CURB_H, p[1]); } else m4.makeScale(0, 0, 0);
      waitBody.setMatrixAt(idx, m4); waitHead.setMatrixAt(idx, m4);
    }
  }
  if (dirty) { waitBody.instanceMatrix.needsUpdate = true; waitHead.instanceMatrix.needsUpdate = true; }
}

/* ================================================================= main loop */
let last = performance.now(), hudAcc = 0, waitAcc = 0, ambAcc = 3, pedAcc = 0, mmAcc = 0;
const camPos = new THREE.Vector3(0, 30, 40), camLook = new THREE.Vector3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  try {
    if (Game.mode === 'race' && !Game.paused) raceStep(dt);
    else if (Game.mode !== 'race') attractStep(dt);
    if (Game.camHook) Game.camHook(dt);
    renderer.render(scene, camera);
  } catch (e) { console.error(e); }
}
function worldTick(dt, T, simHost){
  updateSignals(dt); updateRail(T); updateMetro(T);
  if (simHost) simTraffic(dt, foci()); else stepProxies(dt);
  pedAcc += dt; if (pedAcc > 1 / 30) { updatePeds(pedAcc, camera.position.x, camera.position.z); pedAcc = 0; }
  gatherObstacles();
}
function raceStep(dt){
  if (W.online && !W.isHost) {
    const hp = Net.hostPeer;
    if (hp && typeof hp.presence.t === 'number') { const est = hp.presence.t + (Date.now() - hp.updatedAt) / 1000; W.t += dt; if (Math.abs(W.t - est) > .35) W.t = est; else W.t += (est - W.t) * Math.min(1, dt * 2); }
    else W.t += dt;
  } else W.t += dt;
  if (W.online) netRead();
  if (W.isHost) hostStep(dt);
  worldTick(dt, W.t, W.isHost);
  for (const v of vehicles) {
    if (v.gone) { v.mesh.group.visible = false; continue; }
    if (v.kind === 'me') { stepDrive(v, v.finished ? { th: v.speed > .3 ? -1 : 0, st: 0 } : playerInput(), dt); if (input.item && W.t > 0) { useItem(v); input.item = false; } if (input.horn) { input.horn = false; honk(v); helperSay('side', pick(HELPER.side), 1, true); } }
    else if (v.kind === 'ai') stepDrive(v, aiInput(v, dt), dt);
    else stepRemote(v, dt);
  }
  for (let it = 0; it < 2; it++) for (const v of vehicles) if (!v.gone && isLocal(v)) { collide(v); keepOnRoad(v, 0); }
  for (const v of vehicles) if (!v.gone && isLocal(v)) stepStops(v, dt);
  for (const v of vehicles) if (!v.gone) { syncMesh(v, dt); emitSmoke(v, dt); }
  updateSmoke(dt); stepCrates(dt); renderJams();
  waitAcc += dt; if (waitAcc > .2) { waitAcc = 0; updateWaiting(); }
  chaseCam(dt);
  helperWatch(dt);
  hudAcc += dt; if (hudAcc > .1) { hudAcc = 0; updateHud(); }
  mmAcc += dt; if (mmAcc > .066) { mmAcc = 0; drawMinimap(); }
  updateGuides(); updateFloaters(dt); engineTick();
  if (!$('mapView').hidden) drawBigMap();
  ambAcc -= dt; if (ambAcc <= 0) { ambAcc = 2.5 + Math.random() * 4; if (W.t > 0) horn(.08 + Math.random() * .1, .75 + Math.random() * .5); }
  if (W.online) netSend();
  // the day ends when time is up, or a little after every human finished the route
  const hs = humans(); if (!W.endAt && hs.length && hs.every(v => v.finished)) W.endAt = W.t + 4;
  if (W.t >= W.dur || (W.endAt && W.t >= W.endAt)) endRace();
}
let attract = [];
function attractStep(dt){
  Game.attractT += dt;
  if (!attract.length) return;
  W.t = Game.attractT + 10; W.isHost = true;
  hostStep(dt); worldTick(dt, W.t, true);
  for (const v of attract) stepDrive(v, aiInput(v, dt), dt);
  for (const v of attract) collide(v);
  for (const v of attract) { stepStops(v, dt); syncMesh(v, dt); emitSmoke(v, dt); }
  updateSmoke(dt);
  waitAcc += dt; if (waitAcc > .3) { waitAcc = 0; updateWaiting(); }
  const v = attract[Game.mySlot] || attract[0];
  if (v.finished || v.rs > W.RP.len - 60) { setupAttract(); return; }
  // a slow sweep behind and beside the bus that never leaves the street
  const a = Game.attractT * .11, fx = Math.sin(v.h), fz = Math.cos(v.h), lx = fz, lz = -fx, wide = innerWidth > 760;
  const back = 15 + Math.sin(a * .6) * 4, sideOff = Math.sin(a) * 7 + (wide ? -4 : 0);
  let cx = v.x - fx * back + lx * sideOff, cz = v.z - fz * back + lz * sideOff;
  for (let k = 0; k < 6 && roadPush(cx, cz); k++) { cx += (v.x - cx) * .3; cz += (v.z - cz) * .3; }
  const snapA = Game.attractSnap ? 1 : 0; Game.attractSnap = false;
  camPos.lerp(_v1.set(cx, 6.8 + Math.sin(a * .7) * 1.2, cz), snapA || Math.min(1, dt * 1.6));
  camLook.lerp(_v2.set(v.x + fx * 8 + (wide ? lx * 5 : 0), 2.2, v.z + fz * 8 + (wide ? lz * 5 : 0)), snapA || Math.min(1, dt * 3));
  camera.position.copy(camPos); camera.lookAt(camLook); followSun(v);
}
function setupAttract(){
  disposeVehicles(); attract = []; W.RP = routePath(Game.route, Game.rev); resetPassengers(); setupStopsVisual(); W.finishN = 0;
  for (let s = 0; s < 4; s++) { const v = makeVehicle(s, 'ai', BUSES[s].bn); v.tag.visible = false; vehicles.push(v); attract.push(v); placeOnGrid(v, s); }
  W.isHost = true; W.online = false; Game.attractSnap = true;
  initTraffic(foci());
}
function followSun(t){ sun.position.set(t.x - 60, 120, t.z - 40); sun.target.position.set(t.x, 0, t.z); sun.target.updateMatrixWorld(); if (MATS.sunSpr) MATS.sunSpr.position.set(t.x - 1000, 120, t.z - 450); }
function chaseCam(dt){
  if (!me) return;
  const portrait = innerHeight > innerWidth, fx = Math.sin(me.h), fz = Math.cos(me.h), lx = fz, lz = -fx, spd = Math.abs(me.speed);
  me.tag.visible = Game.cam !== 2;
  let fov;
  if (Game.cam === 2) {
    camPos.set(me.x + fx * 4 - lx * .68, 2.72 - me.pitch * 3, me.z + fz * 4 - lz * .68);
    camera.position.copy(camPos);
    camLook.set(me.x + fx * 34 - lx * me.steerAng * 3, 2.2, me.z + fz * 34 - lz * me.steerAng * 3);
    camera.lookAt(camLook); camera.rotateZ(-me.roll * .6);
    fov = portrait ? 80 : 70;
  } else {
    const far = Game.cam === 1, rev = me.speed < -1;
    const back = (portrait ? 19 : 15.5) + (far ? 8 : 0) + spd * .06;
    let up = (portrait ? 8.2 : 7) + (far ? 3.5 : 0);
    const bx = me.x - fx * back, bz = me.z - fz * back;
    if (underMetro(bx, bz) || underMetro(me.x, me.z) || nearFoot(bx, bz) || nearFoot(me.x, me.z)) up = Math.min(up, 7.2);
    const side = -me.steerAng * clamp(spd / 20, 0, 1) * 4.5 * (rev ? -1 : 1);
    const snap = Game.snap ? 1 : 0; Game.snap = false;
    camPos.lerp(_v1.set(bx, up, bz), snap || 1 - Math.exp(-dt * 5));
    camLook.lerp(_v2.set(me.x + fx * 10 + lx * side, 1.8, me.z + fz * 10 + lz * side), snap || 1 - Math.exp(-dt * 8));
    camera.position.copy(camPos); camera.lookAt(camLook);
    fov = (portrait ? 72 : 62) + Math.min(5, spd * .12);
  }
  const sh = Math.max(me.shake, me.stunT > 0 ? .1 : 0);
  if (sh > 0) { camera.position.x += (Math.random() - .5) * sh; camera.position.y += (Math.random() - .5) * sh * .6; me.shake = Math.max(0, me.shake - dt * 1.6); }
  fov += me.boostT > 0 ? 6 : 0;
  if (Math.abs(camera.fov - fov) > .1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
  followSun(me);
}
function nearFoot(x, z){ const ne = nearestEdge(x, z, 30); if (!ne) return false; return ne.e.foot.some(s => Math.abs(s - ne.s) < 9); }
let jamPool = [];
function buildJamPool(){
  const r = mulberry32(99);
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 3; k++) { const rk = makeTrafficMesh('r', r); rk.position.set((k - 1) * 1.6, 0, (k % 2) * .7); rk.rotation.y = Math.PI / 2 + (k - 1) * .5; g.add(rk); }
    g.visible = false; scene.add(g); jamPool.push(g);
  }
}
function renderJams(){ const js = allJams(); jamPool.forEach((g, i) => { const j = js[i]; if (!j) { g.visible = false; return; } g.visible = true; g.position.set(j.x, 0, j.z); g.rotation.y = j.h || 0; }); }
const SMOKE = []; let smokeMat;
function emitSmoke(v, dt){
  if (!smokeMat) return; v.smokeT -= dt; const th = v.kind === 'remote' || v.kind === 'rai' ? (v.speed > 4 ? .6 : .2) : Math.max(0, v.th);
  if (v.smokeT > 0 || th <= 0) return; v.smokeT = .12 / (th * (.5 + v.liv.wear));
  let p = SMOKE.find(q => q.life <= 0); if (!p) { if (SMOKE.length > 70) return; p = { spr: new THREE.Sprite(smokeMat.clone()), life: 0 }; scene.add(p.spr); SMOKE.push(p); }
  p.spr.position.set(v.x - Math.sin(v.h) * 5.5 - Math.cos(v.h) * .9, .55, v.z - Math.cos(v.h) * 5.5 + Math.sin(v.h) * .9); p.life = 1.4; p.vx = -Math.sin(v.h) * 1.2 + (Math.random() - .5); p.vz = -Math.cos(v.h) * 1.2 + (Math.random() - .5); p.spr.visible = true; p.dark = .4 + v.liv.wear * .6;
}
function updateSmoke(dt){ for (const p of SMOKE) { if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.spr.visible = false; continue; } const t = 1 - p.life / 1.4; p.spr.position.x += p.vx * dt; p.spr.position.z += p.vz * dt; p.spr.position.y += dt * 1.2; const sc = .8 + t * 3; p.spr.scale.set(sc, sc, 1); p.spr.material.opacity = (1 - t) * .55 * p.dark; } }

/* ================================================================= HUD */
function updateGuides(){
  if (!me) return;
  const ns = nextStop(me), free = me.liv.stats.cap - me.pax.length;
  const out = me.pax.some(p => p.d === ns.i), want = !me.finished && (out || (free > 0 && remaining(ns.i) > 0));
  const z = stopZone(me), inZone = z === ns.i, boarding = inZone && want && Math.abs(me.speed) <= BOARD_SPEED && curbOK(me);
  GLOWS.forEach((g, i) => { const on = i === ns.i && want && ns.d < 160; g.visible = on; if (on) { g.material.color.set(boarding ? 0x38e06a : 0xf2b01e); g.material.opacity = .16 + .1 * Math.sin(performance.now() / 160); } });
  const h = $('hint'); let msg = '', go = false;
  if (inZone && want) {
    if (!curbOK(me)) msg = 'মামা, বামে চাপেন — ফুটপাতের পাশে থামান';
    else if (Math.abs(me.speed) > BOARD_SPEED) msg = 'আস্তে! প্রায় থামালে যাত্রী উঠবে-নামবে';
    else { msg = out ? 'যাত্রী নামছে…' : 'যাত্রী উঠছে…'; go = true; }
  } else if (want && ns.d > 0 && ns.d < 70 && me.onRoute) msg = 'সামনে স্টপ · বাঁয়ের হলুদ ঘরে থামান';
  h.hidden = !msg || W.t < 0; h.textContent = msg; h.classList.toggle('go', go);
}
function buildSeatbar(){ const sb = $('seatbar'); sb.textContent = ''; for (let i = 0; i < me.liv.stats.cap; i++) sb.appendChild(document.createElement('i')); }
const TURN_SVG = { L: '<path d="M9 19V10h9"/><path d="M12 6L8 10l4 4"/>', R: '<path d="M15 19V10H6"/><path d="M12 6l4 4-4 4"/>', S: '<path d="M12 20V5"/><path d="M7 10l5-5 5 5"/>', X: '<path d="M6 6l12 12M18 6L6 18"/>' };
function updateHud(){
  if (!me) return;
  const RP = W.RP, tl = W.dur - Math.max(0, W.t);
  $('hTime').textContent = fmtTime(tl); $('hClock').classList.toggle('hot', tl < 30);
  $('hSpeed').textContent = bn(Math.round(Math.abs(me.speed) * 3.6));
  $('hPax').textContent = bn(me.pax.length) + '/' + bn(me.liv.stats.cap); $('hFare').textContent = '৳' + bn(me.score); $('hFine').textContent = '৳' + bn(me.fines);
  const ns = nextStop(me), st = RP.stops[ns.i];
  const sb = $('seatbar').children; for (let i = 0; i < sb.length; i++) { const p = me.pax[i]; sb[i].className = p ? (p.d === ns.i ? 'out' : 'on') : ''; }
  if (me.finished) { $('hNextName').textContent = 'শেষ স্টপে পৌঁছেছেন'; $('hNextInfo').textContent = bn(me.place) + ' নম্বরে · বোনাস ৳' + bn(me.bonus); $('hNear').textContent = ''; }
  else {
    $('hNextName').textContent = st.site.bn + ' · ' + st.site.en;
    const out = me.pax.filter(p => p.d === ns.i).length, wait = clamp(Math.round(remaining(ns.i)), 0, 99);
    $('hNextInfo').textContent = (ns.d > 0 ? bn(Math.round(ns.d * GEO.scale / 10) * 10) + ' মিটার · ' : 'এখানেই · ') + (ns.i === RP.stops.length - 1 ? 'শেষ স্টপ · সবাই নামবে' : `${bn(wait)} জন দাঁড়িয়ে · ${bn(out)} জন নামবে`);
    $('hNear').textContent = 'কাছে: ' + st.site.near;
  }
  $('hNext').classList.toggle('hot', !!hotAt(ns.i));
  // warnings: signals and rail gates ahead
  const wEl = $('hWarn'); let msg = '', red = false;
  if (me.onRoute) {
    for (const sg of RP.signals) { const d = sg.s - me.rs - BUS_HL; if (d > 0 && d < 110) { const s = armState(sg.J, sg.arm.idx); msg = `সামনে সিগন্যাল ${bn(Math.round(d * GEO.scale / 10) * 10)} মি · ` + (s === 'r' ? 'লাল বাতি, থামুন' : s === 'y' ? 'হলুদ বাতি' : 'সবুজ বাতি'); red = s !== 'g'; break; } }
    for (const c of RP.rails) { const d = c.s - me.rs - BUS_HL; if (d > 0 && d < 160) { msg = c.c.closed ? `রেলগেট বন্ধ, ট্রেন আসছে · ${bn(Math.round(d * GEO.scale / 10) * 10)} মি` : `সামনে রেলক্রসিং · ${bn(Math.round(d * GEO.scale / 10) * 10)} মি`; red = c.c.closed; break; } }
  }
  if (me.wrongT > .6) { msg = 'উল্টো পথে চলছেন! ইউ-টার্ন নিন'; red = true; }
  wEl.hidden = !msg; wEl.textContent = msg; wEl.classList.toggle('red', red);
  // turn guidance
  const tEl = $('hTurn');
  if (!me.onRoute && !me.finished && W.t > 0) { tEl.hidden = false; tEl.classList.add('off'); $('hTurnIcon').innerHTML = TURN_SVG.X; $('hTurnText').textContent = 'রুটের বাইরে · ম্যাপে হলুদ দাগ ধরে ফিরুন'; }
  else {
    tEl.classList.remove('off');
    const t = RP.turns.find(q => q.s > me.rs - 4);
    if (t && t.s - me.rs < 260 && !me.finished) { tEl.hidden = false; $('hTurnIcon').innerHTML = TURN_SVG[t.kind]; $('hTurnText').textContent = (t.kind === 'L' ? 'বামে' : t.kind === 'R' ? 'ডানে' : 'সোজা') + ` ${t.toName} · ${/মোড়$/.test(t.J.bn) ? t.J.bn : t.J.bn + ' মোড়'} · ${bn(Math.max(0, Math.round((t.s - me.rs) * GEO.scale / 10) * 10))} মি`; }
    else tEl.hidden = true;
  }
  const D = districtAt(me.x, me.z); $('hPlace').textContent = (me.edge ? me.edge.e.name + ' · ' : '') + D.bn;
  $('hItem').classList.toggle('has', !!me.item);
  $('hItemName').textContent = me.item ? ITEMS[me.item].bn : 'কিছু নাই'; $('hItemHint').textContent = me.item ? ITEMS[me.item].hint + ' · Space' : 'রাস্তার হলুদ বাক্স ধরুন';
  const list = vehicles.filter(v => !v.gone).slice().sort((a, b) => b.score - a.score);
  const ol = $('hStand'); while (ol.children.length < list.length) { const li = document.createElement('li'); for (const c of ['p', 'chip', 'n', 't num']) { const s = document.createElement('span'); s.className = c; li.appendChild(s); } ol.appendChild(li); }
  while (ol.children.length > list.length) ol.removeChild(ol.lastChild);
  list.forEach((v, i) => { const li = ol.children[i]; li.className = v === me ? 'me' : ''; li.children[0].textContent = bn(i + 1); li.children[1].style.background = v.liv.chip; li.children[2].textContent = v === me ? 'আপনি' : v.name; li.children[3].textContent = '৳' + bn(v.score); });
  const c = $('count');
  if (W.t < 0) { c.hidden = false; c.textContent = bn(Math.ceil(-W.t)); } else if (W.t < .9) { c.hidden = false; c.textContent = 'চলেন!'; } else c.hidden = true;
  const nl = $('netline');
  if (W.online) { nl.hidden = false; const n = vehicles.filter(v => (v.kind === 'me' || v.kind === 'remote') && !v.gone).length; nl.textContent = `রুম ${Net.code} · ${bn(n)} জন মানুষ` + (W.isHost ? ' · আপনি হোস্ট' : ''); } else nl.hidden = true;
}
function toast(html, kind){
  if (Game.mode !== 'race') return;
  const box = $('toasts'); const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.innerHTML = html; box.prepend(el);
  while (box.children.length > 3) box.removeChild(box.lastChild);
  setTimeout(() => el.remove(), kind === 'event' ? 6000 : 3200);
}
const floaters = [];
function floatText(text, v, neg){ const el = document.createElement('div'); el.className = 'floater num' + (neg ? ' neg' : ''); el.textContent = text; $('floaters').appendChild(el); floaters.push({ el, x: v.x, z: v.z, y: 4, t: 0 }); if (floaters.length > 8) floaters.shift().el.remove(); }
const projV = new THREE.Vector3();
function updateFloaters(dt){
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.t += dt; f.y += dt * 2.5;
    if (f.t > 1.1) { f.el.remove(); floaters.splice(i, 1); continue; }
    projV.set(f.x, f.y, f.z).project(camera);
    f.el.style.left = ((projV.x + 1) / 2 * innerWidth) + 'px'; f.el.style.top = ((1 - projV.y) / 2 * innerHeight) + 'px'; f.el.style.opacity = String(1 - f.t / 1.1);
  }
}

/* ---------- maps: always north up, like Google Maps ---------- */
const mm = $('minimap'), mg = mm.getContext('2d'); let mmB = null;
const CLS_W = { A4: 2 * (.7 + 4 * LW), A3: 2 * (.65 + 3 * LW), D2: 2 * (.6 + 2 * LW), B: 2 * 2 * LW, C: 2 * LW };
function drawRoads(g, T, x0, z0, x1, z1, scale, colorFn){
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const e of NET.edges) {
    let inBox = false; for (let k = 0; k < e.n; k += 8) if (e.X[k] > x0 && e.X[k] < x1 && e.Z[k] > z0 && e.Z[k] < z1) { inBox = true; break; } if (!inBox) continue;
    g.strokeStyle = colorFn ? colorFn(e) : 'rgba(244,234,214,.28)'; g.lineWidth = Math.max(1.5, CLS_W[e.cls] * scale);
    g.beginPath(); for (let k = 0; k < e.n; k += 3) { const [px, py] = T(e.X[k], e.Z[k]); k ? g.lineTo(px, py) : g.moveTo(px, py); } const [px, py] = T(e.X[e.n - 1], e.Z[e.n - 1]); g.lineTo(px, py); g.stroke();
  }
}
function drawRoute(g, T, RP, w){ g.strokeStyle = 'rgba(242,176,30,.9)'; g.lineWidth = w; g.beginPath(); for (let i = 0; i < RP.n; i += 4) { const [px, py] = T(RP.X[i], RP.Z[i]); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
function drawWaterMap(g, T){ g.fillStyle = 'rgba(61,107,114,.7)'; for (const w of WATER) { if (w.ring) continue; g.beginPath(); w.poly.forEach(([x, z], i) => { const [px, py] = T(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill(); } }
function drawMinimap(){
  if (!me) return;
  const w = mm.width, h = mm.height, R = 230, sc = w / (2 * R), cx = me.x, cz = me.z;
  const T = (x, z) => [w / 2 + (x - cx) * sc, h / 2 + (z - cz) * sc];
  mg.save(); mg.clearRect(0, 0, w, h); mg.beginPath(); mg.arc(w / 2, h / 2, w / 2 - 2, 0, 7); mg.clip();
  mg.fillStyle = 'rgba(23,17,26,.86)'; mg.fillRect(0, 0, w, h);
  drawWaterMap(mg, T);
  drawRoads(mg, T, cx - R, cz - R, cx + R, cz + R, sc);
  drawRoute(mg, T, W.RP, 5);
  const RP = W.RP;
  RP.stops.forEach((st, i) => { const [x, z] = rpAt(RP, st.s, 0); const [px, py] = T(x, z); if (Math.abs(px - w / 2) > w / 2 || Math.abs(py - h / 2) > h / 2) return; if (hotAt(i)) { mg.strokeStyle = '#f2b01e'; mg.lineWidth = 3; mg.beginPath(); mg.arc(px, py, 11 + Math.sin(performance.now() / 150) * 2, 0, 7); mg.stroke(); } mg.fillStyle = remaining(i) > 0 ? '#2f9a52' : 'rgba(244,234,214,.5)'; mg.fillRect(px - 6, py - 6, 12, 12); });
  for (const v of vehicles) { if (v.gone || v === me) continue; const [px, py] = T(v.x, v.z); mg.fillStyle = v.liv.chip; mg.strokeStyle = '#17111a'; mg.lineWidth = 3; mg.beginPath(); mg.arc(px, py, 8, 0, 7); mg.fill(); mg.stroke(); }
  mg.translate(w / 2, h / 2); mg.rotate(-me.h + Math.PI); mg.fillStyle = '#f2b01e'; mg.strokeStyle = '#17111a'; mg.lineWidth = 3; mg.beginPath(); mg.moveTo(0, -16); mg.lineTo(11, 12); mg.lineTo(0, 6); mg.lineTo(-11, 12); mg.closePath(); mg.fill(); mg.stroke();
  mg.restore();
  mg.fillStyle = '#f4ead6'; mg.font = `800 26px "Baloo Da 2", sans-serif`; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText('উ', w / 2, 22); mg.fillStyle = '#d6264f'; mg.beginPath(); mg.moveTo(w / 2, 2); mg.lineTo(w / 2 - 7, 10); mg.lineTo(w / 2 + 7, 10); mg.fill();
}
let bigBase = null, bigT = null;
function drawBigMap(){
  const cv = $('bigmap'), g = cv.getContext('2d'), w = cv.width, h = cv.height, pad = 60;
  if (!bigBase) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const n of NET.nodes) { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); z0 = Math.min(z0, n.z); z1 = Math.max(z1, n.z); }
    const sc = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (z1 - z0)); const ox = (w - (x1 - x0) * sc) / 2, oz = (h - (z1 - z0) * sc) / 2;
    bigT = { T: (x, z) => [ox + (x - x0) * sc, oz + (z - z0) * sc], sc };
    bigBase = makeCanvas(w, h); const b = bigBase.getContext('2d'); b.fillStyle = '#120d14'; b.fillRect(0, 0, w, h);
    drawWaterMap(b, bigT.T);
    b.setLineDash([10, 8]); b.strokeStyle = 'rgba(180,170,150,.8)'; b.lineWidth = 3; b.beginPath(); for (let i = 0; i < RAIL.n; i += 4) { const [px, py] = bigT.T(RAIL.X[i], RAIL.Z[i]); i ? b.lineTo(px, py) : b.moveTo(px, py); } b.stroke(); b.setLineDash([]);
    drawRoads(b, bigT.T, -1e9, -1e9, 1e9, 1e9, sc * 1.6, e => e.prof.cls === 'A4' ? 'rgba(244,234,214,.55)' : e.prof.cls === 'A3' || e.prof.cls === 'D2' ? 'rgba(244,234,214,.42)' : 'rgba(244,234,214,.26)');
    const M = METRO.RP; b.strokeStyle = 'rgba(19,135,123,.95)'; b.lineWidth = 4; b.beginPath(); for (let i = 0; i < M.n; i += 4) { const [px, py] = bigT.T(M.X[i], M.Z[i]); i ? b.lineTo(px, py) : b.moveTo(px, py); } b.stroke();
    b.textAlign = 'center'; b.textBaseline = 'middle';
    for (const d of DIST) { const [px, py] = bigT.T(d.x, d.z); b.font = `700 30px ${HS}`; b.lineWidth = 6; b.strokeStyle = 'rgba(18,13,20,.9)'; b.strokeText(d.bn, px, py); b.fillStyle = 'rgba(242,176,30,.85)'; b.fillText(d.bn, px, py); }
    for (const l of LM_PLACED) { if (!['stadium', 'sangsad', 'airport', 'mall', 'bgb', 'campusGreen', 'mosqueBig'].includes(l.style)) continue; const [px, py] = bigT.T(l.x, l.z); b.fillStyle = '#e45a1c'; b.beginPath(); b.arc(px, py, 6, 0, 7); b.fill(); b.font = `600 20px ${HS}`; b.fillStyle = 'rgba(244,234,214,.85)'; b.fillText(l.bn.split(',')[0].slice(0, 22), px, py + 20); }
    b.fillStyle = '#f4ead6'; b.font = `800 44px "Baloo Da 2", sans-serif`; b.fillText('উত্তর ↑', 110, 50);
  }
  g.drawImage(bigBase, 0, 0); const T = bigT.T;
  drawRoute(g, T, W.RP, 8);
  W.RP.stops.forEach(st => { const [x, z] = rpAt(W.RP, st.s, 0); const [px, py] = T(x, z); g.fillStyle = '#2f9a52'; g.fillRect(px - 6, py - 6, 12, 12); });
  for (const v of vehicles) { if (v.gone) continue; const [px, py] = T(v.x, v.z); g.fillStyle = v.liv.chip; g.strokeStyle = v === me ? '#f2b01e' : '#17111a'; g.lineWidth = v === me ? 6 : 3; g.beginPath(); g.arc(px, py, v === me ? 14 : 10, 0, 7); g.fill(); g.stroke(); }
}
function toggleMap(on){ if (Game.mode !== 'race') return; $('mapView').hidden = !on; if (on) drawBigMap(); }
