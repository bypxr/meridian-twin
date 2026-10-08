"""Build app/index.html from the simulator, the UI parts and the trained model. Run: python src/build.py"""
import glob, os
d = os.path.dirname(os.path.abspath(__file__)) + '/'
t = open(d + 'template.html').read()
sim = open(d + 'sim.js').read(); geo = open(d + 'geo.json').read(); model = open(d + 'model.json').read()
app = '(function(){\n"use strict";\n' + '\n'.join(open(f).read() for f in sorted(glob.glob(d + 'parts/*.js'))) + '\n})();'
app = ''.join(c if ord(c) < 128 else '\\u%04x' % ord(c) for c in app)
t = ''.join(c if ord(c) < 128 else '&#%d;' % ord(c) for c in t)
out = t + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>\n<script>window.GEO=' + geo + ';window.MODEL=' + model + ';</script>\n<script>' + sim + '</script>\n<script>' + app + '</script>\n'
os.makedirs(d + '../app', exist_ok=True)
open(d + '../app/index.html', 'w').write(out); print('wrote app/index.html', len(out), 'bytes')
