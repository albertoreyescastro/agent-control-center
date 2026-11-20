"""Presentation-only regressions; no provider or network access."""
import re
import hashlib
import struct
import shutil
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from validate_public import APPROVED, SCREENSHOTS, DENY, PRIVATE, check, static_svg


class ReadmePresentationTests(unittest.TestCase):
    def test_core_and_external_observation_are_separate(self):
        workflow = (ROOT / '.github/workflows/validate.yml').read_text()
        core, external = workflow.split('  readme-observation:', 1)
        for command in ['scripts/validate_public.py', 'unittest discover',
                        'tests/simulation.cjs', 'tests/dom-smoke.cjs',
                        'tests/readme-observation.cjs', 'tests/browser-qa.cjs']:
            self.assertIn(command, core)
        self.assertNotIn('tests/readme-browser.cjs', core)
        self.assertIn('node tests/readme-browser.cjs', external)
        self.assertIn('if: always()', external)
        self.assertNotIn('continue-on-error', workflow)
        local = (ROOT / 'tests/browser-qa.cjs').read_text()
        self.assertNotIn('readme-browser', local)
        self.assertNotIn('github.com', local)
        observation = (ROOT / 'tests/readme-browser.cjs').read_text()
        self.assertIn('event.pull_request.head.sha', observation)
        self.assertIn("status:'FAIL',rendering_pass:false", observation)
        self.assertIn('process.exitCode=1', observation)

    def test_internal_links_and_anchors(self):
        text = (ROOT / 'README.md').read_text()
        headings = re.findall(r'^#{1,6} (.+)$', text, re.M)
        anchors = {re.sub(r'[^\w -]', '', h.lower()).replace(' ', '-') for h in headings}
        links = re.findall(r'!?\[[^\]]*\]\(([^)]+)\)', text)
        for url in links:
            with self.subTest(url=url):
                if url.startswith('#'):
                    self.assertIn(url[1:], anchors)
                elif url.startswith('https://'):
                    self.assertTrue(url.startswith(('https://github.com/albertoreyescastro/agent-control-center',
                                                    'https://albertoreyescastro.github.io/agent-control-center/')))
                else:
                    p = (ROOT / url).resolve()
                    self.assertTrue(p.is_relative_to(ROOT))
                    self.assertTrue(p.exists())

    def test_ctas_and_demo_disclosure(self):
        text = (ROOT / 'README.md').read_text()
        for label in ['Live Demo ↗', 'Architecture', 'Scenarios', 'Security&nbsp;/&nbsp;Trust&nbsp;Model',
                      'SANITIZED / SIMULATED PORTFOLIO DEMO', 'No live telemetry']:
            self.assertIn(label, text)
        self.assertIn('alt="Live demo — Explore the interactive Agent Control Center:', text)
        self.assertIn('docs/readme/live-demo.svg', text)
        self.assertNotIn('**[ARCHITECTURE', text)
        self.assertNotIn('<script', text.lower())
        self.assertNotIn('style=', text.lower())

    def test_picture_sources_and_weight(self):
        text = (ROOT / 'README.md').read_text()
        images = re.findall(r'(?:src|srcset)="([^"]+)"', text)
        self.assertEqual(len(images), 10)
        for file in images:
            self.assertIn(file, APPROVED)
            self.assertTrue((ROOT / file).exists())
        assets = list((ROOT / 'docs/readme').glob('*.svg'))
        self.assertEqual(len(assets), 11)
        # The new reviewed SVG hero diagrams are more detailed, while remaining
        # static, self-contained and size-bounded. Keep a meaningful asset budget.
        self.assertLess(sum(p.stat().st_size for p in assets), 55_000)
        self.assertTrue(all(p.stat().st_size < 20_000 for p in assets))
        for p in assets:
            static_svg(p.read_text())
            node = ET.fromstring(p.read_text())
            self.assertTrue(node.attrib.get('aria-label') or node.attrib.get('aria-labelledby'))

    def test_cta_visual_identity_and_icon_arrow(self):
        # The V3 CTA uses a gradient surface and a vector arrow, not the old
        # mint console banner. Assert the real content and geometry in both sizes.
        ns = {'s': 'http://www.w3.org/2000/svg'}
        for suffix, width, height in [('', '960', '104'), ('-narrow', '480', '228')]:
            raw = (ROOT / ('docs/readme/live-demo' + suffix + '.svg')).read_text()
            static_svg(raw)
            svg = ET.fromstring(raw)
            self.assertEqual(svg.attrib['width'], width)
            self.assertEqual(svg.attrib['height'], height)
            surface = svg.find('s:rect', ns)
            self.assertEqual(surface.attrib['fill'], 'url(#bg)')
            borders = svg.findall('s:rect', ns)
            self.assertTrue(any(r.attrib.get('stroke') == '#1c342d' for r in borders))
            self.assertTrue(any(r.attrib.get('fill') == '#34d399' for r in borders))
            self.assertNotIn(chr(0xfe0f), raw, 'no emoji presentation selector')
            text = ' '.join(svg.itertext())
            self.assertIn('Explore the live demo', text)
            self.assertIn('Six simulated scenarios', text)
            self.assertIn('No live telemetry', text)
            self.assertIn('Open demo', text)
            self.assertTrue(any(
                p.attrib.get('stroke') == '#04130d' and p.attrib.get('fill') == 'none'
                for p in svg.findall('s:path', ns)
            ), 'icon arrow remains a static SVG path')
            for node in svg.findall('.//s:text', ns):
                if 'Open demo' in (node.text or ''):
                    self.assertIn('system-ui', node.attrib.get('font-family', ''))
                    self.assertEqual(node.attrib.get('font-weight'), '600')

    def test_reviewed_screenshot_contract(self):
        total = 0
        for name, (width, height, size, digest) in SCREENSHOTS.items():
            data = (ROOT / name).read_bytes()
            total += len(data)
            self.assertEqual(len(data), size)
            self.assertEqual(hashlib.sha256(data).hexdigest(), digest)
            self.assertEqual(data[:2], b'\xff\xd8')
            self.assertEqual(data[-2:], b'\xff\xd9')
            pos = 2; found = False
            while pos < len(data):
                self.assertEqual(data[pos], 255)
                marker = data[pos+1]; length = int.from_bytes(data[pos+2:pos+4], 'big')
                self.assertGreaterEqual(length, 2)
                self.assertNotIn(marker, set(range(0xe1, 0xf0)) | {0xfe})
                if marker in {0xc0, 0xc1, 0xc2}:
                    h, w = struct.unpack('>HH', data[pos+5:pos+9]); found = True
                    self.assertEqual((w, h), (width, height))
                if marker == 0xda:
                    break
                pos += length + 2
            self.assertTrue(found)
        self.assertLess(total, 450_000)

    def test_screenshot_mutations_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in APPROVED:
                p = root / name; p.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / name, p)
            name = next(iter(SCREENSHOTS)); p = root / name; data = p.read_bytes()
            for modified in [data + b'extra', data[:-1], b'not an image', bytes([data[0] ^ 1]) + data[1:]]:
                p.write_bytes(modified)
                self.assertIn('unreviewed screenshot bytes', check(root))
            p.write_bytes(data)
            (root / 'docs/readme/unreviewed.jpg').write_bytes(data)
            self.assertIn('unapproved file', check(root))

    def test_gallery_links_and_alternatives(self):
        text = (ROOT / 'README.md').read_text()
        self.assertIn('## See it in action', text)
        for caption in ['Interactive scenario lab', 'Adaptive orchestration graph', 'Fail-closed publication boundary']:
            self.assertIn('[' + caption + ' ↗](https://albertoreyescastro.github.io/agent-control-center/)', text)
        for alt in re.findall(r'<img[^>]+alt="([^"]*)"', text):
            self.assertGreater(len(alt), 30)
        review = (ROOT / 'docs/readme/preview-review.md').read_text()
        self.assertFalse(any(re.search(rx, review) for rx in DENY))
        self.assertFalse(any(lit in review for lit in PRIVATE))

    def test_unsafe_svg_constructs_rejected(self):
        prefix = '<svg xmlns="http://www.w3.org/2000/svg">'
        for child in ['<script/>', '<foreignObject/>', '<image href="remote"/>',
                      '<animate/>', '<g onload="bad"/>', '<text style="bad"/>',
                      '<path fill="url(https://unapproved.invalid)"/>', '<path fill="url(#missing)"/>']:
            with self.subTest(child=child):
                with self.assertRaises(ValueError):
                    static_svg(prefix + child + '</svg>')
        with self.assertRaises(ValueError):
            static_svg('<!DOCTYPE svg>' + prefix + '</svg>')

    def test_presentation_assets_are_scanned(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in APPROVED:
                p = root / name
                p.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / name, p)
            p = root / 'docs/readme/hero.svg'
            original = p.read_text()
            p.write_text(original.replace('</svg>', '<script/></svg>'))
            self.assertIn('invalid README visual', check(root))
            p.write_text(original.replace('</svg>', '<text>' + 'gh' + 'p_' + 'a' * 30 + '</text></svg>'))
            self.assertIn('sensitive public content', check(root))

    def test_details_are_balanced(self):
        text = (ROOT / 'README.md').read_text()
        self.assertEqual(text.count('<details>'), text.count('</details>'))
        self.assertEqual(text.count('<summary>'), text.count('</summary>'))
        self.assertEqual(text.count('<picture>'), text.count('</picture>'))


if __name__ == '__main__':
    unittest.main()
