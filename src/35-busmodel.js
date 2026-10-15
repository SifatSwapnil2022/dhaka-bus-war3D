/* ================================================================= bus model */
function makeTag(text, color){
  const c = makeCanvas(256, 64), g = c.getContext('2d');
  g.fillStyle = 'rgba(23,17,26,.82)'; g.beginPath(); if (g.roundRect) g.roundRect(8, 8, 240, 48, 10); else g.rect(8, 8, 240, 48); g.fill();
  g.fillStyle = color; g.fillRect(14, 22, 16, 20);
  g.fillStyle = '#f4ead6'; g.textAlign = 'left'; g.textBaseline = 'middle'; fitFill(g, text, 40, 33, 205, 700, 28, HS);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFrom(c), depthTest: false, transparent: true })); sp.scale.set(5.4, 1.35, 1); sp.position.set(0, 5.4, 0); sp.renderOrder = 5;
  return sp;
}
function buildBus(liv){
  const g = new THREE.Group(); const cv = busCanvases(liv);
  // sprung body pivots about a roll centre 1 m up; wheels stay on the road
  const bodyG = new THREE.Group(); bodyG.position.y = 1; g.add(bodyG); const bodyIn = new THREE.Group(); bodyIn.position.y = -1; bodyG.add(bodyIn);
  const mats = [lam({ map: texFrom(cv.L) }), lam({ map: texFrom(cv.R) }), lam({ color: new THREE.Color(liv.roof) }), lam({ color: 0x1a1816 }), lam({ map: texFrom(cv.F) }), lam({ map: texFrom(cv.B) })];
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.75, 10.6), mats); body.position.y = .6 + 1.375; body.castShadow = true; body.receiveShadow = true; bodyIn.add(body);
  const sh = new THREE.Shape(); const hw = 1.275, rr = .26, rh = .32; sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(hw, rh - rr); sh.quadraticCurveTo(hw, rh, hw - rr, rh); sh.lineTo(-hw + rr, rh); sh.quadraticCurveTo(-hw, rh, -hw, rh - rr); sh.lineTo(-hw, 0);
  const rg = new THREE.ExtrudeGeometry(sh, { depth: 10.5, bevelEnabled: false, curveSegments: 4 }); rg.translate(0, 0, -5.25);
  const roof = new THREE.Mesh(rg, mats[2]); roof.position.y = 3.35; roof.castShadow = true; bodyIn.add(roof);
  const det = [];
  det.push(B('#202020', 2.66, .38, .32, 0, .8, 5.36), B('#202020', 2.66, .38, .32, 0, .8, -5.36), B('#8f8f8f', 2.3, .08, .12, 0, 1.05, 5.5));
  det.push(B('#fffbe6', .5, .24, .06, .86, 1.43, 5.32), B('#fffbe6', .5, .24, .06, -.86, 1.43, 5.32), B('#d81e1e', .34, .3, .06, .95, 1.3, -5.32), B('#d81e1e', .34, .3, .06, -.95, 1.3, -5.32));
  det.push(B('#5c5c5c', .7, .22, 1.2, 0, 3.75, 1.6), B('#5c5c5c', .7, .22, 1.2, 0, 3.75, -2.4));
  det.push(C('#3a3a3a', .07, .5, -.9, .5, -5.45, Math.PI / 2, 0, 0), B('#7a7a7a', .5, .14, .9, 1.42, .55, 4.1));
  for (const sx of [1, -1]) { det.push(B('#1c1c1c', .07, .07, .95, sx * 1.38, 3.05, 5.58, sx * -.35)); det.push(B(liv.id === 'raida' ? '#f2f0ea' : '#222222', .16, .6, .3, sx * 1.58, 2.7, 5.98)); }
  bodyIn.add(partsMesh(det));
  const wg = new THREE.CylinderGeometry(.52, .52, .34, 14); wg.rotateZ(Math.PI / 2);
  const wm = lam({ color: 0x161616 }), hub = lam({ color: 0xb8b2a6 }); const hubG = new THREE.CylinderGeometry(.22, .22, .36, 8); hubG.rotateZ(Math.PI / 2);
  const wheels = [], steer = [];
  for (const [x, z] of [[1.12, 2.88], [-1.12, 2.88], [1.12, -2.92], [-1.12, -2.92]]) {
    const w = new THREE.Mesh(wg, wm); w.castShadow = true; w.add(new THREE.Mesh(hubG, hub)); wheels.push(w);
    if (z > 0) { const piv = new THREE.Group(); piv.position.set(x, .52, z); piv.add(w); g.add(piv); steer.push(piv); } else { w.position.set(x, .52, z); g.add(w); }
  }
  const helper = new THREE.Group(); helper.position.set(1.3, .6, 4.05);
  helper.add(partsMesh([C('#2a3a5a', .13, .9, 0, .45, 0), C(['#f4f1ea', '#c9e0f2', '#e9d8a6'][Math.floor(Math.random() * 3)], .2, .75, .05, 1.25, 0), P(SPHG, '#5a3a26', .08, 1.8, 0, 0, 0, 0, .17, .17, .17)], false));
  const arm = new THREE.Group(); arm.position.set(.1, 1.55, 0); arm.add(partsMesh([B('#5a3a26', .1, .1, .7, 0, 0, .3)], false)); helper.add(arm);
  bodyIn.add(helper);
  const shd = new THREE.Mesh(GEO_SHADOW(), MATS.shadow); shd.rotation.x = -Math.PI / 2; shd.scale.set(3.9, 12.4, 1); shd.position.y = .05; g.add(shd);
  scene.add(g);
  return { group: g, body: bodyG, wheels, steer, mats, helper, arm };
}
