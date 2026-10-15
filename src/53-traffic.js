/* =================================================================
   traffic on the road graph. Each vehicle keeps to its lane, follows
   the one ahead with a safe gap, waits at red lights and closed rail
   gates, and turns through junctions on a smooth path. Traffic lives
   in a bubble around the players and is recycled when it drifts away.
   ================================================================= */
const AG = []; const POOL = {}; let AG_N = 80, agentSeq = 1;
const KCODE = 'rckmbo';
function takeMesh(k){ const p = POOL[k] || (POOL[k] = []); let m = p.pop(); if (!m) { m = makeTrafficMesh(k, Math.random); scene.add(m); } m.visible = true; return m; }
function dropMesh(k, m){ m.visible = false; (POOL[k] || (POOL[k] = [])).push(m); }
function kindLanes(k, nl){ if (nl === 1) return [0]; if (k === 'r') return [nl - 1]; if (k === 'o' || k === 'c') return nl > 2 ? [nl - 1, nl - 2] : [nl - 1, 0]; return [...Array(nl).keys()]; }
function pickKind(cls, rnd){ const M = MIX[cls]; let t = 0; for (const k in M) t += M[k]; let r = rnd() * t; for (const k in M) { r -= M[k]; if (r <= 0) return k; } return 'k'; }
function setKind(a, k){ if (a.k === k && a.mesh) return; if (a.mesh) dropMesh(a.k, a.mesh); a.k = k; a.mesh = takeMesh(k); const K = KIND[k]; a.hw = K.hw; a.hl = K.hl; }

/* dynamic spatial hash rebuilt every frame */
const DYN = new Map(); const DCELL = 32;
function dynAdd(o){ const k = gkey(Math.floor(o.x / DCELL), Math.floor(o.z / DCELL)); let L = DYN.get(k); if (!L) DYN.set(k, L = []); L.push(o); }
function dynNear(x, z, fn){ const cx = Math.floor(x / DCELL), cz = Math.floor(z / DCELL); for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) { const L = DYN.get(gkey(cx + i, cz + k)); if (L) for (const o of L) fn(o); } }
const LISTS = new Map(); // edge-dir -> agents in edge mode
const lkey = (e, d) => e.i * 2 + (d > 0 ? 1 : 0);

