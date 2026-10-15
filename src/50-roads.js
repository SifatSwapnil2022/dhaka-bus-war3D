/* =================================================================
   road surfaces. Geometry is batched per material so the whole street
   network is a handful of draw calls.
   ================================================================= */
const BT = 320; // tile size for batched geometry, so the camera only draws what is near
class SubBatch {
  constructor(){ this.pos = []; this.uv = []; this.idx = []; this.vi = 0; this.x0 = 1e9; this.x1 = -1e9; this.z0 = 1e9; this.z1 = -1e9; }
  add(p){ this.pos.push(p[0], p[1], p[2]); this.uv.push(p[3], p[4]); if (p[0] < this.x0) this.x0 = p[0]; if (p[0] > this.x1) this.x1 = p[0]; if (p[2] < this.z0) this.z0 = p[2]; if (p[2] > this.z1) this.z1 = p[2]; }
}
class Batch {
  constructor(){ this.T = new Map(); this.vi = 0; }
  sub(x, z){ const k = Math.floor(x / BT) + ':' + Math.floor(z / BT); let b = this.T.get(k); if (!b) this.T.set(k, b = new SubBatch()); return b; }
  strip(rows){ // pairs of [x,y,z,u,v] along a strip; long strips are cut into tile-sized pieces
    const CH = 24;
    for (let a = 0; a < rows.length - 1; a += CH) {
      const end = Math.min(rows.length - 1, a + CH), mid = rows[(a + end) >> 1][0], B = this.sub(mid[0], mid[2]);
      for (let k = a; k <= end; k++) { for (const p of rows[k]) B.add(p); if (k > a) { const v = B.vi - 2; B.idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); } B.vi += 2; }
    }
    this.vi += rows.length * 2;
  }
  tri(a, b, c){ const B = this.sub(a[0], a[2]); for (const p of [a, b, c]) B.add(p); B.idx.push(B.vi, B.vi + 1, B.vi + 2); B.vi += 3; this.vi += 3; }
  quad(a, b, c, d){ const B = this.sub(a[0], a[2]); for (const p of [a, b, c, d]) B.add(p); const v = B.vi; B.idx.push(v, v + 1, v + 2, v, v + 2, v + 3); B.vi += 4; this.vi += 4; }
  mesh(mat, shadow){
    let first = null;
    for (const [, b] of this.T) {
      if (!b.vi) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); g.setIndex(b.idx); g.computeVertexNormals(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = shadow !== false; scene.add(m); if (!first) first = m;
    }
    return first;
  }
}
/* instanced objects grouped per tile, each tile culled on its own */
function tiledInstances(geo, mat, items, place, cast){
  const T = new Map();
  const IT = 640; for (const it of items) { const k = Math.floor(it[0] / IT) + ':' + Math.floor(it[1] / IT); let L = T.get(k); if (!L) T.set(k, L = []); L.push(it); }
  const out = []; const m4 = new THREE.Matrix4();
  if (!geo.boundingSphere) geo.computeBoundingSphere(); const rg = geo.boundingSphere.radius + geo.boundingSphere.center.length();
  for (const [, L] of T) {
    const g = geo.clone(); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const it of L) { x0 = Math.min(x0, it[0]); x1 = Math.max(x1, it[0]); z0 = Math.min(z0, it[1]); z1 = Math.max(z1, it[1]); }
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, 4, (z0 + z1) / 2), Math.hypot(x1 - x0, z1 - z0) / 2 + rg * 3 + 12);
    const im = new THREE.InstancedMesh(g, mat, L.length);
    L.forEach((it, i) => place(im, i, it, m4)); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = !!cast; im.receiveShadow = true; scene.add(im); out.push(im);
  }
  return out;
}
/* a ribbon along an edge between two lateral offsets; normals face the side that sees it */
function edgeRibbon(B, e, s0, s1, latA, latB, yA, yB, vScale, uA = 0, uB = 1, step = 2){
  if (s1 - s0 < .2) return;
  if (yA === yB && latA < latB) { let t = latA; latA = latB; latB = t; t = uA; uA = uB; uB = t; }
  const n = Math.max(1, Math.ceil((s1 - s0) / step)), rows = [];
  for (let k = 0; k <= n; k++) { const s = s0 + (s1 - s0) * k / n; const [ax, az] = eAt(e, s, latA), [bx, bz] = eAt(e, s, latB); const v = s / vScale; rows.push([[ax, yA, az, uA, v], [bx, yB, bz, uB, v]]); }
  B.strip(rows);
}

