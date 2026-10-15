/* ================================================================= renderer */
const canvas = $('gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { FAIL(); return; }
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 1.75));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 700);
const MAXANI = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);

function makeCanvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texFrom(c, repeat){ const t = new THREE.CanvasTexture(c); t.anisotropy = MAXANI; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
function fitFill(g, text, x, y, maxW, weight, size, family){ let s = size; g.font = `${weight} ${s}px ${family}`; while (g.measureText(text).width > maxW && s > 8) { s--; g.font = `${weight} ${s}px ${family}`; } g.fillText(text, x, y); }
function strokeFill(g, text, x, y, fill, stroke, lw){ g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y); }
const MATS = {};
function lam(o){ return new THREE.MeshLambertMaterial(o); }
function VC(){ return MATS.vc || (MATS.vc = lam({ vertexColors: true })); }

/* merge coloured primitives into one geometry, so each model is one draw call */
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function P(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1){
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return { geo, color, m: new THREE.Matrix4().compose(_p, _q, _s) };
}
const BOXG = new THREE.BoxGeometry(1, 1, 1), CYLG = new THREE.CylinderGeometry(1, 1, 1, 12), CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6), SPHG = new THREE.SphereGeometry(1, 10, 8), ICOG = new THREE.IcosahedronGeometry(1, 0), CONEG = new THREE.ConeGeometry(1, 1, 8);
const B = (c, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) => P(BOXG, c, x, y, z, rx, ry, rz, w, h, d);
const C = (c, r, h, x, y, z, rx = 0, ry = 0, rz = 0, seg) => P(seg === 6 ? CYL6 : CYLG, c, x, y, z, rx, ry, rz, r, h, r);
function mergeParts(parts){
  let n = 0; const gs = [];
  for (const p of parts) { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone(); g.applyMatrix4(p.m); gs.push(g); n += g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0; const c = new THREE.Color();
  gs.forEach((g, i) => { c.set(parts[i].color); const cnt = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); for (let k = 0; k < cnt; k++) { col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b; } o += cnt; g.dispose(); });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere(); return out;
}
function partsMesh(parts, cast = true){ const m = new THREE.Mesh(mergeParts(parts), VC()); m.castShadow = cast; m.receiveShadow = true; return m; }

