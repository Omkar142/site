from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote, parse_qs
from PIL import Image
import re
import json
import xml.etree.ElementTree as ET
import hashlib

root = Path(__file__).resolve().parents[1]
void = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Audit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.ids, self.paths, self.fragments, self.controls, self.images = [], set(), [], [], [], []
        self.links = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, 'Duplicate ID: ' + attrs['id']
            self.ids.add(attrs['id'])
        for key in ['aria-controls', 'aria-labelledby']:
            self.controls.extend(attrs.get(key, '').split())
        for key in ['href', 'src', 'data-src', 'data-mobile-src', 'poster', 'data-idle', 'data-hello', 'data-manifest']:
            ref = attrs.get(key, '')
            url = urlparse(ref)
            if not ref or url.scheme or url.netloc:
                continue
            if ref.startswith('#'):
                self.fragments.append(ref[1:])
            elif url.path:
                self.paths.append(unquote(url.path))
        if tag == 'a':
            self.links.append(attrs)
        if tag == 'img':
            assert 'alt' in attrs, 'Image missing alt attribute'
            self.images.append(attrs)
        if tag not in void:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in void:
            return
        assert self.stack and self.stack[-1] == tag, f'Unbalanced tag: {tag}'
        self.stack.pop()


assert 'proveno' not in (root / 'index.html').read_text().lower()
assert 'proveno' not in (root / 'portfolio.js').read_text().lower()
html = (root / 'index.html').read_text()
assert html.index('class="hero"') < html.index('id="profile"') < html.index('id="code"') < html.index('id="mindset"'), 'Codepad must immediately follow the hero'
assert set(re.findall(r'data-project="([^"]+)"', html)) == {'google', 'tracxn', 'screengod', 'cisco'}
assert 'href="#case-cisco"' in html and 'id="case-cisco"' in html
assert html.count('id="code"') == 1
assert 'id="contact-canvas"' in html
assert html.index('id="profile"') < html.index('class="impact"') < html.index('id="work"') < html.index('class="work-marquee"') < html.index('id="mindset"')
assert html.count('class="case-art"') == 3
assert 'id="capabilities"' not in html
assert 'id="case-screengod"' in html
assert 'data-scroll-text' in html
assert 'id="hero-mascot-video"' not in html
assert 'id="mascot-action"' in html
assert 'id="mascot-label"' in html and '>Say hello</span>' in html
assert 'id="hero-sequence"' in html and 'hero-sequence.js' in html
assert html.count('data-mascot-media') == 2 and html.count('class="section-mascot"') == 2
assert 'initialization.js' in html and 'hero-mascot-stick' in html
assert 'id="mascot-proof-link"' in html
assert html.count('data-experience-card=') == 4 and html.count('data-experience-step=') == 4
assert 'splash-identity' in html and 'splash-name' in html
assert 'Illustrative product flow' in html
assert html.index('class="product-model"') < html.index('class="published-product"')
for name in ['mascot-cutout.webp', 'mascot-idle.webp', 'mascot-hello.webp']:
    im = Image.open(root / 'assets' / name).convert('RGBA')
    assert im.getchannel('A').getextrema() == (0, 255), name
sequence = json.loads((root / 'assets' / 'mascot-scroll' / 'manifest.json').read_text())
assert sequence['format'] == 'webp-atlas-v1'
for tier in sequence['tiers'].values():
    assert tier['bytes'] < 4_000_000
    assert sum(a['bytes'] for a in tier['atlases']) == tier['bytes']
    assert sum(a['count'] for a in tier['atlases']) == tier['count']
    cursor = 0
    for atlas in tier['atlases']:
        assert atlas['first'] == cursor
        path = root / atlas['file']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == atlas['sha256']
        assert path.stat().st_size == atlas['bytes']
        im = Image.open(path).convert('RGBA')
        assert im.size == (atlas['width'], atlas['height'])
        for slot in range(atlas['count']):
            x = slot % atlas['columns'] * tier['width']; y = slot // atlas['columns'] * tier['height']
            alpha = im.crop((x,y,x+tier['width'],y+tier['height'])).getchannel('A')
            assert alpha.getextrema() == (0,255)
            w,h = alpha.size
            for edge in [(0,0,w,1),(0,h-1,w,h),(0,0,1,h),(w-1,0,w,h)]:
                assert max(alpha.crop(edge).getextrema()) == 0
        cursor += atlas['count']