/* ---------- textures for the carriageway: lanes, wear and cracks ---------- */
function laneTex(nl, div, worn, seed){
  const r = mulberry32(seed); const W = 128 * Math.max(1, nl), H = 512;
  const c = makeCanvas(Math.min(512, W), H), g = c.getContext('2d'); const w = c.width;
  g.fillStyle = '#403f42'; g.fillRect(0, 0, w, H);
  for (let i = 0; i < 1800 * nl; i++) { const v = 44 + r() * 30 | 0; g.fillStyle = `rgba(${v},${v},${v + 3},.5)`; g.fillRect(r() * w, r() * H, 2, 2); }
  for (let i = 0; i < 4 + worn * 10; i++) { g.fillStyle = `rgba(${r() < .5 ? '76,74,70' : '32,31,33'},${.35 + r() * .3})`; g.fillRect(r() * w, r() * H, 20 + r() * 50, 18 + r() * 70); }
  // tyre polish in each lane
  for (let i = 0; i < nl; i++) for (const o of [.3, .7]) { g.fillStyle = 'rgba(25,25,28,.18)'; g.fillRect((i + o) * w / nl - 6, 0, 12, H); }
  // cracks
  g.strokeStyle = 'rgba(18,18,20,.7)'; g.lineWidth = 1.4;
  for (let i = 0; i < worn * 22; i++) { let x = r() * w, y = r() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * 26; y += (r() - .2) * 22; g.lineTo(x, y); } g.stroke(); }
  const line = (x, y0, y1, col, wd) => { if (r() < worn * .55) { const cut = y0 + r() * (y1 - y0); g.fillStyle = col; g.fillRect(x - wd / 2, y0, wd, Math.max(0, cut - y0 - 20)); return; } g.fillStyle = col; g.fillRect(x - wd / 2, y0, wd, y1 - y0); };
  const a = .74 - worn * .3;
  if (div) line(5, 0, H, `rgba(232,190,40,${a})`, 4); else { for (const y of [20, 276]) line(3, y, y + 200, `rgba(232,226,210,${a})`, 4); }
  line(w - 6, 0, H, `rgba(232,226,210,${a})`, 4);
  for (let i = 1; i < nl; i++) { const x = i * w / nl; line(x, 40, 220, `rgba(232,226,210,${a - .1})`, 4); line(x, 296, 476, `rgba(232,226,210,${a - .1})`, 4); }
  return texFrom(c, true);
}
const LANE_TEX = {};
function laneMat(e){
  const wv = e.cond > .62 ? 2 : e.cond > .32 ? 1 : 0, key = e.prof.nl + (e.prof.div ? 'd' : 'u') + wv;
  if (!LANE_TEX[key]) LANE_TEX[key] = { mat: lam({ map: laneTex(e.prof.nl, e.prof.div, [.08, .45, .9][wv], hashStr(key)) }), batch: new Batch() };
  return LANE_TEX[key];
}

