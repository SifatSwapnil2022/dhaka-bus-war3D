/* =================================================================
   the city: landmarks at their real places, then ordinary Dhaka
   buildings in the style of each neighbourhood, then street furniture.
   ================================================================= */
const DSTYLE = {
  dense:      { h: [9, 30],  w: [6, 13],  d: [10, 18], gap: [.6, 2.2], sign: .95, balc: .6, glass: .05, tank: .6, tolet: .18, alley: .14, tree: .25, wall: 0,  set: [.4, 1.6], pal: 'warm',  second: .8 },
  market:     { h: [6, 20],  w: [6, 12],  d: [10, 16], gap: [.4, 1.4], sign: 1,   balc: .4, glass: .02, tank: .5, tolet: .1,  alley: .12, tree: .1,  wall: 0,  set: [.3, 1],   pal: 'warm',  second: .7 },
  commercial: { h: [14, 48], w: [10, 22], d: [12, 22], gap: [1, 4],    sign: .6,  balc: .2, glass: .45, tank: .3, tolet: .05, alley: .08, tree: .3,  wall: 0,  set: [.8, 3],   pal: 'cool',  second: .7 },
  modern:     { h: [18, 70], w: [14, 26], d: [14, 24], gap: [3, 8],    sign: .2,  balc: .2, glass: .75, tank: .1, tolet: 0,   alley: .05, tree: .7,  wall: .3, set: [3, 7],    pal: 'cool',  second: .6 },
  residential:{ h: [15, 30], w: [10, 16], d: [12, 18], gap: [2, 5],    sign: .15, balc: .9, glass: .1,  tank: .5, tolet: .25, alley: .06, tree: .85, wall: .8, set: [2.5, 5],  pal: 'pastel',second: .7 },
  planned:    { h: [15, 34], w: [10, 18], d: [12, 18], gap: [2, 5],    sign: .4,  balc: .7, glass: .25, tank: .4, tolet: .2,  alley: .05, tree: .6,  wall: .5, set: [2, 4.5],  pal: 'pastel',second: .6 },
  campus:     { h: [8, 16],  w: [16, 30], d: [12, 20], gap: [6, 14],   sign: .1,  balc: .1, glass: .05, tank: .2, tolet: 0,   alley: 0,   tree: 1,   wall: .9, set: [4, 9],    pal: 'brick', second: .3 },
  industrial: { h: [7, 14],  w: [18, 32], d: [16, 26], gap: [3, 8],    sign: .3,  balc: 0,  glass: 0,   tank: .2, tolet: 0,   alley: .1,  tree: .2,  wall: .7, set: [2, 5],    pal: 'grey',  second: .5, tin: .7 },
  open:       { h: [6, 14],  w: [8, 16],  d: [8, 14],  gap: [10, 30],  sign: .5,  balc: .2, glass: .05, tank: .3, tolet: .1,  alley: 0,   tree: .8,  wall: .3, set: [2, 6],    pal: 'warm',  second: .15 },
};
const PALS = {
  warm:   ['#d9cbb0', '#c9b79a', '#e3d6c2', '#d8b4a8', '#e6d3a3', '#bfae98', '#e0c9b6', '#c4a88c', '#d6c09a', '#cdb8c9'],
  cool:   ['#c7cfd6', '#b8c4b5', '#9fb1b8', '#d5d8d6', '#e7dccb', '#a9b3a0', '#c9ccc9'],
  pastel: ['#efe3cf', '#e8d6c0', '#d9e0d0', '#f0d9c4', '#e3e6e0', '#ead1c6', '#d8d1e2', '#f2e6c4'],
  brick:  ['#b06a4f', '#c2785c', '#a65e46', '#d8cfbd'],
  grey:   ['#9a9a96', '#8c9296', '#b0aea6', '#7f8a8c'],
};
const DIST = DISTRICTS.map(d => { const [x, z] = LL(d.ll[0], d.ll[1]); return Object.assign({ x, z }, d); });
function districtAt(x, z){ let b = DIST[0], bd = Infinity; for (const d of DIST) { const q = (d.x - x) ** 2 + (d.z - z) ** 2; if (q < bd) { bd = q; b = d; } } return b; }

