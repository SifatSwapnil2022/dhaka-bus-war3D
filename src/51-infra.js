/* =================================================================
   railway, metro, water, stops, signals and road signs
   ================================================================= */
const RAIL = { X: null, Z: null, S: null, n: 0, len: 0, cross: [], trains: [] };
function segInter(ax, az, bx, bz, cx, cz, dx, dz){
  const r1x = bx - ax, r1z = bz - az, r2x = dx - cx, r2z = dz - cz, den = r1x * r2z - r1z * r2x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * r2z - (cz - az) * r2x) / den, u = ((cx - ax) * r1z - (cz - az) * r1x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [t, u] : null;
}
function buildRailLine(){
  const cv = new THREE.CatmullRomCurve3(RAIL_LL.map(ll => { const [x, z] = LL(ll[0], ll[1]); return new THREE.Vector3(x, 0, z); }), false, 'centripetal');
  const len = cv.getLength(), n = Math.ceil(len / 2), sp = cv.getSpacedPoints(n);
  RAIL.n = sp.length; RAIL.len = len; RAIL.X = new Float32Array(RAIL.n); RAIL.Z = new Float32Array(RAIL.n); RAIL.S = new Float32Array(RAIL.n);
  for (let i = 0; i < RAIL.n; i++) { RAIL.X[i] = sp[i].x; RAIL.Z[i] = sp[i].z; RAIL.S[i] = i * len / n; }
  // level crossings: wherever the line cuts a road
  for (let i = 0; i < RAIL.n - 1; i++) {
    const L = gridAt(SEG_GRID, (RAIL.X[i] + RAIL.X[i + 1]) / 2, (RAIL.Z[i] + RAIL.Z[i + 1]) / 2); if (!L) continue;
    for (const code of L) {
      const e = NET.edges[code >> 12], k = code & 4095;
      const hit = segInter(RAIL.X[i], RAIL.Z[i], RAIL.X[i + 1], RAIL.Z[i + 1], e.X[k], e.Z[k], e.X[k + 1], e.Z[k + 1]);
      if (!hit) continue; const es = (k + hit[1]) * e.ds; if (e.rails.some(r => Math.abs(r.s - es) < 4)) continue;
      const rs = RAIL.S[i] + hit[0] * (RAIL.S[i + 1] - RAIL.S[i]);
      const c = { e, s: es, rs, x: RAIL.X[i] + (RAIL.X[i + 1] - RAIL.X[i]) * hit[0], z: RAIL.Z[i] + (RAIL.Z[i + 1] - RAIL.Z[i]) * hit[0], closed: false, booms: [], lights: [], hitCD: {} };
      e.rails.push(c); RAIL.cross.push(c);
    }
  }
  for (const c of RAIL.cross) for (const sd of [1, -1]) c.e.res[sd].push([c.s - 12, c.s + 12]);
}
function railAt(rs){ rs = clamp(rs, 0, RAIL.len); const f = rs / RAIL.len * (RAIL.n - 1), i = Math.min(RAIL.n - 2, Math.floor(f)), u = f - i; const x = RAIL.X[i] + (RAIL.X[i + 1] - RAIL.X[i]) * u, z = RAIL.Z[i] + (RAIL.Z[i + 1] - RAIL.Z[i]) * u; const dx = RAIL.X[i + 1] - RAIL.X[i], dz = RAIL.Z[i + 1] - RAIL.Z[i], l = Math.hypot(dx, dz) || 1; return [x, z, dx / l, dz / l]; }
function reserveRail(){ for (let i = 0; i < RAIL.n - 1; i += 6) { const j = Math.min(RAIL.n - 1, i + 6); const cx = (RAIL.X[i] + RAIL.X[j]) / 2, cz = (RAIL.Z[i] + RAIL.Z[j]) / 2, dx = RAIL.X[j] - RAIL.X[i], dz = RAIL.Z[j] - RAIL.Z[i], l = Math.hypot(dx, dz) || 1; fpAdd({ cx, cz, ax: dx / l, az: dz / l, hw: l / 2 + .5, hd: 6.5, kind: 'rail' }); } }
function buildRailMeshes(){
  const c = makeCanvas(64, 256), g = c.getContext('2d'); g.fillStyle = '#7a7266'; g.fillRect(0, 0, 64, 256); for (let y = 0; y < 256; y += 16) { g.fillStyle = '#4a3b2c'; g.fillRect(4, y + 3, 56, 7); }
  g.fillStyle = '#a3a3a3'; g.fillRect(14, 0, 4, 256); g.fillRect(46, 0, 4, 256);
  const tm = lam({ map: texFrom(c, true), polygonOffset: true, polygonOffsetFactor: -3 });
  const ballast = new Batch(), track = new Batch();
  const rowsB = [], rowsT = [];
  for (let i = 0; i < RAIL.n; i++) {
    const dx = (RAIL.X[Math.min(RAIL.n - 1, i + 1)] - RAIL.X[Math.max(0, i - 1)]), dz = (RAIL.Z[Math.min(RAIL.n - 1, i + 1)] - RAIL.Z[Math.max(0, i - 1)]), l = Math.hypot(dx, dz) || 1, lx = dz / l, lz = -dx / l, v = RAIL.S[i] / 4;
    rowsT.push([[RAIL.X[i] + lx * 2.5, .07, RAIL.Z[i] + lz * 2.5, 0, v], [RAIL.X[i] - lx * 2.5, .07, RAIL.Z[i] - lz * 2.5, 1, v]]);
    rowsB.push([[RAIL.X[i] + lx * 4.2, .04, RAIL.Z[i] + lz * 4.2, 0, v], [RAIL.X[i] - lx * 4.2, .04, RAIL.Z[i] - lz * 4.2, 1, v]]);
  }
  track.strip(rowsT); ballast.strip(rowsB);
  ballast.mesh(lam({ color: 0x847a6c, polygonOffset: true, polygonOffsetFactor: -1 })); track.mesh(tm);
  const armTex = (() => { const cc = makeCanvas(256, 16), gg = cc.getContext('2d'); for (let x = 0; x < 256; x += 32) { gg.fillStyle = (x / 32) % 2 ? '#f4f1ea' : '#d22a1e'; gg.fillRect(x, 0, 32, 16); } return texFrom(cc); })();
  for (const cr of RAIL.cross) {
    const e = cr.e, pr = e.prof;
    for (const [s, lat] of [[cr.s - 9, pr.hw + .8], [cr.s + 9, -pr.hw - .8]]) {
      const ff = eFrame(e, s, lat); const post = new THREE.Group(); post.position.set(ff.x, CURB_H, ff.z); post.rotation.y = ff.h;
      post.add(partsMesh([B('#2a2a2a', .5, 1.4, .5, 0, .7, 0), C('#e9e4d8', .08, 3.2, 0, 1.6, 0)]));
      const sgn = lat > 0 ? 1 : -1;
      const light = new THREE.Mesh(new THREE.CircleGeometry(.24, 14), new THREE.MeshBasicMaterial({ color: '#3a1010' })); light.position.set(0, 2.9, sgn > 0 ? -.1 : .1); light.rotation.y = sgn > 0 ? Math.PI : 0; post.add(light); cr.lights.push(light);
      const pivot = new THREE.Group(); pivot.position.set(0, 1.25, 0);
      const armLen = 2 * pr.hw - 1.4; const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, .2, .2), lam({ map: armTex }));
      arm.position.x = -sgn * armLen / 2; arm.castShadow = true; pivot.add(arm); post.add(pivot);
      scene.add(post); cr.booms.push({ pivot, sign: sgn });
    }
  }
  for (let k = 0; k < 2; k++) {
    const tg = new THREE.Group(); const cars = [];
    cars.push(partsMesh([B('#1d4f8f', 3.1, 3.6, 16, 0, 2.3, 0), B('#f2c21b', 3.14, .5, 16.02, 0, 1.6, 0), B('#26323a', 3.16, .9, 3, 0, 3.2, 7)]));
    for (let i = 0; i < 7; i++) cars.push(partsMesh(i % 3 === 2 ? [B('#7a2b22', 3.1, 3.4, 16, 0, 2.2, 0), B('#e9e1c9', 3.14, .55, 16.02, 0, 2.6, 0), B('#1f2a30', 3.16, .7, 14, 0, 3.15, 0)] : [B('#2f6b4f', 3.1, 3.4, 16, 0, 2.2, 0), B('#e9e1c9', 3.14, .55, 16.02, 0, 2.6, 0), B('#1f2a30', 3.16, .7, 14, 0, 3.15, 0)]));
    cars.forEach(cm => { scene.add(cm); });
    RAIL.trains.push({ cars, phase: k * .5 });
  }
}
const TRAIN_SPEED = 13, TRAIN_LEN = 8 * 16.6;
function trainHead(tr, t){ const run = RAIL.len + 300, per = run * 2 / TRAIN_SPEED; let q = ((t / per + tr.phase) % 1 + 1) % 1; const fw = q < .5; const d = (fw ? q : 1 - q) * 2 * run - 150; return { s: d, dir: fw ? 1 : -1 }; }
function updateRail(t){
  for (const tr of RAIL.trains) {
    const { s, dir } = trainHead(tr, t); tr.s = s; tr.dir = dir;
    tr.cars.forEach((cm, i) => { const rs = s - dir * (i * 16.6 + 8); if (rs < -20 || rs > RAIL.len + 20) { cm.visible = false; return; } cm.visible = true; const [x, z, dx, dz] = railAt(rs); cm.position.set(x, .1, z); cm.rotation.y = Math.atan2(dx * dir, dz * dir); });
  }
  const blink = Math.floor(t * 3) % 2 === 0;
  for (const c of RAIL.cross) {
    let near = Infinity, onTrack = false;
    for (const tr of RAIL.trains) { const head = tr.s, tail = tr.s - tr.dir * TRAIN_LEN; const lo = Math.min(head, tail), hi = Math.max(head, tail); if (c.rs >= lo - 3 && c.rs <= hi + 3) onTrack = true; const ahead = (c.rs - head) * tr.dir; if (ahead > 0) near = Math.min(near, ahead); }
    const want = onTrack || near < 150;
    c.closed = want; c.onTrack = onTrack;
    c.ang = c.ang == null ? Math.PI / 2 * .92 : c.ang; const target = want ? 0 : Math.PI / 2 * .92; c.ang += clamp(target - c.ang, -.035, .035);
    for (const b of c.booms) b.pivot.rotation.z = -c.ang * b.sign;
    c.lights.forEach(l => l.material.color.set(want && blink ? '#ff3030' : '#3a1010'));
  }
}

