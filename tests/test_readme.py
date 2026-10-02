"""Presentation-only regressions; no provider or network access."""
import re
import shutil
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from validate_public import APPROVED, check, static_svg


class ReadmePresentationTests(unittest.TestCase):
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
        for label in ['LIVE DEMO', 'ARCHITECTURE', 'SCENARIOS', 'SECURITY / TRUST MODEL',
                      'SANITIZED / SIMULATED PORTFOLIO DEMO', 'No live telemetry']:
            self.assertIn(label, text)
        self.assertIn('[LIVE DEMO ↗](https://albertoreyescastro.github.io/agent-control-center/)', text)
        self.assertNotIn('<script', text.lower())
        self.assertNotIn('style=', text.lower())

    def test_picture_sources_and_weight(self):
        text = (ROOT / 'README.md').read_text()
        images = re.findall(r'(?:src|srcset)="([^"]+)"', text)
        self.assertEqual(len(images), 6)
        for file in images:
            self.assertIn(file, APPROVED)
            self.assertTrue((ROOT / file).exists())
        assets = list((ROOT / 'docs/readme').glob('*.svg'))
        self.assertEqual(len(assets), 9)
        self.assertLess(sum(p.stat().st_size for p in assets), 25_000)
        for p in assets:
            static_svg(p.read_text())
            node = ET.fromstring(p.read_text())
            self.assertTrue(node.attrib.get('aria-label') or node.attrib.get('aria-labelledby'))

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
