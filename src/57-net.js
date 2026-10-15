/* =================================================================
   online play: presence-only sync. The host owns passengers, AI buses,
   traffic and crowd events; each player owns their own bus.
   ================================================================= */
const Net = { room: null, named: null, code: '', jt: 0, lastSend: 0, lastTrSend: 0, hostPeer: null, seats: null, lastHost: null, myPeer: null, leftAt: {}, lastTr: null };
const CODE_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function viewers(){ if (!Net.named) return []; return Net.named.peers().filter(p => p.kind === 'viewer' && p.presence && p.presence.v === 3); }
function pickHost(list){ if (!list.length) return null; return list.slice().sort((a, b) => (num(a.presence.jt, 9e15) - num(b.presence.jt, 9e15)) || (a.peer < b.peer ? -1 : 1))[0]; }
function setPres(patch){ if (Net.named) Net.named.presence(patch).catch(() => {}); }
async function initRoom(){
  let room = null;
  try { if (window.claude && typeof window.claude.use === 'function') room = await window.claude.use('room'); } catch (e) { room = null; }
  Net.room = room; const ok = !!room;
  $('createBtn').disabled = !ok; $('joinBtn').disabled = !ok;
  $('onlineState').textContent = ok ? 'প্রস্তুত' : 'এখানে চালু নেই';
  if (!ok) $('onlineNote').textContent = 'অনলাইন রুম চলে যখন পেজটি Claude-এ সাইন-ইন করা অবস্থায় খোলা হয় এবং বন্ধুদের সাথে শেয়ার করা থাকে। পাবলিক লিংক বা আলাদা ফাইল হিসেবে খুললে একা খেলা যাবে।';
}
async function joinRoom(code){
  code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (code.length !== 4) { $('onlineNote').textContent = '৪ অক্ষরের কোড দিন, যেমন: K7QM'; return; }
  try { Net.named = await Net.room.join('dbw3-' + code.toLowerCase()); }
  catch (e) { $('onlineNote').textContent = 'রুমে ঢোকা গেল না (' + (e && e.code ? e.code : 'error') + ')। একটু পরে আবার চেষ্টা করুন।'; return; }
  Net.code = code; Net.jt = Date.now(); Net.lastHost = null; $('roomCode').textContent = code; audioInit();
  setPres({ v: 3, ph: 'lobby', nm: Game.nick || 'খেলোয়াড়', bus: Game.mySlot, jt: Net.jt, dur: Game.dur, route: Game.route, rev: Game.rev ? 1 : 0 });
  Net.named.onPeers(() => { if (Game.mode === 'lobby') renderLobby(); });
  toLobby();
}
function toLobby(){
  W.online = true; Game.mode = 'lobby'; setEngine(false);
  if (!attract.length) setupAttract();
  setPres({ ph: 'lobby', rid: null, k: null, sc: null, b: null, jm: null, t: null, sp: null, ab: null, ai: null, aj: null, seats: null, hn: null, tr: null, sg: null, hot: null, fn: null, dur: Game.dur, route: Game.route, rev: Game.rev ? 1 : 0 });
  setScreen('lobby'); renderLobby();
}
function leaveRoom(){ if (Net.named) Net.named.leave().catch(() => {}); Net.named = null; Net.code = ''; W.online = false; }
function renderLobby(){
  const list = viewers().slice().sort((a, b) => num(a.presence.jt, 9e15) - num(b.presence.jt, 9e15));
  const host = pickHost(list), iAmHost = host && host.sameTab;
  const ol = $('seats'); ol.textContent = '';
  for (let i = 0; i < 4; i++) {
    const p = list[i]; const li = document.createElement('li');
    const chip = document.createElement('span'); chip.className = 'chip'; const who = document.createElement('span'); who.className = 'who';
    if (p) {
      const bi = clamp(Math.floor(num(p.presence.bus, 0)), 0, 3); chip.style.background = BUSES[bi].chip;
      who.textContent = String(p.presence.nm || 'খেলোয়াড়').slice(0, 14) + ' · ' + BUSES[bi].bn; li.append(chip, who);
      if (p === host) { const pl = document.createElement('span'); pl.className = 'pill host'; pl.textContent = 'হোস্ট'; li.appendChild(pl); }
      if (p.sameTab) { const pl = document.createElement('span'); pl.className = 'pill me'; pl.textContent = 'আপনি'; li.appendChild(pl); }
    } else { chip.style.background = 'rgba(255,255,255,.12)'; who.textContent = 'খালি সিট · AI চালাবে'; who.style.color = 'var(--muted)'; li.append(chip, who); }
    ol.appendChild(li);
  }
  const pk = $('lobbyPick'); if (!pk.children.length) BUSES.forEach((b, i) => { const bt = document.createElement('button'); bt.type = 'button'; const c = document.createElement('span'); c.className = 'chip'; c.style.background = b.chip; const t = document.createElement('span'); t.textContent = b.bn; bt.append(c, t); bt.addEventListener('click', () => { Game.mySlot = i; setPres({ bus: i }); renderLobby(); }); pk.appendChild(bt); });
  [...pk.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === Game.mySlot)));
  const hr = host ? clamp(Math.floor(num(host.presence.route, 0)), 0, ROUTES.length - 1) : Game.route, hrev = host ? !!num(host.presence.rev, 0) : Game.rev;
  const RP = routePath(hr, hrev); $('lobbyRoute').textContent = `রুট: ${RP.stops[0].site.bn} → ${RP.stops[RP.stops.length - 1].site.bn} (${ROUTES[hr].sub})` + (iAmHost ? ' · মেনুতে রুট বদলালে এখানে আসবে' : '');
  const first4 = list.slice(0, 4); const dup = first4.some((p, i) => first4.some((q, k) => k !== i && num(q.presence.bus, 0) === num(p.presence.bus, 0)));
  let msg = list.length > 4 ? 'রুমে ৪ জনের বেশি আছে, প্রথম ৪ জন খেলবে। ' : '';
  if (dup) msg += 'দুজন একই বাস নিয়েছে। শুরু হলে একজন খালি বাসটা পাবে। ';
  msg += iAmHost ? `সবাই এলে "রেস শুরু" চাপুন। খেলার সময় ${bn(Game.dur / 60)} মিনিট।` : 'হোস্ট রেস শুরু করার অপেক্ষায়…';
  if (host && !host.sameTab && host.presence.ph === 'race') msg = 'একটা রেস চলছে। শেষ হলে হোস্ট নতুন রেস শুরু করলে আপনিও থাকবেন।';
  $('lobbyMsg').textContent = msg; $('startBtn').hidden = !iAmHost;
}
function hostStart(){
  const list = viewers().slice().sort((a, b) => num(a.presence.jt, 9e15) - num(b.presence.jt, 9e15)).slice(0, 4);
  const mine = list.find(p => p.sameTab); if (!mine) { $('lobbyMsg').textContent = 'রুমের সাথে এখনো যুক্ত হয়নি, এক সেকেন্ড পর আবার চাপুন।'; return; }
  const seatsMap = {}; const used = new Set();
  for (const p of list) { const want = clamp(Math.floor(num(p.presence.bus, 0)), 0, 3); if (!used.has(want)) { seatsMap[p.peer] = want; used.add(want); } }
  for (const p of list) if (seatsMap[p.peer] == null) { for (let s = 0; s < 4; s++) if (!used.has(s)) { seatsMap[p.peer] = s; used.add(s); break; } }
  beginOnlineRace(Math.random().toString(36).slice(2, 8), seatsMap, true, -3, Game.dur, Game.route, Game.rev);
}
function beginOnlineRace(rid, seatsMap, isHost, t0, dur, route, rev){
  const byPeer = {}; viewers().forEach(p => byPeer[p.peer] = p);
  const seats = {}; let mySlot = 0;
  for (let s = 0; s < 4; s++) seats[s] = { kind: isHost ? 'ai' : 'rai', name: aiName(s) };
  for (const peer in seatsMap) {
    const s = seatsMap[peer], p = byPeer[peer];
    if (p && p.sameTab) { seats[s] = { kind: 'me', name: Game.nick || 'আপনি', peer }; mySlot = s; Net.myPeer = peer; }
    else seats[s] = { kind: 'remote', name: p ? String(p.presence.nm || 'খেলোয়াড়').slice(0, 14) : 'খেলোয়াড়', peer };
  }
  Game.mySlot = mySlot; attract = [];
  startRace({ online: true, isHost, rid, seats, mySlot, t0, dur, route, rev });
  Net.seats = seatsMap; Net.lastHost = null; Net.lastTr = null;
  for (const v of vehicles) v.lastHn = 0;
  setPres({ ph: 'race', rid, seats: isHost ? seatsMap : null, dur, route, rev: rev ? 1 : 0 });
}
$('createBtn').addEventListener('click', () => { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CH[Math.floor(Math.random() * CODE_CH.length)]; joinRoom(c); });
$('joinBtn').addEventListener('click', () => joinRoom($('joinCode').value));
$('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('joinCode').value); });
$('startBtn').addEventListener('click', hostStart);
$('leaveBtn').addEventListener('click', () => { leaveRoom(); goMenu(); });
$('copyCode').addEventListener('click', () => {
  const done = () => { $('copyCode').textContent = 'কপি হয়েছে'; setTimeout(() => $('copyCode').textContent = 'কোড কপি', 1500); };
  try { navigator.clipboard.writeText(Net.code).then(done, selectCode); } catch (e) { selectCode(); }
});
function selectCode(){ const r = document.createRange(); r.selectNodeContents($('roomCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
setInterval(() => {
  if (!Net.named || (Game.mode !== 'lobby' && Game.mode !== 'results')) return;
  const list = viewers(); const host = pickHost(list); if (!host || host.sameTab) { if (Game.mode === 'lobby') { setPres({ route: Game.route, rev: Game.rev ? 1 : 0 }); renderLobby(); } return; }
  const hp = host.presence;
  if (hp.ph === 'race' && typeof hp.rid === 'string' && hp.rid !== W.rid && hp.seats && typeof hp.seats === 'object') {
    const mine = list.find(p => p.sameTab);
    if (mine && hp.seats[mine.peer] != null) {
      const clean = {}; for (const k in hp.seats) { const s = Math.floor(num(hp.seats[k], -1)); if (s >= 0 && s < 4) clean[k] = s; }
      if (Game.mode === 'results') setScreen('lobby');
      beginOnlineRace(hp.rid, clean, false, num(hp.t, -3), clamp(num(hp.dur, 360), 60, 900), clamp(Math.floor(num(hp.route, 0)), 0, ROUTES.length - 1), !!num(hp.rev, 0));
    }
  }
  if (Game.mode === 'lobby') renderLobby();
}, 300);
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
function netSend(){
  const now = performance.now(); if (now - Net.lastSend < 50) return; Net.lastSend = now;
  const p = { v: 3, ph: 'race', rid: W.rid, nm: Game.nick || 'খেলোয়াড়', bus: me.slot, jt: Net.jt,
    k: [r2(me.x), r2(me.z), r2(me.h), r2(me.speed)], sc: me.score, fn: me.fines, pc: me.pax.length, dl: me.delivered, b: me.b.slice(), hn: me.hornN, fin: me.finished ? me.place : 0,
    jm: me.jams.filter(j => j.until > W.t).map(j => [r2(j.x), r2(j.z), r2(j.until), r2(j.h)]) };
  if (W.isHost) {
    p.t = r2(W.t); p.sp = W.sp.slice(); p.seats = Net.seats; p.dur = W.dur; p.route = Game.route; p.rev = Game.rev ? 1 : 0; p.hot = W.hot ? [W.hot.i, r1(W.hot.until)] : null;
    const ab = new Array(NST()).fill(0), ai = [], aj = [];
    for (const v of vehicles) if (v.kind === 'ai') { for (let i = 0; i < NST(); i++) ab[i] += v.b[i]; ai.push([v.slot, r2(v.x), r2(v.z), r2(v.h), r2(v.speed), v.score, v.pax.length, v.delivered, v.hornN, v.fines]); for (const j of v.jams) if (j.until > W.t) aj.push([v.slot, r2(j.x), r2(j.z), r2(j.until), r2(j.h)]); }
    p.ab = ab; p.ai = ai; p.aj = aj;
    if (now - Net.lastTrSend > 150) { Net.lastTrSend = now; p.tr = trafficRows(foci()); }
    if (!Net.lastSg || now - Net.lastSg > 450) { Net.lastSg = now; p.sg = NET.juncs.filter(N => N.ctl).map(N => [N.ctl.ph, N.ctl.st === 'g' ? 0 : N.ctl.st === 'y' ? 1 : 2, Math.round(N.ctl.t * 10)]); }
  } else { p.t = null; p.sp = null; p.ab = null; p.ai = null; p.aj = null; p.seats = null; p.tr = null; p.hot = null; p.sg = null; }
  setPres(p);
}
function sanJam(j, o){ if (!Array.isArray(j)) return null; const x = num(j[o], NaN), z = num(j[o + 1], NaN); if (!isFinite(x) || !isFinite(z)) return null; return { x, z, until: num(j[o + 2], 0), h: num(j[o + 3], 0) }; }
function netRead(){
  const list = viewers(); const byPeer = {}; list.forEach(p => byPeer[p.peer] = p); const N = NST();
  for (const v of vehicles) {
    if (v.kind !== 'remote') continue;
    const p = byPeer[v.peer];
    if (!p || p.presence.ph !== 'race' || p.presence.rid !== W.rid) { if (!p) { Net.leftAt[v.peer] = Net.leftAt[v.peer] || performance.now(); if (performance.now() - Net.leftAt[v.peer] > 3000) v.gone = true; } continue; }
    delete Net.leftAt[v.peer]; v.gone = false; v.mesh.group.visible = true;
    const pr = p.presence, k = Array.isArray(pr.k) ? pr.k : null;
    if (k && v.netSrc !== pr) { v.netSrc = pr; v.net = { x: num(k[0], v.x), z: num(k[1], v.z), h: num(k[2], v.h), v: clamp(num(k[3], 0), -10, 45), at: performance.now() }; }
    v.score = Math.floor(num(pr.sc, v.score)); v.fines = Math.max(0, Math.floor(num(pr.fn, v.fines))); v.delivered = Math.floor(num(pr.dl, v.delivered));
    const fin = Math.floor(num(pr.fin, 0)); if (fin && !v.finished) { v.finished = true; v.place = fin; }
    if (Array.isArray(pr.b)) for (let i = 0; i < N; i++) v.b[i] = Math.max(0, Math.floor(num(pr.b[i], v.b[i])));
    v.jams = Array.isArray(pr.jm) ? pr.jm.slice(0, 4).map(j => sanJam(j, 0)).filter(Boolean) : [];
    const hn = Math.floor(num(pr.hn, 0)); if (hn > v.lastHn) { hornHits(v); playHornAt(v); v.lastHn = hn; }
  }
  const host = pickHost(list.filter(p => p.presence.ph === 'race' && p.presence.rid === W.rid)) || pickHost(list);
  const wasHost = W.isHost;
  if (host && host.sameTab) { if (!wasHost) becomeHost(); W.isHost = true; Net.hostPeer = host; }
  else if (host) {
    W.isHost = false; Net.hostPeer = host; const hp = host.presence;
    if (hp.rid === W.rid) {
      W.hostPres = hp; Net.lastHost = hp;
      if (Array.isArray(hp.hot)) { const i = Math.floor(num(hp.hot[0], -1)); if (i >= 0 && i < N) { W.hot = { i, until: num(hp.hot[1], 0) }; announceHot(); } } else W.hot = null;
      if (Array.isArray(hp.ai)) for (const row of hp.ai.slice(0, 4)) {
        if (!Array.isArray(row)) continue; const slot = Math.floor(num(row[0], -1)); const v = vehicles.find(u => u.slot === slot); if (!v || v.kind !== 'rai') continue;
        if (v.netSrc !== hp) v.net = { x: num(row[1], v.x), z: num(row[2], v.z), h: num(row[3], v.h), v: clamp(num(row[4], 0), -10, 45), at: performance.now() };
        v.score = Math.floor(num(row[5], v.score)); v.delivered = Math.floor(num(row[7], v.delivered)); v.fines = Math.max(0, Math.floor(num(row[9], 0)));
        const hn = Math.floor(num(row[8], 0)); if (hn > v.lastHn) { hornHits(v); playHornAt(v); v.lastHn = hn; }
      }
      for (const v of vehicles) if (v.kind === 'rai') { v.netSrc = hp; v.jams = []; }
      if (Array.isArray(hp.aj)) for (const row of hp.aj.slice(0, 8)) { if (!Array.isArray(row)) continue; const v = vehicles.find(u => u.slot === Math.floor(num(row[0], -1)) && u.kind === 'rai'); const j = sanJam(row, 1); if (v && j) v.jams.push(j); }
      if (Array.isArray(hp.tr) && hp.tr !== Net.lastTr) { Net.lastTr = hp.tr; netTraffic(hp.tr.slice(0, 160), performance.now()); }
      if (Array.isArray(hp.sg) && hp.sg !== Net.lastSgIn) { Net.lastSgIn = hp.sg; const J = NET.juncs.filter(N => N.ctl); if (hp.sg.length === J.length) J.forEach((N, i) => { const r = hp.sg[i]; if (!Array.isArray(r)) return; const ph = Math.floor(num(r[0], 0)); if (ph >= 0 && ph < N.ctl.phases.length) N.ctl.ph = ph; N.ctl.st = ['g', 'y', 'ar'][clamp(Math.floor(num(r[1], 0)), 0, 2)]; N.ctl.t = num(r[2], 0) / 10; }); }
    }
  }
}
function becomeHost(){
  const hp = Net.lastHost; const N = NST();
  if (hp && Array.isArray(hp.sp)) for (let i = 0; i < N; i++) W.sp[i] = Math.floor(num(hp.sp[i], W.sp[i]));
  let first = true;
  for (const v of vehicles) {
    if (v.kind !== 'rai') continue;
    v.kind = 'ai'; v.rpI = -1; routeTrack(v); edgeTrack(v);
    if (first && hp && Array.isArray(hp.ab)) { for (let i = 0; i < N; i++) v.b[i] = Math.floor(num(hp.ab[i], 0)); first = false; }
  }
  adoptProxies();
  W.hostPres = null;
}
