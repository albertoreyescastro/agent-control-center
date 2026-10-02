#!/usr/bin/env python3
"""Scan every approved public file, including this detector's source."""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET
from contract import loads, validate

ROOT = Path(__file__).resolve().parents[1]
APPROVED = {'.nojekyll', '.gitignore', 'README.md', 'SECURITY.md', 'VALIDATION.md',
            'index.html', 'assets/app.js', 'assets/demo-state.js', 'assets/styles.css', 'assets/simulation.js', 'assets/favicon.svg',
            'public-state.schema.json', 'scripts/contract.py', 'scripts/validate_public.py',
            'tests/test_public.py', 'tests/dom-smoke.cjs', 'tests/simulation.cjs', 'tests/browser-qa.cjs', 'tests/browser-tools/package.json', 'tests/browser-tools/package-lock.json', '.github/workflows/validate.yml'}
APPROVED |= {'tests/test_readme.py', 'tests/readme-browser.cjs',
             'docs/readme/hero.svg', 'docs/readme/hero-narrow.svg',
             'docs/readme/control-plane.svg', 'docs/readme/control-plane-narrow.svg',
             'docs/readme/trust-boundary.svg', 'docs/readme/trust-boundary-narrow.svg',
             'docs/readme/badge-demo.svg', 'docs/readme/badge-readonly.svg', 'docs/readme/badge-static.svg'}
OPTIONAL = {'public-state.json'}
DENY = [r'(?i)(?:^|[\s\"\x27=(:])/(?:workspace|home|root|tmp|var|mnt|opt|Users)/[A-Za-z0-9._/-]+', r'gh[pousr]_[A-Za-z0-9]{20,}', r'github_pat_[A-Za-z0-9_]{20,}',
        r'AIza[A-Za-z0-9_-]{20,}', r'sk-[A-Za-z0-9_-]{20,}',
        r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
        r'(?i)authorization\s*[:=]\s*[\"\x27]?bearer\s+[A-Za-z0-9._-]{10,}',
        r'(?i)[?&](?:sig|token|access_token|signature|x-amz-signature)=',
        r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',
        r'(?i)https?://(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)']
PRIVATE = ['-work' + '-event-test-' + '20260926', 'agent-control-center' + '-private',
           'automation/' + 'state/providers.json', 'automation/' + 'queue/',
           'gen-lang' + '-client-', 'C:' + '\\Users\\']


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.csp = None
        self.bad = False
        self.referrer = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if any(k.startswith('on') or k == 'style' for k in a):
            self.bad = True
        if tag == 'meta' and a.get('http-equiv', '').lower() == 'content-security-policy':
            self.csp = a.get('content', '')
        if tag == 'meta' and a.get('name') == 'referrer' and a.get('content') == 'no-referrer':
            self.referrer = True
        if tag in {'script', 'link', 'img', 'iframe', 'object', 'base', 'form'}:
            if tag in {'iframe', 'object', 'base', 'form'}:
                self.bad = True
            target = a.get('src', a.get('href', ''))
            if target and not target.startswith('assets/'):
                self.bad = True


def static_svg(text):
    """Presentation assets admit only static, self-contained SVG primitives."""
    if '<!' in text or '<?' in text:
        raise ValueError('SVG declaration')
    root = ET.fromstring(text)
    ns = '{http://www.w3.org/2000/svg}'
    tags = {'svg', 'title', 'desc', 'defs', 'linearGradient', 'stop', 'marker', 'path', 'rect', 'g', 'text'}
    attrs = {'id', 'width', 'height', 'viewBox', 'role', 'aria-labelledby', 'aria-label',
             'x', 'y', 'x2', 'y2', 'rx', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
             'd', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'offset',
             'stop-color', 'refX', 'refY', 'markerWidth', 'markerHeight', 'orient', 'marker-end'}
    if root.tag != ns + 'svg':
        raise ValueError('SVG root')
    ids = {node.attrib['id'] for node in root.iter() if 'id' in node.attrib}
    for node in root.iter():
        if not node.tag.startswith(ns) or node.tag[len(ns):] not in tags or set(node.attrib) - attrs:
            raise ValueError('active or unsupported SVG')
        for value in node.attrib.values():
            if re.search(r'(?i)(https?:|data:|javascript:)', value):
                raise ValueError('SVG resource')
            if 'url(' in value:
                match = re.fullmatch(r'url\(#([A-Za-z][A-Za-z0-9_-]*)\)', value)
                if not match or match[1] not in ids:
                    raise ValueError('SVG reference')


def check(root=ROOT):
    errors = []
    seen = set()
    for p in root.rglob('*'):
        rel = p.relative_to(root).as_posix()
        if p.relative_to(root).parts[0] == '.git':
            continue
        if p.is_symlink():
            errors.append('symlink prohibited')
            continue
        if p.is_dir():
            continue
        seen.add(rel)
        if rel not in APPROVED | OPTIONAL:
            errors.append('unapproved file')
            continue
        try:
            if p.stat().st_size > 200_000:
                raise ValueError('oversized file')
            text = p.read_bytes().decode('utf-8')
            if '\x00' in text:
                raise ValueError('binary file')
        except (UnicodeError, ValueError):
            errors.append('invalid public text')
            continue
        if any(re.search(rx, text) for rx in DENY) or any(lit in text for lit in PRIVATE):
            errors.append('sensitive public content')
        if rel.startswith('docs/readme/'):
            try:
                static_svg(text)
            except (ValueError, ET.ParseError):
                errors.append('invalid README visual')
    if APPROVED - seen:
        errors.append('required file missing')
    try:
        schema = loads((root / 'public-state.schema.json').read_text())
        script = (root / 'assets/demo-state.js').read_text()
        payload = loads(script.removeprefix('window.DEMO_STATE = ').removesuffix(';\n'))
        validate(payload, schema)
        if payload['mode'] != 'demo':
            raise ValueError('demo mode')
        if (root / 'public-state.json').exists():
            validate(loads((root / 'public-state.json').read_text()), schema)
        html = (root / 'index.html').read_text()
        page = Page(); page.feed(html)
        if page.bad or not page.referrer or not page.csp:
            raise ValueError('page boundary')
        directives = ["default-src 'self'", "script-src 'self'", "style-src 'self'",
                          "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]
        actual = {d.strip() for d in page.csp.split(';') if d.strip()}
        if not set(directives).issubset(actual) or any(x in page.csp for x in ['unsafe-inline','unsafe-eval','*']):
            raise ValueError('CSP directive')
        for marker in ['SANITIZED DEMO', 'DEMO TOPOLOGY', 'SIMULATED STREAM']:
            if marker not in html:
                raise ValueError('demo label')
        js = '\n'.join((root / path).read_text() for path in ['assets/app.js', 'assets/simulation.js', 'assets/demo-state.js'])
        if any(sink in js for sink in ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'eval(', 'fetch(', 'WebSocket']):
            raise ValueError('unsafe browser sink')
    except (ValueError, OSError, KeyError):
        errors.append('contract or browser boundary failed')
    return errors


if __name__ == '__main__':
    errors = check()
    if errors:
        print('\n'.join(sorted(set(errors))))
        sys.exit(1)
    print('public-surface validation: PASS')
