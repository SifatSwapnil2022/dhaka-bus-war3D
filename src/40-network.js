/* =================================================================
   road network: edges are smoothed real roads, junctions are clean
   polygons where the roads meet. Everything that drives or gets
   placed asks this module where the road is.
   ================================================================= */
const NET = { nodes: [], edges: [], byId: {}, juncs: [] };
const GRID_CELL = 24;
const SEG_GRID = new Map(), JUNC_GRID = new Map();
const gkey = (cx, cz) => cx * 73856093 ^ cz * 19349663;
function gridAdd(G, x0, z0, x1, z1, item){
  const a = Math.floor(x0 / GRID_CELL), b = Math.floor(x1 / GRID_CELL), c = Math.floor(z0 / GRID_CELL), d = Math.floor(z1 / GRID_CELL);
  for (let i = a; i <= b; i++) for (let k = c; k <= d; k++) { const key = gkey(i, k); let L = G.get(key); if (!L) G.set(key, L = []); L.push(item); }
}
function gridAt(G, x, z){ return G.get(gkey(Math.floor(x / GRID_CELL), Math.floor(z / GRID_CELL))) || null; }

function edgeProfile(cls){ const C = ROAD_CLS[cls]; const med = C.div ? C.med : 0; return Object.assign({}, C, { cls, med, hw: med + C.nl * LW }); }

function buildNetwork(){
  for (const id in NODES) { const d = NODES[id]; const [x, z] = LL(d.ll[0], d.ll[1]); const n = { id, x, z, bn: d.bn, en: d.en, arms: [], i: NET.nodes.length }; NET.nodes.push(n); NET.byId[id] = n; }
  EDGES.forEach((def, i) => {
    const [a, b, cls, cond, shp, name] = def; const A = NET.byId[a], Bn = NET.byId[b];
    const pts = [new THREE.Vector3(A.x, 0, A.z), ...shp.map(ll => { const [x, z] = LL(ll[0], ll[1]); return new THREE.Vector3(x, 0, z); }), new THREE.Vector3(Bn.x, 0, Bn.z)];
    let sp, len;
    if (pts.length === 2) { len = pts[0].distanceTo(pts[1]); const n = Math.max(2, Math.ceil(len / 2)); sp = []; for (let k = 0; k <= n; k++) sp.push(pts[0].clone().lerp(pts[1], k / n)); }
    else { const cv = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); len = cv.getLength(); sp = cv.getSpacedPoints(Math.max(2, Math.ceil(len / 2))); }
    const n = sp.length, X = new Float32Array(n), Z = new Float32Array(n), DX = new Float32Array(n), DZ = new Float32Array(n);
    for (let k = 0; k < n; k++) { X[k] = sp[k].x; Z[k] = sp[k].z; }
    for (let k = 0; k < n; k++) { const p = Math.max(0, k - 1), q = Math.min(n - 1, k + 1); const dx = X[q] - X[p], dz = Z[q] - Z[p], l = Math.hypot(dx, dz) || 1; DX[k] = dx / l; DZ[k] = dz / l; }
    const e = { i, a: A, b: Bn, cls, prof: edgeProfile(cls), cond, name, n, X, Z, DX, DZ, len, ds: len / (n - 1), trimA: 0, trimB: 0, uturns: [], rails: [], digs: [], holes: [], wet: [], humps: [], metro: false, stopsHere: [], foot: [], res: { '1': [], '-1': [] } };
    NET.edges.push(e);
    A.arms.push({ e, end: 'a' }); Bn.arms.push({ e, end: 'b' });
  });
  for (const n of NET.nodes) n.deg = n.arms.length;
  buildJunctionShapes();
  for (const e of NET.edges) {
    const reach = e.prof.hw + SWALK + 2;
    for (let k = 0; k < e.n - 1; k++) {
      const x0 = Math.min(e.X[k], e.X[k + 1]) - reach, x1 = Math.max(e.X[k], e.X[k + 1]) + reach;
      const z0 = Math.min(e.Z[k], e.Z[k + 1]) - reach, z1 = Math.max(e.Z[k], e.Z[k + 1]) + reach;
      gridAdd(SEG_GRID, x0, z0, x1, z1, e.i * 4096 + k);
    }
    // U-turn gaps in the median, every ~220 m on long divided roads
    if (e.prof.div) { const a = e.trimA + 40, b = e.len - e.trimB - 40; if (b - a > 120) { const k = Math.max(1, Math.round((b - a) / 220)); for (let q = 1; q <= k; q++) e.uturns.push(a + (b - a) * q / (k + 1)); } }
  }
  for (const J of NET.juncs) gridAdd(JUNC_GRID, J.x - J.R - 2, J.z - J.R - 2, J.x + J.R + 2, J.z + J.R + 2, J);
}