/* ---------- landmarks ---------- */
const LM_PLACED = [];
function buildLandmarks(){
  MATS.signAtlas = lam({ map: signAtlas() });
  for (const sp of LANDMARKS) {
    sp.placed = false;
    const [x, z] = LL(sp.ll[0], sp.ll[1]); const ne = nearestEdge(x, z, 400) || (() => { let best = null; for (const e of NET.edges) { const p = edgeProjectFull(e, x, z); if (!best || p.d2 < best.d2) best = Object.assign({ e }, p); } return best; })();
    if (!ne) continue;
    const e = ne.e, pr = e.prof, sd = ne.lat >= 0 ? 1 : -1;
    const tries = [];
    for (const sc of [1, .86, .72, .6]) for (const o of [0, 8, -8, 16, -16, 26, -26, 38, -38, 52, -52]) tries.push([sc, o]);
    for (const [sc, o] of tries) {
      const w = sp.w * sc, d = sp.d * sc, h = sp.h;
      const minLat = pr.hw + SWALK + 1.2 + d / 2, latC = sd * clamp(Math.abs(ne.lat), minLat, minLat + (sp.far || 14));
      const s = clamp(ne.s + o, w / 2 + 2, e.len - w / 2 - 2);
      const f = eFrame(e, s, latC); const fp = { cx: f.x, cz: f.z, ax: f.ux, az: f.uz, hw: w / 2, hd: d / 2, kind: 'lm' };
      if (!fpFree(fp, .8)) continue;
      const g = new THREE.Group(); g.position.set(f.x, .02, f.z); g.rotation.y = Math.atan2(-f.lx * sd, -f.lz * sd);
      LM[sp.style](g, Object.assign({}, sp, { w, d, h }));
      shadowAll(g); scene.add(g); fpAdd(fp); sp.placed = true; sp.x = f.x; sp.z = f.z; sp.e = e; sp.s = s; sp.sd = sd;
      e.res[sd].push([s - w / 2 - 3, s + w / 2 + 3]); LM_PLACED.push(sp);
      break;
    }
  }
}

