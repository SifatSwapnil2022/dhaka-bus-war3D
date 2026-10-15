"""Build index.html from the source modules in src/ (run: python3 build.py)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ORDER = ['00-head.html', '10-util.js', '20-data.js', '30-render.js', '31-textures.js', '32-signs.js', '33-lmstyles.js', '33b-lmstyles.js',
         '34-trafficmodels.js', '35-busmodel.js', '40-network.js', '50-roads.js', '51-infra.js', '52-city.js', '53-traffic.js',
         '54-bus.js', '55-game.js', '56-menu.js', '57-net.js', '90-sound.js', '99-boot.js']
out = ''.join(open(os.path.join(HERE, 'src', f), encoding='utf-8').read() for f in ORDER)
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(out)
print('index.html', len(out), 'bytes')