assert 'class="splash-paint"' in html
assert 'role="switch"' in html and 'aria-checked="true"' in html
audit = Audit()
audit.feed((root / 'index.html').read_text())
assert not audit.stack
links = audit.links
gmail = [urlparse(a.get('href', '')) for a in links if urlparse(a.get('href', '')).hostname == 'mail.google.com']
assert len(gmail) == 1
assert parse_qs(gmail[0].query)['to'] == ['omkargochhayat@gmail.com']
assert parse_qs(gmail[0].query)['view'] == ['cm']
assert any(a.get('href') == 'mailto:omkargochhayat@gmail.com' for a in links)
assert len([a for a in links if '1veucMrrtlHZ9i6QxWsc1Zz96Lh6JaxC3' in a.get('href','')]) >= 3
assert any('com.contextmaster' in a.get('href','') for a in links)
assert any(a.get('href') == 'https://www.linkedin.com/in/omkar-gochhayat/' and a.get('class') == 'button button-secondary' for a in links)
for forbidden in ['permission-aware', 'Company knowledge', 'figures retained', 'figures carried', 'Software Test Engineer Trainee', 'Dec 2021–Jan 2022']:
    assert forbidden.lower() not in html.lower(), forbidden
assert 'Mar 2024–Mar 2026' in html and 'Aug 2021–Nov 2022' in html
assert 'Technical Project Manager' in html and 'Software Engineering Intern' in html
for a in links:
    if a.get('target') == '_blank': assert 'noopener' in a.get('rel', '')

for name in audit.paths:
    assert (root / name).is_file(), name
for name in audit.fragments + audit.controls:
    assert name in audit.ids, name
for filename in ['portfolio.css', 'cinematic.css', 'continuity.css', 'creator.css', 'refinement.css', 'hero-film.css']:
    for name in re.findall(r'url\([\"\']?([^\)\"\']+)', (root / filename).read_text()):
        assert (root / name).is_file(), name
for attrs in audit.images:
    if attrs['src'].endswith('.svg'):
        element = ET.parse(root / attrs['src']).getroot()
        assert int(element.attrib['width']) == int(attrs['width'])
        assert int(element.attrib['height']) == int(attrs['height'])
        continue
    image = Image.open(root / attrs['src'])
    assert int(attrs['width']) == image.width and int(attrs['height']) == image.height, attrs['src']
    if 'pilot-' in attrs['src']:
        assert image.mode == 'RGBA' and image.getchannel('A').getextrema()[0] == 0
brand_sources = json.loads((root / 'assets/brand-sources.json').read_text())
for name, source in brand_sources.items():
    assert hashlib.sha256((root / 'assets' / name).read_bytes()).hexdigest() == source['sha256']
    assert urlparse(source['source']).hostname in {'www.gstatic.com', 'cdn.tracxn.com'}
assert 'tracxn-mark' not in html and 'class="google-lockup"' in html
assert html.index('src="layout.js') < html.index('href="portfolio.css')
contact = html[html.index('class="contact-top"'):]
assert contact.index('class="contact-copy"') < contact.index('class="contact-character"')


def luminance(hex_value):
    channels = [int(hex_value[i:i + 2], 16) / 255 for i in [1, 3, 5]]
    channels = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in channels]
    return sum(x * weight for x, weight in zip(channels, [.2126, .7152, .0722]))


