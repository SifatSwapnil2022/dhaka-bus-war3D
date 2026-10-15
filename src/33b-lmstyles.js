/* ---------- more real places ---------- */
Object.assign(LM, {
  mosqueBig(g, sp){ const { w, d, h } = sp;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * .7, h, d * .7), lam({ map: texRep(bandTex, w / 10, h / 6), color: 0xf4f1ea })); m.position.set(0, h / 2, -d * .1); g.add(m);
    const p = [B('#e9e4d8', w, 3.4, d, 0, 1.7, 0), B('#d8d0bd', w * .72, .8, d * .72, 0, h + .4, -d * .1)];
    for (let x = -w * .3; x <= w * .3 + .01; x += w * .1) p.push(B('#e9e4d8', 1, 3.4, 1, x, 5, d * .26), P(BOXG, '#e9e4d8', x + w * .05, 7.2, d * .26, 0, 0, 0, w * .1, 1.2, 1));
    p.push(C('#efe9dc', 1.1, h + 14, w / 2 - 2, (h + 14) / 2, -d / 2 + 2), P(CONEG, '#d8c99a', w / 2 - 2, h + 15.5, -d / 2 + 2, 0, 0, 0, 1.4, 3, 1.4));
    g.add(partsMesh(p)); nameBoard(g, sp, 5.6, Math.min(w * .6, 18), d / 2 + .1, '#0f5132', '#f4ead6'); },
  mosque(g, sp){ const { w, d, h } = sp;
    const p = [B('#f2efe6', w, h * .6, d, 0, h * .3, 0), B('#e3ddcf', w + .4, .5, d + .4, 0, h * .6 + .25, 0)];
    p.push(P(SPHG, '#f4f1ea', 0, h * .62, 0, 0, 0, 0, w * .22, w * .2, w * .22), C('#f4f1ea', .9, h + 6, w / 2 - 1.2, (h + 6) / 2, d / 2 - 1.2), P(SPHG, '#f4f1ea', w / 2 - 1.2, h + 6.5, d / 2 - 1.2, 0, 0, 0, 1.1, 1.3, 1.1));
    for (let x = -w * .35; x <= w * .35; x += w * .175) p.push(B('#7aa37a', 1.6, 2.6, .2, x, 2, d / 2 + .02));
    g.add(partsMesh(p)); nameBoard(g, sp, h * .45, Math.min(w * .8, 14), d / 2 + .06, '#0f5132', '#f4ead6'); },
  park(g, sp){ const { w, d } = sp;
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam({ map: texRep(grassTex, w / 8, d / 8) })); gr.rotation.x = -Math.PI / 2; gr.position.y = .06; gr.receiveShadow = true; g.add(gr);
    const p = [], r = mulberry32(hashStr(sp.en));
    for (let i = 0; i < w * d / 70; i++) treeParts(p, (r() - .5) * (w - 6), (r() - .5) * (d - 6), .9 + r() * .5, r() < .12);
    for (let x = -w / 2; x <= w / 2; x += 2.5) p.push(B('#2b2b2b', .08, 1.4, .08, x, .7, d / 2 - .2)); p.push(B('#2b2b2b', w, .08, .08, 0, 1.35, d / 2 - .2), B('#2b2b2b', w, .08, .08, 0, .5, d / 2 - .2));
    p.push(B('#a59d8c', 3, .1, d - 2, 0, .1, 0));
    g.add(partsMesh(p)); g.add(partsMesh([B('#5b4330', .2, 3.6, .2, -3, 1.8, d / 2 - .2), B('#5b4330', .2, 3.6, .2, 3, 1.8, d / 2 - .2)])); nameBoard(g, sp, 3.4, 8, d / 2 - .08, '#1f5e57', '#f4ead6'); },
  shapla(g, sp){ const p = [C('#cfc8b8', 5.5, .6, 0, .3, 0), C('#5f8a9a', 4.8, .3, 0, .62, 0), C('#e9e4d8', .7, 3.6, 0, 2.2, 0)];
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; p.push(P(SPHG, k % 2 ? '#f2eee6' : '#e8d9e0', Math.cos(a) * 1.6, 4.8, Math.sin(a) * 1.6, .5 * Math.sin(a), 0, -.5 * Math.cos(a), .9, .25, 2.4)); }
    p.push(P(SPHG, '#f2b01e', 0, 5.1, 0, 0, 0, 0, .8, .6, .8));
    g.add(partsMesh(p)); nameBoard(g, sp, 1.2, 6, 5.6, '#1f5e57', '#f4ead6'); },
  terminal(g, sp){ const { w, d, h } = sp; const p = [B('#bdb5a4', w, .4, d, 0, .2, 0)];
    for (let x = -w / 2 + 3; x < w / 2; x += 7) p.push(B('#7d7468', .4, h, .4, x, h / 2, -d / 2 + 2), B('#7d7468', .4, h, .4, x, h / 2, d / 2 - 2));
    p.push(B('#8e9aa0', w, .3, d, 0, h, 0, 0, .05));
    const cols = ['#d22a1e', '#12904b', '#2b8fd2', '#e6e0d3', '#f2b01e'];
    for (let i = 0; i < 6; i++) { const x = -w / 2 + 6 + i * (w - 12) / 5; p.push(B(cols[i % 5], 2.5, 2.7, 10, x, 1.95, -2), B('#25313a', 2.54, .9, 8.6, x, 2.6, -2)); }
    g.add(partsMesh(p)); nameBoard(g, sp, h + 1.6, Math.min(w * .6, 20), d / 2 - 1.5, '#7a1e14', '#f4ead6'); },
  sangsad(g, sp){ const { w, d, h } = sp;
    const conc = lam({ map: texRep(bandTex, 1, 1), color: 0xd8d2c4 });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(w * .22, w * .22, h, 8), lam({ color: 0xcfc9bb })); core.position.y = h / 2; g.add(core);
    const p = [];
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; const x = Math.cos(a) * w * .3, z = Math.sin(a) * d * .3; p.push(P(BOXG, '#d6d0c2', x, h * .4, z, 0, -a, 0, w * .16, h * .8, d * .14)); }
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; p.push(P(CYLG, '#3a3a3a', Math.cos(a) * w * .3, h * .45, Math.sin(a) * d * .3, Math.PI / 2, -a, 0, 2.2, 1, 2.2)); }
    g.add(partsMesh(p));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d * .25), new THREE.MeshPhongMaterial({ color: 0x3d6b72, shininess: 80 })); water.rotation.x = -Math.PI / 2; water.position.set(0, .1, d * .42); g.add(water);
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam({ color: 0x5f8a3e })); lawn.rotation.x = -Math.PI / 2; lawn.position.y = .05; g.add(lawn);
    nameBoard(g, sp, 2.4, 14, d / 2 + .1, '#1f5e57', '#f4ead6'); void conc; },
  asadgate(g, sp){ const p = [B('#e9e4d8', 1.4, 7, 1.4, -4, 3.5, 0), B('#e9e4d8', 1.4, 7, 1.4, 4, 3.5, 0), B('#e3ddcf', 10, 1.6, 1.8, 0, 7.6, 0), P(CONEG, '#e3ddcf', 0, 9.2, 0, 0, 0, 0, 1.6, 2, 1.6)];
    g.add(partsMesh(p)); nameBoard(g, sp, 7.6, 7, .95, '#5b3a1f', '#f4ead6'); },
  bgb(g, sp){ const { w, d } = sp; const p = []; const gateW = 9;
    for (const sd of [-1, 1]) { const segW = w / 2 - gateW / 2 - 1.2; p.push(B('#8a3b2b', segW, 3.2, .6, sd * (gateW / 2 + 1.2 + segW / 2), 1.6, d / 2 - .4)); p.push(B('#efe9dc', segW, .3, .7, sd * (gateW / 2 + 1.2 + segW / 2), 3.3, d / 2 - .4)); p.push(B('#8a3b2b', .6, 3.2, d - 1.4, sd * (w / 2 - .3), 1.6, -.3)); }
    p.push(B('#8a3b2b', w, 3.2, .6, 0, 1.6, -d / 2 + .3));
    p.push(B('#2f5d3a', 1.6, 6.2, 1.6, -gateW / 2 - .4, 3.1, d / 2 - .4), B('#2f5d3a', 1.6, 6.2, 1.6, gateW / 2 + .4, 3.1, d / 2 - .4), B('#2f5d3a', gateW + 2.8, 1.6, 1.8, 0, 6.6, d / 2 - .4), B('#c22f2f', gateW + 2.8, .3, 1.9, 0, 7.5, d / 2 - .4));
    for (let x = -w / 2 + 4; x < w / 2 - 3; x += 6.5) if (Math.abs(x) > 7) treeParts(p, x, d / 2 - 5, 1.0, Math.abs(Math.round(x)) % 13 < 2);
    p.push(B('#6b8a4a', w - 2, .15, d - 2, 0, .08, 0), B('#e6dcc4', w * .5, 10, 10, 0, 5, -d / 2 + 7), B('#c22f2f', w * .52, .5, 10.4, 0, 10.2, -d / 2 + 7));
    g.add(partsMesh(p)); const gs = signPlane(sp.bn, sp.en, gateW + 2.6, 1.5, '#2f5d3a', '#f4ead6'); gs.position.set(0, 6.6, d / 2 + .52); g.add(gs);
    g.add(partsMesh([C('#d9d4c7', .08, 9, gateW / 2 + 3, 4.5, d / 2 + .6)])); flagMesh(g, gateW / 2 + 3, d / 2 + .6, 9); },
});