/* ---------- generic buildings, batched per 256 m tile ---------- */
const TILES = new Map();
function tileOf(x, z){ const k = Math.floor(x / 320) + ':' + Math.floor(z / 320); let t = TILES.get(k); if (!t) TILES.set(k, t = { W: { P: [], N: [], U: [], C: [], I: [], v: 0 }, G: { P: [], N: [], U: [], C: [], I: [], v: 0 }, S: { P: [], N: [], U: [], I: [], v: 0 }, tanks: [], boards: [], tolets: [] }); return t; }
const _tA = new THREE.Vector3(), _tB = new THREE.Vector3(), _tN = new THREE.Vector3();
function bQuad(T, p, n, uv, col){
  _tA.set(p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]); _tB.set(p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]); _tN.crossVectors(_tA, _tB);
  let order = [0, 1, 2, 3], uvo = uv;
  if (_tN.x * n[0] + _tN.y * n[1] + _tN.z * n[2] < 0) { order = [0, 3, 2, 1]; uvo = [uv[0], uv[1], uv[6], uv[7], uv[4], uv[5], uv[2], uv[3]]; }
  for (const k of order) T.P.push(p[k][0], p[k][1], p[k][2]);
  for (let k = 0; k < 4; k++) { T.N.push(n[0], n[1], n[2]); if (T.C) T.C.push(col.r, col.g, col.b); }
  T.U.push(...uvo); T.I.push(T.v, T.v + 1, T.v + 2, T.v, T.v + 2, T.v + 3); T.v += 4;
}
const FLAT_UV = [.02, .02, .02, .02, .02, .02, .02, .02];
function oBox(T, cx, cz, y0, y1, ax, az, hw, hd, col, uvU, top, tex = 12.8){
  const nx = az, nz = -ax;
  const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + ax * a * hw + nx * b * hd, cz + az * a * hw + nz * b * hd]);
  for (let k = 0; k < 4; k++) {
    const A = cs[k], Bq = cs[(k + 1) % 4]; const len = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]);
    const mx = (A[0] + Bq[0]) / 2 - cx, mz = (A[1] + Bq[1]) / 2 - cz, ml = Math.hypot(mx, mz) || 1;
    const u0 = uvU || 0, uv = uvU != null ? [u0, y0 / tex, u0 + len / tex, y0 / tex, u0 + len / tex, y1 / tex, u0, y1 / tex] : FLAT_UV;
    bQuad(T, [[A[0], y0, A[1]], [Bq[0], y0, Bq[1]], [Bq[0], y1, Bq[1]], [A[0], y1, A[1]]], [mx / ml, 0, mz / ml], uv, col);
  }
  if (top) bQuad(T, [[cs[0][0], y1, cs[0][1]], [cs[1][0], y1, cs[1][1]], [cs[2][0], y1, cs[2][1]], [cs[3][0], y1, cs[3][1]]], [0, 1, 0], FLAT_UV, top);
}
function signQuad(T, x, z, rx, rz, w, nx, nz, cell, y0 = 3.05, y1 = 4.45){
  const cu = (cell % 4) / 4, cv = 1 - (Math.floor(cell / 4) + 1) / 4;
  const L0 = [x - rx * w / 2, z - rz * w / 2], R0 = [x + rx * w / 2, z + rz * w / 2];
  T.P.push(L0[0], y0, L0[1], R0[0], y0, R0[1], R0[0], y1, R0[1], L0[0], y1, L0[1]);
  for (let k = 0; k < 4; k++) T.N.push(nx, 0, nz);
  T.U.push(cu, cv, cu + .25, cv, cu + .25, cv + .25, cu, cv + .25);
  const ex = R0[0] - L0[0], ez = R0[1] - L0[1];
  if (-ez * nx + ex * nz >= 0) T.I.push(T.v, T.v + 1, T.v + 2, T.v, T.v + 2, T.v + 3); else T.I.push(T.v, T.v + 2, T.v + 1, T.v, T.v + 3, T.v + 2);
  T.v += 4;
}
const _shutter = new THREE.Color('#3a332d');
function placeBuilding(rnd, st, cx, cz, ax, az, w, d, h, fnx, fnz, front, glassy){
  const T = tileOf(cx, cz), pal = PALS[st.pal];
  const col = new THREE.Color(pal[Math.floor(rnd() * pal.length)]).multiplyScalar(.82 + rnd() * .2);
  const roof = st.tin && rnd() < st.tin ? new THREE.Color('#6d7c86') : col.clone().multiplyScalar(.6);
  if (glassy) { oBox(T.G, cx, cz, 0, h, ax, az, w / 2, d / 2, new THREE.Color(1, 1, 1).multiplyScalar(.85 + rnd() * .15), 0, null, 6); const nx = az, nz = -ax, cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b2]) => [cx + ax * a * w / 2 + nx * b2 * d / 2, h, cz + az * a * w / 2 + nz * b2 * d / 2]); bQuad(T.W, cs, [0, 1, 0], FLAT_UV, new THREE.Color('#8f9696').multiplyScalar(.8 + rnd() * .2)); }
  else oBox(T.W, cx, cz, 0, h, ax, az, w / 2, d / 2, col, Math.floor(rnd() * 4) * .25, roof);
  if (!front) return;
  const fcx = cx + fnx * d / 2, fcz = cz + fnz * d / 2;
  if (!glassy && rnd() < st.sign) {
    oBox(T.W, fcx + fnx * .05, fcz + fnz * .05, .3, 3, ax, az, Math.min(w / 2 - .4, 4.5), .05, _shutter, null, null);
    signQuad(T.S, fcx + fnx * .12, fcz + fnz * .12, -fnz, fnx, Math.min(w - .8, 9), fnx, fnz, Math.floor(rnd() * 16));
  }
  if (!glassy && rnd() < st.balc) { const bc = col.clone().multiplyScalar(.8); for (let y = 6.4; y < h - 1; y += 3.2) oBox(T.W, fcx + fnx * .45, fcz + fnz * .45, y - .15, y + 1, ax, az, w * .36, .45, bc, null, bc); }
  if (rnd() < st.tank) { const tc = new THREE.Color(rnd() < .7 ? '#1f1f22' : '#8a8780'); oBox(T.W, cx + (rnd() - .5) * w * .4, cz + (rnd() - .5) * d * .4, h, h + 1.6, ax, az, .8, .8, tc, null, tc); }
  if (Game.hq && rnd() < st.tolet && h > 12) T.tolets.push({ x: fcx + fnx * .1, z: fcz + fnz * .1, y: 6 + Math.floor(rnd() * 2) * 3.2 + 1.6, n: [fnx, fnz], off: (rnd() - .5) * w * .5, ax, az });
  if (rnd() < .06 && h < 34) T.boards.push({ cx, cz, y: h, fnx, fnz, w: Math.min(w, 11), ad: Math.floor(rnd() * 6) });
}
function buildCity(hq){
  const rnd = mulberry32(77);
  const alleys = new Batch(), walls = { P: [], N: [], U: [], C: [], I: [], v: 0 };
  for (const e of NET.edges) {
    const pr = e.prof;
    for (const sd of [1, -1]) {
      let s = e.trimA + 3 + rnd() * 4;
      while (s < e.len - e.trimB - 5) {
        const [px, pz] = eAt(e, s, sd * (pr.hw + SWALK + 6)); const D = districtAt(px, pz), st = DSTYLE[D.style];
        const w = st.w[0] + rnd() * (st.w[1] - st.w[0]), gap = st.gap[0] + rnd() * (st.gap[1] - st.gap[0]);
        const sc = s + w / 2; if (sc + w / 2 > e.len - e.trimB - 2) break;
        const d = st.d[0] + rnd() * (st.d[1] - st.d[0]);
        const nearW = (e.stopsHere.some(q => Math.abs(q.s - sc) < 80) ? 1.3 : 1);
        const h = Math.max(4, (st.h[0] + Math.pow(rnd(), 1.3) * (st.h[1] - st.h[0])) * nearW);
        const set = st.set[0] + rnd() * (st.set[1] - st.set[0]);
        const f = eFrame(e, sc, sd * (pr.hw + SWALK + set + d / 2));
        const fp = { cx: f.x, cz: f.z, ax: f.ux, az: f.uz, hw: w / 2, hd: d / 2 };
        if (fpFree(fp, .25)) {
          fpAdd(fp);
          const fnx = -f.lx * sd, fnz = -f.lz * sd;
          placeBuilding(rnd, st, f.x, f.z, f.ux, f.uz, w, d, h, fnx, fnz, true, rnd() < st.glass);
          if (rnd() < st.wall && set > 1.6) { const [wx, wz] = eAt(e, sc, sd * (pr.hw + SWALK + .35)); const wc = new THREE.Color('#d8cfbd').multiplyScalar(.8 + rnd() * .15); const gw = Math.min(1.6, w / 2 - 1.2); if (gw > .3) { oBox(walls, wx + f.ux * (w / 2 + gw) / 2, wz + f.uz * (w / 2 + gw) / 2, 0, 2.1, f.ux, f.uz, (w / 2 - gw) / 2, .12, wc, null, wc); oBox(walls, wx - f.ux * (w / 2 + gw) / 2, wz - f.uz * (w / 2 + gw) / 2, 0, 2.1, f.ux, f.uz, (w / 2 - gw) / 2, .12, wc, null, wc); } }
          // a taller row behind, so the street feels like a city, not a film set
          if (hq && rnd() < st.second) {
            const d2 = st.d[0] + rnd() * (st.d[1] - st.d[0]), w2 = w * (.8 + rnd() * .5), h2 = h * (1 + rnd() * .6) + 3;
            const f2 = eFrame(e, sc + (rnd() - .5) * 3, sd * (pr.hw + SWALK + set + d + 3 + rnd() * 6 + d2 / 2));
            const fp2 = { cx: f2.x, cz: f2.z, ax: f2.ux, az: f2.uz, hw: w2 / 2, hd: d2 / 2 };
            if (fpFree(fp2, 2)) { fpAdd(fp2); placeBuilding(rnd, st, f2.x, f2.z, f2.ux, f2.uz, w2, d2, h2, fnx, fnz, false, rnd() < st.glass * 1.2); }
          }
        }
        s += w + gap;
        // now and then a narrow lane (goli) runs off between the buildings
        if (rnd() < st.alley) {
          const aw = 3.6 + rnd() * 1.6; const s0 = s + .2, s1 = s0 + aw;
          if (s1 < e.len - e.trimB - 4 && !e.res[sd].some(([a, b]) => s1 > a && s0 < b)) {
            const [x0, z0] = eAt(e, (s0 + s1) / 2, sd * (pr.hw + SWALK)), f3 = eFrame(e, (s0 + s1) / 2, 0); const ox = f3.lx * sd, oz = f3.lz * sd;
            const L = 22; const ax2 = f3.ux, az2 = f3.uz;
            alleys.quad([x0 - ax2 * aw / 2, .05, z0 - az2 * aw / 2, 0, 0], [x0 + ax2 * aw / 2, .05, z0 + az2 * aw / 2, 1, 0], [x0 + ax2 * aw / 2 + ox * L, .05, z0 + az2 * aw / 2 + oz * L, 1, L / 4], [x0 - ax2 * aw / 2 + ox * L, .05, z0 - az2 * aw / 2 + oz * L, 0, L / 4]);
            fpAdd({ cx: x0 + ox * L / 2, cz: z0 + oz * L / 2, ax: ax2, az: az2, hw: aw / 2, hd: L / 2, kind: 'alley' });
            s = s1 + .2;
          }
        }
      }
    }
  }
  // the rest of each block: plain massing so there is no empty desert behind the street
  if (hq) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const n of NET.nodes) { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); z0 = Math.min(z0, n.z); z1 = Math.max(z1, n.z); }
    for (let x = x0 - 200; x < x1 + 200; x += 23) for (let z = z0 - 200; z < z1 + 200; z += 23) {
      const cx = x + (rnd() - .5) * 6, cz = z + (rnd() - .5) * 6;
      const nc = nearestCoarse(cx, cz); if (!nc || nc.d > 320) continue; const dd = nc.d - nc.e.prof.hw; if (dd < 30) continue;
      const D = districtAt(cx, cz), st = DSTYLE[D.style]; if (D.style === 'open' && rnd() < .6) continue;
      const w = 13 + rnd() * 9, d = 12 + rnd() * 8, h = (st.h[0] + rnd() * (st.h[1] - st.h[0])) * (dd > 90 ? .8 : 1.1);
      const ang = Math.atan2(nc.e.DX[nc.k], nc.e.DZ[nc.k]);
      const fp = { cx, cz, ax: Math.sin(ang), az: Math.cos(ang), hw: w / 2, hd: d / 2 };
      if (!fpFree(fp, 1.5)) continue; fpAdd(fp);
      placeBuilding(rnd, st, cx, cz, fp.ax, fp.az, w, d, h, 0, 0, false, rnd() < st.glass * .6);
    }
  }
  const atlas = windowAtlas(), glassT = glassTexC();
  const mk = (T, mat, color) => { if (!T.v) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(T.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(T.N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(T.U, 2)); if (color) g.setAttribute('color', new THREE.Float32BufferAttribute(T.C, 3)); g.setIndex(T.I); g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  const wallM = lam({ map: atlas, vertexColors: true }), glassM = lam({ map: glassT, vertexColors: true });
  const tanks = [], tolets = [], boards = [];
  for (const [, T] of TILES) { mk(T.W, wallM, true); mk(T.G, glassM, true); mk(T.S, MATS.signAtlas, false); tanks.push(...T.tanks); tolets.push(...T.tolets); boards.push(...T.boards); }
  mk(walls, lam({ vertexColors: true }), true);
  alleys.mesh(lam({ color: 0x6a5d4f }));
  const tg = new THREE.CylinderGeometry(.9, .9, 1.6, 10); tg.translate(0, .8, 0);
  if (tanks.length) tiledInstances(tg, lam({ color: 0x1f1f22 }), tanks.map(t => [t[0], t[2], t[1]]), (im, i, t, m4) => { m4.makeTranslation(t[0], t[2], t[1]); im.setMatrixAt(i, m4); }, true);
  const tlM = lam({ map: toLetTex(), side: THREE.DoubleSide }), tlG = new THREE.PlaneGeometry(1.1, .82); const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  if (tolets.length) tiledInstances(tlG, tlM, tolets.map(t => [t.x, t.z, t]), (im, i, it, m4) => { const t = it[2]; q.setFromAxisAngle(up, Math.atan2(t.n[0], t.n[1])); ps.set(t.x + t.ax * t.off, t.y, t.z + t.az * t.off); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); });
  for (const b of boards) { const grp = new THREE.Group(); grp.position.set(b.cx, b.y, b.cz); grp.rotation.y = Math.atan2(b.fnx, b.fnz); grp.add(partsMesh([B('#4a4a4a', .2, 3, .2, -b.w / 2 + .5, 1.5, 0), B('#4a4a4a', .2, 3, .2, b.w / 2 - .5, 1.5, 0), B('#3a3a3a', b.w, .2, .2, 0, 2.7, -.1)])); const ad = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.w * .22), lam({ map: adTex(b.ad) })); ad.position.set(0, 2.7 + b.w * .11, .05); grp.add(ad); scene.add(grp); }
}