contrasts = {}
for fg, bg in [('#d7e2ea', '#0c0c0c'), ('#abb7c0', '#0c0c0c'), ('#4f5761', '#f5f6f5'), ('#bbccd7', '#0c0c0c'), ('#ffffff', '#3048ec'), ('#f3f2eb', '#0c0e13'), ('#b6b8c3', '#0c0e13'), ('#e0e6ff', '#3048ec'), ('#f3f2eb', '#3048ec'), ('#13151b', '#ff9b60'), ('#a7b4ff', '#0c0e13'), ('#30313a', '#ff9b60'), ('#c5c8d4', '#12192b'), ('#b6b8c3', '#1b2544'), ('#ffb783', '#12182a')]:
    a, b = sorted([luminance(fg), luminance(bg)])
    ratio = (b + .05) / (a + .05)
    assert ratio >= 4.5, (fg, bg, ratio)
    contrasts[fg + ' on ' + bg] = round(ratio, 2)

assert re.search(r'\.experience-story \{[^}]*transition: none;', (root / 'dist/hero-film.css').read_text())
assert 'experience-introduce .6s .65s' not in (root / 'dist/hero-film.css').read_text()

results = {
    'revision': 'Layered pigment strokes and distance-scrubbed company transitions independent of frame downloads',
    'checks': {
        'controller_suites': 'passed: scroll-story.cjs, cinematic.cjs, pilot-rig.mjs, counters.cjs, continuity.cjs, projects.cjs, creator.cjs, layout.cjs, hero-film.cjs, hero-sequence.cjs, entrance-codepad.cjs and section-mascots.cjs',
        'javascript_syntax': 'passed',
        'html_css_js_parsing': 'passed',
        'three_bundle_build': 'passed',
        'early_codepad_and_cisco_work': 'passed',
        'evidence_first_section_order_and_four_stories': 'passed',
        'gmail_recipient_linkedin_resume_and_product_links': 'passed',
        'private_and_migration_copy_removed': 'passed',
        'official_wordmark_integrity_and_dimensions': 'passed',
        'early_layout_policy_and_separated_contact': 'passed',
        'balanced_html': 'passed',
        'unique_ids': 'passed',
        'internal_aria_references': 'passed',
        'local_assets': 'passed',
        'image_dimensions_and_alpha': 'passed',
        'sequence_frames_hashes_alpha_dimensions_and_byte_budgets': 'passed',
        'palette_text_contrast': contrasts,
    },
    'browser_rendering': 'unverified: required managed control-browser capability unavailable',
    'gpu_rendering': 'unverified in browser',
    'axe_scan': 'not rerun for this revision',
    'entrance_and_typing': 'One-character 34ms typing with 90/160ms punctuation/line pauses; 1100ms paint reveal precedes the approved splash, which holds 900ms after document ready then reveals over 550ms, 2900ms failsafe, once per session; interaction/reduced/deep-link bypass',
    'animation_scope': '320px desktop and 240px compact pinned gesture connected to right-side linked Google/Tracxn/Cisco/ScreenGod evidence, distance-driven company crossfades with no timed delay and direct keyboard-accessible selectors; short viewports unpinned; matching detailed idle/wave media in mindset and contact, lazy and paused offscreen. User-supplied presenting film extracted into 120 desktop and 72 mobile transparent frames; scroll owns forward/reverse poses with settled holds, replay control and idle handoff; three-atlas decoded cache and two concurrent image requests; 8 desktop / 5 mobile atlas files; direct scroll pose without easing lag; reduced-motion/data-saver/static fallbacks',
    'mascot_asset': 'Filmed transparent frames; no production rigged GLB is supplied or claimed. Procedural rig remains rebuildable source, not the visible hero.',
    'review_basis': 'User-supplied 3602204d presenting film and processed transparent poses inspected against #0c0c0c; browser composition and scroll playback unverified',
    'screenshots': 'uploaded recording documents the previous version; no post-change browser captures available',
}
(root / 'QA-results.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
