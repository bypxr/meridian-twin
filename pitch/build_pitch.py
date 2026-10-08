"""Build app/pitch.html: the five slide pitch with the live prototype inside. Run after src/build.py: python pitch/build_pitch.py"""
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__)) + '/'
sys.path.insert(0, D)
from faq import FAQ
app = open(D + '../app/index.html').read().replace('<title>Meridian Twin</title>', '<title>Meridian Twin Pitch</title>', 1)
layer = open(D + 'deck_layer.html').read().replace('__FAQ__', json.dumps([[s, [list(x) for x in q]] for s, q in FAQ]))
head, js = layer.split('<script>', 1)
out = app + '\n' + ''.join(c if ord(c) < 128 else '&#%d;' % ord(c) for c in head) + '<script>' + ''.join(c if ord(c) < 128 else '\\u%04x' % ord(c) for c in js)
open(D + '../app/pitch.html', 'w').write(out); print('wrote app/pitch.html', len(out), 'bytes')
