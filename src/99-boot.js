/* ================================================================= boot */
const tick0 = () => new Promise(r => setTimeout(r, 0));
async function boot(){
  try { await Promise.race([Promise.all(['700 40px "Hind Siliguri"', '600 40px "Hind Siliguri"', '400 40px "Galada"', '800 40px "Baloo Da 2"'].map(f => document.fonts.load(f, 'বাস ঢাকা'))), new Promise(r => setTimeout(r, 3500))]); } catch (e) {}
  await tick0();
  try {
    MATS.shadow = new THREE.MeshBasicMaterial({ map: radialTex(), transparent: true, depthWrite: false });
    smokeMat = new THREE.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: .5 });
    try {
      const b = parseInt(localStorage.getItem('dbw.bus'), 10); if (b >= 0 && b < 4) Game.mySlot = b;
      const n = localStorage.getItem('dbw.nick'); if (n) { Game.nick = cleanNick(n); $('nick').value = Game.nick; }
      const d = parseInt(localStorage.getItem('dbw.dur'), 10); if ([240, 360, 480].includes(d)) Game.dur = d;
      const q = localStorage.getItem('dbw.hq'); if (q === '0' || q === '1') Game.hq = q === '1';
      const r = parseInt(localStorage.getItem('dbw.route'), 10); if (r >= 0 && r < ROUTES.length) Game.route = r;
      Game.rev = localStorage.getItem('dbw.rev') === '1';
      const vo = localStorage.getItem('dbw.voice'); if (vo === '0' || vo === '1') Game.voice = vo === '1';
    } catch (e) {}
    const msg = t => { $('loadMsg').textContent = t; };
    msg('রাস্তা আর মোড় বসানো হচ্ছে…'); await tick0();
    buildNetwork(); buildCoarse(); buildRailLine();
    ROUTES.forEach((R, i) => { for (const rev of [false, true]) { const RP = buildRoutePath(R, rev); routeRails(RP); RPS[R.id + (rev ? '<' : '>')] = RP; placeRouteStops(RP); } });
    buildSky(); buildMetro(); reserveRail(); buildWater();
    buildFootbridges(); buildSignals(); finishSignals(); buildGantries();
    msg('ভাঙা রাস্তা, রেললাইন আর স্টপ…'); await tick0();
    buildRoads(); buildDamage(); buildRailMeshes(); buildStopPlaces();
    msg('ভবন আর স্থাপনা…'); await tick0();
    buildLandmarks(); buildCity(Game.hq); buildStreetFurniture(Game.hq); buildPeds(isTouch ? 120 : 200); buildJamPool();
    AG_N = Game.hq ? 66 : 44;
    buildMenu(); setupAttract(); resize(); applyGfx(); setScreen('menu');
    requestAnimationFrame(t => { last = t; frame(t); });
    initRoom();
  } catch (e) { console.error(e); FAIL('শহর বানাতে গিয়ে একটা সমস্যা হলো: ' + (e && e.message ? e.message : e)); }
}
window.__dbw = { Game, W, NET, get vehicles(){ return vehicles; }, AG, RPS, RAIL, METRO, LANDMARKS, LM_PLACED, FP, STOP_PLACES, STATIC_OBS, WATER, startRace, soloSeats, obb, get me(){ return me; }, input, raceStep, attractStep, armState, roadPush, nearestEdge, juncAt, routePath, rpAt, eAt, setupAttract, drawBigMap, toggleMap, camera, scene, renderer, TILES, AG_N: () => AG_N, aiScan, laneGap, rpLanes, rpMeta, aiInput, OBS: () => OBS, STATIC_OBS, trafficRows, netTraffic, stepProxies, adoptProxies, foci, PROXY, becomeHost, initTraffic, updateRail, helperSay, followSun, METRO_RP: () => METRO.RP, closeup: () => ({ camPos, camLook }), spawnAgent, listRemove, PROF };
boot();
})();
</script>