/* ---------- all road meshes ---------- */
const DECALS = { hole: new Batch(), patch: new Batch(), wet: new Batch(), dig: new Batch(), zebra: new Batch(), line: new Batch(), bay: new Batch(), edgeBreak: new Batch(), hump: new Batch() };
function decalQuad(B, x, z, ax, az, hw, hd, y, cell, cells){
  const nx = az, nz = -ax; const u0 = (cell % cells) / cells, u1 = u0 + 1 / cells;
  B.quad([x - ax * hw - nx * hd, y, z - az * hw - nz * hd, u0, 0], [x + ax * hw - nx * hd, y, z + az * hw - nz * hd, u1, 0], [x + ax * hw + nx * hd, y, z + az * hw + nz * hd, u1, 1], [x - ax * hw + nx * hd, y, z - az * hw + nz * hd, u0, 1]);
}
function buildRoads(){
  const pav = paverTex(); pav.repeat.set(1, 1);
  const SW = new Batch(), CURB = new Batch(), SWOUT = new Batch(), MED = new Batch(), MEDC = new Batch(), JN = new Batch();
  for (const e of NET.edges) {
    const pr = e.prof, a = e.trimA, b = e.len - e.trimB, LT = laneMat(e);
    // carriageway, one ribbon per direction so the lane texture reads correctly both ways
    edgeRibbon(LT.batch, e, a, b, pr.hw, pr.med * .999, .02, .02, 26, 1, 0);
    edgeRibbon(LT.batch, e, a, b, -pr.med * .999, -pr.hw, .02, .02, 26, 0, 1);
    if (pr.div) edgeRibbon(JN, e, a, b, pr.med, -pr.med, .019, .019, 8);
    for (const sd of [1, -1]) {
      edgeRibbon(SW, e, a, b, sd * (pr.hw + SWALK), sd * pr.hw, CURB_H, CURB_H, 4.6, 0, 1);
      edgeRibbon(CURB, e, a, b, sd * pr.hw, sd * pr.hw, CURB_H, 0, 2, 0, 1);
      edgeRibbon(SWOUT, e, a, b, sd * (pr.hw + SWALK), sd * (pr.hw + SWALK), 0, CURB_H, 2, 0, 1);
    }
    // dead ends get a sidewalk cap and a barrier
    for (const [N, s] of [[e.a, a], [e.b, b]]) if (N.dead) {
      const sgn = N === e.a ? -1 : 1; const s2 = s + sgn * SWALK;
      edgeRibbon(SW, e, Math.min(s, s2), Math.max(s, s2), pr.hw + SWALK, -pr.hw - SWALK, CURB_H, CURB_H, 4.6);
    }
    // medians with gaps for U-turns, junctions and the railway
    if (pr.div) {
      const cuts = [[0, a + 7], [b - 7, e.len]].concat(e.uturns.map(u => [u - 7, u + 7]), e.rails.map(r => [r.s - 6, r.s + 6])).sort((p, q) => p[0] - q[0]);
      let s = 0; const spans = [];
      for (const [c0, c1] of cuts) { if (c0 > s + .5) spans.push([s, c0]); s = Math.max(s, c1); }
      if (e.len > s + .5) spans.push([s, e.len]);
      e.medSpans = spans;
      for (const [s0, s1] of spans) {
        edgeRibbon(MED, e, s0, s1, pr.med, -pr.med, .34, .34, 3);
        edgeRibbon(MEDC, e, s0, s1, pr.med, pr.med, .34, 0, 2); edgeRibbon(MEDC, e, s0, s1, -pr.med, -pr.med, .34, 0, 2);
        for (const ss of [s0, s1]) { const [x0, z0] = eAt(e, ss, pr.med), [x1, z1] = eAt(e, ss, -pr.med); MEDC.quad([x0, 0, z0, 0, 0], [x1, 0, z1, 1, 0], [x1, .34, z1, 1, 1], [x0, .34, z0, 0, 1]); MEDC.quad([x1, 0, z1, 1, 0], [x0, 0, z0, 0, 0], [x0, .34, z0, 0, 1], [x1, .34, z1, 1, 1]); }
      }
    } else e.medSpans = [];
  }
  // junction boxes and their corner sidewalks
  for (const N of NET.juncs) {
    const P = N.poly; const ctr = [N.x, .021, N.z, N.x / 14, N.z / 14];
    for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; JN.tri(ctr, [q[0], .021, q[1], q[0] / 14, q[1] / 14], [p[0], .021, p[1], p[0] / 14, p[1] / 14]); }
    for (const f of N.fillets) {
      if (f.length < 2) continue;
      const rows = [], crow = [], orow = [];
      for (let k = 0; k < f.length; k++) {
        const pa = f[Math.max(0, k - 1)], pb = f[Math.min(f.length - 1, k + 1)]; let tx = pb[0] - pa[0], tz = pb[1] - pa[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        const ox = tz, oz = -tx; const p = f[k]; const q = [p[0] + ox * SWALK, p[1] + oz * SWALK];
        rows.push([[q[0], CURB_H, q[1], 1, k * .5], [p[0], CURB_H, p[1], 0, k * .5]]);
        crow.push([[p[0], 0, p[1], 0, k], [p[0], CURB_H, p[1], 1, k]]);
        orow.push([[q[0], CURB_H, q[1], 0, k], [q[0], 0, q[1], 1, k]]);
      }
      SW.strip(rows); CURB.strip(crow); SWOUT.strip(orow);
    }
  }
  const aspPlain = lam({ map: (() => { const t = laneTex(1, false, .3, 991); return t; })() });
  // the junction texture should have no lane lines: paint a clean one
  aspPlain.map = (() => { const c = makeCanvas(128, 128), g = c.getContext('2d'); g.fillStyle = '#403f42'; g.fillRect(0, 0, 128, 128); const r = mulberry32(3); for (let i = 0; i < 900; i++) { const v = 44 + r() * 30 | 0; g.fillStyle = `rgba(${v},${v},${v + 3},.5)`; g.fillRect(r() * 128, r() * 128, 2, 2); } for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(25,25,28,.1)'; g.fillRect(r() * 100, r() * 100, 20 + r() * 30, 20 + r() * 30); } return texFrom(c, true); })();
  for (const k in LANE_TEX) LANE_TEX[k].batch.mesh(LANE_TEX[k].mat);
  JN.mesh(aspPlain);
  SW.mesh(lam({ map: pav }), true);
  CURB.mesh(lam({ map: curbTex(), side: THREE.DoubleSide }));
  SWOUT.mesh(lam({ color: 0x6b6256, side: THREE.DoubleSide }));
  MED.mesh(lam({ map: grassTex() }), true);
  MEDC.mesh(lam({ map: curbTex(), side: THREE.DoubleSide }));
  buildMarkings();
}

/* zebra crossings and stop lines at every controlled junction */
function zebraTex(){ const c = makeCanvas(256, 16), g = c.getContext('2d'); g.clearRect(0, 0, 256, 16); g.fillStyle = 'rgba(236,232,220,.85)'; for (let x = 6; x < 256; x += 22) g.fillRect(x, 0, 12, 16); return texFrom(c, true); }
function buildMarkings(){
  for (const N of NET.juncs) {
    if (N.deg < 3) continue;
    for (const arm of N.arms) {
      const e = arm.e, pr = e.prof, dirIn = arm.end === 'b' ? 1 : -1; // direction of traffic arriving at N on this arm
      const sT = arm.end === 'a' ? e.trimA : e.len - e.trimB, sg = arm.end === 'a' ? 1 : -1;
      const z0 = sT + sg * .6, z1 = sT + sg * 4.2;
      const n = Math.max(1, Math.round(pr.hw * 2 / 1.7));
      edgeRibbonUV(DECALS.zebra, e, Math.min(z0, z1), Math.max(z0, z1), pr.hw, -pr.hw, .028, n);
      const sl = stopLineS(e, dirIn);
      edgeRibbon(DECALS.line, e, sl - .25, sl + .25, dirIn > 0 ? pr.hw : -pr.med, dirIn > 0 ? pr.med : -pr.hw, .029, .029, 1);
    }
  }
}
function edgeRibbonUV(B, e, s0, s1, latA, latB, y, uRep){
  const [ax0, az0] = eAt(e, s0, latA), [bx0, bz0] = eAt(e, s0, latB), [ax1, az1] = eAt(e, s1, latA), [bx1, bz1] = eAt(e, s1, latB);
  B.quad([ax0, y, az0, 0, 0], [bx0, y, bz0, uRep, 0], [bx1, y, bz1, uRep, 1], [ax1, y, az1, 0, 1]);
}

/* ---------- broken roads: potholes, patches, digging, waterlogging, humps ---------- */
function holeAtlas(){
  const c = makeCanvas(512, 128), g = c.getContext('2d'); g.clearRect(0, 0, 512, 128);
  const r = mulberry32(17);
  for (let k = 0; k < 4; k++) {
    const cx = k * 128 + 64, cy = 64; g.save(); g.beginPath();
    for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2, rr = 40 + r() * 18; g.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * .8); }
    g.closePath(); g.fillStyle = 'rgba(110,98,80,.95)'; g.fill(); g.clip();
    const gr = g.createRadialGradient(cx, cy, 4, cx, cy, 52); gr.addColorStop(0, 'rgba(28,24,20,.95)'); gr.addColorStop(.7, 'rgba(52,46,38,.85)'); gr.addColorStop(1, 'rgba(90,80,64,.6)'); g.fillStyle = gr; g.fillRect(cx - 64, 0, 128, 128);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${120 + r() * 60 | 0},${110 + r() * 50 | 0},${90 + r() * 40 | 0},.8)`; g.fillRect(cx - 50 + r() * 100, cy - 40 + r() * 80, 3 + r() * 5, 2 + r() * 4); }
    if (k % 2) { g.fillStyle = 'rgba(92,108,112,.75)'; g.beginPath(); g.ellipse(cx + 4, cy + 4, 26, 18, .3, 0, 7); g.fill(); g.fillStyle = 'rgba(200,215,220,.35)'; g.fillRect(cx - 10, cy - 4, 18, 3); }
    g.restore();
    g.strokeStyle = 'rgba(25,24,22,.8)'; g.lineWidth = 2; g.beginPath(); for (let a = 0; a < 7; a++) { const ang = r() * 7; g.moveTo(cx + Math.cos(ang) * 44, cy + Math.sin(ang) * 36); g.lineTo(cx + Math.cos(ang) * (60 + r() * 6), cy + Math.sin(ang) * (48 + r() * 8)); } g.stroke();
  }
  return texFrom(c);
}
function patchAtlas(){
  const c = makeCanvas(256, 128), g = c.getContext('2d'); g.clearRect(0, 0, 256, 128);
  const r = mulberry32(5);
  for (let k = 0; k < 2; k++) { const x = k * 128; g.fillStyle = k ? 'rgba(34,33,35,.92)' : 'rgba(92,90,86,.9)'; g.beginPath(); g.moveTo(x + 8 + r() * 6, 8); g.lineTo(x + 120 - r() * 6, 6 + r() * 6); g.lineTo(x + 122, 120 - r() * 8); g.lineTo(x + 6, 122); g.closePath(); g.fill(); for (let i = 0; i < 500; i++) { const v = (k ? 30 : 80) + r() * 30 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(x + 10 + r() * 108, 10 + r() * 108, 2, 2); } g.strokeStyle = 'rgba(20,20,20,.6)'; g.lineWidth = 2; g.strokeRect(x + 7, 7, 114, 114); }
  return texFrom(c);
}
function wetTex(){
  const c = makeCanvas(128, 256), g = c.getContext('2d'); const r = mulberry32(9);
  for (let i = 0; i < 30; i++) { const x = 16 + r() * 96, y = 16 + r() * 224, rr = 18 + r() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(84,96,92,.92)'); gr.addColorStop(1, 'rgba(84,96,92,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
  return texFrom(c);
}
function digTex(){
  const c = makeCanvas(128, 512), g = c.getContext('2d'); g.fillStyle = '#5e4a36'; g.fillRect(0, 0, 128, 512); const r = mulberry32(13);
  for (let i = 0; i < 900; i++) { const v = r() * 40 | 0; g.fillStyle = `rgba(${70 + v},${55 + v},${40 + v * .6 | 0},.8)`; g.fillRect(r() * 128, r() * 512, 3 + r() * 4, 3 + r() * 4); }
  g.fillStyle = '#2b2118'; g.fillRect(36, 0, 56, 512); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(36, 0, 8, 512);
  for (let y = 10; y < 512; y += 64) { g.fillStyle = '#7d7468'; g.beginPath(); g.ellipse(64, y + 20, 22, 9, 0, 0, 7); g.fill(); }
  return texFrom(c, true);
}
function humpTex(){ const c = makeCanvas(64, 16), g = c.getContext('2d'); for (let x = 0; x < 64; x += 16) { g.fillStyle = '#d8b21c'; g.fillRect(x, 0, 8, 16); g.fillStyle = '#2a2a2a'; g.fillRect(x + 8, 0, 8, 16); } g.globalAlpha = .45; g.fillStyle = '#5a5650'; for (let i = 0; i < 20; i++) g.fillRect(Math.random() * 64, Math.random() * 16, 6, 3); return texFrom(c, true); }
const STATIC_OBS = [];
function buildDamage(){
  for (const e of NET.edges) {
    const r = mulberry32(1000 + e.i * 7), pr = e.prof, a = e.trimA + 8, b = e.len - e.trimB - 8; if (b - a < 20) continue;
    const busy = (s, pad) => e.stopsHere.some(st => Math.abs(st.s - s) < STOP_ZONE + pad) || e.rails.some(rr => Math.abs(rr.s - s) < 14 + pad) || e.digs.some(d => s > d.s0 - pad && s < d.s1 + pad) || e.foot.some(f => Math.abs(f - s) < 8 + pad);
    // digging: one lane fenced off while a trench is dug along it
    if (e.cond > .5 && b - a > 150 && r() < .7) {
      const L = 32 + r() * 22, s0 = a + 30 + r() * (b - a - 60 - L), s1 = s0 + L;
      if (!busy(s0, 10) && !busy(s1, 10) && !busy((s0 + s1) / 2, 10)) {
        const sd = r() < .5 ? 1 : -1, l0 = pr.hw - LW, l1 = pr.hw; e.digs.push({ s0, s1, sd, l0, l1 });
      }
    }
    // potholes, some full of water
    const nh = Math.round(Math.pow(e.cond, 1.5) * (b - a) / 22);
    for (let i = 0; i < nh; i++) { const s = a + r() * (b - a); if (busy(s, 2)) continue; const lat = (r() < .5 ? 1 : -1) * (pr.med + .8 + r() * (pr.hw - pr.med - 1.6)); e.holes.push({ s, lat, r: .55 + r() * .75 * (.6 + e.cond * .6), cell: Math.floor(r() * 4) }); }
    // patches of fresh and old asphalt
    const np = Math.round(e.cond * (b - a) / 16);
    for (let i = 0; i < np; i++) { const s = a + r() * (b - a); const lat = (r() < .5 ? 1 : -1) * (pr.med + 1 + r() * (pr.hw - pr.med - 2)); const [x, z, ux, uz] = eAt(e, s, lat); decalQuad(DECALS.patch, x, z, ux, uz, 1 + r() * 2.4, .8 + r() * 1.4, .026, Math.floor(r() * 2), 2); }
    // waterlogging after rain on the worst roads
    if (e.cond > .62 && r() < .8) { const s = a + 20 + r() * Math.max(1, b - a - 40); if (!busy(s, 6)) { e.wet.push({ s, len: 14 + r() * 10 }); } }
    // speed breakers on the smaller roads
    if (pr.cls === 'B' || pr.cls === 'C') { const k = 1 + (r() < .5 ? 1 : 0); for (let i = 0; i < k; i++) { const s = a + 15 + r() * Math.max(1, b - a - 30); if (!busy(s, 6) && !e.wet.some(w => Math.abs(w.s - s) < w.len + 4)) e.humps.push({ s }); } }
    // a ragged, broken edge along the curb on bad roads
    if (e.cond > .55) for (const sd of [1, -1]) { let s = a; while (s < b) { const L = 6 + r() * 18; if (r() < .45 && !busy(s, 0)) edgeRibbon(DECALS.edgeBreak, e, s, Math.min(b, s + L), sd * pr.hw, sd * (pr.hw - .7 - r() * .8), .024, .024, 8, 0, 1); s += L + 6 + r() * 20; } }
    for (const h of e.holes) { const [x, z, ux, uz] = eAt(e, h.s, h.lat); decalQuad(DECALS.hole, x, z, ux, uz, h.r * 1.25, h.r, .03, h.cell, 4); }
    for (const w of e.wet) edgeRibbon(DECALS.wet, e, w.s - w.len / 2, w.s + w.len / 2, pr.hw - .3, -pr.hw + .3, .032, .032, w.len);
    for (const hm of e.humps) edgeRibbonUV(DECALS.hump, e, hm.s - .5, hm.s + .5, pr.hw, -pr.hw, .07, Math.round(pr.hw));
    for (const d of e.digs) {
      edgeRibbon(DECALS.dig, e, d.s0, d.s1, d.sd * d.l1, d.sd * d.l0, .034, .034, 20);
      // barricade boxes are obstacles for everyone
      const n = Math.ceil((d.s1 - d.s0) / 6);
      for (let k = 0; k < n; k++) { const s = d.s0 + (k + .5) * (d.s1 - d.s0) / n; const f = eFrame(e, s, d.sd * (d.l0 + .1)); STATIC_OBS.push({ x: f.x, z: f.z, h: f.h, hw: .18, hl: (d.s1 - d.s0) / n / 2, k: 'dig', e, s }); }
      for (const s of [d.s0, d.s1]) { const f = eFrame(e, s, d.sd * (d.l0 + d.l1) / 2); STATIC_OBS.push({ x: f.x, z: f.z, h: f.h + Math.PI / 2, hw: .18, hl: LW / 2, k: 'dig', e, s }); }
    }
  }
  const holeM = lam({ map: holeAtlas(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  DECALS.hole.mesh(holeM);
  DECALS.patch.mesh(lam({ map: patchAtlas(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  DECALS.wet.mesh(new THREE.MeshPhongMaterial({ map: wetTex(), transparent: true, depthWrite: false, shininess: 90, specular: 0x9fb4c0, polygonOffset: true, polygonOffsetFactor: -4 }));
  DECALS.dig.mesh(lam({ map: digTex(), polygonOffset: true, polygonOffsetFactor: -4 }));
  DECALS.zebra.mesh(lam({ map: zebraTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  DECALS.line.mesh(lam({ color: 0xe6dfcf, polygonOffset: true, polygonOffsetFactor: -2 }));
  DECALS.edgeBreak.mesh(lam({ map: (() => { const c = makeCanvas(64, 256), g = c.getContext('2d'); const r = mulberry32(2); g.clearRect(0, 0, 64, 256); g.fillStyle = 'rgba(92,82,68,.95)'; g.beginPath(); g.moveTo(0, 0); for (let y = 0; y <= 256; y += 8) g.lineTo(18 + r() * 40, y); g.lineTo(0, 256); g.closePath(); g.fill(); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${60 + r() * 30 | 0},${54 + r() * 24 | 0},${44 + r() * 20 | 0},.8)`; g.fillRect(r() * 40, r() * 256, 3, 3); } return texFrom(c, true); })(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  DECALS.hump.mesh(lam({ map: humpTex() }));
}