/* point and frame along an edge; s is clamped to the edge */
function eAt(e, s, lat){
  s = clamp(s, 0, e.len); const f = s / e.ds; let i = Math.floor(f); if (i >= e.n - 1) i = e.n - 2; const u = f - i, j = i + 1;
  const x = e.X[i] + (e.X[j] - e.X[i]) * u, z = e.Z[i] + (e.Z[j] - e.Z[i]) * u;
  let ux = e.DX[i] + (e.DX[j] - e.DX[i]) * u, uz = e.DZ[i] + (e.DZ[j] - e.DZ[i]) * u; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
  return [x + uz * lat, z - ux * lat, ux, uz];
}
function eFrame(e, s, lat){ const [x, z, ux, uz] = eAt(e, s, lat); return { x, z, ux, uz, lx: uz, lz: -ux, h: Math.atan2(ux, uz) }; }
/* project onto one segment k of an edge */
function segProj(e, k, x, z){
  const ax = e.X[k], az = e.Z[k], bx = e.X[k + 1], bz = e.Z[k + 1];
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
  let t = ((x - ax) * vx + (z - az) * vz) / l2; const tc = clamp(t, 0, 1);
  const px = ax + vx * tc, pz = az + vz * tc, l = Math.sqrt(l2);
  const lat = ((x - ax) * vz - (z - az) * vx) / l;
  const s = (k + t) * e.ds;
  return { s, lat, d2: (x - px) ** 2 + (z - pz) ** 2, k };
}
/* the nearest edge to a point: { e, s, lat } or null */
function nearestEdge(x, z, maxD = 60){
  const L = gridAt(SEG_GRID, x, z); let best = null, bd = maxD * maxD;
  if (L) for (const code of L) { const e = NET.edges[code >> 12], k = code & 4095; const p = segProj(e, k, x, z); if (p.d2 < bd) { bd = p.d2; best = { e, s: p.s, lat: p.lat, k }; } }
  return best;
}
function edgeProjectFull(e, x, z){ let best = null; for (let k = 0; k < e.n - 1; k++) { const p = segProj(e, k, x, z); if (!best || p.d2 < best.d2) best = p; } return best; }

