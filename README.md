# dhaka-bus-war3D

**ঢাকা বাস ওয়ার** is a 3D local-bus racing game set on Dhaka's real roads. You drive one of four real Dhaka buses (Bolaka, Raida, Shikor, Malancha), pick up jatri, drop them at the right stop and fight the other buses for passengers through rail gates, signals and broken roads.

It runs in the browser. Nothing needs to be installed.

## What is in the game

- **A real Dhaka road network, north up.** Every junction, road and landmark is placed from its real latitude and longitude, so Uttara and the Airport are to the north, Mirpur is north-west, Rampura and Badda are east, Dhanmondi is south-west and Gulistan/Motijheel are south. Distances are a quarter of the real ones so a race fits in a few minutes; road widths stay close to real.
- **60 roads, 33 junctions,** the Dhaka–Tongi railway with level crossings that close when a train actually comes, and the MRT Line-6 viaduct with stations above Rokeya Sarani.
- **52 landmarks on their real side of the road,** among them East West University, BRAC University, Jamuna Future Park, Dhanmondi Lake, Shimanto Square, BGB Headquarters, Dhaka College, City College, the National Parliament, Baitul Mukarram and Shahjalal Airport.
- **Five routes, both directions:** Gulistan → Kuril (Malibag, Rampura, Badda) · Mirpur 10 → Gulistan (under the metro) · Azimpur → Shyamoli (Dhanmondi) · Notun Bazar → Abdullahpur · Gulistan → Mohakhali → Kuril.
- **Free driving.** Enter any road, reverse, and U-turn at the median gaps. A bus has a realistic turning circle, so a solid median really stops you.
- **Broken roads:** potholes that jolt the bus, patched asphalt, crumbling edges, waterlogging, speed breakers and road works that fence off a lane.
- **The helper (হেলপার)** calls passengers and warns the driver in Dhaka Bangla: "মামা, ডান! প্লাস্টিক!", "আস্তে! সামনে রিকশা!", "মালিবাগ! রামপুরা! বাড্ডা! ওই ওই!". If the device has a Bangla voice installed, he also speaks.
- **Traffic:** rickshaws, CNGs, cars, microbuses, motorbikes and other buses keep to lanes, follow at a safe gap, wait at red lights and closed rail gates, and turn through junctions on smooth paths.
- **Fair scoring:** BRTA fares (৳2.53 per km, minimum ৳10). Fines depend on how hard you hit something, and one collision is charged only once. Red lights and driving the wrong way are fined too. Whoever reaches the last stop first gets a bonus.
- **AI rivals with personalities:** গরম ওস্তাদ (aggressive), পাকা ওস্তাদ (balanced), ঠান্ডা ওস্তাদ (cautious).
- **Bus feel:** sprung suspension, front wheels that steer, chase / far / driver's-seat cameras.

## Play

Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari). Or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

**Controls:** `↑`/`W` accelerate · `↓`/`S` brake, and reverse when stopped · `←` `→` steer · `H` horn · `Space` use item · `C` camera · `N` full map · `M` sound · `Esc` pause. On phones there are on-screen buttons. Choose **হালকা** graphics on slower phones.

Stop near the left curb inside the yellow bus-stop box and almost stop: jatri get on and off.

## Build from source

The game is written as plain JavaScript modules in `src/`. `build.py` joins them into the single `index.html`:

```bash
python3 build.py
```

| File | What it does |
| --- | --- |
| `src/20-data.js` | Junctions, roads, stops, routes, landmarks, railway and metro, all as real lat/lon |
| `src/40-network.js` | Road graph, junction shapes, drivable-area checks, route paths |
| `src/50-roads.js` | Road surfaces, lane markings, potholes, road works |
| `src/51-infra.js` | Railway and level crossings, metro, water, stops, signals, direction signs |
| `src/52-city.js` | Landmarks, neighbourhood-styled buildings, trees, poles and wires |
| `src/53-traffic.js` | Traffic on the road graph |
| `src/54-bus.js` | Bus physics, collisions, fares, AI rivals |
| `src/55-game.js` | Helper calls, race flow, camera, HUD, maps |
| `src/57-net.js` | Online rooms |

Built with [three.js](https://threejs.org/) r128. Fonts: Hind Siliguri, Baloo Da 2 and Galada from Google Fonts.

## Multiplayer

Four-player online rooms currently work when the game is opened as a Claude artifact. On a plain web host (GitHub Pages, Netlify) the game runs in single-player mode against three AI buses. A Firebase-based multiplayer for public hosting is planned.

## Roadmap

- Performance pass for phones
- Firebase multiplayer for public hosting
- Exact road curves from OpenStreetMap
- Day/night and rush hours, rain and flooding
- Jatri personalities, missions and a career mode

## Notes

Buildings are simplified versions of the real places, not exact models. Bus colours are taken from photos of the real buses.

Made by Md Sifatullah Sheikh.
