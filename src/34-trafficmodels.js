/* ================================================================= traffic models */
const HOODS = ['#d6264f', '#13877b', '#f2b01e', '#1f4fa3', '#7a1f8f', '#e45a1c'];
const CARS = ['#f2f1ec', '#c9cbcc', '#1d1d1f', '#8a1c1c', '#2b4a7a', '#d9d4c7', '#4a4a4a'];
let _shadowGeo = null; function GEO_SHADOW(){ return _shadowGeo || (_shadowGeo = new THREE.PlaneGeometry(1, 1)); }
function makeTrafficMesh(k, r){
  const p = [];
  const wheel = (x, y, z, rad, wd = .2) => p.push(P(CYLG, '#151515', x, y, z, 0, 0, Math.PI / 2, rad, wd, rad));
  if (k === 'r') {
    wheel(.55, .5, -.55, .5, .06); wheel(-.55, .5, -.55, .5, .06); wheel(0, .5, 1.2, .5, .06);
    const hc = HOODS[Math.floor(r() * HOODS.length)], hc2 = HOODS[Math.floor(r() * HOODS.length)];
    p.push(B('#2a2a2a', .12, .12, 2, 0, .58, .35), B(hc2, 1.15, .4, .75, 0, 1.05, -.5), B(hc, 1.18, 1.05, .07, 0, 1.6, -.9, 0, .12), B(hc, 1.18, .07, .85, 0, 2.08, -.5, 0, -.08), B(hc2, 1.02, .62, .05, 0, .95, -.93), B('#2a2a2a', .8, .05, .05, 0, 1.22, 1.05));
    p.push(C(['#f4f1ea', '#6aa0c9', '#d8cfb8'][Math.floor(r() * 3)], .2, .8, 0, 1.55, .75), P(SPHG, '#5a3a26', 0, 2.05, .78, 0, 0, 0, .17, .17, .17), C(['#2b5a8a', '#5a2b6e', '#2e6b3f'][Math.floor(r() * 3)], .23, .5, 0, 1.0, .75));
    if (r() < .7) p.push(C(['#c22f4a', '#2f5fa7', '#e7a21b'][Math.floor(r() * 3)], .22, .6, -.2, 1.55, -.45), P(SPHG, '#5a3a26', -.2, 2.0, -.45, 0, 0, 0, .16, .16, .16));
  } else if (k === 'c') {
    p.push(B('#1f8a4c', 1.3, .8, 2.6, 0, .75, 0), B('#1b6d3c', 1.0, .7, .5, 0, 1.15, 1.25), B('#1f8a4c', 1.42, .1, 2.4, 0, 2.12, -.05));
    for (const [x, z] of [[-.66, -1.15], [.66, -1.15], [-.66, .6], [.66, .6]]) p.push(B('#111', .06, .95, .06, x, 1.62, z));
    p.push(B('#111', 1.34, .06, .06, 0, 1.62, -1.15), B('#222', 1.3, .5, .05, 0, 1.4, -1.2));
    wheel(-.62, .34, -.85, .34); wheel(.62, .34, -.85, .34); wheel(0, .34, 1.1, .34);
    p.push(C('#f4f1ea', .2, .6, .2, 1.45, .55), P(SPHG, '#5a3a26', .2, 1.9, .55, 0, 0, 0, .15, .15, .15));
  } else if (k === 'k') {
    const c = CARS[Math.floor(r() * CARS.length)];
    p.push(B(c, 1.78, .62, 4.4, 0, .66, 0), B(c, 1.56, .55, 2.3, 0, 1.24, -.2), B('#1d2a33', 1.6, .38, 2.1, 0, 1.25, -.2), B('#f7f3e3', .4, .14, .05, .6, .78, 2.2), B('#f7f3e3', .4, .14, .05, -.6, .78, 2.2), B('#b31d1d', .4, .14, .05, .6, .8, -2.2), B('#b31d1d', .4, .14, .05, -.6, .8, -2.2));
    for (const [x, z] of [[.86, 1.4], [-.86, 1.4], [.86, -1.4], [-.86, -1.4]]) wheel(x, .34, z, .34);
  } else if (k === 'm') {
    const c = r() < .6 ? '#f2f1ec' : '#c9cbcc';
    p.push(B(c, 1.82, 1.55, 4.6, 0, 1.15, 0), B('#1d2a33', 1.86, .55, 3.6, 0, 1.5, -.3), B('#1d2a33', 1.7, .6, .05, 0, 1.45, 2.31), B('#f7f3e3', .4, .14, .05, .6, .75, 2.31), B('#f7f3e3', .4, .14, .05, -.6, .75, 2.31));
    for (const [x, z] of [[.86, 1.5], [-.86, 1.5], [.86, -1.5], [-.86, -1.5]]) wheel(x, .34, z, .34);
  } else if (k === 'b') {
    p.push(B('#1d1d1d', .28, .45, 1.5, 0, .7, 0), B(['#c8231c', '#1f4fa3', '#1d1d1d'][Math.floor(r() * 3)], .38, .32, .8, 0, .95, .2));
    wheel(0, .32, .65, .32, .12); wheel(0, .32, -.65, .32, .12);
    p.push(C(['#2f9a52', '#f4f1ea', '#2f5fa7'][Math.floor(r() * 3)], .2, .62, 0, 1.4, -.15), P(SPHG, ['#2f9a52', '#d6264f', '#1d1d1d'][Math.floor(r() * 3)], 0, 1.9, -.12, 0, 0, 0, .2, .2, .2));
  } else {
    const a = HOODS[Math.floor(r() * HOODS.length)], b = ['#f4f1ea', '#1f4fa3', '#2f9a52', '#d8d2c4'][Math.floor(r() * 4)];
    p.push(B(b, 2.5, 2.7, 10, 0, 1.95, 0), B(a, 2.52, .7, 10.02, 0, 1.2, 0), B('#25313a', 2.54, .9, 8.6, 0, 2.6, -.4), B('#1b232a', 2.3, 1.1, .05, 0, 2.5, 5.01), B('#151515', 2.2, .4, .06, 0, 3.05, 5.03));
    for (const [x, z] of [[1.1, 3], [-1.1, 3], [1.1, -3], [-1.1, -3]]) wheel(x, .52, z, .52, .3);
  }
  const g = new THREE.Group(); g.add(partsMesh(p));
  const kk = KIND[k]; const sh = new THREE.Mesh(GEO_SHADOW(), MATS.shadow); sh.rotation.x = -Math.PI / 2; sh.scale.set(kk.hw * 2.6, kk.hl * 2.4, 1); sh.position.y = .04; sh.userData.blob = true; sh.visible = !Game.hq; g.add(sh);
  return g;
}