/* ---------- junction shapes ---------- */
function armDir(arm){
  const e = arm.e, k = Math.min(e.n - 1, Math.max(1, Math.round(10 / e.ds)));
  if (arm.end === 'a') { const dx = e.X[k] - e.X[0], dz = e.Z[k] - e.Z[0], l = Math.hypot(dx, dz); return [dx / l, dz / l]; }
  const dx = e.X[e.n - 1 - k] - e.X[e.n - 1], dz = e.Z[e.n - 1 - k] - e.Z[e.n - 1], l = Math.hypot(dx, dz); return [dx / l, dz / l];
}
function bezQ(p0, c, p1, n){ const out = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t; out.push([a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]]); } return out; }
function buildJunctionShapes(){
  for (const N of NET.nodes) {
    for (const arm of N.arms) { const [dx, dz] = armDir(arm); arm.dx = dx; arm.dz = dz; arm.ang = Math.atan2(dz, dx); arm.hw = arm.e.prof.hw; }
    N.arms.sort((p, q) => p.ang - q.ang);
    N.arms.forEach((a, i) => a.idx = i);
    const deg = N.arms.length;
    if (deg === 1) { N.dead = true; N.R = 0; continue; }
    const req = N.arms.map(() => 0), gaps = [];
    for (let i = 0; i < deg; i++) {
      const A = N.arms[i], Bm = N.arms[(i + 1) % deg];
      let gap = Bm.ang - A.ang; if (gap <= 0) gap += Math.PI * 2;
      const pA = [-A.dz, A.dx], qB = [Bm.dz, -Bm.dx];
      const g = { i, j: (i + 1) % deg, gap, X: null };
      if (gap < Math.PI - .12) {
        const det = -(A.dx * Bm.dz - A.dz * Bm.dx);
        if (Math.abs(det) > 1e-4) {
          const solve = (ha, hb) => { const rx = qB[0] * hb - pA[0] * ha, rz = qB[1] * hb - pA[1] * ha; return [(rx * (-Bm.dz) - rz * (-Bm.dx)) / det, (A.dx * rz - A.dz * rx) / det]; };
          // trims come from the outer sidewalk edges, so neighbouring sidewalks never overlap
          const [to, uo] = solve(A.hw + SWALK, Bm.hw + SWALK), [t, u] = solve(A.hw, Bm.hw);
          const fil = clamp(3 + (Math.PI / 2 - Math.min(gap, Math.PI / 2)) * 3, 3, 7);
          req[i] = Math.max(req[i], to + fil, t + fil + 2); req[(i + 1) % deg] = Math.max(req[(i + 1) % deg], uo + fil, u + fil + 2);
          g.X = [N.x + A.dx * t + pA[0] * A.hw, N.z + A.dz * t + pA[1] * A.hw];
        }
      }
      gaps.push(g);
    }
    N.arms.forEach((a, i) => { a.trim = Math.min(Math.max(req[i], 6) + 1.5, Math.max(30, a.e.len * .32)); if (a.end === 'a') a.e.trimA = a.trim; else a.e.trimB = a.trim; });
    // polygon, counter-clockwise in (x, z)
    const poly = [], fillets = [];
    for (let i = 0; i < deg; i++) {
      const A = N.arms[i], g = gaps[i], Bm = N.arms[g.j];
      const cm = [N.x + A.dx * A.trim + A.dz * A.hw, N.z + A.dz * A.trim - A.dx * A.hw];
      const cp = [N.x + A.dx * A.trim - A.dz * A.hw, N.z + A.dz * A.trim + A.dx * A.hw];
      const nm = [N.x + Bm.dx * Bm.trim + Bm.dz * Bm.hw, N.z + Bm.dz * Bm.trim - Bm.dx * Bm.hw];
      poly.push(cm, cp);
      let curve;
      if (g.X) curve = bezQ(cp, g.X, nm, 10);
      else if (g.gap < Math.PI + .12) curve = [cp, nm];
      else { // reflex gap: come back along each road's edge and hug the node on a tight arc
        const pA0 = [N.x - A.dz * A.hw, N.z + A.dx * A.hw], qB0 = [N.x + Bm.dz * Bm.hw, N.z - Bm.dx * Bm.hw];
        const a0 = Math.atan2(pA0[1] - N.z, pA0[0] - N.x); let a1 = Math.atan2(qB0[1] - N.z, qB0[0] - N.x); while (a1 < a0) a1 += Math.PI * 2;
        curve = [cp]; const steps = Math.max(4, Math.ceil((a1 - a0) / .2));
        for (let k = 0; k <= steps; k++) { const t = k / steps, a = a0 + (a1 - a0) * t, r = A.hw + (Bm.hw - A.hw) * t; curve.push([N.x + Math.cos(a) * r, N.z + Math.sin(a) * r]); }
        curve.push(nm);
      }
      for (let k = 1; k < curve.length - 1; k++) poly.push(curve[k]);
      fillets.push(curve);
    }
    N.poly = poly; N.fillets = fillets;
    N.R = poly.reduce((m, p) => Math.max(m, Math.hypot(p[0] - N.x, p[1] - N.z)), 0);
    NET.juncs.push(N);
  }
}
function pointInPoly(poly, x, z){ let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; }
function polyNearest(poly, x, z){
  let bd = Infinity, bx = 0, bz = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i], vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz || 1;
    const t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / l2, 0, 1), px = a[0] + vx * t, pz = a[1] + vz * t, d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < bd) { bd = d; bx = px; bz = pz; }
  }
  return [bx, bz, Math.sqrt(bd)];
}
function juncAt(x, z){ const L = gridAt(JUNC_GRID, x, z); if (L) for (const J of L) if ((x - J.x) ** 2 + (z - J.z) ** 2 < J.R * J.R + 1 && pointInPoly(J.poly, x, z)) return J; return null; }

