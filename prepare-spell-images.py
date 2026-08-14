# -*- coding: utf-8 -*-
"""Turns raw ComfyUI spell art into web icons for the codex.

DROP THE FILES HERE:  crystalforge\\scarred-lands\\spellart\\
Anything matching  sp_{slug}_00001_.png  is picked up; the trailing ComfyUI
counter does not matter. The slug is whatever build-codex-book.py's
spell_slug() produces, so `sp_doublemoon.png` becomes `doublemoon.jpg`.

What it does:
  * renames  sp_doublemoon_00001_.png  ->  doublemoon.jpg
  * downscales to 256px square — displayed at 96px, so this covers 2x DPI
  * re-encodes to progressive JPEG at quality 82
  * deletes the source PNG once converted, when the filesystem allows it

Run it, then rebuild the codex with build-codex-book.py.
"""

import os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, 'scarred-lands', 'spellart')

SIZE = 256
QUALITY = 82

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow is missing. Install it with:  pip install Pillow')

os.makedirs(ART, exist_ok=True)
pat = re.compile(r'^sp_([a-z0-9-]+?)(?:_\d+_?)?$', re.I)

done, skipped, leftovers = [], [], []
for src in sorted(glob.glob(os.path.join(ART, '*.png')) +
                  glob.glob(os.path.join(ART, '*.PNG'))):
    stem = os.path.splitext(os.path.basename(src))[0]
    m = pat.match(stem)
    if not m:
        skipped.append(os.path.basename(src))
        continue
    slug = m.group(1).lower()
    out = os.path.join(ART, f'{slug}.jpg')
    im = Image.open(src).convert('RGB')
    if im.width != im.height:                 # centre-crop anything off-square
        s = min(im.width, im.height)
        l, t = (im.width - s) // 2, (im.height - s) // 2
        im = im.crop((l, t, l + s, t + s))
    if im.width > SIZE:
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
    im.save(out, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    try:
        os.remove(src)
    except OSError:
        leftovers.append(os.path.basename(src))
    done.append(f'{os.path.basename(out):34} {im.width}x{im.height}  '
                f'{os.path.getsize(out)/1024:5.0f} KB')

print(f'converted {len(done)} file(s):')
for d in done:
    print('  ', d)
if skipped:
    print('\nignored (name did not match sp_{slug}):')
    for x in skipped:
        print('  ', x)
if leftovers:
    print(f'\n{len(leftovers)} source PNG(s) could not be deleted from here — '
          'harmless, .gitignore keeps *.png out of the repo.')

have = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ART, '*.jpg')))
total_kb = sum(os.path.getsize(os.path.join(ART, h)) for h in have) / 1024
print(f'\n{len(have)} spell icon(s) present, {total_kb:.0f} KB total')
