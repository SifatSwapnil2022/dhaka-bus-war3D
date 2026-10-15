/* =================================================================
   buses: free driving anywhere on the road network, collisions,
   stops and fares along the chosen route, and the AI rivals
   ================================================================= */
const Game = { mode: 'menu', paused: false, mySlot: 0, nick: '', attractT: 0, dur: 360, hq: !isTouch, cam: 0, route: 0, rev: false, voice: true };
const W = { t: -3, sp: [], spAcc: [], isHost: true, online: false, rid: '', ended: false, hostPres: null, hot: null, hotNext: 25, dur: 360, RP: null, finishN: 0, endAt: 0 };
let vehicles = [], me = null;
const input = { up: false, down: false, left: false, right: false, item: false, horn: false };
const RPS = {}; // route paths: id + direction
function routePath(ri, rev){ const R = ROUTES[ri]; const key = R.id + (rev ? '<' : '>'); return RPS[key]; }
function NST(){ return W.RP ? W.RP.stops.length : 0; }

function hotAt(i){ return W.hot && W.hot.i === i && W.t < W.hot.until; }
function remaining(si){
  let taken = 0;
  for (const v of vehicles) { if (v.kind === 'rai') continue; taken += v.b[si] || 0; }
  let sp;
  if (W.isHost) sp = W.sp[si] || 0;
  else { const hp = W.hostPres; sp = hp && Array.isArray(hp.sp) ? num(hp.sp[si], 0) : 0; taken += hp && Array.isArray(hp.ab) ? num(hp.ab[si], 0) : 0; }
  return sp - taken;
}
function nextStop(v){ const RP = W.RP; for (let i = 0; i < RP.stops.length; i++) { const d = RP.stops[i].s - v.rs; if (d > -STOP_ZONE) return { i, d }; } return { i: RP.stops.length - 1, d: -999 }; }
function stopZone(v){ if (!v.onRoute) return -1; const RP = W.RP; for (let i = 0; i < RP.stops.length; i++) if (Math.abs(RP.stops[i].s - v.rs) < STOP_ZONE) return i; return -1; }
function fareFor(from, to){ const km = (W.RP.stops[to].s - W.RP.stops[from].s) * GEO.scale / 1000; return Math.max(FARE_MIN, Math.round(km * FARE_KM)); }
function pickDest(si){
  const N = NST(); let tot = 0; const ws = [];
  for (let j = 1; j <= 8 && si + j < N; j++) { const k = si + j; const w = W.RP.stops[k].site.w / (1 + .1 * j) * (j === 1 ? .6 : 1) * (k === N - 1 ? 1.6 : 1); ws.push([k, w]); tot += w; }
  if (!ws.length) return -1;
  let r = Math.random() * tot; for (const [k, w] of ws) { r -= w; if (r <= 0) return k; } return ws[0][0];
}
function makeVehicle(slot, kind, name){
  const liv = BUSES[slot], m = buildBus(liv);
  const v = { slot, liv, kind, name, x: 0, z: 0, h: 0, speed: 0, rs: 0, rlat: 0, rpI: -1, onRoute: true, edge: null, pax: [], score: 0, earn: 0, fines: 0, delivered: 0, bonus: 0, item: null, boostT: 0, stunT: 0, hornN: 0, jams: [], boardT: 0,
    b: [], mesh: m, net: null, lastHn: 0, zoneIn: -1, bumpT: 0, gone: false, peer: null, px: 0, pz: 0, sigCD: {}, smokeT: 0, th: 0, trainCD: 0, wrongT: 0, wrongCD: 0, holeCD: {}, humpCD: {}, lastStopS: {}, finished: false, place: 0,
    ai: { laneI: 1, laneT: 0, stopT: 0, prof: PROF[PROFILE_BY_SLOT[slot]], agg: PROF[PROFILE_BY_SLOT[slot]].agg, itemT: 2 + Math.random() * 2, hold: 0, pushT: 0, topMul: 1 }, busCD: {}, steerAng: 0, roll: 0, rollV: 0, pitch: 0, pitchV: 0, shake: 0, lastValid: null, offT: 0 };
  v.tag = makeTag(kind === 'me' ? 'আপনি' : name, liv.chip); m.group.add(v.tag);
  return v;
}
function disposeVehicles(){ for (const v of vehicles) { scene.remove(v.mesh.group); v.mesh.mats.forEach(mt => { if (mt.map) mt.map.dispose(); mt.dispose(); }); } vehicles = []; me = null; }
function placeOnGrid(v, k){
  const RP = W.RP, lanes = rpLanes(RP, 34);
  const s = 34 - Math.floor(k / 2) * 15 - (k % 2) * 5, lat = k % 2 ? lanes[lanes.length - 1] : lanes[Math.max(0, lanes.length - 2)];
  const [x, z, ux, uz] = rpAt(RP, Math.max(6, s), lat);
  v.x = x; v.z = z; v.h = Math.atan2(ux, uz); v.speed = 0; v.rpI = -1; v.b = new Array(NST()).fill(0); v.pax = [];
  routeTrack(v); v.lastValid = { x, z, h: v.h }; syncMesh(v, 0);
}
function routeTrack(v){
  const RP = W.RP; const p = rpProject(RP, v.x, v.z, v.rpI); v.rpI = p.i; v.rs = p.s; v.rlat = p.lat;
  const m = RP.P[p.i]; const hw = m[2]; const al = Math.sin(v.h) * RP.DX[p.i] + Math.cos(v.h) * RP.DZ[p.i];
  v.onRoute = p.d < hw + 4 && (al > .1 || Math.abs(v.speed) < .5);
}
function edgeTrack(v){
  const ne = nearestEdge(v.x, v.z, 40); if (!ne) { v.edge = null; return; }
  const [, , ux, uz] = eAt(ne.e, ne.s, 0); const al = Math.sin(v.h) * ux + Math.cos(v.h) * uz;
  v.edge = { e: ne.e, s: ne.s, lat: ne.lat, dir: al >= 0 ? 1 : -1, ux, uz, align: Math.abs(al) };
}
function syncMesh(v, dt){
  const m = v.mesh, g = m.group; g.position.set(v.x, 0, v.z); g.rotation.y = v.h;
  if (dt > 0) {
    const yaw = wrapA(v.h - (v.prevH === undefined ? v.h : v.prevH)) / dt, acc = (v.speed - (v.prevSpeed === undefined ? v.speed : v.prevSpeed)) / dt;
    if (v.kind === 'remote' || v.kind === 'rai') v.steerAng = clamp(-yaw * 1.2, -1, 1);
    const tRoll = clamp(v.speed * yaw * .0045, -.065, .065), tPitch = clamp(-acc * .0055, -.05, .05);
    v.rollV += ((tRoll - v.roll) * 70 - v.rollV * 9) * dt; v.roll += v.rollV * dt;
    v.pitchV += ((tPitch - v.pitch) * 70 - v.pitchV * 9) * dt; v.pitch += v.pitchV * dt;
  }
  v.prevH = v.h; v.prevSpeed = v.speed;
  const wob = v.stunT > 0 ? Math.sin(performance.now() / 40) * .05 : 0;
  m.body.rotation.z = clamp(v.roll + wob, -.12, .12); m.body.rotation.x = clamp(v.pitch, -.08, .08);
  const sa = -v.steerAng * .5; for (const p of m.steer) p.rotation.y = sa;
  for (const w of m.wheels) w.rotation.x += v.speed * dt / .52;
  const boarding = W.RP && stopZone(v) >= 0 && Math.abs(v.speed) < BOARD_SPEED + 2;
  m.helper.position.x = boarding ? 1.48 : 1.3; m.arm.rotation.x = boarding ? -.8 + Math.sin(performance.now() / 120) * .6 : -.2;
}
function jolt(v, nx, nz, mag){
  const fx = Math.sin(v.h), fz = Math.cos(v.h), lx = fz, lz = -fx;
  v.pitchV += (nx * fx + nz * fz) * mag * .7; v.rollV += -(nx * lx + nz * lz) * mag * .7;
  if (v.kind === 'me') v.shake = Math.max(v.shake, mag * .35);
}
function buzz(ms){ try { if (isTouch && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
function resetPassengers(){ const N = NST(); W.sp = new Array(N).fill(0); W.spAcc = new Array(N).fill(0); for (let i = 0; i < N; i++) { W.sp[i] = i === N - 1 ? 0 : 6 + Math.round(W.RP.stops[i].site.w * 5); W.spAcc[i] = Math.random(); } W.hot = null; W.hotNext = 22 + Math.random() * 10; }

/* ================================================================= physics */
function obb(ax, az, ah, ahw, ahl, bx, bz, bh, bhw, bhl){
  const a1x = Math.sin(ah), a1z = Math.cos(ah), a2x = a1z, a2z = -a1x;
  const b1x = Math.sin(bh), b1z = Math.cos(bh), b2x = b1z, b2z = -b1x;
  const dx = bx - ax, dz = bz - az; let minO = Infinity, nx = 0, nz = 0;
  const axes = [a1x, a1z, a2x, a2z, b1x, b1z, b2x, b2z];
  for (let i = 0; i < 8; i += 2) {
    const x = axes[i], z = axes[i + 1];
    const ra = ahl * Math.abs(a1x * x + a1z * z) + ahw * Math.abs(a2x * x + a2z * z);
    const rb = bhl * Math.abs(b1x * x + b1z * z) + bhw * Math.abs(b2x * x + b2z * z);
    const d = dx * x + dz * z, o = ra + rb - Math.abs(d);
    if (o <= 0) return null;
    if (o < minO) { minO = o; const sg = d < 0 ? -1 : 1; nx = x * sg; nz = z * sg; }
  }
  return { o: minO, nx, nz };
}
function isLocal(v){ return v.kind === 'me' || v.kind === 'ai'; }
function fine(v, amount, label){
  v.score -= amount; v.fines += amount;
  if (v.kind === 'me') { toast(`<b>−৳${bn(amount)}</b> · ${label}`, 'fine'); whistle(); floatText('−৳' + bn(amount), v, true); }
}
const BUS_PTS = [[BUS_HW, BUS_HL], [-BUS_HW, BUS_HL], [BUS_HW, -BUS_HL], [-BUS_HW, -BUS_HL], [BUS_HW, 0], [-BUS_HW, 0], [0, BUS_HL + .1]];
function keepOnRoad(v, spd){
  let hit = false;
  for (let it = 0; it < 3; it++) {
    const fx = Math.sin(v.h), fz = Math.cos(v.h), lx = fz, lz = -fx; let best = null, bd = 0;
    for (const [l, f] of BUS_PTS) { const x = v.x + lx * l + fx * f, z = v.z + lz * l + fz * f; const p = roadPush(x, z); if (!p || p[2]) continue; const d = p[0] * p[0] + p[1] * p[1]; if (d > bd) { bd = d; best = p; } }
    if (!best || bd < 1e-6) break;
    v.x += best[0]; v.z += best[1]; hit = true;
    const n = Math.sqrt(bd), nx = best[0] / n, nz = best[1] / n, into = -(Math.sin(v.h) * nx + Math.cos(v.h) * nz) * v.speed;
    if (into > 0) v.speed *= 1 - Math.min(.6, into * .06);
  }
  const c = roadPush(v.x, v.z);
  if (c && c[2]) { if (v.lastValid) { v.x = v.lastValid.x; v.z = v.lastValid.z; v.h = v.lastValid.h; v.speed = 0; } }
  else if (!c) v.lastValid = { x: v.x, z: v.z, h: v.h };
  if (hit && v.kind === 'me' && spd > 9 && v.bumpT <= 0) { v.bumpT = 1.4; thud(.5); buzz(40); }
  return hit;
}
function surfaceAt(v){
  const E = v.edge; if (!E) return { wet: false };
  const e = E.e; let wet = false; for (const w of e.wet) if (Math.abs(E.s - w.s) < w.len / 2 + 2) { wet = true; break; }
  return { wet };
}
function stepDrive(v, inp, dt){
  const st = v.liv.stats;
  const surf = surfaceAt(v);
  if (surf.wet && v.kind === 'me' && !v.wasWater && Math.abs(v.speed) > 4) helperSay('water', pick(LINES.water), 3);
  v.wasWater = surf.wet;
  const rival = v.kind === 'ai' ? v.ai.topMul || 1 : 1;
  const top = st.top * rival * (v.boostT > 0 ? 1.3 : 1) * (v.stunT > 0 ? .38 : 1) * (surf.wet ? .55 : 1);
  v.th = inp.th;
  if (inp.th > 0) { if (v.speed < top) v.speed += st.acc * inp.th * dt * (v.boostT > 0 ? 1.6 : 1) * (v.speed < 0 ? 2.5 : 1); }
  else if (inp.th < 0) v.speed -= (v.speed > .5 ? 22 : 5.5) * -inp.th * dt;
  v.speed -= v.speed * .2 * dt;
  if (v.speed > top) v.speed += (top - v.speed) * Math.min(1, dt * 2.6);
  if (v.speed < -6) v.speed = -6;
  if (inp.th === 0 && Math.abs(v.speed) < .35) v.speed = 0;
  const spd = Math.abs(v.speed);
  // a real bus cannot turn tighter than about a 9 m radius: a U-turn needs a median gap
  const rate = Math.min(spd / (8.6 / st.grip), 1.5 * st.grip * (1 - .45 * Math.min(1, spd / 24)));
  v.steerAng += (inp.st - v.steerAng) * Math.min(1, dt * (v.kind === 'me' ? 5 : 8));
  v.h -= v.steerAng * rate * dt * (v.speed >= 0 ? 1 : -1);
  v.x += (Math.sin(v.h) * v.speed + v.px) * dt; v.z += (Math.cos(v.h) * v.speed + v.pz) * dt;
  const k = Math.exp(-5 * dt); v.px *= k; v.pz *= k;
  keepOnRoad(v, spd);
  const prevEdge = v.edge;
  edgeTrack(v); routeTrack(v);
  roadHazards(v, prevEdge, dt);
  v.boostT = Math.max(0, v.boostT - dt); v.stunT = Math.max(0, v.stunT - dt); v.bumpT = Math.max(0, v.bumpT - dt);
}
/* rail gates, red lights, wrong way, potholes and speed breakers */
function roadHazards(v, prev, dt){
  const E = v.edge; if (!E) return;
  const e = E.e, race = Game.mode === 'race' && W.t > 0;
  const fx = Math.sin(v.h), fz = Math.cos(v.h), along = (fx * E.ux + fz * E.uz) >= 0 ? 1 : -1;
  // rail crossings: the boom is a wall, the train pushes you off
  for (const c of e.rails) {
    const d = (c.s - E.s) * along; // distance ahead to the track
    if (c.closed && !c.onTrack && d > BUS_HL - 1 && d < BUS_HL + 9.6 && Math.abs(E.lat) < e.prof.hw) {
      const back = d - (BUS_HL + 9.6); v.x += E.ux * along * back; v.z += E.uz * along * back; v.speed = Math.min(v.speed, 0);
      if (v.kind === 'me' && v.bumpT <= 0) { v.bumpT = 2; helperSay('rail', pick(LINES.rail), 3); }
    }
    if (c.onTrack && Math.abs(c.s - E.s) < BUS_HL + 2.6 && Math.abs(E.lat) < e.prof.hw + 1) {
      const side = E.s < c.s ? -1 : 1, target = c.s + side * (BUS_HL + 2.8), sh = target - E.s; v.x += E.ux * sh; v.z += E.uz * sh; v.speed = 0;
      if (race && !(v.trainCD > W.t)) { v.trainCD = W.t + 15; fine(v, 50, 'রেললাইনের উপর দাঁড়িয়ে ছিলেন! জরিমানা'); }
    }
  }
  // red light: crossing the stop line of your own approach while it is red
  if (prev && prev.e === e && race) {
    const dir = E.dir, N = endNode(e, dir);
    if (N.ctl && E.align > .6 && E.lat * dir > 0) {
      const sl = stopLineS(e, dir), a0 = (prev.s - sl) * dir + BUS_HL, a1 = (E.s - sl) * dir + BUS_HL;
      if (a0 < 0 && a1 >= 0) { const arm = armOf(N, e, dir > 0 ? 'b' : 'a'); if (armState(N, arm.idx) === 'r' && !(v.sigCD[N.id] > W.t)) { v.sigCD[N.id] = W.t + 20; fine(v, SIG_FINE, 'লাল বাতিতে পার! সার্জেন্টের মামলা'); } }
    }
  }
  // wrong way on a divided road
  const wrong = e.prof.div && E.align > .5 && Math.abs(E.lat) > e.prof.med && Math.sign(E.lat) !== E.dir && Math.abs(v.speed) > 3 && E.s > e.trimA && E.s < e.len - e.trimB;
  v.wrongT = wrong ? v.wrongT + dt : Math.max(0, v.wrongT - dt * 2);
  if (v.kind === 'me' && v.wrongT > .6 && v.wrongT - dt <= .6) helperSay('wrong', pick(LINES.wrong), 4);
  if (race && v.wrongT > 2.5 && !(v.wrongCD > W.t)) { v.wrongCD = W.t + 15; fine(v, WRONG_FINE, 'উল্টো পথে গাড়ি! ট্রাফিক মামলা'); }
  // potholes under the wheels
  const lx = fz, lz = -fx;
  for (const [wl, wf] of [[1.12, 2.88], [-1.12, 2.88], [1.12, -2.92], [-1.12, -2.92]]) {
    const wx = v.x + lx * wl + fx * wf, wz = v.z + lz * wl + fz * wf;
    const rx = wx - v.x, rz = wz - v.z; const ws = E.s + rx * E.ux + rz * E.uz, wlat = E.lat + rx * E.uz - rz * E.ux;
    for (const hl of e.holes) {
      if (Math.abs(ws - hl.s) < hl.r && Math.abs(wlat - hl.lat) < hl.r) {
        const key = e.i + ':' + Math.round(hl.s * 10); if (v.holeCD[key] > performance.now()) continue; v.holeCD[key] = performance.now() + 900;
        const spd = Math.abs(v.speed); if (spd < 1.5) continue;
        jolt(v, (Math.random() - .5) * .5, 1, Math.min(1.6, spd / 9)); v.speed *= 1 - Math.min(.12, spd * .006);
        if (v.kind === 'me') { thud(.35 + Math.min(.4, spd / 40)); buzz(30); }
      }
    }
  }
  for (const hm of e.humps) {
    if (Math.abs(E.s - hm.s) > BUS_HL) continue; const key = e.i + ':' + Math.round(hm.s); if (v.humpCD[key] > performance.now()) continue; v.humpCD[key] = performance.now() + 2500;
    const spd = Math.abs(v.speed); if (spd < 3) continue; jolt(v, 0, 1, Math.min(2, spd / 6)); if (spd > 8) v.speed *= .7;
    if (v.kind === 'me') { thud(.5); if (spd > 9) helperSay('hump', 'মামা, স্পিড ব্রেকার! আস্তে!', 5); }
  }
}
let OBS = [];
function gatherObstacles(){
  OBS = [];
  if (W.isHost || Game.mode !== 'race') { for (const a of AG) if (a.e) OBS.push({ x: a.x, z: a.z, h: a.h, hw: a.hw, hl: a.hl, k: a.k, ref: a, v: a.v }); }
  else for (const [, p] of PROXY) if (p.mesh) OBS.push({ x: p.x, z: p.z, h: p.h, hw: KIND[p.k].hw, hl: KIND[p.k].hl, k: p.k, ref: p, v: p.v || 0 });
  for (const o of STATIC_OBS) OBS.push({ x: o.x, z: o.z, h: o.h, hw: o.hw, hl: o.hl, k: 'dig', ref: o, v: 0 });
  for (const j of allJams()) OBS.push({ x: j.x, z: j.z, h: j.h || 0, hw: 2.4, hl: 2.4, k: 'j', ref: j, owner: j.owner, until: j.until, v: 0 });
}
function collide(v){
  for (const u of vehicles) {
    if (u === v || u.gone) continue; if (Math.abs(u.x - v.x) > 13 || Math.abs(u.z - v.z) > 13) continue;
    const r = obb(v.x, v.z, v.h, BUS_HW, BUS_HL, u.x, u.z, u.h, BUS_HW, BUS_HL); if (!r) continue;
    const both = isLocal(u); const wv = both ? .5 : 1;
    v.x -= r.nx * r.o * wv; v.z -= r.nz * r.o * wv; if (both) { u.x += r.nx * r.o * .5; u.z += r.nz * r.o * .5; }
    const fv = Math.sin(v.h) * r.nx + Math.cos(v.h) * r.nz;
    if (v.speed * fv > 0) v.speed *= 1 - .45 * Math.abs(fv);
    const uvn = (Math.sin(u.h) * -r.nx + Math.cos(u.h) * -r.nz) * u.speed; if (uvn > 0) { v.px -= r.nx * uvn * .55; v.pz -= r.nz * uvn * .55; }
    const ram = v.speed * fv + uvn;
    if (ram > 2) jolt(v, r.nx, r.nz, Math.min(1.4, ram / 8));
    if (v.kind === 'me' && v.bumpT <= 0 && (Math.abs(v.speed) > 5 || uvn > 4)) { v.bumpT = 1.6; helperSay('bus', pick(LINES.bus), 2); thud(.7); buzz(50); }
    if (Game.mode === 'race' && W.t > 0 && v.speed * fv > 3 && ram > 7) {
      if ((v.busCD[u.slot] || 0) > W.t) v.busCD[u.slot] = Math.max(v.busCD[u.slot], W.t + 1);
      else { v.busCD[u.slot] = W.t + 5; fine(v, 40, 'অন্য বাসে জোরে ধাক্কা! জরিমানা'); }
    }
  }
  for (const o of OBS) {
    if (Math.abs(o.x - v.x) > 10 || Math.abs(o.z - v.z) > 10) continue;
    if (o.k === 'j' && o.owner === v && W.t < o.until - 10.5) continue;
    const r = obb(v.x, v.z, v.h, BUS_HW, BUS_HL, o.x, o.z, o.h, o.hw, o.hl); if (!r) continue;
    v.x -= r.nx * r.o; v.z -= r.nz * r.o;
    const fv = Math.sin(v.h) * r.nx + Math.cos(v.h) * r.nz;
    const closing = v.speed * fv - (Math.sin(o.h) * r.nx + Math.cos(o.h) * r.nz) * (o.v || 0);
    if (v.speed * fv > 0) v.speed *= 1 - .6 * Math.abs(fv);
    if (o.k === 'j') { if (v.bumpT <= 0) { v.speed *= .35; v.bumpT = 1; if (v.kind === 'me') thud(.6); } continue; }
    if (o.k === 'dig') { if (v.kind === 'me' && v.bumpT <= 0 && closing > 2) { v.bumpT = 1.5; thud(.4); helperSay('dig', pick(LINES.dig), 6); } continue; }
    if (W.t > 0 && Game.mode === 'race') {
      // one charge per collision: while still touching, the cooldown just keeps extending
      const ref = o.ref; if (!ref.cd) ref.cd = {}; const cdv = ref.cd[v.slot] || 0;
      if (cdv > W.t) ref.cd[v.slot] = Math.max(cdv, W.t + 1);
      else if (closing > 1.2) {
        const K = KIND[o.k], label = K.label;
        jolt(v, r.nx, r.nz, Math.min(1.5, closing / 6));
        if (closing < 3) { ref.cd[v.slot] = W.t + 2; if (v.kind === 'me') { toast('হালকা ঘষা লাগলো · জরিমানা নেই, সাবধানে!', ''); thud(.3); } }
        else { const hard = closing >= 7; ref.cd[v.slot] = W.t + 4; fine(v, hard ? K.fine * 2 : K.fine, hard ? 'জোরে ধাক্কা · ' + label : label); if (v.kind === 'me') { thud(.6); buzz(60); } if (ref.mode !== undefined && W.isHost) ref.v = 0; }
      }
    }
  }
}
function allJams(){ const out = []; for (const v of vehicles) for (const j of v.jams) if (j.until > W.t) out.push({ x: j.x, z: j.z, h: j.h, until: j.until, owner: v }); return out; }

/* ================================================================= stops and fares */
function curbOK(v){ const m = rpMeta(W.RP, v.rs); return v.rlat >= m[2] - 4.3; }
function stepStops(v, dt){
  const RP = W.RP, si = stopZone(v), cap = v.liv.stats.cap, N = NST();
  if (v.kind === 'me') {
    if (si >= 0 && v.zoneIn !== si) { v.zoneIn = si; v.lastBoard = 0; if (remaining(si) > 0 || v.pax.some(p => p.d === si)) helperSay('stop', pick(HELPER.stopArrive), 1); if (remaining(si) > 0 && v.pax.length >= cap) helperSay('full', pick(LINES.full), 1); }
    if (si < 0 && v.zoneIn >= 0) { if (v.lastBoard) helperSay('leave', pick(HELPER.leave), 1, true); v.zoneIn = -1; }
  }
  // the last stop: everyone gets off and the trip is done
  if (!v.finished && v.onRoute && v.rs > RP.len - 30 && Math.abs(v.speed) < 6 && W.t > 0 && Game.mode === 'race') finishTrip(v);
  if (si < 0 || Math.abs(v.speed) > BOARD_SPEED || !curbOK(v) || v.finished) { v.boardT = Math.max(v.boardT, .05); return; }
  v.boardT -= dt; if (v.boardT > 0) return;
  const k = v.pax.findIndex(p => p.d === si);
  if (k >= 0) {
    const p = v.pax.splice(k, 1)[0]; const fare = fareFor(p.f, si);
    v.score += fare; v.earn += fare; v.delivered++; v.boardT = .12; v.lastBoard = 1;
    if (v.kind === 'me') { floatText('+৳' + bn(fare), v); coin(); if (Math.random() < .2) helperSay('drop', pick(HELPER.drop), 1); }
  } else if (v.pax.length < cap && remaining(si) > 0 && si < N - 1) {
    const d = pickDest(si); if (d < 0) { v.boardT = .2; return; }
    v.b[si]++; v.pax.push({ f: si, d }); v.boardT = .16; v.lastBoard = 1;
    if (v.kind === 'me') { tick(); if (Math.random() < .14) helperSay('board', pick(HELPER.board), 1); }
  } else v.boardT = .08;
}
const FINISH_BONUS = [80, 50, 30, 15];
function finishTrip(v){
  v.finished = true; const N = NST();
  let paid = 0; for (const p of v.pax) if (p.d === N - 1 || p.d < 0) { const f = fareFor(p.f, N - 1); paid += f; v.delivered++; }
  v.score += paid; v.earn += paid; v.pax = [];
  const bonus = FINISH_BONUS[Math.min(3, W.finishN)]; W.finishN++; v.place = W.finishN; v.bonus = bonus; v.score += bonus;
  if (v.kind === 'me') { toast(`<b>+৳${bn(bonus)}</b> · ${bn(v.place)} নম্বরে শেষ স্টপে পৌঁছালেন!`, 'good'); helperSay('finish', pick(LINES.finish), 0); floatText('+৳' + bn(bonus + paid), v); }
}

/* ================================================================= items */
let CRATES = [];
function crateTex(){
  const c = makeCanvas(128, 128), g = c.getContext('2d'); g.fillStyle = '#f2b01e'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#d6264f'; g.lineWidth = 8; g.strokeRect(8, 8, 112, 112); g.fillStyle = '#13877b'; for (const [x, y] of [[20, 20], [108, 20], [20, 108], [108, 108]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
  g.fillStyle = '#d6264f'; g.font = '800 78px "Baloo Da 2", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 70); return texFrom(c);
}
function setupCrates(){
  if (!CRATES.length) { const m = lam({ map: crateTex(), emissive: 0x3a2400 }), geo = new THREE.BoxGeometry(1.5, 1.5, 1.5); for (let i = 0; i < 16; i++) { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; scene.add(mesh); CRATES.push({ mesh, alive: false, back: 0 }); } }
  const RP = W.RP, r = mulberry32(31 + Game.route * 7 + (Game.rev ? 1 : 0)); let i = 0;
  for (const c of CRATES) { c.alive = false; c.mesh.visible = false; }
  for (let s = 120; s < RP.len - 80 && i < CRATES.length; s += 150 + r() * 60) {
    if (RP.stops.some(st => Math.abs(st.s - s) < STOP_ZONE + 12) || RP.signals.some(sg => Math.abs(sg.s - s) < 30)) continue;
    const m = rpMeta(RP, s); if (m[5] < 0) continue; const lanes = rpLanes(RP, s); const lat = lanes[Math.floor(r() * lanes.length)];
    const [x, z] = rpAt(RP, s, lat); const c = CRATES[i++]; c.s = s; c.x = x; c.z = z; c.alive = true; c.back = 0; c.mesh.position.set(x, 1.4, z); c.mesh.visible = true;
  }
}
function stepCrates(dt){
  for (const c of CRATES) {
    if (c.s == null) continue;
    if (!c.alive) { if (c.back > 0) { c.back -= dt; if (c.back <= 0) { c.alive = true; c.mesh.visible = true; } } continue; }
    c.mesh.rotation.y += dt * 1.2; c.mesh.position.y = 1.4 + Math.sin(performance.now() / 300 + c.s) * .2;
    for (const v of vehicles) {
      if (!isLocal(v) || v.item) continue;
      if (Math.abs(c.x - v.x) > 7 || Math.abs(c.z - v.z) > 7) continue;
      if (obb(v.x, v.z, v.h, BUS_HW + .4, BUS_HL + .4, c.x, c.z, 0, .75, .75)) {
        const rr = Math.random(); v.item = rr < .4 ? 'horn' : rr < .72 ? 'boost' : 'jam'; c.alive = false; c.back = 8; c.mesh.visible = false;
        if (v.kind === 'me') { blip(660, 990, .14, .1); helperSay('item', ITEMS[v.item].bn + ' পাইছি! ' + ITEMS[v.item].hint + '।', 1); }
        break;
      }
    }
  }
}
function useItem(v){
  if (!v.item) return; const it = v.item; v.item = null;
  if (it === 'boost') { v.boostT = 2.6; if (v.kind === 'me') { helperSay('boost', pick(LINES.boost), 1); blip(300, 700, .35, .1, 'sawtooth'); } }
  else if (it === 'horn') { v.hornN++; hornHits(v); playHornAt(v); }
  else if (it === 'jam') {
    v.jams = v.jams.filter(j => j.until > W.t).slice(-2);
    const fx = Math.sin(v.h), fz = Math.cos(v.h); const x = v.x - fx * 12, z = v.z - fz * 12;
    if (!roadPush(x, z)) { v.jams.push({ x, z, h: v.h, until: W.t + 12 }); if (v.kind === 'me') helperSay('jam', pick(LINES.jam), 1); }
  }
}
function hornHits(att){
  const fx = Math.sin(att.h), fz = Math.cos(att.h);
  for (const u of vehicles) {
    if (u === att || u.gone || !isLocal(u)) continue;
    const dx = u.x - att.x, dz = u.z - att.z, d = Math.hypot(dx, dz); if (d > 38 || d < .1) continue;
    if ((dx * fx + dz * fz) / d > .55) { u.stunT = Math.max(u.stunT, 1.4); if (u.kind === 'me') helperSay('stun', pick(LINES.stunned), 1); }
  }
}
/* the ordinary horn: slow traffic ahead moves to the left lane if it can */
function honk(v){
  playHornAt(v);
  if (!W.isHost) return;
  const fx = Math.sin(v.h), fz = Math.cos(v.h);
  for (const a of AG) {
    if (!a.e || a.mode !== 'edge') continue; const dx = a.x - v.x, dz = a.z - v.z, d = Math.hypot(dx, dz); if (d > 30 || d < 2) continue;
    if ((dx * fx + dz * fz) / d < .8) continue;
    const nl = a.e.prof.nl; if (a.lane < nl - 1) { const l = laneLat(a.e, a.dir, nl - 1); if (laneFreeFor(a, l)) { a.tl = l; a.lane = nl - 1; } }
  }
}

/* ================================================================= AI rivals */
function humans(){ return vehicles.filter(v => !v.gone && (v.kind === 'me' || v.kind === 'remote')); }
function aiScan(v){
  const RP = W.RP, out = [];
  const consider = (x, z, hl, hw, sp, h) => { if (Math.abs(x - v.x) > 60 || Math.abs(z - v.z) > 60) return; const p = rpProject(RP, x, z, v.rpI); if (p.d > 25) return; const al = Math.sin(h) * RP.DX[p.i] + Math.cos(h) * RP.DZ[p.i], ca = Math.abs(al), sa = Math.sqrt(Math.max(0, 1 - al * al)); out.push({ ds: p.s - v.rs, lat: p.lat, hl: hl * ca + hw * sa, hw: hw * ca + hl * sa, v: Math.max(0, sp * al) }); };
  for (const o of OBS) consider(o.x, o.z, o.hl, o.hw, o.v || 0, o.h);
  for (const u of vehicles) if (u !== v && !u.gone) consider(u.x, u.z, BUS_HL, BUS_HW, u.speed, u.h);
  return out;
}
function laneGap(objs, laneLat){
  let gap = 60, lv = 99;
  for (const o of objs) { if (Math.abs(o.lat - laneLat) > BUS_HW + o.hw + .35) continue; const al = o.ds - BUS_HL - o.hl; if (al > -BUS_HL * 1.2 && al < gap) { gap = Math.max(0, al); lv = o.v; } }
  return { gap, lv };
}
function aiInput(v, dt){
  const a = v.ai, st = v.liv.stats, RP = W.RP;
  if ((Game.mode === 'race' && W.t < 0) || v.finished) return { th: v.speed > .3 ? -1 : 0, st: 0 };
  const objs = aiScan(v), lanes = rpLanes(RP, v.rs + 10), curb = lanes[lanes.length - 1];
  let desired = st.top;
  a.laneT -= dt; if (a.laneT <= 0) { a.laneI = Math.floor(Math.random() * lanes.length); a.laneT = 3 + Math.random() * 4; }
  let targetLat = lanes[Math.min(a.laneI, lanes.length - 1)];
  a.pushT = Math.max(0, a.pushT - dt); a.topMul = a.prof.top;
  const lead = vehicles.reduce((m, u) => Math.max(m, u.score), 0);
  if (lead - v.score > 60) a.topMul = 1.05 + Math.min(.05, (lead - v.score) / 2000);
  const ns = nextStop(v), z = stopZone(v), free = st.cap - v.pax.length;
  const H = humans();
  const humanClose = H.some(hm => { const d = hm.rs - v.rs; return d > 0 && d < 70; });
  let leaving = false;
  if (z >= 0) {
    const un = v.pax.some(p => p.d === z), can = free > 0 && remaining(z) > 0;
    const maxStop = (humanClose ? 2.2 + (1 - a.agg) * 1.5 : 3.6) * a.prof.stopMul;
    if ((un || can) && a.stopT < maxStop) { desired = 0; a.stopT += dt; targetLat = curb - .3; } else leaving = true;
  } else a.stopT = 0;
  if (!leaving && desired > 0 && ns.d > -STOP_ZONE) {
    const un = v.pax.some(p => p.d === ns.i), wait = Math.max(0, remaining(ns.i));
    const worth = un || (free > 0 && (wait >= 2 || hotAt(ns.i)));
    if (worth && ns.d < 100) {
      const racing = H.some(hm => Math.abs(v.rs - hm.rs) < 45 && nextStop(hm).i === ns.i);
      targetLat = curb - .3; desired = Math.min(desired * (racing ? 1.06 : 1), 3.6 + Math.max(0, ns.d) * (racing ? .62 : .42));
      if (racing) a.topMul *= 1.05;
    }
  }
  let R = null, rd = 1e9; for (const hm of H) { const d = hm.rs - v.rs; if (Math.abs(d) < Math.abs(rd) && hm.onRoute) { rd = d; R = hm; } }
  if (R && desired > 4) {
    if (rd > 0 && rd < 45) { a.topMul *= 1 + .07 * a.agg; if (Math.abs(R.rlat - targetLat) < 3.5 && rd < 25) targetLat = R.rlat > curb - 2 ? R.rlat - LW : R.rlat + LW; if (rd < 30 && R.kind === 'me' && Math.random() < dt * .25) helperSay('rival', pick(LINES.rival), 3); }
    if (rd < 0 && rd > -26 && a.prof.cutIn) targetLat = R.rlat;
    if (a.prof.shove && Math.abs(rd) < 7 && Math.abs(R.rlat - v.rlat) < 4.8) { if (a.pushT <= 0 && Math.random() < dt * 1.2 * a.agg) a.pushT = .9; if (a.pushT > 0) targetLat = R.rlat; }
  }
  const cur = laneGap(objs, targetLat);
  if (cur.gap < 24 && desired > 2 && a.pushT <= 0) {
    let best = targetLat, bg = cur.gap;
    for (const l of lanes) { if (Math.abs(l - v.rlat) > 7.6) continue; const g2 = laneGap(objs, l); if (g2.gap > bg + 6) { bg = g2.gap; best = l; } }
    targetLat = best;
  }
  const now = laneGap(objs, v.rlat);
  if (now.gap < 30) {
    let lim = Math.max(0, now.lv + (now.gap - 4 * a.prof.gap) * .6 / a.prof.gap);
    // blocked where we are but the lane we steer for is open: creep forward so the bus can slide across
    if (lim < 2.5 && Math.abs(targetLat - v.rlat) > .8 && now.gap > 2.5 && laneGap(objs, targetLat).gap > 12) lim = 2.5;
    desired = Math.min(desired, lim);
  }
  // signals and rail gates on the route
  for (const sg of RP.signals) { const d = sg.s - v.rs - BUS_HL; if (d < -2 || d > 120) continue; const s = armState(sg.J, sg.arm.idx); if (s === 'g') break; if (a.prof.yellow && s === 'y' && d < 9) break; desired = Math.min(desired, Math.max(0, (d - 1.5) * .7)); break; }
  for (const c of RP.rails) { if (!c.c.closed) continue; const d = c.s - v.rs - BUS_HL - 9.6; if (d < -3 || d > 140) continue; desired = Math.min(desired, Math.max(0, (d - 1) * .7)); }
  // slow for the bend
  let curv = 0; for (const o of [12, 22, 34]) { const [, , ux1, uz1] = rpAt(RP, v.rs + o - 6, 0), [, , ux2, uz2] = rpAt(RP, v.rs + o + 6, 0); curv = Math.max(curv, Math.abs(wrapA(Math.atan2(ux2, uz2) - Math.atan2(ux1, uz1))) / 12); }
  if (curv > .004) desired = Math.min(desired, Math.sqrt(3.4 / curv));
  // humps and potholes: a sensible driver slows a little
  if (v.edge) { const E = v.edge; for (const hm of E.e.humps) { const d = (hm.s - E.s) * E.dir; if (d > 0 && d < 30) desired = Math.min(desired, 6 + d * .3); } }
  targetLat = clamp(targetLat, lanes[0] - .4, curb);
  const look = 9 + Math.abs(v.speed) * .55;
  let px, pz; if (v.onRoute || rpProject(RP, v.x, v.z, v.rpI).d < 14) { [px, pz] = rpAt(RP, v.rs + look, targetLat); } else { [px, pz] = rpAt(RP, v.rs + 4, curb - 2); desired = Math.min(desired, 6); }
  const diff = wrapA(Math.atan2(px - v.x, pz - v.z) - v.h);
  const stIn = clamp(-diff * 2.4, -1, 1);
  let th = v.speed < desired - .8 ? 1 : (v.speed > desired + 1.5 ? -.8 : .15);
  if (desired < .3) th = v.speed > .3 ? -1 : 0;
  if (v.item) {
    a.hold += dt; a.itemT -= dt;
    if (a.itemT <= 0) {
      const fx = Math.sin(v.h), fz = Math.cos(v.h);
      a.itemT = .5 + Math.random() * .8; let use = a.hold > 9;
      for (const u of vehicles) { if (u === v || u.gone) continue; const dx = u.x - v.x, dz = u.z - v.z, d = Math.hypot(dx, dz), al = (dx * fx + dz * fz) / (d || 1); const human = u.kind === 'me' || u.kind === 'remote';
        if (v.item === 'horn' && d < (human ? 34 : 26) && al > .65) use = true;
        if (v.item === 'jam' && d < 26 && al < -.6) use = true; }
      if (v.item === 'boost' && ns.d > 140 && Math.abs(diff) < .15) use = true;
      if (use) { useItem(v); a.hold = 0; }
    }
  }
  return { th, st: stIn };
}
function playerInput(){
  if (W.t < 0) return { th: 0, st: 0 };
  return { th: (input.up ? 1 : 0) - (input.down ? 1 : 0), st: (input.right ? 1 : 0) - (input.left ? 1 : 0) };
}
function stepRemote(v, dt){
  const n = v.net; if (!n) return;
  const age = Math.min(.3, (performance.now() - n.at) / 1000);
  const px = n.x + Math.sin(n.h) * n.v * age, pz = n.z + Math.cos(n.h) * n.v * age;
  if (Math.hypot(px - v.x, pz - v.z) > 18) { v.x = px; v.z = pz; v.h = n.h; }
  else { const k = Math.min(1, dt * 10); v.x += (px - v.x) * k; v.z += (pz - v.z) * k; v.h += wrapA(n.h - v.h) * k; }
  v.speed = n.v; edgeTrack(v); routeTrack(v);
}