/* is this s on an edge inside a stretch of solid median? */
function medianAt(e, s){
  if (!e.prof.div) return false;
  if (s < e.trimA + 7 || s > e.len - e.trimB - 7) return false;
  for (const u of e.uturns) if (Math.abs(s - u) < 7) return false;
  for (const r of e.rails) if (Math.abs(s - r.s) < 6) return false;
  return true;
}
/* drivable-area query. Returns null when the point is on the road,
   otherwise the shortest push [dx, dz] back onto it. */
const _cand = [];
function roadPush(x, z){
  const L = gridAt(SEG_GRID, x, z);
  _cand.length = 0;
  if (L) {
    const seen = new Map();
    for (const code of L) { const e = NET.edges[code >> 12], k = code & 4095; const p = segProj(e, k, x, z); const o = seen.get(e); if (!o || p.d2 < o.d2) seen.set(e, p); }
    for (const [e, p] of seen) {
      if (p.s < -.5 || p.s > e.len + .5) continue;
      const hw = e.prof.hw, al = Math.abs(p.lat), sg = p.lat < 0 ? -1 : 1;
      const [, , ux, uz] = eAt(e, p.s, 0); const lx = uz, lz = -ux;
      if (al <= hw) {
        if (medianAt(e, p.s) && al < e.prof.med + .05) { const d = e.prof.med + .05 - al; _cand.push([lx * sg * d, lz * sg * d]); }
        else return null;
      } else if (al < hw + SWALK + 6) { const d = al - hw; _cand.push([-lx * sg * d, -lz * sg * d]); }
    }
  }
  const JL = gridAt(JUNC_GRID, x, z);
  if (JL) for (const J of JL) {
    if ((x - J.x) ** 2 + (z - J.z) ** 2 > (J.R + 8) ** 2) continue;
    if (pointInPoly(J.poly, x, z)) return null;
    const [px, pz] = polyNearest(J.poly, x, z); _cand.push([px - x, pz - z]);
  }
  if (!_cand.length) return [0, 0, true];
  let best = _cand[0], bd = Infinity; for (const c of _cand) { const d = c[0] * c[0] + c[1] * c[1]; if (d < bd) { bd = d; best = c; } }
  return best;
}
/* keep a point clear of every road surface and sidewalk */
function roadClear(x, z, margin){
  const L = gridAt(SEG_GRID, x, z);
  if (L) for (const code of L) { const e = NET.edges[code >> 12], k = code & 4095; const p = segProj(e, k, x, z); if (p.s < -e.prof.hw - SWALK || p.s > e.len + e.prof.hw + SWALK) continue; if (Math.sqrt(p.d2) < e.prof.hw + SWALK + margin) return false; }
  const JL = gridAt(JUNC_GRID, x, z);
  if (JL) for (const J of JL) if (Math.hypot(x - J.x, z - J.z) < J.R + SWALK + margin) return false;
  return true;
}
function laneLat(e, dir, i){ return dir * (e.prof.med + (i + .5) * LW); }
function stopLineS(e, dir){ return dir > 0 ? e.len - e.trimB - 5.5 : e.trimA + 5.5; }
function entryS(e, dir){ return dir > 0 ? e.trimA + 1 : e.len - e.trimB - 1; }
function endNode(e, dir){ return dir > 0 ? e.b : e.a; }
function startNode(e, dir){ return dir > 0 ? e.a : e.b; }
function armOf(N, e, end){ return N.arms.find(a => a.e === e && a.end === end); }