/* ---------- MRT Line-6 viaduct ---------- */
const METRO = { RP: null, stations: [], train: null };
function buildMetro(){
  const RP = buildRoutePath({ nodes: METRO_NODES }, false); METRO.RP = RP;
  for (const L of RP.legs) L.e.metro = true;
  const deck = new Batch(), under = new Batch(), wall = new Batch(), parts = [];
  const rowsD = [], rowsU = [], rowsW1 = [], rowsW2 = [];
  for (let s = 0; s <= RP.len; s += 2) {
    const [x, z, ux, uz] = rpAt(RP, s, 0), lx = uz, lz = -ux, v = s / 10;
    rowsD.push([[x + lx * 4.4, 12.6, z + lz * 4.4, 0, v], [x - lx * 4.4, 12.6, z - lz * 4.4, 1, v]]);
    rowsU.push([[x - lx * 4.4, 11.2, z - lz * 4.4, 0, v], [x + lx * 4.4, 11.2, z + lz * 4.4, 1, v]]);
    rowsW1.push([[x + lx * 4.4, 13.6, z + lz * 4.4, 0, v], [x + lx * 4.4, 11.2, z + lz * 4.4, 1, v]]);
    rowsW2.push([[x - lx * 4.4, 11.2, z - lz * 4.4, 0, v], [x - lx * 4.4, 13.6, z - lz * 4.4, 1, v]]);
  }
  deck.strip(rowsD); under.strip(rowsU); wall.strip(rowsW1); wall.strip(rowsW2);
  const dm = deck.mesh(lam({ color: 0xbdb8ad })); if (dm) dm.castShadow = true;
  under.mesh(lam({ color: 0x8f8a80 })); const wm = wall.mesh(lam({ color: 0xd3cec2, side: THREE.DoubleSide })); if (wm) wm.castShadow = true;
  // columns stand in the median
  for (let s = 6; s < RP.len - 4; s += 26) {
    const m = rpMeta(RP, s); if (m[5] < 0) continue; const e = NET.edges[m[5]]; if (!medianAt(e, m[6])) continue;
    const [x, z, ux, uz] = rpAt(RP, s, 0), h = Math.atan2(ux, uz);
    parts.push(P(BOXG, '#b3ad9f', x, 5.6, z, 0, h, 0, Math.min(1.2, e.prof.med * 1.8), 11, 1.7));
    parts.push(P(BOXG, '#a8a294', x, 10.6, z, 0, h, 0, 8.4, 1.2, 2.2));
  }
  if (parts.length) scene.add(partsMesh(parts));
  // stations at their real places, never inside a junction
  for (const st of METRO_STATIONS) {
    const [sx, sz] = LL(st.ll[0], st.ll[1]); const p = rpProject(RP, sx, sz, -1); let s = p.s;
    for (let k = 0; k < 80; k++) { const ok = [-34, 0, 34].every(o => { const m = rpMeta(RP, s + o); return m[5] >= 0; }); if (ok) break; s += 3; }
    const m = rpMeta(RP, s); if (m[5] < 0) continue; const e = NET.edges[m[5]], pr = e.prof;
    const f = rpAt(RP, s, 0), h = Math.atan2(f[2], f[3]);
    const g = new THREE.Group(); g.position.set(f[0], 0, f[1]); g.rotation.y = h;
    const W2 = pr.hw + SWALK * .5;
    const sp = [B('#e6e2d8', 2 * W2 + 4, .9, 64, 0, 11.4, 0), B('#dcd7cb', 2 * W2 + 4, .5, 66, 0, 18.3, 0), B('#f0ece2', 2 * W2 + 2, 5.2, 62, 0, 14.9, 0)];
    for (const sd of [1, -1]) for (const zz of [-26, 26]) { sp.push(P(BOXG, '#cfc9bc', sd * (pr.hw + 2.6), 5.6, zz, -.82, 0, 0, 2.2, .5, 15)); sp.push(B('#b3ad9f', 1.6, 11, 1.6, sd * (pr.hw + 2.6), 5.6, zz + (zz > 0 ? 8 : -8))); }
    g.add(partsMesh(sp));
    const glassM = lam({ map: texRep(glassTexC, 10, 1) });
    for (const sd of [1, -1]) { const gl = new THREE.Mesh(new THREE.PlaneGeometry(62, 3.2), glassM); gl.position.set(sd * (W2 + 2.05), 15.2, 0); gl.rotation.y = sd * Math.PI / 2; g.add(gl); }
    for (const zz of [-33.2, 33.2]) { const sg = signPlane(st.bn + ' মেট্রো স্টেশন', 'MRT Line-6', 18, 3.2, '#1b6b5a', '#f4ead6'); sg.position.set(0, 15.1, zz); sg.rotation.y = zz < 0 ? Math.PI : 0; g.add(sg); }
    scene.add(g); METRO.stations.push({ s, x: f[0], z: f[1] });
    for (const sd of [1, -1]) e.res[sd].push([m[6] - 36, m[6] + 36]);
  }
  const tg = []; for (let i = 0; i < 6; i++) { const cm = partsMesh([B('#f2f1ec', 3, 3.3, 18, 0, 1.75, 0), B('#1c2b33', 3.04, .9, 17, 0, 2.2, 0), B('#13877b', 3.06, .35, 18.02, 0, 1.2, 0)]); scene.add(cm); tg.push(cm); }
  METRO.train = tg;
}
function updateMetro(t){
  if (!METRO.train) return; const RP = METRO.RP;
  const run = RP.len - 140; let q = (t * 15) % (run * 2); if (q < 0) q += run * 2;
  const dir = q < run ? 1 : -1, s = 70 + (q < run ? q : run * 2 - q), lat = dir > 0 ? 2.1 : -2.1;
  METRO.train.forEach((c, i) => { const [x, z, ux, uz] = rpAt(RP, s - dir * i * 18.6, lat); c.position.set(x, 12.6, z); c.rotation.y = Math.atan2(ux, uz) + (dir < 0 ? Math.PI : 0); });
}
function underMetro(x, z){ if (!METRO.RP) return false; const p = rpProject(METRO.RP, x, z, METRO.hint); METRO.hint = p.i; return p.d < 7 || METRO.stations.some(st => Math.hypot(st.x - x, st.z - z) < 40); }

