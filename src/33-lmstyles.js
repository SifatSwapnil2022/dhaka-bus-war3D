/* ---------- landmarks: real places on the route, in simplified form ---------- */
function nameBoard(g, spec, y, w, z, bg = '#0f6b3f', fg = '#f4ead6'){
  const h = Math.max(1.6, Math.min(3.2, w / 6)); const s = signPlane(spec.bn, spec.en, w, h, bg, fg); s.position.set(0, y, z); g.add(s); return s;
}
function flagMesh(g, x, z, h){ const c = makeCanvas(100, 60), q = c.getContext('2d'); q.fillStyle = '#006a4e'; q.fillRect(0, 0, 100, 60); q.fillStyle = '#f42a41'; q.beginPath(); q.arc(45, 30, 20, 0, 7); q.fill(); const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.32), lam({ map: texFrom(c), side: THREE.DoubleSide })); m.position.set(x + 1.15, h - .7, z); g.add(m); }
function treeParts(parts, x, z, s, flame){ parts.push(C('#5b4330', .18 * s, 2.4 * s, x, 1.2 * s, z, 0, 0, 0, 6)); parts.push(P(ICOG, flame ? '#d8462a' : '#3f6b2f', x, 3.2 * s, z, 0, x * .3, 0, 1.6 * s, 1.3 * s, 1.6 * s)); parts.push(P(ICOG, flame ? '#e5622f' : '#4f7f38', x + .5 * s, 3.9 * s, z - .3 * s, .4, 0, 0, 1.1 * s, 1 * s, 1.1 * s)); }
function shadowAll(g){ g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
const LM = {
  govt(g, sp){ const { w, d, h } = sp; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ map: texRep(windowAtlas, w / 12.8, h / 12.8), color: 0xece6d6 })); m.position.y = h / 2; g.add(m);
    g.add(partsMesh([B('#d8d0bd', w + .6, .8, d + .6, 0, h + .4, 0), B('#cfc6b1', w * .3, h * .55, 1.4, 0, h * .275, d / 2 + .6), C('#d9d4c7', .08, h + 5, w / 2 - 2, (h + 5) / 2, d / 2 + 2)])); flagMesh(g, w / 2 - 2, d / 2 + 2, h + 5);
    nameBoard(g, sp, h * .7, Math.min(w * .7, 20), d / 2 + 1.36, '#f4ead6', '#1d3a2a'); },
  stadium(g, sp){ const { w, d, h } = sp; const rx = w / 2, rz = d / 2;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, h, 40, 1, true), lam({ color: 0xcfc8b8, side: THREE.DoubleSide })); ring.scale.set(rx, 1, rz); ring.position.y = h / 2; g.add(ring);
    const seats = new THREE.Mesh(new THREE.CylinderGeometry(.97, .62, h * .9, 40, 1, true), lam({ color: 0x2b7a5a, side: THREE.DoubleSide })); seats.scale.set(rx, 1, rz); seats.position.y = h * .45; g.add(seats);
    const field = new THREE.Mesh(new THREE.CircleGeometry(1, 40), lam({ color: 0x4f8a3a })); field.rotation.x = -Math.PI / 2; field.scale.set(rx * .6, rz * .6, 1); field.position.y = .4; g.add(field);
    if (sp.flood) { const p = []; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { p.push(B('#8c8c8c', 1, h * 2.6, 1, a * rx * .7, h * 1.3, b * rz * .7)); p.push(B('#e9e9e2', 4, 2.4, .5, a * rx * .7, h * 2.6, b * rz * .7)); } g.add(partsMesh(p)); }
    nameBoard(g, sp, h + 2.2, Math.min(w * .6, 26), rz + .2); },
  stalls(g, sp){ const { w, d } = sp; const p = []; const cols = ['#d6264f', '#13877b', '#f2b01e', '#1f4fa3', '#e45a1c'];
    for (let x = -w / 2 + 2; x < w / 2 - 1; x += 3.6) { p.push(B('#6e6458', 3.2, 2.2, d * .8, x, 1.1, 0)); p.push(B(cols[Math.abs(Math.round(x)) % 5], 3.4, .1, d * .9, x, 2.6, .3, 0, -.12)); p.push(B('#c9a46a', 2.6, .6, .8, x, .9, d * .4 - .2)); p.push(C('#f4f1ea', .22, .9, x + .8, 1.25, d * .4 + .3)); p.push(P(SPHG, '#5a3a26', x + .8, 1.9, d * .4 + .3, 0, 0, 0, .18, .18, .18)); }
    g.add(partsMesh(p)); nameBoard(g, sp, 3.6, Math.min(w * .5, 12), d / 2 + .1, '#f2b01e', '#2a1a08'); },
  cinema(g, sp){ const { w, d, h } = sp; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ color: 0xd9b9a3 })); m.position.y = h / 2; g.add(m);
    const po = new THREE.Mesh(new THREE.PlaneGeometry(w * .9, h * .48), lam({ map: posterTex() })); po.position.set(0, h * .62, d / 2 + .05); g.add(po);
    g.add(partsMesh([B('#3a2f2a', w * .9, .4, .6, 0, h * .36, d / 2 + .3), B('#3a2f2a', w * .5, 3, .2, 0, 1.5, d / 2 + .1)]));
    nameBoard(g, sp, h * .3, w * .8, d / 2 + .62, '#1b1b1b', '#f2b01e'); },
  market(g, sp){ const { w, d, h } = sp; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ map: texRep(windowAtlas, w / 12.8, h / 12.8), color: 0xe0cfb8 })); m.position.y = h / 2; g.add(m);
    for (let fl = 1; fl < Math.min(5, h / 3.2); fl++) for (let x = -w / 2 + 3; x < w / 2 - 2.5; x += 6) { const cell = (fl * 7 + Math.abs(Math.round(x))) % 16; const geo = new THREE.PlaneGeometry(5.2, 1.2); const uv = geo.attributes.uv; const cu = (cell % 4) / 4, cv = 1 - (Math.floor(cell / 4) + 1) / 4; for (let k = 0; k < uv.count; k++) uv.setXY(k, cu + uv.getX(k) * .25, cv + uv.getY(k) * .25); const s = new THREE.Mesh(geo, MATS.signAtlas); s.position.set(x, fl * 3.2 + .6, d / 2 + .06); g.add(s); }
    nameBoard(g, sp, h + 1.4, Math.min(w * .8, 22), d / 2 - 1); },
  tvtower(g, sp){ const { w, d, h } = sp; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ map: texRep(bandTex, w / 8, h / 6) })); m.position.y = h / 2; g.add(m);
    const p = []; let y = h, sz = 4; for (let k = 0; k < 6; k++) { p.push(B(k % 2 ? '#f4f1ea' : '#c8231c', sz, 7, sz, -w / 4, y + 3.5, -d / 4)); y += 7; sz *= .78; } p.push(C('#9a9a9a', .15, 10, -w / 4, y + 5, -d / 4)); g.add(partsMesh(p));
    nameBoard(g, sp, h * .5, Math.min(w * .7, 16), d / 2 + .06); },
  campus(g, sp){ const { w, d, h } = sp; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * .7), lam({ map: texRep(bandTex, w / 8, h / 4) })); m.position.set(0, h / 2, -d * .15); g.add(m);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(w * .28, h + 2, d * .72), lam({ map: texRep(glassTexC, 2, h / 6) })); gl.position.set(w * .18, (h + 2) / 2, -d * .15); g.add(gl);
    const p = [B('#b8ae9b', 1.4, 6, 1.4, -5, 3, d / 2 - .8), B('#b8ae9b', 1.4, 6, 1.4, 5, 3, d / 2 - .8), B('#8f8574', 12, 1.2, 1.6, 0, 6.4, d / 2 - .8), B('#5b6b4b', w, .3, d * .3, 0, .15, d * .35)];
    for (let x = -w / 2 + 3; x < w / 2; x += 6) if (Math.abs(x) > 7) treeParts(p, x, d * .36, .8);
    g.add(partsMesh(p));
    const gate = signPlane(sp.bn, sp.en, 11.6, 1.6, '#123a5c', '#f4ead6'); gate.position.set(0, 6.4, d / 2 + .02); g.add(gate);
    nameBoard(g, sp, h - 2, Math.min(w * .6, 18), d * .21 + .12, '#123a5c', '#f4ead6'); },
  campusGreen(g, sp){ const { w, d, h } = sp;
    const core = new THREE.Mesh(new THREE.BoxGeometry(w * .6, h, d * .6), lam({ map: texRep(glassTexC, w / 8, h / 6) })); core.position.set(0, h / 2, -d * .1); g.add(core);
    const p = []; for (let k = 0; k < 7; k++) { const y = 4 + k * (h - 6) / 7; p.push(B('#e9e3d4', w * .66, .6, d * .66, 0, y, -d * .1)); p.push(B('#4f8f3a', w * .66, .7, 1.2, 0, y + .6, d * .23 - .2)); p.push(B('#4f8f3a', 1.2, .7, d * .66, w * .33 - .6, y + .6, -d * .1)); }
    p.push(B('#d9d2c1', w, 4, d, 0, 2, 0)); for (let x = -w / 2 + 3; x < w / 2; x += 7) treeParts(p, x, d / 2 - 1.5, .8);
    g.add(partsMesh(p));
    nameBoard(g, sp, 5.6, Math.min(w * .7, 18), d / 2 + .06, '#0b5f9c', '#ffffff'); },
  mall(g, sp){ const { w, d, h } = sp; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ map: texRep(glassTexC, w / 10, h / 8) })); m.position.y = h / 2; g.add(m);
    g.add(partsMesh([B('#e9e5dc', w + .4, 1.4, d + .4, 0, h * .5, 0), B('#e9e5dc', w + .4, 1.6, d + .4, 0, h + .8, 0), B('#f2b01e', w * .7, .3, .3, 0, 4.6, d / 2 + .3), B('#dcd5c6', w * .4, .3, 1.6, 0, 4.2, d / 2 + .8)]));
    nameBoard(g, sp, h - 3, Math.min(w * .8, 26), d / 2 + .25, '#1b1b1b', '#f2b01e'); },
  tower(g, sp){ const { w, d, h } = sp; const pod = new THREE.Mesh(new THREE.BoxGeometry(w, 14, d), lam({ map: texRep(glassTexC, w / 10, 2) })); pod.position.y = 7; g.add(pod);
    const tw = new THREE.Mesh(new THREE.BoxGeometry(w * .5, h, d * .5), lam({ map: texRep(glassTexC, w / 16, h / 8) })); tw.position.set(-w * .15, h / 2, -d * .15); g.add(tw);
    g.add(partsMesh([B('#d9d2c4', w * .52, 2, d * .52, -w * .15, h + 1, -d * .15), B('#e9e5dc', w + .3, 1, d + .3, 0, 14.3, 0)]));
    nameBoard(g, sp, 11.5, Math.min(w * .8, 22), d / 2 + .2, '#1b1b1b', '#f2b01e'); },
  airport(g, sp){ const { w, d, h } = sp;
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * .5), lam({ map: texRep(glassTexC, w / 8, h / 6) })); t.position.set(0, h / 2, -d * .1); g.add(t);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, w + 4, 24, 1, false, 0, Math.PI), lam({ color: 0xe9e7e1 })); roof.rotation.z = Math.PI / 2; roof.scale.set(4, 1, d * .3); roof.position.set(0, h, -d * .1); g.add(roof);
    const p = [C('#d9d4c7', 2.2, 30, w / 2 - 8, 15, -d * .38), C('#2f4f5c', 3.6, 3.4, w / 2 - 8, 31.7, -d * .38), C('#d9d4c7', 3.9, .6, w / 2 - 8, 33.6, -d * .38)];
    p.push(C('#f2f1ec', 1.8, 30, -w / 4, 4, -d * .44, Math.PI / 2, Math.PI / 2, 0), B('#e1e0da', 26, .5, 5, -w / 4, 3.6, -d * .44), B('#e1e0da', 1, 5, 3, -w / 4 - 13, 6, -d * .44), B('#13877b', .3, 4, 2.6, -w / 4 - 13.6, 6.4, -d * .44));
    for (let x = -w / 2; x <= w / 2; x += 4) p.push(B('#7a7a7a', .12, 2.4, .12, x, 1.2, d / 2 - 1)); p.push(B('#8a8a8a', w, .08, .08, 0, 2.3, d / 2 - 1));
    g.add(partsMesh(p));
    nameBoard(g, sp, h + 3.4, Math.min(w * .7, 44), d * .15 + .4, '#0b4f7c', '#ffffff'); },
  station(g, sp){ const { w, d } = sp; const p = [B('#bdb5a4', w, 1, d, 0, .5, 0), B('#c22f2f', w, .3, d * .9, 0, 5.5, 0)]; for (let x = -w / 2 + 2; x < w / 2; x += 6) p.push(B('#6e6458', .3, 5, .3, x, 3, 0)); p.push(B('#3a3a3a', w, .2, .3, 0, 1.05, -d / 2 + 1)); g.add(partsMesh(p)); nameBoard(g, sp, 4.2, Math.min(w * .5, 16), d / 2 + .1, '#f4f1ea', '#1d1d1d'); },
  office(g, sp){ const { w, d, h } = sp; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ map: texRep(glassTexC, w / 8, h / 6) })); m.position.y = h / 2; g.add(m);
    g.add(partsMesh([B('#d9d2c4', w + .6, 5, d + .6, 0, 2.5, 0), B('#d9d2c4', w * .6, 3, d * .6, 0, h + 1.5, 0)])); nameBoard(g, sp, h - 2, Math.min(w * .85, 18), d / 2 + .06, '#1b1b1b', '#ffffff'); },
  hospital(g, sp){ const { w, d, h } = sp; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam({ map: texRep(windowAtlas, w / 12.8, h / 12.8), color: 0xf4f1ea })); m.position.y = h / 2; g.add(m);
    g.add(partsMesh([B('#2f9a52', 1.2, 4, .3, -w / 2 + 3, h - 3, d / 2 + .2), B('#2f9a52', 4, 1.2, .3, -w / 2 + 3, h - 3, d / 2 + .2), B('#e0dbcf', w * .4, .4, 2.4, 0, 4, d / 2 + 1.2), B('#bdb5a4', .4, 4, .4, -w * .19, 2, d / 2 + 2.2), B('#bdb5a4', .4, 4, .4, w * .19, 2, d / 2 + 2.2)]));
    nameBoard(g, sp, h - 3, Math.min(w * .6, 20), d / 2 + .06, '#f4f1ea', '#1f6e3d'); },
  museum(g, sp){ const { w, d, h } = sp; const p = [B('#cfc7b6', w, 1.4, d, 0, .7, 0), B('#e4ddcd', w * .9, h - 2, d * .7, 0, h / 2, -d * .1), B('#d8cfbc', w * .94, 1.4, d * .9, 0, h, 0)];
    for (let x = -w * .4; x <= w * .4 + .01; x += w * .1) p.push(C('#efe9dc', .55, h - 2.6, x, (h - 2.6) / 2 + 1.4, d * .32));
    g.add(partsMesh(p)); const tri = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, w * .94, 3), lam({ color: 0xd8cfbc })); tri.rotation.z = Math.PI / 2; tri.scale.set(2.6, 1, d * .45); tri.position.set(0, h + 1.3, 0); g.add(tri);
    nameBoard(g, sp, 2.6, Math.min(w * .5, 14), d / 2 + .1, '#5b3a1f', '#f4ead6'); },
  collegeBrick(g, sp){ const { w, d, h } = sp; const main = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * .5), lam({ map: texRep(brickTex, w / 4, h / 4) })); main.position.set(0, h / 2, -d * .25); g.add(main);
    const tw = new THREE.Mesh(new THREE.BoxGeometry(6, h + 7, 6), lam({ map: texRep(brickTex, 1.5, (h + 7) / 4) })); tw.position.set(0, (h + 7) / 2, -d * .25 - 1); g.add(tw);
    const p = [B('#efe9dc', w + .4, .6, d * .5 + .4, 0, h + .3, -d * .25), B('#efe9dc', 6.6, .6, 6.6, 0, h + 7.3, -d * .25 - 1), P(CONEG, '#7d3a2a', 0, h + 9, -d * .25 - 1, 0, Math.PI / 4, 0, 4.6, 3, 4.6), B('#5b7b3b', w, .2, d * .45, 0, .1, d * .22)];
    p.push(B('#8a3b2b', 1.2, 4.6, 1.2, -4.5, 2.3, d / 2 - .6), B('#8a3b2b', 1.2, 4.6, 1.2, 4.5, 2.3, d / 2 - .6), B('#efe9dc', 10.4, 1, 1.4, 0, 4.9, d / 2 - .6));
    for (let x = -w / 2 + 2; x < -6; x += 5) p.push(B('#8a3b2b', 4.8, 1.6, .4, x + 2.5, .8, d / 2 - .6)); for (let x = 5.5; x < w / 2 - 2; x += 5) p.push(B('#8a3b2b', 4.8, 1.6, .4, x + 2.5, .8, d / 2 - .6));
    g.add(partsMesh(p));
    const gs = signPlane(sp.bn, sp.en, 9.8, 1.5, '#7a1e14', '#f4ead6'); gs.position.set(0, 4.9, d / 2 + .12); g.add(gs);
    nameBoard(g, sp, h - 2.5, Math.min(w * .5, 14), .06, '#7a1e14', '#f4ead6'); },
  college(g, sp){ const { w, d, h } = sp; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * .6), lam({ map: texRep(windowAtlas, w / 12.8, h / 12.8), color: 0xf0d995 })); m.position.set(0, h / 2, -d * .2); g.add(m);
    const p = []; for (let y = 3.2; y < h; y += 3.2) p.push(B('#e8c96f', w + .4, .3, 1.2, 0, y, d * .1 + .4)); p.push(B('#c7b07a', 1, 4, 1, -4.6, 2, d / 2 - .5), B('#c7b07a', 1, 4, 1, 4.6, 2, d / 2 - .5), B('#5b7b3b', w, .2, d * .35, 0, .1, d * .3));
    g.add(partsMesh(p)); nameBoard(g, sp, h - 2, Math.min(w * .7, 16), d * .1 + 1.06, '#1f4fa3', '#ffffff'); const gs = signPlane(sp.bn, '', 8, 1.1, '#1f4fa3', '#fff'); gs.position.set(0, 4.3, d / 2 + .05); g.add(gs); },
  kash(g, sp){ const { w, d } = sp; const gr = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam({ color: 0x8c9a62 })); gr.rotation.x = -Math.PI / 2; gr.position.y = .05; g.add(gr);
    const n = 700, im = new THREE.InstancedMesh(new THREE.ConeGeometry(.35, 1.6, 5), lam({ color: 0xf4f1ea }), n), m4 = new THREE.Matrix4(), r = mulberry32(8);
    for (let i = 0; i < n; i++) { m4.makeRotationZ((r() - .5) * .5); m4.setPosition((r() - .5) * (w - 2), 1.3 + r() * .5, (r() - .5) * (d - 4) - 1); im.setMatrixAt(i, m4); } g.add(im);
    const st = new THREE.Mesh(new THREE.BoxGeometry(w * .9, .8, d * .85), lam({ color: 0x6b7a4a })); st.position.set(0, .4, -1); g.add(st);
    g.add(partsMesh([B('#5b4330', .2, 4, .2, -3, 2, d / 2 - .5), B('#5b4330', .2, 4, .2, 3, 2, d / 2 - .5)])); nameBoard(g, sp, 3.6, 8, d / 2 - .38, '#f4ead6', '#3b5a2a'); },
  lake(g, sp){ const { w, d } = sp; const sh = new THREE.Shape(); const rw = w / 2 - 5, rd = d / 2 - 5; sh.absellipse(0, 0, rw, rd, 0, Math.PI * 2, false, 0);
    const water = new THREE.Mesh(new THREE.ShapeGeometry(sh, 32), new THREE.MeshPhongMaterial({ color: 0x3d6b72, shininess: 80, specular: 0x9fc4c8 })); water.rotation.x = -Math.PI / 2; water.position.y = .12; g.add(water);
    const bank = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam({ color: 0x5f7c40 })); bank.rotation.x = -Math.PI / 2; bank.position.y = .06; g.add(bank);
    const p = []; for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; const tx = Math.cos(a) * (rw + 2.2), tz = Math.sin(a) * (rd + 2.2); if (tz > d / 2 - 6 && Math.abs(tx) < 6) continue; treeParts(p, tx, tz, .85, k % 6 === 0); }
    p.push(B('#a59d8c', 3, .4, d - 10, 0, .5, -1), B('#7d756a', .2, 1, d - 10, 1.5, .9, -1), B('#7d756a', .2, 1, d - 10, -1.5, .9, -1));
    g.add(partsMesh(p)); g.add(partsMesh([B('#5b4330', .2, 3.6, .2, -3, 1.8, d / 2 - 1), B('#5b4330', .2, 3.6, .2, 3, 1.8, d / 2 - 1)])); nameBoard(g, sp, 3.4, 8, d / 2 - .88, '#1f5e57', '#f4ead6'); },
  bgb(g, sp){ const { w, d } = sp; const p = []; const gateW = 9;
    for (const sd of [-1, 1]) { const segW = w / 2 - gateW / 2 - 1.2; p.push(B('#8a3b2b', segW, 3.2, .6, sd * (gateW / 2 + 1.2 + segW / 2), 1.6, d / 2 - .4)); p.push(B('#efe9dc', segW, .3, .7, sd * (gateW / 2 + 1.2 + segW / 2), 3.3, d / 2 - .4)); p.push(B('#8a3b2b', .6, 3.2, d - 1.4, sd * (w / 2 - .3), 1.6, -.3)); }
    p.push(B('#8a3b2b', w, 3.2, .6, 0, 1.6, -d / 2 + .3));
    p.push(B('#2f5d3a', 1.6, 6.2, 1.6, -gateW / 2 - .4, 3.1, d / 2 - .4), B('#2f5d3a', 1.6, 6.2, 1.6, gateW / 2 + .4, 3.1, d / 2 - .4), B('#2f5d3a', gateW + 2.8, 1.6, 1.8, 0, 6.6, d / 2 - .4), B('#c22f2f', gateW + 2.8, .3, 1.9, 0, 7.5, d / 2 - .4));
    for (let x = -w / 2 + 4; x < w / 2 - 3; x += 6.5) if (Math.abs(x) > 7) treeParts(p, x, d / 2 - 5, 1.0, Math.abs(Math.round(x)) % 13 < 2);
    const cols = [{ x: -w / 4, bn: 'বীরশ্রেষ্ঠ নূর মোহাম্মদ পাবলিক কলেজ', en: 'Birshreshtha Noor Mohammad Public College' }, { x: w / 4, bn: 'বীরশ্রেষ্ঠ মুন্সী আব্দুর রউফ পাবলিক কলেজ', en: 'Birshreshtha Munshi Abdur Rouf Public College' }];
    for (const c of cols) { const m = new THREE.Mesh(new THREE.BoxGeometry(Math.min(26, w * .42), 14, 12), lam({ map: texRep(windowAtlas, 2, 1.1), color: 0xf0e2c0 })); m.position.set(c.x, 7, -d / 2 + 8); g.add(m); const s = signPlane(c.bn, c.en, Math.min(24, w * .4), 2.4, '#2f5d3a', '#f4ead6'); s.position.set(c.x, 11.4, -d / 2 + 14.06); g.add(s); }
    p.push(B('#6b8a4a', w - 2, .15, d - 2, 0, .08, 0));
    g.add(partsMesh(p)); const gs = signPlane(sp.bn, sp.en, gateW + 2.6, 1.5, '#2f5d3a', '#f4ead6'); gs.position.set(0, 6.6, d / 2 + .52); g.add(gs);
    g.add(partsMesh([C('#d9d4c7', .08, 9, gateW / 2 + 3, 4.5, d / 2 + .6)])); flagMesh(g, gateW / 2 + 3, d / 2 + .6, 9); },
  flowers(g, sp){ const { w, d } = sp; const p = []; const fl = ['#e8304a', '#f2b01e', '#f4f1ea', '#e45a1c', '#c2185b'];
    for (let x = -w / 2 + 1.5; x < w / 2 - 1; x += 3) { p.push(B('#6e6458', 2.8, 1, d * .7, x, .5, 0)); for (let k = 0; k < 5; k++) p.push(P(SPHG, fl[(k + Math.abs(Math.round(x))) % 5], x - 1 + k * .5, 1.2 + (k % 2) * .2, d * .1 + (k % 3) * .4, 0, 0, 0, .35, .35, .35)); p.push(B('#13877b', 3, .08, d * .9, x, 2.4, 0, 0, -.15)); p.push(C('#2f5fa7', .05, 2.4, x + 1.3, 1.2, d * .38)); }
    g.add(partsMesh(p)); nameBoard(g, sp, 3.3, Math.min(w * .5, 10), d / 2 + .1, '#c2185b', '#fff'); },
};