/* ---------- footprints: nothing may overlap anything else ---------- */
const FP = [], FP_GRID = new Map();
function fpCorners(f){ const nx = f.az, nz = -f.ax; return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [f.cx + f.ax * a * f.hw + nx * b * f.hd, f.cz + f.az * a * f.hw + nz * b * f.hd]); }
function fpOverlap(a, b){
  if (Math.hypot(a.cx - b.cx, a.cz - b.cz) > Math.hypot(a.hw, a.hd) + Math.hypot(b.hw, b.hd)) return false;
  const axes = [[a.ax, a.az], [a.az, -a.ax], [b.ax, b.az], [b.az, -b.ax]];
  const ca = fpCorners(a), cb = fpCorners(b);
  for (const [x, z] of axes) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const p of ca) { const d = p[0] * x + p[1] * z; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const p of cb) { const d = p[0] * x + p[1] * z; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if (a1 < b0 || b1 < a0) return false;
  }
  return true;
}
function fpBox(f){ const r = Math.hypot(f.hw, f.hd); return [f.cx - r, f.cz - r, f.cx + r, f.cz + r]; }
function fpAdd(f){ FP.push(f); const [a, b, c, d] = fpBox(f); gridAdd(FP_GRID, a, b, c, d, f); return f; }
function fpHits(f){
  const [a, b, c, d] = fpBox(f); const seen = new Set();
  for (let i = Math.floor(a / GRID_CELL); i <= Math.floor(c / GRID_CELL); i++) for (let k = Math.floor(b / GRID_CELL); k <= Math.floor(d / GRID_CELL); k++) {
    const L = FP_GRID.get(gkey(i, k)); if (!L) continue; for (const o of L) { if (seen.has(o)) continue; seen.add(o); if (fpOverlap(f, o)) return true; }
  }
  return false;
}
function fpFree(f, margin){
  const cs = fpCorners(f);
  for (const [x, z] of cs) if (!roadClear(x, z, margin)) return false;
  for (let k = 0; k < 4; k++) { const a = cs[k], b = cs[(k + 1) % 4]; if (!roadClear((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, margin)) return false; }
  if (!roadClear(f.cx, f.cz, margin)) return false;
  if (inWater(f.cx, f.cz) || cs.some(([x, z]) => inWater(x, z))) return false;
  return !fpHits(f);
}
let WATER = [];
function inWater(x, z){ for (const w of WATER) if (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && pointInPoly(w.poly, x, z)) return true; return false; }
function addWater(poly){ let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } const w = { poly, x0, x1, z0, z1 }; WATER.push(w); return w; }