/* ---------- water: Dhanmondi Lake and Hatirjheel ---------- */
function waterMat(){ return new THREE.MeshPhongMaterial({ color: 0x3d6b72, shininess: 80, specular: 0x9fc4c8 }); }
function buildWater(){
  // the lake runs along the east side of Satmasjid Road, with a promenade between
  const LE = findEdge('jigatola', 'satm27')[0], lp = LE.prof, lake = [], s0 = LE.trimA + 30, s1 = LE.len - LE.trimB - 30, inL = [], outL = [];
  for (let s = s0; s <= s1; s += 8) { const t = (s - s0) / (s1 - s0), wdt = 16 + 10 * Math.sin(t * Math.PI) + 4 * Math.sin(t * 17); const a = -(lp.hw + SWALK + 9 + 3 * Math.sin(t * 9)); inL.push(eAt(LE, s, a)); outL.push(eAt(LE, s, a - wdt)); }
  for (const p of inL) lake.push([p[0], p[1]]); for (let i = outL.length - 1; i >= 0; i--) lake.push([outL[i][0], outL[i][1]]);
  addWater(lake);
  const sh = new THREE.Shape(lake.map(([x, z]) => new THREE.Vector2(x, -z)));
  const wm = new THREE.Mesh(new THREE.ShapeGeometry(sh), waterMat()); wm.rotation.x = -Math.PI / 2; wm.position.y = .12; scene.add(wm);
  // a lakeside walkway and trees around the bank
  const ring = new Batch(), trees = [];
  const cx = lake.reduce((a, p) => a + p[0], 0) / lake.length, cz = lake.reduce((a, p) => a + p[1], 0) / lake.length;
  const rows = [];
  for (let i = 0; i <= lake.length; i++) { const p = lake[i % lake.length]; const dx = p[0] - cx, dz = p[1] - cz, l = Math.hypot(dx, dz) || 1; const q = [p[0] + dx / l * 6, p[1] + dz / l * 6]; rows.push([[q[0], .16, q[1], 0, i], [p[0], .16, p[1], 1, i]]); }
  ring.strip(rows); ring.mesh(lam({ color: 0x9a907e }));
  const ringPoly = lake.map(p => { const dx = p[0] - cx, dz = p[1] - cz, l = Math.hypot(dx, dz) || 1; return [p[0] + dx / l * 12, p[1] + dz / l * 12]; });
  addWater(ringPoly).ring = true;
  for (let i = 0; i < lake.length; i++) { const p = lake[i], q = lake[(i + 1) % lake.length]; for (let t = 0; t < 1; t += .34) { const x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t; const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1; trees.push([x + dx / l * 9, z + dz / l * 9]); } }
  const tp = []; trees.forEach(([x, z], i) => treeParts(tp, x, z, .95, i % 7 === 0)); if (tp.length) scene.add(partsMesh(tp));
  { const lsg = signPlane('ধানমন্ডি লেক', 'Dhanmondi Lake', 9, 1.6, '#1f5e57', '#f4ead6'); lsg.position.set(lake[0][0] + 8, 3, lake[0][1]); lsg.rotation.y = Math.PI / 2; scene.add(lsg); }
  // Hatirjheel: a band of water on the north side of the lakeside road
  for (const [a, b] of HATIRJHEEL_EDGES) {
    const f = findEdge(a, b); if (!f) continue; const e = f[0], pr = e.prof;
    const s0 = e.trimA + 12, s1 = e.len - e.trimB - 12; const l0 = pr.hw + SWALK + 9, l1 = pr.hw + SWALK + 44;
    let spans = [[s0, s1]];
    for (const r of e.rails) spans = spans.flatMap(([p, q]) => (r.s > p && r.s < q) ? [[p, r.s - 14], [r.s + 14, q]] : [[p, q]]);
    const WB = new Batch(), BK = new Batch();
    for (const [p, q] of spans) {
      if (q - p < 10) continue;
      edgeRibbon(WB, e, p, q, l1, l0, .12, .12, 10);
      edgeRibbon(BK, e, p, q, l0, pr.hw + SWALK, .1, .1, 6);
      const poly = []; const n = Math.ceil((q - p) / 8); for (let k = 0; k <= n; k++) { const [x, z] = eAt(e, p + (q - p) * k / n, l1 + 2); poly.push([x, z]); } for (let k = n; k >= 0; k--) { const [x, z] = eAt(e, p + (q - p) * k / n, pr.hw + SWALK - .2); poly.push([x, z]); }
      addWater(poly);
    }
    WB.mesh(waterMat()); BK.mesh(lam({ color: 0x5f7c40 }));
    const lamp = []; for (let s = s0; s < s1; s += 30) { const [x, z] = eAt(e, s, pr.hw + SWALK + 4); lamp.push(C('#d9d4c7', .1, 5, x, 2.5, z), B('#f4f1ea', .6, .3, .6, x, 5.1, z)); } if (lamp.length) scene.add(partsMesh(lamp));
  }
}

