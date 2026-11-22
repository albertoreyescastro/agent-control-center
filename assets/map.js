/* Responsive, keyboard-operable projection of a single recorded transition. */
(function (root) {
  'use strict';
  // World coordinates keep the execution lanes open and the return channels outside them.
  // Each node also has a portrait position so the overview can be read vertically.
  const nodes = {
    operator: ['Operator', 'Telegram · human input', 96, 222, 94, 78],
    coordinator: ['Control plane', 'Mission coordinator', 325, 156, 258, 163],
    ledger: ['Durable state', 'Recorded task & lease', 305, 304, 92, 291],
    router: ['Role-aware router', 'Policy & eligibility', 557, 222, 253, 395],
    local: ['Local executor', 'Preferred execution', 802, 127, 93, 510],
    cloud: ['Cloud executor', 'Fenced fallback', 802, 320, 255, 567],
    candidate: ['Candidate PR', 'Immutable revision', 1044, 157, 92, 699],
    validator: ['Validator', 'Read-only checks', 1064, 292, 254, 781],
    council: ['Review council', 'Independent families', 1280, 222, 97, 930],
    verdict: ['Verdict', 'Council decision', 1481, 222, 255, 1014],
    gate: ['Human gate', 'Version-bound approval', 1671, 208, 96, 1118],
    registry: ['Capability registry', 'Health & included pools', 543, 103, 92, 392],
    reconciler: ['Reconciler', 'Ownership & receipts', 325, 56, 93, 172],
    observer: ['Control room', 'Read-only observer', 96, 338, 253, 283],
  };
  const icons = {
    operator: 'M5 19c0-6 14-6 14 0 M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    coordinator: 'M6 6h12v12H6z M9 9h6v6H9z M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3',
    ledger: 'M4 6c0-5 16-5 16 0s-16 5-16 0v11c0 5 16 5 16 0V6 M4 11c0 5 16 5 16 0',
    router: 'M4 17h3c4 0 4-10 9-10h4m-3-3 3 3-3 3 M12 13c1 4 3 4 8 4m-3-3 3 3-3 3',
    local: 'M3 4h18v13H3z M8 21h8m-4-4v4',
    cloud: 'M7 18a5 5 0 1 1 0-10 6 6 0 0 1 12 2 4 4 0 0 1 0 8z',
    candidate:
      'M6 9v8m11-10v10m0-7c0-3-4-4-7-4m2-2-2 2 2 2 M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M8 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M19 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    validator: 'M9 3h6m-5 0v6l-6 10q-1 2 2 2h12q3 0 2-2l-6-10V3 M7 15h10',
    council: 'M12 3 20 7v8l-8 5-8-5V7z M8 11l3 3 5-6',
    verdict: 'M12 3v16m-5 2h10 M4 7h16 M6 8l-3 7h6zm12 0-3 7h6z',
    gate: 'M5 20V9h14v11z M8 9V6a4 4 0 1 1 8 0v3 M12 13v3',
    registry: 'M12 3l9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',
    reconciler: 'M4 10a8 8 0 0 1 14-4l2 3m0-5v5h-5 M20 14a8 8 0 0 1-14 4l-2-3m0 5v-5h5',
    observer: 'M3 5h18v13H3z M7 13l3-3 3 3 4-5 M8 21h8',
  };
  const links = [
    ['operator', 'coordinator'],
    ['coordinator', 'ledger'],
    ['ledger', 'observer'],
    ['ledger', 'router'],
    ['registry', 'router'],
    ['reconciler', 'ledger'],
    ['router', 'local'],
    ['router', 'cloud'],
    ['local', 'candidate'],
    ['cloud', 'candidate'],
    ['candidate', 'validator'],
    ['validator', 'council'],
    ['council', 'verdict'],
    ['verdict', 'gate'],
    ['gate', 'operator'],
    ['verdict', 'router'],
  ];
  const ns = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, text) {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text) n.textContent = text;
    return n;
  }
  function description(key, s) {
    const c = root.Simulation.current(s);
    const evidence = s.log
      .slice()
      .reverse()
      .find((e) => e.to === key || e.from === key);
    const facts = {
      operator: s.question
        ? 'A scoped question is waiting in Telegram.'
        : 'Only the operator can settle a scope or approval question.',
      coordinator: 'Registers the mission and its policy, and resumes from the session journal.',
      gate: 'An approval binds one action, task, immutable candidate and confirmation stage.',
      observer: 'Read-only projection of the session ledger. Operator decisions arrive in Telegram.',
      ledger: s.policy
        ? 'Recorded task: ' + s.title + '.'
        : 'Mission, task, attempt and effects are recorded here.',
      router:
        'Local ' +
        (s.pc ? 'online' : 'offline') +
        ' · cloud transport ' +
        (s.transport ? 'verified' : 'missing') +
        ' · project access ' +
        (s.projectAccess ? 'verified' : 'unknown') +
        '.',
      registry:
        'Additional spend disabled. Local pool ' +
        (s.pools.local ? 'eligible' : 'fenced') +
        ' · cloud pool ' +
        (s.pools.cloud ? 'eligible' : 'fenced') +
        '. Exact quota is not observable.',
      reconciler: 'Reads recorded ownership and receipts before resuming the task.',
      local:
        'PC ' +
        (s.pc ? 'online' : 'offline') +
        '. ' +
        (s.owner === 'local' ? 'Owns attempt ' + s.attempt + '.' : 'No current lease.'),
      cloud:
        'Jules is unavailable for new tasks. It appears in the historical walkthrough. The cloud worker here is a fictional alias.',
      candidate: c
        ? 'Version ' + c.version + ' · ' + c.sha.slice(0, 12) + ' · ' + c.scope + '.'
        : 'An immutable draft carries the diff and base revision.',
      validator: s.checks
        ? 'Read-only check evidence for ' + s.checks.sha.slice(0, 12) + '.'
        : 'Reads the candidate and runs the authored fixture checks.',
      council:
        (s.policy?.sensitive ? 'Three' : 'Two') +
        ' known independent families required. Slate is the executor family. Remaining reviewers: ' +
        ['Iris', 'Birch', 'Reed', 'Fern'].slice(s.offline).join(', ') +
        '.',
      verdict: s.reviews
        ? (s.reviews.pass ? 'Pass' : 'Blocking finding') + ' for ' + s.reviews.sha.slice(0, 12) + '.'
        : 'A first blocking finding may return one repair to routing.',
    };
    if (key === 'council')
      facts.council += ' Excluded: ' + root.Simulation.reviewers(s).excluded.join('; ') + '.';
    return facts[key] + (evidence ? ' ' + evidence.detail : '');
  }
  const compactNodes = new Set(['reconciler', 'registry', 'verdict']);
  const colours = { normal: '#a8d9ff', human: '#ffcc71', danger: '#ff8494', late: '#9b9aaa' };
  const flightMs = 2100;
  let scene = null;
  const point = (x, y) => ({ x, y });
  const xy = (p) => p.x + ' ' + p.y;
  function geometry(small) {
    const result = {};
    for (const [key, [, , x, y, mx, my]] of Object.entries(nodes)) {
      const round = compactNodes.has(key),
        council = key === 'council';
      result[key] = {
        x: small ? mx : x,
        y: small ? my : y,
        rx: round ? 18 : council ? (small ? 81 : 108) : small ? 71 : 84,
        ry: round ? 18 : 24,
      };
    }
    return result;
  }
  const vectors = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };
  function port(n, side) {
    const [dx, dy] = vectors[side];
    return point(n.x + dx * (n.rx + 2), n.y + dy * (n.ry + 2));
  }
  function curve(n, m, a, b) {
    const p = port(n, a),
      q = port(m, b),
      distance = Math.hypot(q.x - p.x, q.y - p.y);
    const bend = Math.max(18, Math.min(102, distance * 0.54));
    const handle = (pt, side) => point(pt.x + vectors[side][0] * bend, pt.y + vectors[side][1] * bend);
    return 'M' + xy(p) + ' C' + xy(handle(p, a)) + ' ' + xy(handle(q, b)) + ' ' + xy(q);
  }
  // Non-adjacent events use a free lane, leaving the intermediate cards untouched.
  function outer(n, m, side, lane) {
    const p = port(n, side),
      q = port(m, side);
    if (side === 'left' || side === 'right') {
      const mid = (p.y + q.y) / 2;
      return (
        'M' +
        xy(p) +
        ' C' +
        lane +
        ' ' +
        p.y +
        ' ' +
        lane +
        ' ' +
        (p.y + (mid - p.y) * 0.45) +
        ' ' +
        lane +
        ' ' +
        mid +
        ' S' +
        lane +
        ' ' +
        q.y +
        ' ' +
        xy(q)
      );
    }
    const mid = (p.x + q.x) / 2;
    return (
      'M' +
      xy(p) +
      ' C' +
      p.x +
      ' ' +
      lane +
      ' ' +
      (p.x + (mid - p.x) * 0.45) +
      ' ' +
      lane +
      ' ' +
      mid +
      ' ' +
      lane +
      ' S' +
      q.x +
      ' ' +
      lane +
      ' ' +
      xy(q)
    );
  }
  function route(a, b, g, small) {
    const n = g[a],
      m = g[b],
      id = a + '-' + b;
    if (id === 'gate-operator') return outer(n, m, small ? 'left' : 'top', small ? 9 : 15);
    if (id === 'verdict-router') return outer(n, m, small ? 'right' : 'top', small ? 345 : 55);
    if (id === 'reconciler-ledger' && !small) return outer(n, m, 'left', 207);
    const regular = links.some(([u, v]) => u === a && v === b);
    if (!regular && Math.abs(small ? n.y - m.y : n.x - m.x) > (small ? 165 : 275)) {
      return outer(
        n,
        m,
        small ? (n.x + m.x < 348 ? 'left' : 'right') : 'bottom',
        small ? (n.x + m.x < 348 ? 12 : 343) : 396,
      );
    }
    if (small) {
      if (Math.abs(m.y - n.y) > 68)
        return curve(n, m, m.y > n.y ? 'bottom' : 'top', m.y > n.y ? 'top' : 'bottom');
      return curve(n, m, m.x > n.x ? 'right' : 'left', m.x > n.x ? 'left' : 'right');
    }
    if (Math.abs(n.x - m.x) < 100)
      return curve(n, m, m.y > n.y ? 'bottom' : 'top', m.y > n.y ? 'top' : 'bottom');
    return curve(n, m, m.x > n.x ? 'right' : 'left', m.x > n.x ? 'left' : 'right');
  }
  function gradient(id, stops, radial = false) {
    const n = svg(radial ? 'radialGradient' : 'linearGradient', {
      id,
      ...(radial ? {} : { x2: '0%', y2: '100%' }),
    });
    stops.forEach(([offset, color, opacity]) =>
      n.append(svg('stop', { offset, 'stop-color': color, 'stop-opacity': opacity ?? 1 })),
    );
    return n;
  }
  function definitions() {
    const defs = svg('defs', {});
    defs.append(
      gradient('station-surface', [
        [0, '#1c2433'],
        [0.18, '#121925'],
        [1, '#080d16'],
      ]),
      gradient('selected-surface', [
        [0, '#27384c'],
        [0.18, '#152132'],
        [1, '#0a111d'],
      ]),
      gradient(
        'photon-halo',
        [
          [0, '#fff'],
          [0.18, '#fff', 0.93],
          [0.4, '#fff', 0.36],
          [1, '#fff', 0],
        ],
        true,
      ),
    );
    for (const [tone, color] of Object.entries(colours))
      defs.append(
        gradient(
          'glow-' + tone,
          [
            [0, '#fff'],
            [0.2, color, 0.9],
            [0.5, color, 0.24],
            [1, color, 0],
          ],
          true,
        ),
      );
    return defs;
  }
  function icon(name, x, y, size) {
    const group = svg('g', {
      transform: 'translate(' + x + ' ' + y + ') scale(' + size / 24 + ')',
      class: 'diagram-icon',
    });
    group.append(svg('path', { d: icons[name] }));
    return group;
  }
  function badge(parent, x, y, label, tone) {
    const w = Math.max(43, label.length * 5.6 + 16);
    parent.append(
      svg('rect', { x, y: y - 10, width: w, height: 17, rx: 8, class: 'node-badge ' + tone }),
      svg(
        'text',
        { x: x + w / 2, y: y + 2, 'text-anchor': 'middle', class: 'badge-label ' + tone },
        label,
      ),
    );
  }
  function makeStation(key, g, s, small) {
    const n = g[key],
      [label, sub] = nodes[key],
      c = root.Simulation.current(s);
    const off =
      (key === 'local' && (!s.pc || !s.pools.local)) ||
      (key === 'cloud' && (!s.transport || !s.projectAccess || !s.pools.cloud));
    const group = svg('g', {
      role: 'button',
      tabindex: 0,
      'aria-label': 'Inspect ' + label + (off ? ', ineligible' : ''),
      'data-node': key,
      class: 'station',
    });
    if (off) group.classList.add('off');
    if (key === 'operator' || key === 'gate') group.classList.add('human');
    if (compactNodes.has(key)) {
      group.append(
        svg('circle', { cx: n.x, cy: n.y, r: n.rx + 4, class: 'rim' }),
        svg('circle', { cx: n.x, cy: n.y, r: n.rx, class: 'shell' }),
        icon(key, n.x - 9, n.y - 9, 18),
        svg('text', { x: n.x, y: n.y + 33, 'text-anchor': 'middle', class: 'node-name' }, label),
      );
    } else if (key === 'council') {
      const families = root.Simulation.reviewers(s).families;
      const members = families.length ? families : ['Unavailable'];
      const gap = small ? 38 : 45,
        cardWidth = n.rx * 2 - (small ? 26 : 46);
      group.append(
        svg(
          'text',
          {
            x: n.x,
            y: n.y - ((members.length - 1) * gap) / 2 - 25,
            'text-anchor': 'middle',
            class: 'group-label',
          },
          label,
        ),
      );
      members.forEach((family, i) => {
        const y = n.y + (i - (members.length - 1) / 2) * gap,
          left = n.x - cardWidth / 2,
          right = n.x + cardWidth / 2;
        group.append(
          svg('path', {
            class: 'family-wire',
            d:
              'M' +
              (n.x - n.rx) +
              ' ' +
              n.y +
              ' C' +
              left +
              ' ' +
              n.y +
              ' ' +
              (left - 8) +
              ' ' +
              y +
              ' ' +
              left +
              ' ' +
              y +
              ' M' +
              right +
              ' ' +
              y +
              ' C' +
              (right + 8) +
              ' ' +
              y +
              ' ' +
              right +
              ' ' +
              n.y +
              ' ' +
              (n.x + n.rx) +
              ' ' +
              n.y,
          }),
          svg('rect', { x: left, y: y - 16, width: cardWidth, height: 32, rx: 7, class: 'shell' }),
          icon('council', left + 9, y - 8, 16),
          svg('text', { x: left + 32, y: y + 4, class: 'node-name' }, family + ' review'),
        );
      });
    } else {
      const left = n.x - n.rx,
        top = n.y - n.ry;
      group.append(
        svg('rect', { x: left - 3, y: top - 3, width: n.rx * 2 + 6, height: 54, rx: 11, class: 'rim' }),
        svg('rect', { x: left, y: top, width: n.rx * 2, height: 48, rx: 9, class: 'shell' }),
        svg('rect', { x: left + 8, y: n.y - 12, width: 24, height: 24, rx: 6, class: 'icon-well' }),
        icon(key, left + 12, n.y - 8, 16),
        svg('text', { x: left + 39, y: n.y - 2, class: 'node-name' }, label),
        svg(
          'text',
          { x: left + 39, y: n.y + 12, class: 'node-sub' },
          small && key === 'coordinator' ? 'Coordinator' : sub,
        ),
      );
      if (key === s.owner)
        badge(
          group,
          left + 9,
          top - 2,
          s.lost ? 'Signal lost' : 'Lease · ' + s.attempt,
          s.lost ? 'danger' : 'healthy',
        );
      else if (off) badge(group, left + 9, top - 2, 'Fenced', 'muted');
      else if (key === 'candidate' && c)
        badge(group, left + 9, top - 2, 'v' + c.version + ' · exact SHA', 'normal');
      else if (key === 'gate' && s.question && ['confirm', 'gate'].includes(s.phase))
        badge(group, left + 9, top - 2, 'Awaiting approval', 'human');
      if (key === s.owner) {
        const x = n.x + n.rx - 54,
          y = top - 8;
        group.append(
          svg('path', {
            d: 'M' + x + ' ' + y + (s.lost ? 'h43' : 'h9l3-3 2 5 4-12 4 15 3-6h18'),
            class: 'inline-ecg ' + (s.lost ? 'lost' : 'healthy'),
          }),
        );
      }
      if (key === s.owner && !s.lost) {
        group.append(svg('circle', { cx: left + 20, cy: n.y, r: 13, class: 'owner-pulse' }));
      }
    }
    return group;
  }
  function activate(n, fn) {
    n.addEventListener('click', fn);
    n.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    });
  }
  function light(path, tone, reduced, animate) {
    const layer = svg('g', { class: 'delivery ' + tone, 'aria-hidden': 'true' });
    const origin = path.getPointAtLength(0),
      end = path.getPointAtLength(path.getTotalLength());
    [origin, end].forEach((p) =>
      layer.append(svg('circle', { cx: p.x, cy: p.y, r: 3.4, class: 'port-light' })),
    );
    if (reduced || !animate) return layer;
    // The tail is clipped by the exact route. Its leading edge moves at the same
    // normalised speed as the white core, including along the two return arcs.
    const trail = svg('path', {
      d: path.getAttribute('d'),
      pathLength: 100,
      class: 'light-trail',
      'stroke-dasharray': '8 110',
      'stroke-dashoffset': 8,
    });
    const sweep = svg('animate', {
      attributeName: 'stroke-dashoffset',
      from: 8,
      to: -92,
      dur: flightMs + 'ms',
      begin: 'indefinite',
      fill: 'freeze',
    });
    trail.append(sweep);
    const packet = svg('g', { class: 'photon', opacity: 0 });
    packet.append(
      svg('circle', { r: 15, fill: 'url(#glow-' + tone + ')' }),
      svg('circle', { r: 5, fill: 'url(#photon-halo)' }),
      svg('circle', { r: 2.25, fill: '#ffffff' }),
    );
    const travel = svg('animateMotion', {
      path: path.getAttribute('d'),
      dur: flightMs + 'ms',
      calcMode: 'paced',
      repeatCount: 1,
      fill: 'freeze',
      begin: 'indefinite',
    });
    packet.append(
      travel,
      svg('animate', {
        attributeName: 'opacity',
        values: '1;1;0',
        keyTimes: '0;.84;1',
        dur: flightMs + 450 + 'ms',
        begin: 'indefinite',
        fill: 'freeze',
      }),
    );
    trail.append(
      svg('animate', {
        attributeName: 'opacity',
        from: 1,
        to: 0,
        dur: '450ms',
        begin: 'indefinite',
        class: 'after-flight',
        fill: 'freeze',
      }),
    );
    layer.append(trail, packet);
    const arrival = svg('circle', { cx: end.x, cy: end.y, r: 4, class: 'arrival', opacity: 0 });
    arrival.append(
      svg('animate', {
        attributeName: 'r',
        from: 4,
        to: 17,
        dur: '600ms',
        begin: 'indefinite',
        fill: 'freeze',
      }),
      svg('animate', {
        attributeName: 'opacity',
        values: '0;.85;0',
        dur: '600ms',
        begin: 'indefinite',
        fill: 'freeze',
      }),
    );
    layer.append(arrival);
    return layer;
  }
  function frame(g, key, event, path, small, overview, ratio) {
    const total = small ? [0, 0, 354, 1180] : [0, -4, 1770, 421];
    if (overview) return total;
    const keys = event
      ? [event.from, event.to]
      : small
        ? ['operator', 'coordinator']
        : ['operator', 'coordinator', 'ledger', 'router'];
    if (!keys.includes(key) && key) keys.push(key);
    const bounds = keys.map((k) => [
      g[k].x - g[k].rx - 16,
      g[k].y - 40,
      g[k].x + g[k].rx + 16,
      g[k].y + 43,
    ]);
    if (path) {
      const b = path.getBBox();
      bounds.push([b.x - 12, b.y - 12, b.x + b.width + 12, b.y + b.height + 12]);
    }
    const left = Math.min(...bounds.map((v) => v[0])),
      right = Math.max(...bounds.map((v) => v[2]));
    const top = Math.min(...bounds.map((v) => v[1])),
      bottom = Math.max(...bounds.map((v) => v[3]));
    const w = Math.max(
      small ? 340 : 470,
      right - left + (small ? 10 : 68),
      (bottom - top + (small ? 26 : 74)) * ratio,
    );
    const h = w / ratio;
    return [(left + right - w) / 2, (top + bottom - h) / 2, w, h];
  }
  function locator(mini, g, small, box) {
    mini.replaceChildren();
    mini.setAttribute('viewBox', small ? '0 0 354 1180' : '0 -4 1770 421');
    for (const [a, b] of links)
      mini.append(svg('path', { d: route(a, b, g, small), class: 'mini-wire' }));
    for (const n of Object.values(g))
      mini.append(
        svg('rect', {
          x: n.x - n.rx,
          y: n.y - 13,
          width: n.rx * 2,
          height: 26,
          rx: 8,
          class: 'mini-node',
        }),
      );
    mini.append(
      svg('rect', { x: box[0], y: box[1], width: box[2], height: box[3], rx: 8, class: 'mini-frame' }),
    );
  }
  function draw({ surface, s, small, motion, selected, onPick, onLink, animate, overview, mini }) {
    const stamp = s.run + '/' + s.log.length + '/' + small + '/' + motion;
    const old = surface.viewBox.animVal;
    const previous = old.width ? [old.x, old.y, old.width, old.height] : null;
    const event = s.log.at(-1),
      g = geometry(small);
    const rebuild = scene?.stamp !== stamp || scene.surface !== surface;
    let pending;
    if (rebuild) {
      const focus = surface.contains(document.activeElement) ? document.activeElement.dataset : null;
      surface.unpauseAnimations?.();
      surface.replaceChildren(definitions());
      const wires = svg('g', {}),
        stations = svg('g', {});
      surface.append(wires, stations);
      const routes = [...links];
      if (event && !routes.some(([a, b]) => a === event.from && b === event.to))
        routes.push([event.from, event.to]);
      let active = null;
      for (const [a, b] of routes) {
        const selectedEdge = event?.from === a && event?.to === b;
        const tone = selectedEdge
          ? event.title === 'Late result discarded'
            ? 'late'
            : a === 'operator' && b === 'coordinator'
              ? 'human'
              : event.tone
          : a === 'gate' || b === 'gate'
            ? 'human'
            : a === 'verdict' && b === 'router'
              ? 'danger'
              : 'normal';
        const d = route(a, b, g, small);
        const wire = svg('path', { d, class: 'wire ' + tone + (selectedEdge ? ' active' : '') });
        wires.append(wire);
        const hit = svg('path', {
          d,
          class: 'rail-hit',
          role: 'button',
          tabindex: 0,
          'data-link': a + '-' + b,
          'aria-label': 'Inspect ' + nodes[a][0] + ' to ' + nodes[b][0],
        });
        activate(hit, () => onLink(a, b));
        wires.append(hit);
        if (selectedEdge) {
          active = wire;
          pending = light(wire, tone, motion, animate);
        }
      }
      for (const key of Object.keys(g)) {
        const group = makeStation(key, g, s, small);
        activate(group, () => onPick(key));
        stations.append(group);
      }
      if (pending) surface.append(pending);
      scene = { stamp, surface, active, box: null };
      if (focus?.node || focus?.link)
        surface
          .querySelector(
            focus.node ? '[data-node="' + focus.node + '"]' : '[data-link="' + focus.link + '"]',
          )
          ?.focus({ preventScroll: true });
    }
    for (const node of surface.querySelectorAll('.station')) {
      const key = node.dataset.node;
      node.classList.toggle('chosen', key === selected);
      node.classList.toggle('current', key === event?.to);
      node.classList.toggle('origin', key === event?.from);
      node.setAttribute('aria-pressed', String(key === selected));
    }
    const rect = surface.getBoundingClientRect(),
      ratio = rect.height && rect.width ? rect.width / rect.height : small ? 1.2 : 2.7;
    const box = frame(g, selected, event, scene.active, small, overview, ratio);
    const oldCamera = surface.querySelector('.camera');
    if (scene.box !== box.join(' ')) {
      oldCamera?.remove();
      surface.setAttribute('viewBox', box.join(' '));
      if (previous && !motion && scene.surface === surface && event) {
        const camera = svg('animate', {
          class: 'camera',
          attributeName: 'viewBox',
          from: previous.join(' '),
          to: box.join(' '),
          dur: '420ms',
          calcMode: 'spline',
          keyTimes: '0;1',
          keySplines: '.26 .1 .22 1',
          begin: 'indefinite',
          fill: 'freeze',
        });
        surface.append(camera);
        camera.beginElement();
      }
      scene.box = box.join(' ');
      if (mini) locator(mini, g, small, box);
    }
    if (pending) {
      const lead = 160;
      for (const item of pending.querySelectorAll('animate,animateMotion')) {
        item.beginElementAt(
          (lead +
            (item.parentNode.classList.contains('arrival') || item.classList.contains('after-flight')
              ? flightMs
              : 0)) /
            1000,
        );
      }
    }
  }
  root.MissionMap = { draw, description, nodes, duration: flightMs + 160 };
})(globalThis);