/* ---------- poles, wires, lamps, trees, median plants ---------- */
function reserved(e, sd, s, pad = 0){ return e.res[sd].some(([a, b]) => s > a - pad && s < b + pad); }
function buildStreetFurniture(hq){
  const poles = [], wires = [], lampParts = [], bushes = [], trunks = [];
  const flameC = new THREE.Color('#d8462a'), greenA = new THREE.Color('#3f6b2f'), greenB = new THREE.Color('#567f38'), greenC = new THREE.Color('#6e8f3a');
  const r = mulberry32(12), m4 = new THREE.Matrix4();
  for (const e of NET.edges) {
    const pr = e.prof, a = e.trimA + 4, b = e.len - e.trimB - 4;
    for (const sd of [1, -1]) {
      // electric poles with the famous tangle of wires (not on the big avenues)
      if (pr.cls !== 'A4' && pr.cls !== 'D2') {
        const mine = [];
        for (let s = a + 4; s < b; s += 30 + r() * 8) { if (reserved(e, sd, s, 3)) continue; const [x, z] = eAt(e, s, sd * (pr.hw + .9)); poles.push([x, z]); mine.push([x, z, s]); }
        for (let i = 0; i + 1 < mine.length; i++) {
          const A = mine[i], Bq = mine[i + 1]; if (Bq[2] - A[2] > 48) continue;
          const nW = 3 + (e.cond > .5 ? 3 : 0);
          for (let w = 0; w < nW; w++) {
            const y0 = 8.2 + w * .32, sag = .8 + w * .35 + ((i * 7 + w) % 3) * .3; let px = A[0], pz = A[1], py = y0;
            for (let q = 1; q <= 6; q++) { const t = q / 6; const x = A[0] + (Bq[0] - A[0]) * t, z = A[1] + (Bq[1] - A[1]) * t, y = y0 - Math.sin(Math.PI * t) * sag; wires.push(px, py, pz, x, y, z); px = x; py = y; pz = z; }
          }
        }
      }
      // trees along the outer edge of the sidewalk
      for (let s = a + 3; s < b; s += 11 + r() * 6) {
        const [x, z] = eAt(e, s, sd * (pr.hw + SWALK - 1.1)); const D = districtAt(x, z), st = DSTYLE[D.style];
        if (r() > st.tree * (pr.cls === 'A4' ? .7 : 1)) continue; if (reserved(e, sd, s, 4)) continue;
        if (underMetro(x, z)) continue;
        trunks.push([x, z, .8 + r() * .3, r() < .1 ? flameC : r() < .4 ? greenA : r() < .7 ? greenB : greenC]);
      }
    }
    // lamps and plants in the median
    if (pr.div && !e.metro) for (const [s0, s1] of e.medSpans) {
      for (let s = s0 + 6; s < s1 - 4; s += 32) { const f = eFrame(e, s, 0); lampParts.push(P(CYL6, '#9a968c', f.x, 4.9, f.z, 0, 0, 0, .12, 9.2, .12)); for (const sd of [1, -1]) { lampParts.push(P(BOXG, '#9a968c', f.x + f.lx * sd * 1.5, 9.4, f.z + f.lz * sd * 1.5, 0, f.h, 0, 3, .12, .12)); lampParts.push(P(BOXG, '#e9e5d6', f.x + f.lx * sd * 2.9, 9.3, f.z + f.lz * sd * 2.9, 0, f.h, 0, .7, .2, .35)); } }
      for (let s = s0 + 2; s < s1 - 1; s += 3.4) { const [x, z] = eAt(e, s, 0); bushes.push([x, z]); }
    }
  }
  if (poles.length) { const pg = new THREE.CylinderGeometry(.13, .19, 9.5, 6); pg.translate(0, 4.75, 0); tiledInstances(pg, lam({ color: 0x8a857c }), poles, (im, i, p, m4) => { m4.makeTranslation(p[0], CURB_H, p[1]); im.setMatrixAt(i, m4); }, true); }
  if (wires.length) { const WT = new Map(); for (let i = 0; i < wires.length; i += 6) { const k = Math.floor(wires[i] / BT) + ':' + Math.floor(wires[i + 2] / BT); let L = WT.get(k); if (!L) WT.set(k, L = []); for (let j = 0; j < 6; j++) L.push(wires[i + j]); } const wm = new THREE.LineBasicMaterial({ color: 0x1c1a19 }); for (const [, L] of WT) { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(L, 3)); wg.computeBoundingSphere(); scene.add(new THREE.LineSegments(wg, wm)); } }
  if (lampParts.length) { const LT = new Map(); for (const p of lampParts) { const e = p.m.elements; const k = Math.floor(e[12] / BT) + ':' + Math.floor(e[14] / BT); let L = LT.get(k); if (!L) LT.set(k, L = []); L.push(p); } for (const [, L] of LT) scene.add(partsMesh(L, false)); }
  if (bushes.length) tiledInstances(new THREE.IcosahedronGeometry(.62, 0), lam({ color: 0x4f7a34 }), bushes, (im, i, p, m4) => { m4.makeScale(1, .7 + (i % 3) * .15, 1); m4.setPosition(p[0], .8, p[1]); im.setMatrixAt(i, m4); });
  if (trunks.length) {
    // trunk and crown in one mesh: one draw call per area for all the trees
    const tg = new THREE.CylinderGeometry(.2, .26, 3, 6).toNonIndexed(); tg.translate(0, 1.5, 0);
    const cg0 = new THREE.IcosahedronGeometry(1.75, 1), cg = cg0.index ? cg0.toNonIndexed() : cg0; cg.translate(0, 4.4, 0);
    const tree = new THREE.BufferGeometry(), n1 = tg.attributes.position.count, n2 = cg.attributes.position.count;
    const pos = new Float32Array((n1 + n2) * 3), nor = new Float32Array((n1 + n2) * 3), col = new Float32Array((n1 + n2) * 3);
    pos.set(tg.attributes.position.array, 0); pos.set(cg.attributes.position.array, n1 * 3); nor.set(tg.attributes.normal.array, 0); nor.set(cg.attributes.normal.array, n1 * 3);
    for (let i = 0; i < n1; i++) { col[i * 3] = .5; col[i * 3 + 1] = .36; col[i * 3 + 2] = .26; } for (let i = n1; i < n1 + n2; i++) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1; }
    tree.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tree.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); tree.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const light = c => c.clone().lerp(new THREE.Color(1, 1, 1), .25);
    tiledInstances(tree, lam({ vertexColors: true }), trunks, (im, i, t, m4) => { m4.makeScale(t[2], t[2], t[2]); m4.setPosition(t[0], CURB_H, t[1]); im.setMatrixAt(i, m4); im.setColorAt(i, light(t[3])); }, true);
  }
  buildDigProps();
}
function buildDigProps(){
  const sheet = (() => { const c = makeCanvas(256, 64), g = c.getContext('2d'); for (let x = 0; x < 256; x += 8) { g.fillStyle = (x / 8) % 2 ? '#2c64a8' : '#3a76bd'; g.fillRect(x, 0, 8, 64); } g.fillStyle = '#f4f1ea'; g.fillRect(0, 26, 256, 12); g.fillStyle = '#c8231c'; g.font = `700 11px ${HS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('উন্নয়ন কাজ চলছে', 128, 32); return texFrom(c, true); })();
  const sm = lam({ map: sheet, side: THREE.DoubleSide }); const parts = [];
  for (const e of NET.edges) for (const d of e.digs) {
    const L = d.s1 - d.s0, n = Math.ceil(L / 6);
    for (let k = 0; k < n; k++) { const s = d.s0 + (k + .5) * L / n; const f = eFrame(e, s, d.sd * (d.l0 + .1)); const m = new THREE.Mesh(new THREE.PlaneGeometry(L / n - .1, 2), sm); m.position.set(f.x, 1, f.z); m.rotation.y = f.h + Math.PI / 2; scene.add(m); }
    for (const s of [d.s0, d.s1]) { const f = eFrame(e, s, d.sd * (d.l0 + d.l1) / 2); const m = new THREE.Mesh(new THREE.PlaneGeometry(LW, 2), sm); m.position.set(f.x, 1, f.z); m.rotation.y = f.h; scene.add(m); }
    const mid = eFrame(e, (d.s0 + d.s1) / 2, d.sd * (d.l0 + d.l1) / 2);
    parts.push(P(SPHG, '#7a5c3d', mid.x + mid.ux * 6, .2, mid.z + mid.uz * 6, 0, 0, 0, 1.6, 1, 2.8));
    parts.push(B('#e7b416', 2, 1.4, 3.4, mid.x - mid.ux * 6, 1.1, mid.z - mid.uz * 6, mid.h), B('#2a2a2a', 2.1, .5, 3.6, mid.x - mid.ux * 6, .35, mid.z - mid.uz * 6, mid.h), B('#e7b416', .4, .4, 4, mid.x - mid.ux * 6 + mid.lx * .5, 2.4, mid.z - mid.uz * 6 + mid.lz * .5, mid.h, .5));
    const sg = signPlane('সাময়িক অসুবিধার জন্য দুঃখিত', 'Road works', 4.4, 1.2, '#f2b01e', '#2a1a08'); const sf = eFrame(e, d.s0 - 4 * Math.sign(1), d.sd * (d.l0 + d.l1) / 2); sg.position.set(sf.x, 1.6, sf.z); sg.rotation.y = sf.h + Math.PI; scene.add(sg);
  }
  if (parts.length) scene.add(partsMesh(parts));
}

/* ---------- pedestrians that live near the camera ---------- */
let peds = [], pedBody, pedHead;
function buildPeds(n){
  const bodyG = new THREE.CylinderGeometry(.24, .3, 1.25, 7); bodyG.translate(0, .62, 0);
  const headG = new THREE.SphereGeometry(.2, 8, 6); headG.translate(0, 1.42, 0);
  pedBody = new THREE.InstancedMesh(bodyG, lam({ color: 0xffffff }), n); pedHead = new THREE.InstancedMesh(headG, lam({ color: 0x5a3a26 }), n);
  const cloth = ['#f4f1ea', '#2f5fa7', '#c22f4a', '#e7a21b', '#0f8a6c', '#7b3fa0', '#d9d2c3', '#3d3d3d', '#e06a2b', '#a3c4e0'], col = new THREE.Color(), rp = mulberry32(21);
  for (let i = 0; i < n; i++) { peds.push({ e: null, sd: 1, s: 0, v: .9 + rp() * .7, dir: rp() < .5 ? 1 : -1, lane: rp() * .9, ph: rp() * 6 }); col.set(cloth[Math.floor(rp() * cloth.length)]); pedBody.setColorAt(i, col); }
  if (pedBody.instanceColor) pedBody.instanceColor.needsUpdate = true;
  pedBody.frustumCulled = pedHead.frustumCulled = false; scene.add(pedBody, pedHead);
}
const pedM4 = new THREE.Matrix4();
function respawnPed(p, cx, cz){
  for (let k = 0; k < 8; k++) {
    const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 180; const ne = nearestEdge(cx + Math.cos(a) * d, cz + Math.sin(a) * d, 50); if (!ne) continue;
    const e = ne.e; const s = e.trimA + 2 + Math.random() * Math.max(1, e.len - e.trimA - e.trimB - 4);
    p.e = e; p.sd = Math.random() < .5 ? 1 : -1; p.s = s; return;
  }
}
function updatePeds(dt, cx, cz){
  for (let i = 0; i < peds.length; i++) {
    const p = peds[i];
    if (!p.e) respawnPed(p, cx, cz);
    if (!p.e) { pedM4.makeScale(0, 0, 0); pedBody.setMatrixAt(i, pedM4); pedHead.setMatrixAt(i, pedM4); continue; }
    p.s += p.dir * p.v * dt; const e = p.e;
    if (p.s < e.trimA + .5 || p.s > e.len - e.trimB - .5) { p.dir = -p.dir; p.s = clamp(p.s, e.trimA + .5, e.len - e.trimB - .5); }
    const [x, z] = eAt(e, p.s, p.sd * (e.prof.hw + 1.4 + p.lane * 2.4));
    if (Math.abs(x - cx) + Math.abs(z - cz) > 300) { p.e = null; pedM4.makeScale(0, 0, 0); }
    else { pedM4.makeScale(1, 1, 1); pedM4.setPosition(x, CURB_H + Math.abs(Math.sin(performance.now() / 160 + p.ph)) * .06, z); }
    pedBody.setMatrixAt(i, pedM4); pedHead.setMatrixAt(i, pedM4);
  }
  pedBody.instanceMatrix.needsUpdate = true; pedHead.instanceMatrix.needsUpdate = true;
}

/* ---------- sky, light, ground ---------- */
let sun;
function buildSky(){
  scene.background = skyTex();
  scene.fog = new THREE.Fog(0xcfa47b, 160, 640);
  scene.add(new THREE.HemisphereLight(0xc3cad6, 0x6a5444, .78));
  sun = new THREE.DirectionalLight(0xffd6a6, .8); sun.position.set(-120, 160, -60);
  sun.castShadow = true; sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 10; sc.far = 420; sun.shadow.bias = -.0006;
  scene.add(sun, sun.target);
  const sunC = makeCanvas(128, 128), sg = sunC.getContext('2d'); const sgr = sg.createRadialGradient(64, 64, 4, 64, 64, 64); sgr.addColorStop(0, 'rgba(255,236,200,1)'); sgr.addColorStop(.18, 'rgba(255,214,160,.9)'); sgr.addColorStop(1, 'rgba(255,190,130,0)'); sg.fillStyle = sgr; sg.fillRect(0, 0, 128, 128);
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFrom(sunC), fog: false, depthWrite: false, transparent: true })); sunSpr.scale.set(170, 170, 1); scene.add(sunSpr); MATS.sunSpr = sunSpr;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const n of NET.nodes) { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); z0 = Math.min(z0, n.z); z1 = Math.max(z1, n.z); }
  const W = x1 - x0 + 1600, H = z1 - z0 + 1600; const gt = groundTex(); gt.repeat.set(W / 24, H / 24);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), lam({ map: gt, color: 0x9a9486 })); ground.rotation.x = -Math.PI / 2; ground.position.set((x0 + x1) / 2, -.06, (z0 + z1) / 2); ground.receiveShadow = true; scene.add(ground);
}