/* ---------- bus stops on every route, both directions ---------- */
const STOP_PLACES = []; // physical shelters: { e, es, sd, site, x, z, slots }
function placeRouteStops(RP){
  const out = [];
  for (const id of RP.route.stops.slice()) {
    const site = STOP_SITES[id]; if (!site) continue;
    const [x, z] = LL(site.ll[0], site.ll[1]); const p = rpProject(RP, x, z, -1);
    let s = p.s, ok = false;
    const good = s0 => { if (s0 - STOP_ZONE < 6 || s0 + STOP_ZONE > RP.len - 6) return false; for (const o of [-STOP_ZONE - 4, -STOP_ZONE / 2, 0, STOP_ZONE / 2, STOP_ZONE + 6]) { const m = rpMeta(RP, s0 + o); if (m[5] < 0 || m[5] !== rpMeta(RP, s0)[5]) return false; } const m = rpMeta(RP, s0), e = NET.edges[m[5]]; if (e.rails.some(r => Math.abs(r.s - m[6]) < 26)) return false; for (const sg of RP.signals) if (s0 + STOP_ZONE > sg.s - 3 && s0 - STOP_ZONE < sg.s + 4) return false; return !out.some(q => Math.abs(q.s - s0) < STOP_ZONE * 2 + 18); };
    for (let k = 0; k < 90 && !ok; k++) { for (const c of [s + k * 3, s - k * 3]) if (good(c)) { s = c; ok = true; break; } }
    if (!ok) continue;
    const m = rpMeta(RP, s); const e = NET.edges[m[5]], es = m[6], sd = m[7];
    out.push({ id, site, s, e, es, sd });
  }
  out.sort((a, b) => a.s - b.s);
  RP.stops = out;
  for (const st of out) {
    let pl = STOP_PLACES.find(q => q.e === st.e && q.sd === st.sd && Math.abs(q.es - st.es) < 22);
    if (!pl) { pl = { e: st.e, es: st.es, sd: st.sd, site: st.site }; STOP_PLACES.push(pl); st.e.stopsHere.push({ s: st.es, sd: st.sd }); st.e.res[st.sd].push([st.es - STOP_ZONE - 4, st.es + STOP_ZONE + 4]); }
    st.place = pl; const dd = (pl.es - st.es) * st.sd; st.es = pl.es; st.s += dd;
  }
}
function bayTex(){
  const c = makeCanvas(128, 512), g = c.getContext('2d'); g.clearRect(0, 0, 128, 512);
  g.strokeStyle = 'rgba(242,176,30,.85)'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 500);
  g.lineWidth = 5; for (let y = -128; y < 512; y += 36) { g.beginPath(); g.moveTo(6, y); g.lineTo(122, y + 116); g.stroke(); }
  g.fillStyle = 'rgba(64,63,66,1)'; g.fillRect(22, 150, 84, 212);
  g.save(); g.translate(64, 256); g.rotate(-Math.PI / 2); g.fillStyle = 'rgba(242,176,30,.95)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 50px ${HS}`; g.fillText('বাস স্টপ', 0, 0); g.restore();
  return texFrom(c);
}
function buildStopPlaces(){
  const bay = new Batch();
  for (const pl of STOP_PLACES) {
    const e = pl.e, pr = e.prof, sd = pl.sd;
    edgeRibbon(bay, e, pl.es - STOP_ZONE, pl.es + STOP_ZONE, sd * (pr.hw - .25), sd * (pr.hw - LW - .2), .045, .045, STOP_ZONE * 2, sd > 0 ? 0 : 1, sd > 0 ? 1 : 0);
    const f = eFrame(e, pl.es, sd * (pr.hw + 3.0));
    const g = new THREE.Group(); g.position.set(f.x, CURB_H, f.z); g.rotation.y = f.h + (sd < 0 ? Math.PI : 0);
    const parts = [B('#1f5e57', 2.6, .18, 9, 0, 3, 0), B('#8a6f4c', .6, .1, 6, .5, .55, 0), B('#3d4a47', .1, 1.6, 8.6, 1.25, 1.95, 0)];
    for (const zz of [-4, 4]) for (const xx of [-1.1, 1.1]) parts.push(B('#5c6e6a', .12, 3, .12, xx, 1.5, zz));
    g.add(partsMesh(parts));
    const sign = signPlane(pl.site.bn, pl.site.en + ' · bus stop', 5.4, 1.6); sign.material.side = THREE.DoubleSide; sign.position.set(-.2, 4.1, 4.6); sign.rotation.y = Math.PI; g.add(sign);
    scene.add(g);
    const fp = { cx: f.x, cz: f.z, ax: f.ux, az: f.uz, hw: 5, hd: 1.6, kind: 'stop' }; FP.push(fp);
    pl.glow = null;
  }
  bay.mesh(lam({ map: bayTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
}

/* ---------- footbridges near the busiest stops on the wide roads ---------- */
function buildFootbridges(){
  const done = [];
  for (const pl of STOP_PLACES) {
    const e = pl.e; if (!e.prof.div || e.metro || pl.site.w < .75) continue;
    const s = pl.es - pl.sd * (STOP_ZONE + 9); if (s < e.trimA + 12 || s > e.len - e.trimB - 12) continue;
    if (done.some(d => d.e === e && Math.abs(d.s - s) < 120) || e.rails.some(r => Math.abs(r.s - s) < 30)) continue;
    done.push({ e, s }); e.foot.push(s);
    const pr = e.prof, f = eFrame(e, s, 0); const g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = f.h;
    const W2 = pr.hw + 3.2;
    const p = [B('#7f8a8c', 2 * W2, .5, 2.8, 0, 9.1, 0), B('#5e6a6c', 2 * W2, 1.1, .1, 0, 9.9, 1.35), B('#5e6a6c', 2 * W2, 1.1, .1, 0, 9.9, -1.35)];
    for (const sd of [1, -1]) { p.push(P(BOXG, '#7f8a8c', sd * (pr.hw + 2.6), 4.7, -4.3, -.9, 0, 0, 2.2, .4, 12)); p.push(B('#4c5759', .6, 9.1, .6, sd * (pr.hw + 2.6), 4.55, 1.2)); e.res[sd].push([s - 12, s + 6]); }
    if (pr.div) p.push(B('#4c5759', .6, 9.1, .6, 0, 4.55, 0));
    g.add(partsMesh(p));
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(2 * pr.hw - 4, 1.8), lam({ map: adTex(Math.floor(s) % 6) })); ad.position.set(0, 10.6, -1.42); ad.rotation.y = Math.PI; g.add(ad);
    const ad2 = new THREE.Mesh(ad.geometry, lam({ map: adTex((Math.floor(s) + 3) % 6) })); ad2.position.set(0, 10.6, 1.42); g.add(ad2);
    scene.add(g);
  }
}

/* ---------- junction control: one green at a time, like a Dhaka sergeant ---------- */
const LAMPS = { n: 0, mats: [], mesh: null };
const LAMP_ON = [new THREE.Color('#ff3030'), new THREE.Color('#ffc21a'), new THREE.Color('#38e06a')], LAMP_OFF = [new THREE.Color('#3a1010'), new THREE.Color('#3a2c08'), new THREE.Color('#0e2a16')];
function buildSignals(){
  for (const N of NET.juncs) {
    if (N.deg < 3) continue;
    const arms = N.arms, used = new Set(), phases = [];
    for (let i = 0; i < arms.length; i++) for (let j = i + 1; j < arms.length; j++) {
      if (used.has(i) || used.has(j)) continue;
      if (Math.abs(wrapA(arms[i].ang - arms[j].ang)) > Math.PI - .55) { phases.push({ arms: [i, j], sl: true }); used.add(i); used.add(j); }
    }
    for (let i = 0; i < arms.length; i++) if (!used.has(i)) phases.push({ arms: [i], sl: false });
    N.ctl = { phases, ph: Math.floor(hashStr(N.id) % phases.length), t: (hashStr(N.id) % 7), st: 'g' };
    N.major = arms.some(a => a.e.prof.cls === 'A4' || a.e.prof.cls === 'A3');
    N.heads = [];
    for (const arm of arms) {
      const e = arm.e, dirIn = arm.end === 'b' ? 1 : -1, pr = e.prof, sl = stopLineS(e, dirIn);
      const f = eFrame(e, sl - dirIn * .4, dirIn * (pr.hw + .9));
      const g = new THREE.Group(); g.position.set(f.x, CURB_H, f.z); g.rotation.y = f.h + (dirIn < 0 ? Math.PI : 0);
      const reach = N.major ? Math.min(pr.hw - 1, 6.5) : 0;
      g.add(partsMesh([C('#2a2a2a', .12, 5.6, 0, 2.8, 0), B('#1b1b1b', .7, 2, .6, -reach, 5.2, .2)].concat(reach ? [B('#1b1b1b', reach + .4, .14, .14, -reach / 2, 5.6, 0)] : [])));
      scene.add(g); g.updateMatrixWorld(true);
      const lamps = [0, 1, 2].map(k => { const o = new THREE.Object3D(); o.position.set(-reach, 5.85 - k * .6, -.11); o.rotation.y = Math.PI; g.add(o); o.updateMatrixWorld(true); const i = LAMPS.n++; LAMPS.mats.push(o.matrixWorld.clone()); g.remove(o); return i; });
      N.heads.push({ arm, lamps });
      e.res[dirIn].push(dirIn > 0 ? [sl - 3, e.len] : [0, sl + 3]);
    }
    if (N.major) {
      // a traffic sergeant on the corner
      const fl = N.fillets[0]; if (fl && fl.length) { const p = fl[Math.floor(fl.length / 2)]; const dx = p[0] - N.x, dz = p[1] - N.z, l = Math.hypot(dx, dz) || 1; const pg = new THREE.Group(); pg.position.set(p[0] + dx / l * 2, CURB_H, p[1] + dz / l * 2); pg.rotation.y = Math.atan2(-dx, -dz); pg.add(partsMesh([C('#d8d2c4', .9, .5, 0, .25, 0), C('#e9e4d8', .07, 2.6, 0, 1.5, 0), P(CONEG, '#c22f2f', 0, 2.9, 0, 0, 0, 0, 1.0, .6, 1.0), C('#f4f1ea', .22, .7, .35, .85, 0), C('#26314a', .2, .55, .35, .35, 0), P(SPHG, '#5a3a26', .35, 1.38, 0, 0, 0, 0, .17, .17, .17), C('#f2f2f2', .19, .08, .35, 1.56, 0)])); scene.add(pg); }
    }
  }
}
function finishSignals(){
  const im = new THREE.InstancedMesh(new THREE.CircleGeometry(.22, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, LAMPS.n));
  LAMPS.mats.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, LAMP_OFF[i % 3]); }); if (im.instanceColor) im.instanceColor.needsUpdate = true; scene.add(im); LAMPS.mesh = im;
}
function phaseOf(N, armIdx){ const ph = N.ctl.phases[N.ctl.ph]; return ph.arms.includes(armIdx) ? ph : null; }
function armState(N, armIdx){ if (!N.ctl) return 'g'; const ph = phaseOf(N, armIdx); if (!ph) return 'r'; return N.ctl.st === 'g' ? 'g' : N.ctl.st === 'y' ? 'y' : 'r'; }
function updateSignals(dt){
  if (LAMPS.mesh && LAMPS.mesh.instanceColor) LAMPS.mesh.instanceColor.needsUpdate = true;
  for (const N of NET.juncs) {
    const C = N.ctl; if (!C) continue;
    C.t += dt;
    if (!W.isHost && W.online && Game.mode === 'race') { for (const hd of N.heads) { const s2 = armState(N, hd.arm.idx); const im = LAMPS.mesh; im.setColorAt(hd.lamps[0], s2 === 'r' ? LAMP_ON[0] : LAMP_OFF[0]); im.setColorAt(hd.lamps[1], s2 === 'y' ? LAMP_ON[1] : LAMP_OFF[1]); im.setColorAt(hd.lamps[2], s2 === 'g' ? LAMP_ON[2] : LAMP_OFF[2]); } continue; }
    if (C.st === 'g') {
      const ph = C.phases[C.ph], dem = N.demand || [], load = ph.arms.reduce((a, i) => a + (dem[i] || 0), 0);
      const maxG = (ph.sl ? 13 : 8) + Math.min(10, load * .7), minG = 5;
      const here = load > 0, other = C.phases.some((p, k) => k !== C.ph && p.arms.some(i => dem[i] > 0));
      const urgentElsewhere = N.urgent >= 0 && !ph.arms.includes(N.urgent);
      if (C.t > minG && (urgentElsewhere || (other && (!here || C.t > maxG)))) { C.st = 'y'; C.t = 0; }
      else if (C.t > maxG + 14 && !here) { C.st = 'y'; C.t = 0; }
    } else if (C.st === 'y') { if (C.t > 2.6) { C.st = 'ar'; C.t = 0; } }
    else if (C.st === 'ar') {
      if (C.t > 1.6 && (!(N.inside > 0) || C.t > 4.5)) { // pick the next phase that has someone waiting
        let k = C.ph; for (let q = 1; q <= C.phases.length; q++) { const c = (C.ph + q) % C.phases.length; if (C.phases[c].arms.some(i => N.demand && N.demand[i] > 0)) { k = c; break; } if (q === C.phases.length) k = (C.ph + 1) % C.phases.length; }
        if (N.urgent >= 0) { const u = C.phases.findIndex(p => p.arms.includes(N.urgent)); if (u >= 0) k = u; }
        C.ph = k; C.st = 'g'; C.t = 0;
      }
    }
    for (const hd of N.heads) { const s = armState(N, hd.arm.idx); const im = LAMPS.mesh; im.setColorAt(hd.lamps[0], s === 'r' ? LAMP_ON[0] : LAMP_OFF[0]); im.setColorAt(hd.lamps[1], s === 'y' ? LAMP_ON[1] : LAMP_OFF[1]); im.setColorAt(hd.lamps[2], s === 'g' ? LAMP_ON[2] : LAMP_OFF[2]); }
  }
}

