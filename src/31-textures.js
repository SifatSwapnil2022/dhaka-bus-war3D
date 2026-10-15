/* ================================================================= textures */
function asphaltTex(){
  const c = makeCanvas(256, 512), g = c.getContext('2d');
  g.fillStyle = '#3d3c3f'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2800; i++) { const v = 42 + Math.random() * 30 | 0; g.fillStyle = `rgba(${v},${v},${v + 3},.5)`; g.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); }
  for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '72,70,68' : '34,33,35'},.5)`; g.fillRect(Math.random() * 220, Math.random() * 480, 30 + Math.random() * 60, 20 + Math.random() * 70); }
  for (let i = 0; i < 5; i++) { const x = Math.random() * 256, y = Math.random() * 512, r = 8 + Math.random() * 18; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(10,10,12,.45)'); gr.addColorStop(1, 'rgba(10,10,12,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.fillStyle = 'rgba(232,226,210,.72)'; g.fillRect(5, 0, 4, 512); g.fillStyle = 'rgba(232,190,40,.7)'; g.fillRect(246, 0, 4, 512);
  g.fillStyle = 'rgba(232,226,210,.6)'; for (const x of [64, 128, 192]) { g.fillRect(x - 2, 40, 4, 180); g.fillRect(x - 2, 296, 4, 180); }
  return texFrom(c, true);
}
function paverTex(){
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#7f776b'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) { const v = 120 + Math.random() * 30 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.fillRect(x + 1.5, y + 1.5, 29, 29); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(40,30,20,${Math.random() * .15})`; g.fillRect(Math.random() * 128, Math.random() * 128, 3, 3); }
  return texFrom(c, true);
}
function curbTex(){ const c = makeCanvas(8, 64), g = c.getContext('2d'); g.fillStyle = '#e5b21b'; g.fillRect(0, 0, 8, 32); g.fillStyle = '#1b1a18'; g.fillRect(0, 32, 8, 32); return texFrom(c, true); }
function grassTex(){ const c = makeCanvas(128, 128), g = c.getContext('2d'); g.fillStyle = '#4c6b34'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${40 + Math.random() * 50 | 0},${80 + Math.random() * 60 | 0},${30 + Math.random() * 20 | 0},.6)`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 3); } return texFrom(c, true); }
function groundTex(){
  const c = makeCanvas(256, 256), g = c.getContext('2d'); g.fillStyle = '#6b604f'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) { const v = 80 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v + 10},${v},${v - 18},.35)`; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
  return texFrom(c, true);
}
function windowAtlas(){
  const c = makeCanvas(256, 256), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .06})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 6, 2 + Math.random() * 6); }
  const glassC = ['#2c3742', '#34404b', '#283139', '#3b4652'];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
    const x = k * 64, y = r * 64, v = (r * 4 + k * 7) % 5;
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 8, y + 12, 48, 5);
    g.fillStyle = v === 0 ? '#e5bf78' : glassC[(r + k) % 4]; g.fillRect(x + 12, y + 18, 40, 32);
    g.strokeStyle = 'rgba(28,28,28,.75)'; g.lineWidth = 1.5;
    for (let gx = x + 16; gx < x + 52; gx += 6) { g.beginPath(); g.moveTo(gx, y + 18); g.lineTo(gx, y + 50); g.stroke(); }
    g.beginPath(); g.moveTo(x + 12, y + 34); g.lineTo(x + 52, y + 34); g.stroke();
    if (v === 3) { g.fillStyle = '#d9d9d4'; g.fillRect(x + 38, y + 44, 18, 11); g.fillStyle = '#777'; g.fillRect(x + 40, y + 47, 14, 2); }
    if (v === 2) { const cols = ['#c33', '#36c', '#e9b627', '#2a9d5c']; for (let q = 0; q < 3; q++) { g.fillStyle = cols[(q + r) % 4]; g.fillRect(x + 16 + q * 12, y + 52, 9, 9); } }
    g.fillStyle = 'rgba(60,50,40,.12)'; g.fillRect(x + 14, y + 50, 4, 12);
  }
  return texFrom(c, true);
}
function glassTexC(){
  const c = makeCanvas(128, 128), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#4f7f94'); gr.addColorStop(.5, '#2e5568'); gr.addColorStop(1, '#40697c'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(0, 90); g.lineTo(90, 0); g.lineTo(120, 0); g.lineTo(0, 120); g.fill();
  g.fillStyle = '#c9d1d4'; for (let i = 0; i <= 128; i += 32) { g.fillRect(i - 1, 0, 2, 128); g.fillRect(0, i - 1.5, 128, 3); }
  return texFrom(c, true);
}
function brickTex(){
  const c = makeCanvas(128, 128), g = c.getContext('2d'); g.fillStyle = '#c9b8a6'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < 128; x += 16) { const v = Math.random() * 30 | 0; g.fillStyle = `rgb(${150 + v},${58 + v * .4 | 0},${42 + v * .3 | 0})`; g.fillRect(x + 1, y + 1, 14, 6); }
  g.fillStyle = '#efe9dc'; g.fillRect(40, 30, 48, 70); g.beginPath(); g.arc(64, 30, 24, Math.PI, 0); g.fill();
  g.fillStyle = '#2c3a42'; g.fillRect(46, 34, 36, 62); g.beginPath(); g.arc(64, 34, 18, Math.PI, 0); g.fill();
  g.fillStyle = '#efe9dc'; g.fillRect(62, 18, 4, 80); g.fillRect(46, 60, 36, 3); g.fillRect(36, 100, 56, 6);
  return texFrom(c, true);
}
function bandTex(){
  const c = makeCanvas(128, 128), g = c.getContext('2d'); g.fillStyle = '#ebe3d1'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#2d3e4a'; g.fillRect(0, 36, 128, 40); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 38, 128, 6);
  g.fillStyle = '#d4cab4'; for (let x = 0; x < 128; x += 32) g.fillRect(x, 36, 3, 40);
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g.fillRect(Math.random() * 128, Math.random() * 128, 4, 4); }
  return texFrom(c, true);
}
function radialTex(){ const c = makeCanvas(64, 64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return texFrom(c); }
function smokeTex(){ const c = makeCanvas(64, 64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(60,58,56,.7)'); gr.addColorStop(1, 'rgba(60,58,56,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return texFrom(c); }
function skyTex(){
  const c = makeCanvas(16, 512), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#5f7591'); gr.addColorStop(.42, '#a7a7a8'); gr.addColorStop(.62, '#d7ad7f'); gr.addColorStop(1, '#c9a07a');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512); return texFrom(c);
}
const TEXC = {};
function texRep(make, rx, ry){ if (!TEXC[make.name]) TEXC[make.name] = make(); const t = TEXC[make.name].clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t; }
function labelTex(bnT, enT, bg, fg, w = 512, h = 128){
  const c = makeCanvas(w, h), g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.globalAlpha = .55; g.lineWidth = Math.max(3, h * .025); g.strokeRect(h * .05, h * .05, w - h * .1, h - h * .1); g.globalAlpha = 1;
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFill(g, bnT, w / 2, h * (enT ? .42 : .52), w - h * .3, 700, h * .46, HS);
  if (enT) { g.globalAlpha = .85; fitFill(g, enT.toUpperCase(), w / 2, h * .8, w - h * .4, 700, h * .16, '"Baloo Da 2", sans-serif'); g.globalAlpha = 1; }
  return texFrom(c);
}
function signPlane(bnT, enT, w, h, bg = '#0f6b3f', fg = '#f4ead6'){
  const ch = clamp(Math.round(512 * h / w), 64, 256);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam({ map: labelTex(bnT, enT, bg, fg, 512, ch) }));
}

/* ---------- bus liveries (painted from the real buses) ---------- */
const SW = 1024, SH = 280, FW = 256, FH = 292;
function wearPass(g, w, Wd, H){
  const n = Math.floor(w * 90 * Wd / 1024);
  for (let i = 0; i < n; i++) { const x = Math.random() * Wd, y = H * .15 + Math.random() * H * .85; g.strokeStyle = `rgba(${70 + Math.random() * 40 | 0},${60 + Math.random() * 30 | 0},50,${.15 + Math.random() * .3})`; g.lineWidth = .8 + Math.random() * 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 60, y + (Math.random() - .5) * 12); g.stroke(); }
  const m = Math.floor(w * 14 * Wd / 1024 + 1);
  for (let i = 0; i < m; i++) { const x = Math.random() * Wd, y = H * .55 + Math.random() * H * .45, r = 6 + Math.random() * 22; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(110,60,25,${.35 * w + .1})`); gr.addColorStop(1, 'rgba(110,60,25,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  const d = g.createLinearGradient(0, H * .6, 0, H); d.addColorStop(0, 'rgba(120,100,70,0)'); d.addColorStop(1, `rgba(120,100,70,${.25 + w * .45})`); g.fillStyle = d; g.fillRect(0, H * .6, Wd, H * .4);
}
function star(g, x, y, r){ g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
const LIVERY = {
  bolaka: {
    side(g){
      g.fillStyle = '#f3efe4'; g.fillRect(0, 192, SW, 50); g.fillStyle = '#161616'; g.fillRect(0, 188, SW, 4); g.fillRect(0, 242, SW, 4);
      g.fillStyle = '#f2c21b'; g.beginPath(); g.moveTo(SW, 140); g.lineTo(936, 140); g.quadraticCurveTo(884, 204, 944, 266); g.lineTo(SW, 266); g.fill();
      g.fillStyle = '#c8231c'; g.beginPath(); g.moveTo(SW, 168); g.quadraticCurveTo(962, 178, 952, 264); g.lineTo(978, 264); g.quadraticCurveTo(988, 196, SW, 194); g.fill();
    },
    text(g, fx){ g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 40px ${HS}`; g.fillStyle = '#c8231c'; g.fillText('বলাকা', fx(250), 218); g.fillStyle = '#1f3f9b'; g.fillText('এক্সপ্রেস লিঃ', fx(470), 218); g.font = `600 20px ${HS}`; g.fillStyle = '#fff'; g.fillText('সায়েদাবাদ — গাজীপুর', fx(650), 166); },
    front(g){ g.fillStyle = '#f2c21b'; g.fillRect(0, 176, FW, 86); g.fillStyle = '#c8231c'; g.beginPath(); g.moveTo(0, 230); g.quadraticCurveTo(FW / 2, 196, FW, 230); g.lineTo(FW, 244); g.quadraticCurveTo(FW / 2, 212, 0, 244); g.fill(); },
  },
  raida: {
    side(g){
      g.fillStyle = '#f4c20d'; g.beginPath(); g.moveTo(SW, 262); g.bezierCurveTo(820, 250, 560, 150, 0, 176); g.lineTo(0, 204); g.bezierCurveTo(560, 182, 800, 272, SW, 286); g.closePath(); g.fill();
      g.fillStyle = '#d8252a'; g.beginPath(); g.moveTo(SW, 236); g.bezierCurveTo(820, 228, 560, 136, 0, 160); g.lineTo(0, 171); g.bezierCurveTo(560, 149, 820, 244, SW, 249); g.closePath(); g.fill();
      g.fillStyle = '#b59b4a'; g.fillRect(0, 252, SW, 28); g.fillStyle = '#f4c20d'; g.fillRect(0, 140, SW, 5);
    },
    text(g, fx){ g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 34px ${HS}`; strokeFill(g, 'রাইদা', fx(140), 228, '#ffffff', '#d8252a', 6); g.font = `600 18px ${HS}`; g.fillStyle = '#ffffff'; g.fillText('পোস্তগোলা — দিয়াবাড়ি', fx(640), 162); g.font = `600 16px ${HS}`; g.fillStyle = '#7a1214'; g.fillText('রাইদা এন্টারপ্রাইজ', fx(720), 268); },
    front(g){ g.fillStyle = '#f2f0ea'; g.fillRect(0, 178, FW, 30); g.fillStyle = '#f4c20d'; g.beginPath(); g.moveTo(0, 226); g.lineTo(FW / 2, 252); g.lineTo(FW, 226); g.lineTo(FW, 242); g.lineTo(FW / 2, 268); g.lineTo(0, 242); g.fill(); g.fillStyle = '#ffffff'; for (const x of [104, 128, 152]) star(g, x, 192, 6); },
  },
  shikor: {
    side(g){ g.fillStyle = '#c9252b'; g.fillRect(0, 140, SW, 10); g.fillRect(0, 238, SW, 20); g.fillStyle = '#2f9a52'; g.fillRect(0, 30, SW, 6); },
    text(g, fx){ g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 52px ${HS}`; strokeFill(g, 'শিকড়', fx(420), 196, '#c9252b', '#ffffff', 5); g.font = `600 18px ${HS}`; g.fillStyle = '#3b2a22'; g.fillText('মিরপুর — যাত্রাবাড়ী', fx(700), 170); },
    front(g){ g.fillStyle = '#c9252b'; g.fillRect(0, 236, FW, 26); g.fillStyle = '#2f9a52'; g.fillRect(0, 176, FW, 6); },
  },
  malancha: {
    side(g){ g.fillStyle = '#2b8fd2'; g.fillRect(0, 176, SW, 76); g.fillStyle = '#d0312d'; g.fillRect(0, 252, SW, 28); g.fillStyle = '#1f6ea6'; g.fillRect(0, 172, SW, 5); },
    text(g, fx){ g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 44px ${HS}`; g.fillStyle = '#ffffff'; g.fillText('মালঞ্চ', fx(380), 215); g.font = `600 18px ${HS}`; g.fillStyle = '#2a2a2a'; g.fillText('মোহাম্মদপুর — ধুপখোলা', fx(690), 158); },
    front(g){ g.fillStyle = '#2b8fd2'; g.fillRect(0, 176, FW, 86); },
  },
};
function paintSide(liv, isLeft){
  const c = makeCanvas(SW, SH), g = c.getContext('2d');
  g.fillStyle = liv.body; g.fillRect(0, 0, SW, SH);
  LIVERY[liv.id].side(g);
  g.fillStyle = liv.roof; g.fillRect(0, 0, SW, 24); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 22, SW, 4);
  const glass = (x, w, y = 34, h = 104) => {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3b4a55'); gr.addColorStop(1, '#1c252c'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    if (w > 50) { g.fillStyle = 'rgba(8,10,12,.55)'; for (let k = 0; k < 2; k++) if (Math.random() < .65) { const hx = x + 14 + Math.random() * (w - 28); g.beginPath(); g.arc(hx, y + h - 30, 10, 0, 7); g.fill(); g.fillRect(hx - 14, y + h - 22, 28, 22); } }
    g.fillStyle = 'rgba(255,255,255,.10)'; g.beginPath(); g.moveTo(x + w * .2, y); g.lineTo(x + w * .5, y); g.lineTo(x + w * .2, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
  };
  const end = isLeft ? 856 : 932;
  for (let x = 24; x < end - 30; x += 84) glass(x, Math.min(84, end - x) - 8);
  if (isLeft) {
    for (const [x0, x1] of [[866, 948], [520, 590]]) {
      g.fillStyle = '#141a1f'; g.fillRect(x0, 34, x1 - x0, 226);
      glass(x0 + 6, x1 - x0 - 12, 40, 96); glass(x0 + 6, x1 - x0 - 12, 146, 70);
      g.fillStyle = '#9aa0a3'; g.fillRect(x0 + 4, 236, x1 - x0 - 8, 6);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x0 + (x1 - x0) / 2 - 1, 36, 2, 200);
    }
  } else glass(944, 66, 32, 116);
  for (const ax of [230, 792]) { g.fillStyle = '#16130f'; g.beginPath(); g.arc(ax, SH + 8, 56, Math.PI, 0); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 266, SW, 14);
  wearPass(g, liv.wear, SW, SH);
  let out = c;
  if (isLeft) { out = makeCanvas(SW, SH); const o = out.getContext('2d'); o.translate(SW, 0); o.scale(-1, 1); o.drawImage(c, 0, 0); o.setTransform(1, 0, 0, 1, 0, 0); }
  LIVERY[liv.id].text(out.getContext('2d'), isLeft ? (x => SW - x) : (x => x));
  return out;
}
function paintFront(liv){
  const c = makeCanvas(FW, FH), g = c.getContext('2d');
  g.fillStyle = liv.body; g.fillRect(0, 0, FW, FH);
  LIVERY[liv.id].front(g);
  g.fillStyle = '#151515'; g.fillRect(8, 4, FW - 16, 50); g.fillStyle = liv.board; g.fillRect(11, 7, FW - 22, 44);
  g.fillStyle = liv.boardInk; g.textAlign = 'center'; g.textBaseline = 'middle'; fitFill(g, liv.bn, FW / 2, 30, FW - 40, 700, 34, HS);
  const gr = g.createLinearGradient(0, 60, 0, 172); gr.addColorStop(0, '#46555f'); gr.addColorStop(1, '#1b232a'); g.fillStyle = gr; g.fillRect(10, 60, FW - 20, 112);
  g.fillStyle = 'rgba(6,8,10,.7)'; g.beginPath(); g.arc(62, 128, 13, 0, 7); g.fill(); g.fillRect(44, 140, 36, 32);
  g.fillStyle = liv.body; g.fillRect(FW / 2 - 3, 60, 6, 112);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(20, 60); g.lineTo(74, 60); g.lineTo(32, 172); g.lineTo(14, 172); g.fill();
  g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 170); g.lineTo(104, 120); g.moveTo(150, 170); g.lineTo(214, 120); g.stroke();
  if (liv.id === 'bolaka') { g.fillStyle = '#2f9a52'; g.fillRect(150, 148, 92, 20); g.fillStyle = '#fff'; g.font = `600 13px ${HS}`; g.fillText('মা-বাবার দোয়া', 196, 158); }
  for (const x of [16, FW - 62]) { g.fillStyle = '#1b1b1b'; g.fillRect(x - 2, 194, 50, 26); g.fillStyle = '#f7f3e3'; g.fillRect(x, 196, 30, 22); g.fillStyle = '#f2a516'; g.fillRect(x + 32, 196, 14, 22); }
  g.fillStyle = '#222'; g.fillRect(86, 190, 84, 36); g.fillStyle = '#4a4a4a'; for (let y = 194; y < 224; y += 7) g.fillRect(90, y, 76, 3);
  g.fillStyle = '#1d9a58'; g.fillRect(84, 234, 88, 22); g.fillStyle = '#0d1d12'; g.font = `600 10px ${HS}`; g.fillText(liv.plate, 128, 245);
  g.fillStyle = liv.id === 'malancha' ? '#d0312d' : '#2b2724'; g.fillRect(0, 262, FW, 30);
  wearPass(g, liv.wear, FW, FH);
  return c;
}
function paintBack(liv){
  const c = makeCanvas(FW, FH), g = c.getContext('2d');
  g.fillStyle = liv.body; g.fillRect(0, 0, FW, FH); LIVERY[liv.id].front(g);
  g.fillStyle = liv.roof; g.fillRect(0, 0, FW, 30);
  const gr = g.createLinearGradient(0, 44, 0, 136); gr.addColorStop(0, '#46555f'); gr.addColorStop(1, '#1b232a'); g.fillStyle = gr; g.fillRect(24, 44, FW - 48, 92);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 19px ${HS}`; strokeFill(g, '১০০ হাত দূরে থাকুন', FW / 2, 160, '#ffffff', '#1a1a1a', 4);
  for (const x of [14, FW - 50]) { g.fillStyle = '#7d0d0d'; g.fillRect(x, 194, 36, 36); g.fillStyle = '#e02424'; g.fillRect(x + 3, 197, 30, 18); g.fillStyle = '#f2a516'; g.fillRect(x + 3, 217, 30, 10); }
  g.fillStyle = '#1d9a58'; g.fillRect(84, 234, 88, 22); g.fillStyle = '#0d1d12'; g.font = `600 10px ${HS}`; g.fillText(liv.plate, 128, 245);
  g.fillStyle = '#2b2724'; g.fillRect(0, 262, FW, 30);
  wearPass(g, liv.wear * 1.2, FW, FH);
  return c;
}
const BUS_CANVAS = {};
function busCanvases(liv){ if (!BUS_CANVAS[liv.id]) BUS_CANVAS[liv.id] = { L: paintSide(liv, true), R: paintSide(liv, false), F: paintFront(liv), B: paintBack(liv) }; return BUS_CANVAS[liv.id]; }