function spawnAgent(a, foci, far){
  for (let t = 0; t < 24; t++) {
    const f = foci[Math.floor(Math.random() * foci.length)]; if (!f) return false;
    const ang = Math.random() * Math.PI * 2, d = far ? 150 + Math.random() * 190 : 15 + Math.random() * 300;
    const ne = nearestEdge(f.x + Math.cos(ang) * d, f.z + Math.sin(ang) * d, 40); if (!ne) continue;
    const e = ne.e, k = pickKind(e.prof.cls, Math.random), s0 = e.trimA + 8, s1 = e.len - e.trimB - 16; if (s1 <= s0) continue;
    const s = clamp(ne.s, s0, s1), dir = Math.random() < .5 ? 1 : -1, lanes = kindLanes(k, e.prof.nl), lane = lanes[Math.floor(Math.random() * lanes.length)], lat = laneLat(e, dir, lane);
    const [x, z] = eAt(e, s, lat);
    let clear = true;
    const L = LISTS.get(lkey(e, dir)); if (L) for (const b of L) if (b !== a && Math.abs(b.s - s) < 16 && Math.abs(b.lat - lat) < 2.6) { clear = false; break; }
    if (clear) for (const v of vehicles) if (!v.gone && Math.hypot(v.x - x, v.z - z) < (far ? 60 : 22)) { clear = false; break; }
    if (clear && far) for (const ff of foci) if (Math.hypot(ff.x - x, ff.z - z) < 120) { clear = false; break; }
    if (clear && e.digs.some(dg => s > dg.s0 - 10 && s < dg.s1 + 10)) clear = false;
    if (!clear) continue;
    setKind(a, k); const K = KIND[k];
    a.e = e; a.dir = dir; a.s = s; a.lat = lat; a.tl = lat; a.lane = lane; a.mode = 'edge'; a.path = null; a.J = null;
    a.v0 = (K.v[0] + Math.random() * (K.v[1] - K.v[0])) * (k === 'r' ? 1 : e.prof.speed); a.v = a.v0 * .7; a.blk = 0; a.stuck = 0; a.hitT = 0; a.wob = Math.random() * 6; a.dlat = 0; a.cd = {};
    a.id = agentSeq++; a.vis = true;
    if (L) L.push(a); else LISTS.set(lkey(e, dir), [a]);
    placeAgent(a, 0); return true;
  }
  a.vis = false; if (a.mesh) a.mesh.visible = false; a.e = null; return false;
}
function initTraffic(foci){
  for (const a of AG) if (a.mesh) dropMesh(a.k, a.mesh);
  AG.length = 0; LISTS.clear();
  for (let i = 0; i < AG_N; i++) { const a = { k: null, mesh: null }; AG.push(a); spawnAgent(a, foci, false); }
}
function laneFreeFor(a, lat){
  const L = LISTS.get(lkey(a.e, a.dir));
  if (L) for (const b of L) { if (b === a) continue; const d = (b.s - a.s) * a.dir; if (d < -10 - b.hl || d > 16 + b.hl) continue; if (Math.abs(b.lat - lat) < a.hw + b.hw + .6 || Math.abs(b.tl - lat) < a.hw + b.hw + .6) return false; }
  const [x, z] = eAt(a.e, a.s, lat); let ok = true;
  dynNear(x, z, o => { if (!ok || o.ag) return; if (Math.hypot(o.x - x, o.z - z) < o.hl + a.hl + 5) ok = false; });
  return ok;
}
/* the nearest thing in front of a vehicle, in its own frame */
function corridorGap(a, x, z, h, look, skipSameEdge){
  const fx = Math.sin(h), fz = Math.cos(h); let gap = 1e9, lv = 99, who = null;
  dynNear(x, z, o => {
    if (o.ref === a) return;
    if (skipSameEdge && o.ag && o.ag.mode === 'edge' && o.ag.e === a.e) return;
    const rx = o.x - x, rz = o.z - z, al = rx * fx + rz * fz; if (al <= 0 || al > look + o.hl) return;
    const lt = rx * fz - rz * fx, dh = o.h - h, ca = Math.abs(Math.cos(dh)), sa = Math.abs(Math.sin(dh));
    const extA = o.hl * ca + o.hw * sa, extL = o.hw * ca + o.hl * sa;
    if (Math.abs(lt) > a.hw + extL + .35) return;
    const g = al - a.hl - extA; if (g < gap) { gap = g; lv = Math.max(0, (o.v || 0) * Math.cos(dh)); who = o; }
  });
  return { gap, lv, who };
}
function chooseExit(a, N, arm, ph){
  const nl = a.e.prof.nl, inAng = Math.atan2(-arm.dz, -arm.dx), cands = [];
  for (const o of N.arms) {
    if (o === arm) continue; const t = wrapA(o.ang - inAng), kind = t > .5 ? 'R' : t < -.5 ? 'L' : 'S';
    if (ph && ph.sl && kind === 'R') continue;
    let laneOK = true; if (nl > 1) { if (a.lane === 0 && kind === 'L') laneOK = false; if (a.lane === nl - 1 && kind === 'R') laneOK = false; if (a.lane > 0 && a.lane < nl - 1 && kind !== 'S') laneOK = false; }
    cands.push({ o, kind, laneOK, w: (a.k === 'r' && o.e.prof.cls === 'A4' ? .03 : 1) * (kind === 'S' ? 3 : 1) * (o.e.prof.cls === 'C' ? .4 : 1) * ((o.end === 'a' ? o.e.b : o.e.a).dead ? .5 : 1) });
  }
  let pool = cands.filter(c => c.laneOK);
  if (!pool.length && cands.length) { // no exit fits this lane: take the one on this lane's side
    const t = c => wrapA(c.o.ang - inAng); const sorted = cands.slice().sort((p, q) => t(p) - t(q));
    pool = [a.lane < (nl - 1) / 2 ? sorted[sorted.length - 1] : sorted[0]];
  }
  if (!pool.length) return null;
  let tot = pool.reduce((s, c) => s + c.w, 0), r = Math.random() * tot; for (const c of pool) { r -= c.w; if (r <= 0) return c; } return pool[0];
}
function buildPath(x0, z0, fx0, fz0, x3, z3, fx3, fz3){
  const ch = Math.hypot(x3 - x0, z3 - z0), k = ch * .42; const c1x = x0 + fx0 * k, c1z = z0 + fz0 * k, c2x = x3 - fx3 * k, c2z = z3 - fz3 * k;
  const pts = [], cum = [0]; const n = 18;
  for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3; pts.push([a * x0 + b * c1x + c * c2x + d * x3, a * z0 + b * c1z + c * c2z + d * z3]); if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
  return { pts, cum, len: cum[n] };
}
function pathAt(P, u){ u = clamp(u, 0, P.len); let i = 1; while (i < P.cum.length - 1 && P.cum[i] < u) i++; const a = P.pts[i - 1], b = P.pts[i], seg = P.cum[i] - P.cum[i - 1] || 1, t = (u - P.cum[i - 1]) / seg; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])]; }
function listRemove(a){ const L = LISTS.get(lkey(a.e, a.dir)); if (!L) return; const i = L.indexOf(a); if (i >= 0) L.splice(i, 1); }