/* ---------- overhead direction signs on the main roads ---------- */
function gantryTex(rows){
  const c = makeCanvas(512, 160), g = c.getContext('2d'); g.fillStyle = '#0f6b3f'; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = 'rgba(244,234,214,.8)'; g.lineWidth = 4; g.strokeRect(6, 6, 500, 148);
  const h = 148 / rows.length; g.fillStyle = '#f4ead6'; g.textBaseline = 'middle';
  rows.forEach(([arrow, text], i) => { const y = 6 + h * (i + .5); g.textAlign = 'center'; g.font = `800 ${Math.min(46, h * .8)}px "Baloo Da 2", sans-serif`; g.fillText(arrow, 46, y); g.textAlign = 'left'; fitFill(g, text, 86, y, 410, 700, Math.min(40, h * .62), HS); });
  return texFrom(c);
}
function buildGantries(){
  for (const N of NET.juncs) {
    if (N.deg < 3) continue;
    for (const arm of N.arms) {
      const e = arm.e, pr = e.prof; if (pr.cls !== 'A4' && pr.cls !== 'A3') continue;
      const dirIn = arm.end === 'b' ? 1 : -1, s = stopLineS(e, dirIn) - dirIn * 46;
      if (s < e.trimA + 20 || s > e.len - e.trimB - 20) continue;
      if (e.rails.some(r => Math.abs(r.s - s) < 30) || e.foot.some(f => Math.abs(f - s) < 20)) continue;
      const inAng = Math.atan2(-arm.dz, -arm.dx);
      const rows = N.arms.filter(o => o !== arm).map(o => { const t = wrapA(o.ang - inAng); const far = o.end === 'a' ? o.e.b : o.e.a; return [t > .5 ? '→' : t < -.5 ? '←' : '↑', far.bn, t]; }).sort((p, q) => p[2] - q[2]).slice(0, 3).map(r => [r[0], r[1]]);
      const f = eFrame(e, s, dirIn * (pr.med + pr.nl * LW / 2)); const g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = f.h + (dirIn < 0 ? Math.PI : 0);
      const half = pr.nl * LW / 2 + 1;
      g.add(partsMesh([C('#8a8f90', .18, 8, -half, 4, 0), C('#8a8f90', .18, 8, half, 4, 0), B('#8a8f90', half * 2 + .4, .3, .3, 0, 7.9, 0)]));
      const bw = Math.min(half * 2 - .6, 11), bh = bw * 160 / 512;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), lam({ map: gantryTex(rows) })); board.position.set(0, 7.9 + bh / 2 - .3, -.2); board.rotation.y = Math.PI; g.add(board);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), lam({ color: 0x9aa0a0 })); back.position.set(0, 7.9 + bh / 2 - .3, -.18); g.add(back);
      scene.add(g);
      for (const sd of [1, -1]) e.res[sd].push([s - 4, s + 4]);
    }
  }
}
