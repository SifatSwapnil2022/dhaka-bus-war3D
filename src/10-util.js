const $ = id => document.getElementById(id);
function FAIL(msg){ $('fail').hidden = false; $('menu').hidden = true; $('loading').hidden = true; if (msg) $('failMsg').textContent = msg; }
if (typeof THREE === 'undefined') { FAIL(); return; }

/* ================================================================= helpers */
const BN = '০১২৩৪৫৬৭৮৯';
const bn = n => String(n).replace(/-/g, '−').replace(/\d/g, d => BN[d]);
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return bn(Math.floor(s / 60)) + ':' + bn(String(s % 60).padStart(2, '0')); };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
const wrapA = d => { d = (d + Math.PI) % (2 * Math.PI); if (d < 0) d += 2 * Math.PI; return d - Math.PI; };
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = a => a[Math.floor(Math.random() * a.length)];
const HS = '"Hind Siliguri", "Baloo Da 2", sans-serif';
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/* =================================================================
   geography: real latitude/longitude, projected with true bearings.
   North is -z, east is +x. Distances are a quarter of the real ones,
   road widths stay close to real, so the city keeps its shape and the
   drive stays short enough for a race.
   ================================================================= */
const GEO = { lat0: 23.775, lon0: 90.395, scale: 4 };
const M_LAT = 110700, M_LON = 111320 * Math.cos(GEO.lat0 * Math.PI / 180);
function LL(lat, lon){ return [(lon - GEO.lon0) * M_LON / GEO.scale, -(lat - GEO.lat0) * M_LAT / GEO.scale]; }

/* road cross-section. lat > 0 is the left of travel along an edge (a -> b):
   in left-hand traffic that is where a -> b traffic drives. */
const LW = 3.6, SWALK = 4.6, CURB_H = .3;
const ROAD_CLS = {
  A4: { div: true,  nl: 4, med: .7, label: 'প্রধান সড়ক', speed: 1.0 },
  A3: { div: true,  nl: 3, med: .65, label: 'প্রধান সড়ক', speed: .92 },
  D2: { div: true,  nl: 2, med: .6, label: 'সড়ক', speed: .88 },
  B:  { div: false, nl: 2, med: 0,  label: 'সড়ক', speed: .74 },
  C:  { div: false, nl: 1, med: 0,  label: 'গলি', speed: .55 },
};
const BUS_HW = 1.28, BUS_HL = 5.3;
const STOP_ZONE = 15, BOARD_SPEED = 4.8, MAXQ = 24;
const FARE_KM = 2.53, FARE_MIN = 10;