/* ---------- route paths: a smooth line a bus follows through the junctions ---------- */
function findEdge(a, b){ for (const e of NET.edges) { if (e.a.id === a && e.b.id === b) return [e, 1]; if (e.b.id === a && e.a.id === b) return [e, -1]; } return null; }
function buildRoutePath(route, reverse){
  const ids = reverse ? route.nodes.slice().reverse() : route.nodes.slice();
  const legs = [];
  for (let k = 0; k < ids.length - 1; k++) { const f = findEdge(ids[k], ids[k + 1]); if (!f) throw new Error('route gap ' + ids[k] + '-' + ids[k + 1]); legs.push({ e: f[0], dir: f[1] }); }
  const P = []; // [x, z, hw, med, nl, eIdx, eS, dir, J]
  const push = (x, z, meta) => { const l = P[P.length - 1]; if (l && Math.hypot(x - l[0], z - l[1]) < .5) return; P.push([x, z].concat(meta)); };
  const turns = [];
  legs.forEach((L, k) => {
    const e = L.e, d = L.dir, pr = e.prof;
    const first = k === 0, last = k === legs.length - 1;
    const sIn = d > 0 ? (first && e.a.dead ? 2 : e.trimA) : (first && e.b.dead ? e.len - 2 : e.len - e.trimB);
    const sOut = d > 0 ? (last && e.b.dead ? e.len - 4 : e.len - e.trimB) : (last && e.a.dead ? 4 : e.trimA);
    const n = Math.max(2, Math.ceil(Math.abs(sOut - sIn)));
    for (let q = 0; q <= n; q++) { const s = sIn + (sOut - sIn) * q / n; const [x, z] = eAt(e, s, 0); push(x, z, [pr.hw, pr.med, pr.nl, e.i, s, d, -1]); }
    if (!last) {
      const N2 = legs[k + 1], e2 = N2.e, d2 = N2.dir, J = endNode(e, d);
      const s2 = d2 > 0 ? e2.trimA : e2.len - e2.trimB;
      const [x0, z0, ux0, uz0] = eAt(e, sOut, 0), [x3, z3, ux3, uz3] = eAt(e2, s2, 0);
      const fx0 = ux0 * d, fz0 = uz0 * d, fx3 = ux3 * d2, fz3 = uz3 * d2;
      const ch = Math.hypot(x3 - x0, z3 - z0), kk = ch * .45;
      const c1 = [x0 + fx0 * kk, z0 + fz0 * kk], c2 = [x3 - fx3 * kk, z3 - fz3 * kk];
      const m = Math.max(4, Math.ceil(ch));
      for (let q = 1; q < m; q++) { const t = q / m, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, dd = t ** 3; const x = a * x0 + b * c1[0] + c * c2[0] + dd * x3, z = a * z0 + b * c1[1] + c * c2[1] + dd * z3; const hw = lerp(pr.hw, e2.prof.hw, t); push(x, z, [hw, 0, Math.max(pr.nl, e2.prof.nl), -1, 0, 0, J.i]); }
      const turn = wrapA(Math.atan2(fz3, fx3) - Math.atan2(fz0, fx0));
      turns.push({ J, turn, kind: turn > .5 ? 'R' : turn < -.5 ? 'L' : 'S', toName: e2.name, toNode: endNode(e2, d2), inArm: armOf(J, e, d > 0 ? 'b' : 'a') });
    }
  });
  const n = P.length; const X = new Float32Array(n), Z = new Float32Array(n), S = new Float32Array(n), DX = new Float32Array(n), DZ = new Float32Array(n);
  for (let i = 0; i < n; i++) { X[i] = P[i][0]; Z[i] = P[i][1]; S[i] = i ? S[i - 1] + Math.hypot(X[i] - X[i - 1], Z[i] - Z[i - 1]) : 0; }
  for (let i = 0; i < n; i++) { const p = Math.max(0, i - 1), q = Math.min(n - 1, i + 1); const dx = X[q] - X[p], dz = Z[q] - Z[p], l = Math.hypot(dx, dz) || 1; DX[i] = dx / l; DZ[i] = dz / l; }
  const RP = { route, reverse, ids, legs, P, n, X, Z, S, DX, DZ, len: S[n - 1], turns, stops: [], signals: [], rails: [] };
  // where each junction box starts along the path, for signals and turn hints
  let ti = 0;
  for (let i = 1; i < n; i++) if (P[i][8] >= 0 && P[i - 1][8] < 0) { const t = turns[ti++]; if (t) { t.s = S[i - 1]; if (!t.J.dead && t.J.deg >= 3) RP.signals.push({ s: S[i - 1] - 5.5, J: t.J, arm: t.inArm }); } }
  return RP;
}
function rpIndex(RP, s){ s = clamp(s, 0, RP.len); let lo = 0, hi = RP.n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (RP.S[m] <= s) lo = m; else hi = m; } return lo; }
function rpAt(RP, s, lat){
  const i = rpIndex(RP, s), j = Math.min(RP.n - 1, i + 1), seg = RP.S[j] - RP.S[i] || 1, u = clamp((s - RP.S[i]) / seg, 0, 1);
  const x = RP.X[i] + (RP.X[j] - RP.X[i]) * u, z = RP.Z[i] + (RP.Z[j] - RP.Z[i]) * u;
  let ux = RP.DX[i] + (RP.DX[j] - RP.DX[i]) * u, uz = RP.DZ[i] + (RP.DZ[j] - RP.DZ[i]) * u; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
  return [x + uz * lat, z - ux * lat, ux, uz];
}
function rpMeta(RP, s){ return RP.P[rpIndex(RP, s)]; }
function rpProject(RP, x, z, hint){
  let bi = 0, bd = Infinity;
  if (hint == null || hint < 0) { for (let i = 0; i < RP.n; i += 2) { const d = (RP.X[i] - x) ** 2 + (RP.Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } }
  else { const a = Math.max(0, hint - 60), b = Math.min(RP.n - 1, hint + 60); for (let i = a; i <= b; i++) { const d = (RP.X[i] - x) ** 2 + (RP.Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } }
  const rx = x - RP.X[bi], rz = z - RP.Z[bi];
  const along = rx * RP.DX[bi] + rz * RP.DZ[bi], lat = rx * RP.DZ[bi] - rz * RP.DX[bi];
  return { i: bi, s: clamp(RP.S[bi] + along, 0, RP.len), lat, d: Math.sqrt(bd) };
}
function rpLanes(RP, s){ const m = rpMeta(RP, s); const med = m[3], nl = m[4], out = []; for (let i = 0; i < nl; i++) out.push(med + (i + .5) * LW); return out; }

/* rail crossings and stops along a route path */
function routeRails(RP){
  RP.rails = [];
  for (const c of RAIL.cross) {
    let bi = -1, bd = 1e9;
    for (let i = 0; i < RP.n; i++) if (RP.P[i][5] === c.e.i) { const d = Math.abs(RP.P[i][6] - c.s); if (d < bd) { bd = d; bi = i; } }
    if (bi >= 0 && bd < 3) RP.rails.push({ s: RP.S[bi], c });
  }
}
/* coarse index of road samples, for questions like "which road is this block on" far from any road */
const COARSE = new Map(); const CC = 128;
function buildCoarse(){ for (const e of NET.edges) for (let k = 0; k < e.n; k += 5) { const key = gkey(Math.floor(e.X[k] / CC), Math.floor(e.Z[k] / CC)); let L = COARSE.get(key); if (!L) COARSE.set(key, L = []); L.push([e, k]); } }
function nearestCoarse(x, z){
  const cx = Math.floor(x / CC), cz = Math.floor(z / CC); let best = null, bd = Infinity;
  for (let i = -2; i <= 2; i++) for (let k = -2; k <= 2; k++) { const L = COARSE.get(gkey(cx + i, cz + k)); if (L) for (const [e, j] of L) { const d = (e.X[j] - x) ** 2 + (e.Z[j] - z) ** 2; if (d < bd) { bd = d; best = [e, j]; } } }
  return best ? { e: best[0], k: best[1], d: Math.sqrt(bd) } : null;
}