function trafficDemand(){
  for (const N of NET.juncs) { if (!N.demand) N.demand = new Array(N.deg).fill(0); else N.demand.fill(0); N.inside = 0; N.jl = N.jl || []; N.jl.length = 0; }
  for (const a of AG) {
    if (!a.e) continue;
    if (a.mode === 'junc') { a.J.inside++; a.J.jl.push(a); continue; }
    const N = endNode(a.e, a.dir); if (!N.ctl) continue; const d = (stopLineS(a.e, a.dir) - a.s) * a.dir; if (d < 60) { const arm = armOf(N, a.e, a.dir > 0 ? 'b' : 'a'); N.demand[arm.idx]++; }
  }
  for (const N of NET.juncs) N.urgent = -1;
  for (const v of vehicles) {
    if (v.gone || !v.edge) continue; const e = v.edge.e, dir = v.edge.dir; const N = endNode(e, dir); if (!N.ctl) continue;
    const d = (stopLineS(e, dir) - v.edge.s) * dir; if (d > -2 && d < 80) { const arm = armOf(N, e, dir > 0 ? 'b' : 'a'); N.demand[arm.idx] += 4;
      // the sergeant waves a waiting player's bus through sooner
      if ((v.kind === 'me' || v.kind === 'remote') && Math.abs(v.speed) < 2 && d < 45) { v.waitT = (v.waitT || 0) + 1 / 60; if (v.waitT > 8) N.urgent = arm.idx; } else v.waitT = 0; }
    const J = juncAt(v.x, v.z); if (J) J.inside++;
  }
}
function simTraffic(dt, foci){
  DYN.clear();
  for (const a of AG) if (a.e) dynAdd({ x: a.x, z: a.z, h: a.h, hw: a.hw, hl: a.hl, v: a.v, ref: a, ag: a });
  for (const v of vehicles) if (!v.gone) dynAdd({ x: v.x, z: v.z, h: v.speed < 0 ? v.h : v.h, hw: BUS_HW, hl: BUS_HL, v: Math.max(0, v.speed), ref: v });
  for (const o of STATIC_OBS) dynAdd(o);
  for (const j of allJams()) dynAdd({ x: j.x, z: j.z, h: j.h || 0, hw: 2.4, hl: 2.4, v: 0, ref: j });
  trafficDemand();
  for (const a of AG) {
    if (!a.e) { if (Math.random() < dt * 2) spawnAgent(a, foci, true); continue; }
    const K = KIND[a.k];
    let near = 1e9; for (const f of foci) near = Math.min(near, Math.hypot(f.x - a.x, f.z - a.z));
    if (near > 420 || (a.stuck > 30 && near > 90)) { if (a.mode === 'edge') listRemove(a); a.e = null; a.mesh.visible = false; spawnAgent(a, foci, true); continue; }
    a.hitT = Math.max(0, a.hitT - dt);
    if (a.mode === 'edge') {
      const e = a.e, dir = a.dir; let gap = 1e9, lv = a.v0;
      const L = LISTS.get(lkey(e, dir));
      for (const b of L) { if (b === a) continue; const d = (b.s - a.s) * dir; if (d <= 0 || d > 55) continue; if (Math.abs(b.lat - a.lat) > a.hw + b.hw + .45) continue; const g = d - a.hl - b.hl; if (g < gap) { gap = g; lv = b.v; } }
      const cg = corridorGap(a, a.x, a.z, a.h, 40, true); if (cg.gap < gap) { gap = cg.gap; lv = cg.lv; }
      // rail gates
      for (const c of e.rails) { const dd = (c.s - dir * 9.5 - a.s) * dir - a.hl; if (c.closed && dd > -1 && dd < 120) { const g = dd - .8; if (g < gap) { gap = g; lv = 0; } } }
      // the end of this road: a junction to enter, or the edge of the map
      const N = endNode(e, dir), sl = stopLineS(e, dir), dStop = (sl - a.s) * dir - a.hl;
      if (N.dead) { if ((e.len * (dir > 0 ? 1 : 0) - a.s) * dir < a.hl + 6) { listRemove(a); a.e = null; a.mesh.visible = false; spawnAgent(a, foci, true); continue; } }
      else if (dStop < 70) {
        const arm = armOf(N, e, dir > 0 ? 'b' : 'a'), stt = armState(N, arm.idx);
        let go = stt === 'g' || (stt === 'y' && dStop < a.v * .9);
        if (go && dStop < 1.2) {
          const ph = N.ctl ? phaseOf(N, arm.idx) : null, ex = chooseExit(a, N, arm, ph);
          if (ex) {
            const o = ex.o, e2 = o.e, d2 = o.end === 'a' ? 1 : -1, nl2 = e2.prof.nl;
            let lane2 = ex.kind === 'L' ? nl2 - 1 : ex.kind === 'R' ? 0 : Math.min(a.lane, nl2 - 1); if (a.k === 'r') lane2 = nl2 - 1;
            const lat2 = laneLat(e2, d2, lane2), s2 = entryS(e2, d2), [x3, z3, ux3, uz3] = eAt(e2, s2, lat2);
            let free = true;
            for (const ahead of [0, 6, 12]) { const [qx, qz] = eAt(e2, s2 + d2 * ahead, lat2); dynNear(qx, qz, q => { if (free && q.ref !== a && Math.hypot(q.x - qx, q.z - qz) < q.hl + a.hl + (q.ag ? 2.5 : 4)) free = false; }); if (!free) break; }
            if (free) {
              const [x0, z0, ux0, uz0] = eAt(e, a.s, a.lat);
              const path = buildPath(x0, z0, ux0 * dir, uz0 * dir, x3, z3, ux3 * d2, uz3 * d2);
              // never start across the box while someone else's path still crosses ours
              let clash = false;
              if (N.jl) for (const o of N.jl) {
                if (o.mode !== 'junc' || !o.path || (o.inArm === arm && o.lane0 === a.lane)) continue; const P2 = o.path, lim = (a.hw + o.hw + 1.2) ** 2;
                for (let i = 0; i < path.pts.length && !clash; i += 2) for (let j = 0; j < P2.pts.length; j += 2) { if (P2.cum[j] < o.pu - 2) continue; const dx = path.pts[i][0] - P2.pts[j][0], dz = path.pts[i][1] - P2.pts[j][1]; if (dx * dx + dz * dz < lim) { clash = true; break; } }
                if (clash) break;
              }
              if (!clash) {
                a.path = path; a.pu = 0; a.J = N; a.inArm = arm; a.lane0 = a.lane; a.nxt = { e: e2, dir: d2, lane: lane2, lat: lat2, s: s2 };
                listRemove(a); a.mode = 'junc'; N.jl.push(a); placeAgent(a, dt); continue;
              }
            }
          }
          go = false;
        }
        if (!go) { const g = dStop - .3; if (g < gap) { gap = g; lv = 0; } }
      }
      const vt = Math.min(a.v0, Math.max(0, (gap - 2.2) * .8));
      a.v += clamp(vt - a.v, -11 * dt, (a.k === 'r' ? 1.8 : 3.4) * dt);
      if (gap < .4 || a.v < 0) a.v = 0;
      a.stuck = a.v < .3 ? a.stuck + dt : 0;
      if (gap < 18 && lv < a.v0 * .7) a.blk += dt; else a.blk = Math.max(0, a.blk - dt * .5);
      if (a.blk > 1.2 && dStop > 30) {
        a.blk = 0; const lanes = kindLanes(a.k, e.prof.nl).concat(a.k === 'r' && e.prof.nl > 1 ? [e.prof.nl - 2] : []).map(i => [i, laneLat(e, dir, i)]).filter(([, l]) => Math.abs(l - a.tl) > .5).sort((p, q) => Math.abs(p[1] - a.lat) - Math.abs(q[1] - a.lat));
        for (const [i, l] of lanes) if (Math.abs(l - a.lat) < 4.2 && laneFreeFor(a, l)) { a.tl = l; a.lane = i; break; }
      }
      a.s += dir * a.v * dt;
      const dl = clamp(a.tl - a.lat, -2.2 * dt, 2.2 * dt); a.lat += dl; a.dlat = dt > 0 ? dl / dt : 0;
    } else {
      const P = a.path; const [x, z, h] = pathAt(P, a.pu);
      const cg = corridorGap(a, x, z, h, 25, false);
      const vt = Math.min(a.v0 * .75, Math.max(0, (cg.gap - 1.8) * .8));
      a.v += clamp(vt - a.v, -11 * dt, 3 * dt); if (cg.gap < .3 || a.v < 0) a.v = 0;
      a.stuck = a.v < .3 ? a.stuck + dt : 0;
      a.pu += a.v * dt;
      if (a.pu >= P.len) { const n = a.nxt; a.e = n.e; a.dir = n.dir; a.lane = n.lane; a.lat = a.tl = n.lat; a.s = n.s; a.mode = 'edge'; a.path = null; a.J = null; a.v0 = (KIND[a.k].v[0] + Math.random() * (KIND[a.k].v[1] - KIND[a.k].v[0])) * (a.k === 'r' ? 1 : a.e.prof.speed); const L2 = LISTS.get(lkey(a.e, a.dir)); if (L2) L2.push(a); else LISTS.set(lkey(a.e, a.dir), [a]); }
    }
    placeAgent(a, dt);
  }
}
function placeAgent(a, dt){
  if (!a.e) return;
  if (a.mode === 'edge') {
    const wob = a.k === 'r' ? Math.sin(performance.now() / 800 + a.wob) * .12 : 0;
    const [x, z, ux, uz] = eAt(a.e, a.s, a.lat + wob);
    let h = Math.atan2(ux * a.dir, uz * a.dir); if (a.v > .3) h += Math.atan2(a.dlat, a.v) * .9 * a.dir;
    a.x = x; a.z = z; a.h = h;
  } else { const [x, z, h] = pathAt(a.path, a.pu); a.x = x; a.z = z; a.h = h; }
  a.mesh.position.set(a.x, .02, a.z); a.mesh.rotation.y = a.h;
}
/* clients show the host's traffic */
const PROXY = new Map();
function netTraffic(rows, at){
  const seen = new Set();
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 6) continue; const id = Math.floor(num(r[0], -1)), k = KCODE[Math.floor(num(r[1], 0))] || 'k'; if (id < 0) continue;
    let p = PROXY.get(id); if (!p) { p = { k: null, mesh: null, id, ag: null, hitT: 0, cd: {} }; PROXY.set(id, p); }
    setKind(p, k); seen.add(id);
    const x = num(r[2], 0), z = num(r[3], 0), h = num(r[4], 0), v = clamp(num(r[5], 0), 0, 30);
    if (!p.net || Math.hypot(p.x - x, p.z - z) > 20) { p.x = x; p.z = z; p.h = h; }
    p.net = { x, z, h, v, at };
  }
  for (const [id, p] of PROXY) if (!seen.has(id) && performance.now() - (p.net ? p.net.at : 0) > 1500) { if (p.mesh) dropMesh(p.k, p.mesh); PROXY.delete(id); }
}
function stepProxies(dt){
  DYN.clear();
  for (const [, p] of PROXY) {
    const n = p.net; if (!n) continue; const age = Math.min(.4, (performance.now() - n.at) / 1000);
    const tx = n.x + Math.sin(n.h) * n.v * age, tz = n.z + Math.cos(n.h) * n.v * age, k = Math.min(1, dt * 8);
    p.x += (tx - p.x) * k; p.z += (tz - p.z) * k; p.h += wrapA(n.h - p.h) * k; p.v = n.v; p.hw = KIND[p.k].hw; p.hl = KIND[p.k].hl;
    p.mesh.position.set(p.x, .02, p.z); p.mesh.rotation.y = p.h; p.hitT = Math.max(0, p.hitT - dt);
  }
}
function trafficRows(foci){
  const out = [];
  for (const a of AG) { if (!a.e) continue; let near = 1e9; for (const f of foci) near = Math.min(near, Math.abs(f.x - a.x) + Math.abs(f.z - a.z)); if (near > 300) continue; out.push([a.id, KCODE.indexOf(a.k), Math.round(a.x * 10) / 10, Math.round(a.z * 10) / 10, Math.round(a.h * 100) / 100, Math.round(a.v * 10) / 10]); }
  return out;
}
/* when this player becomes host, the shown traffic turns into real traffic */
function adoptProxies(){
  for (const a of AG) if (a.mesh) dropMesh(a.k, a.mesh); AG.length = 0; LISTS.clear();
  for (const [, p] of PROXY) {
    const ne = nearestEdge(p.x, p.z, 30); if (!ne) { if (p.mesh) dropMesh(p.k, p.mesh); continue; }
    const e = ne.e, [, , ux, uz] = eAt(e, ne.s, 0), dir = Math.sin(p.h) * ux + Math.cos(p.h) * uz >= 0 ? 1 : -1;
    const a = { k: p.k, mesh: p.mesh, hw: KIND[p.k].hw, hl: KIND[p.k].hl, e, dir, s: clamp(ne.s, e.trimA + 2, e.len - e.trimB - 2), lat: ne.lat, tl: ne.lat, lane: 0, mode: 'edge', v: p.v || 0, v0: KIND[p.k].v[1] * e.prof.speed, blk: 0, stuck: 0, hitT: 0, wob: 0, dlat: 0, cd: {}, id: agentSeq++, x: p.x, z: p.z, h: p.h };
    let best = 0, bd = 99; for (let i = 0; i < e.prof.nl; i++) { const d = Math.abs(laneLat(e, dir, i) - ne.lat); if (d < bd) { bd = d; best = i; } } a.lane = best; a.tl = laneLat(e, dir, best);
    AG.push(a); const L = LISTS.get(lkey(e, dir)); if (L) L.push(a); else LISTS.set(lkey(e, dir), [a]);
  }
  PROXY.clear();
  while (AG.length < AG_N) { const a = { k: null, mesh: null, e: null }; AG.push(a); }
}
