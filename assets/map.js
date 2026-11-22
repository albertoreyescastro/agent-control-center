/* Responsive, keyboard-operable projection of a single recorded transition. */
(function (root) {
  'use strict';
  // World coordinates keep the execution lanes open and the return channels outside them.
  // Each node also has a portrait position so the overview can be read vertically.
  const nodes = {
    operator: ['Operator', 'Telegram, HITL approvals', 96, 222, 94, 78],
    coordinator: ['Control plane', 'Cloudflare Workers, 24/7', 325, 156, 258, 163],
    ledger: ['Durable state', 'GitHub, CAS-fenced writes', 305, 304, 92, 291],
    router: ['Role-aware router', 'Deterministic, auditable', 557, 222, 253, 413],
    local: ['Codex A', 'OpenAI, local', 802, 106, 93, 519],
    localB: ['Codex B', 'OpenAI, local fallback', 802, 178, 255, 578],
    claude: ['Claude Code', 'Anthropic, local', 802, 245, 93, 645],
    antigravity: ['Antigravity', 'Multi-model, local', 802, 312, 255, 705],
    cloud: ['Jules', 'Google, historical replay', 802, 411, 93, 786],
    candidate: ['Candidate PR', 'Exact base, SHA, paths', 1044, 185, 254, 870],
    validator: ['Validator', 'Exact-SHA test gate', 1064, 320, 92, 955],
    council: ['Review council on Workers AI', 'Independent models', 1280, 235, 250, 1073],
    verdict: ['Verdict', 'Structured JSON', 1481, 235, 96, 1191],
    gate: ['Human merge gate', 'Exact-SHA approval', 1671, 215, 254, 1280],
    merged: ['Merged', 'By a human', 1850, 215, 96, 1370],
    registry: ['Capability registry', 'Capability, health, quota', 543, 103, 92, 400],
    reconciler: ['Reconciler', 'Every 60 s in the film', 325, 56, 93, 172],
    observer: ['Control room', 'Read-only telemetry', 96, 338, 253, 283],
    pinned: ['Pinned policy', 'Rules fixed per run', 305, 422, 223, 333],
    feedback: ['Feedback triage', 'Auto-reply or escalate', 557, 414, 252, 498],
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
    ['ledger', 'pinned'],
    ['cloud', 'feedback'],
    ['feedback', 'operator'],
    ['router', 'localB'],
    ['localB', 'candidate'],
    ['router', 'claude'],
    ['claude', 'candidate'],
    ['router', 'antigravity'],
    ['antigravity', 'candidate'],
    ['gate', 'merged'],
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
      localB: 'Second local OpenAI worker. If Codex A is busy before a claim, Codex B can take it.',
      claude: 'Anthropic local worker. Gated by the walkthrough policy for this task.',
      antigravity: 'Multi-model local worker. Gated by the walkthrough policy for this task.',
      pinned: 'The mission keeps its review, spend and approval rules across retries.',
      feedback: 'Routine questions follow the pinned policy. Changes in scope go to Telegram.',
      merged:
        'The historical walkthrough ends with a human merge. This simulator stops at authorisation.',
      cloud:
        'Jules is the Google cloud agent in the historical walkthrough. This replay simulates that role locally.',
      candidate: c
        ? 'Version ' + c.version + ' · ' + c.sha.slice(0, 12) + ' · ' + c.scope + '.'
        : 'An immutable draft carries the diff and base revision.',
      validator: s.checks
        ? 'Read-only check evidence for ' + s.checks.sha.slice(0, 12) + '.'
        : 'Reads the candidate and runs the authored fixture checks.',
      council:
        'Workers AI · ' +
        root.Simulation.reviewers(s).required +
        ' independent model families required. ' +
        root.Simulation.reviewers(s)
          .members.map((w) => w.name + ' (' + w.family + ')')
          .join(', ') +
        '.',
      verdict: s.reviews
        ? (s.reviews.pass ? 'Pass' : 'Blocking finding') + ' for ' + s.reviews.sha.slice(0, 12) + '.'
        : 'A first blocking finding may return one repair to routing.',
    };
    if (key === 'council')
      facts.council += ' Excluded: ' + root.Simulation.reviewers(s).excluded.join('; ') + '.';
    return facts[key] + (evidence ? ' ' + evidence.detail : '');
  }
  const compactNodes = new Set(['reconciler', 'registry', 'verdict', 'merged', 'pinned', 'feedback']);
  const colours = {
    pass: '#89eac4',
    normal: '#a8d9ff',
    human: '#ffcc71',
    danger: '#ff8494',
    late: '#9b9aaa',
  };
  const flightMs = 1900;
  let scene = null;
  const point = (x, y) => ({ x, y });
  const xy = (p) => p.x + ' ' + p.y;
  function geometry(small) {
    const result = {};
    for (const [key, [, , x, y, mx, my]] of Object.entries(nodes)) {
      const round = compactNodes.has(key),
        council = key === 'council';
      const cardRadius = small ? (key === 'gate' ? 80 : 71) : 84;
      result[key] = {
        x: small ? mx : x,
        y: small ? my : y,
        rx: round ? 18 : council ? (small ? 97 : 126) : cardRadius,
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
    if (id === 'validator-council') return curve(n, m, small ? 'bottom' : 'right', 'left');
    if (id === 'council-verdict') return curve(n, m, 'right', small ? 'top' : 'left');
    if (id === 'gate-operator') return outer(n, m, small ? 'left' : 'top', small ? 9 : 15);
    if (id === 'verdict-router') return outer(n, m, small ? 'right' : 'top', small ? 345 : 55);
    if (id === 'reconciler-ledger' && !small) return outer(n, m, 'left', 207);
    if (id === 'feedback-operator') return outer(n, m, small ? 'right' : 'bottom', small ? 342 : 484);
    const regular = links.some(([u, v]) => u === a && v === b);
    if (!regular && Math.abs(small ? n.y - m.y : n.x - m.x) > (small ? 165 : 275)) {
      return outer(
        n,
        m,
        small ? (n.x + m.x < 348 ? 'left' : 'right') : 'bottom',
        small ? (n.x + m.x < 348 ? 12 : 343) : 503,
      );
    }
    if (small) {
      if (b === 'council') return curve(n, m, 'bottom', 'left');
      if (a === 'council' && b === 'verdict') return curve(n, m, 'right', 'top');
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
    group.append(
      svg('path', {
        d:
          icons[name] ||
          icons[
            {
              localB: 'local',
              claude: 'local',
              antigravity: 'local',
              pinned: 'registry',
              feedback: 'coordinator',
              merged: 'candidate',
            }[name]
          ],
      }),
    );
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
      (['local', 'localB'].includes(key) &&
        (!s.pc || !s.pools.local || (key === 'local' && s.codexABusy))) ||
      key === 'claude' ||
      key === 'antigravity' ||
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
      const status =
        key === 'verdict' && s.reviews && c
          ? (s.reviews.pass ? 'PASS' : 'FAIL') + ' · v' + c.version
          : sub;
      group.append(
        svg('circle', { cx: n.x, cy: n.y, r: n.rx + 4, class: 'rim' }),
        svg('circle', { cx: n.x, cy: n.y, r: n.rx, class: 'shell' }),
        icon(key, n.x - 9, n.y - 9, 18),
        svg('text', { x: n.x, y: n.y + 33, 'text-anchor': 'middle', class: 'node-name' }, label),
        svg('text', { x: n.x, y: n.y + 45, 'text-anchor': 'middle', class: 'node-sub' }, status),
      );
    } else if (key === 'council') {
      const { members: selected, required } = root.Simulation.reviewers(s);
      const members = root.Simulation.councilModels.filter(
        (w) => required === 3 || selected.some((r) => r.family === w.family),
      );
      const gap = small ? 38 : 45,
        cardWidth = small ? 122 : 153;
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
      members.forEach((model, i) => {
        const seat = selected.find((r) => r.family === model.family);
        const vote =
          s.reviews?.sha === c?.sha ? s.reviews?.votes.find((v) => v.family === model.family) : null;
        const y = n.y + (i - (members.length - 1) / 2) * gap,
          left = n.x - cardWidth / 2,
          right = n.x + cardWidth / 2;
        group.append(
          svg('path', {
            class: 'family-wire',
            'data-leg': 'in',
            'data-family': model.family,
            d:
              'M' +
              xy(port(n, 'left')) +
              ' C' +
              (left - 20) +
              ' ' +
              n.y +
              ' ' +
              (left - 18) +
              ' ' +
              y +
              ' ' +
              left +
              ' ' +
              y,
          }),
          svg('path', {
            class: 'family-wire',
            'data-leg': 'out',
            'data-family': model.family,
            d:
              'M' +
              right +
              ' ' +
              y +
              ' C' +
              (right + 18) +
              ' ' +
              y +
              ' ' +
              (right + 20) +
              ' ' +
              n.y +
              ' ' +
              xy(port(n, 'right')),
          }),
          svg('rect', { x: left, y: y - 16, width: cardWidth, height: 32, rx: 7, class: 'shell' }),
          icon('council', left + 8, y - 8, 15),
          svg('text', { x: left + 28, y: y - 1, class: 'node-name' }, model.name),
          svg(
            'text',
            { x: left + 28, y: y + 11, class: 'node-sub' },
            vote
              ? vote.verdict + ' · ' + model.family
              : seat
                ? model.family + (seat.reserve ? ' · reserve' : '')
                : 'Offline',
          ),
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
          small
            ? {
                coordinator: 'Cloudflare Workers',
                operator: 'Telegram approvals',
                ledger: 'GitHub, CAS writes',
                cloud: 'Google · replay',
              }[key] || sub
            : sub,
        ),
      );
      if (key === root.Simulation.station(s, s.owner))
        badge(
          group,
          left + 9,
          top - 2,
          s.lost ? 'Signal lost' : 'Lease · ' + s.attempt,
          s.lost ? 'danger' : 'healthy',
        );
      else if (off)
        badge(
          group,
          left + 9,
          top - 2,
          ['claude', 'antigravity'].includes(key) ? 'Gated' : 'Fenced',
          'muted',
        );
      else if (key === 'candidate' && c)
        badge(group, left + 9, top - 2, 'v' + c.version + ' · exact SHA', 'normal');
      else if (key === 'gate' && s.question && ['confirm', 'gate'].includes(s.phase))
        badge(group, left + 9, top - 2, 'Awaiting approval', 'human');
      if (key === root.Simulation.station(s, s.owner)) {
        const x = n.x + n.rx - 54,
          y = top - 8;
        group.append(
          svg('path', {
            d: 'M' + x + ' ' + y + (s.lost ? 'h43' : 'h9l3-3 2 5 4-12 4 15 3-6h18'),
            class: 'inline-ecg ' + (s.lost ? 'lost' : 'healthy'),
          }),
        );
      }
      if (key === root.Simulation.station(s, s.owner) && !s.lost) {
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
  function light(path, tone, reduced, animate, duration = flightMs, delay = 0) {
    const layer = svg('g', {
      class: 'delivery ' + tone,
      'data-duration': duration,
      'data-delay': delay,
      'aria-hidden': 'true',
    });
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
      dur: duration + 'ms',
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
      dur: duration + 'ms',
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
        dur: duration + 450 + 'ms',
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
    const total = small ? [0, 0, 354, 1440] : [0, -4, 1910, 530];
    if (overview) return total;
    const keys = event
      ? [event.from, event.to]
      : small
        ? ['operator', 'coordinator']
        : ['operator', 'coordinator', 'ledger', 'router'];
    if (!keys.includes(key) && key) keys.push(key);
    const bounds = keys.map((k) => [
      g[k].x - g[k].rx - 16,
      g[k].y - (k === 'council' ? 86 : 40),
      g[k].x + g[k].rx + 16,
      g[k].y + (k === 'council' ? 73 : 43),
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
    mini.setAttribute('viewBox', small ? '0 0 354 1440' : '0 -4 1910 530');
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
      let active = null,
        sceneTone = 'normal';
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
          sceneTone = tone;
        }
      }
      for (const key of Object.keys(g)) {
        const group = makeStation(key, g, s, small);
        activate(group, () => onPick(key));
        stations.append(group);
      }
      if (active) {
        pending = svg('g', { class: 'handoff-lights' });
        const entering = event.from === 'validator' && event.to === 'council';
        const leaving =
          event.from === 'council' &&
          event.to === 'verdict' &&
          s.reviews &&
          s.reviews.sha === event.sha;
        if (entering || leaving) {
          const branchMs = 850,
            trunkMs = flightMs - branchMs;
          const families = entering ? root.Simulation.reviewers(s).families : s.reviews?.families || [];
          const leg = entering ? 'in' : 'out';
          const trunkTone = leaving && s.reviews.pass ? 'pass' : sceneTone;
          pending.append(light(active, trunkTone, motion, animate, trunkMs, entering ? 0 : branchMs));
          for (const path of stations.querySelectorAll('[data-leg="' + leg + '"]')) {
            if (!families.includes(path.dataset.family)) continue;
            const vote = leaving ? s.reviews.votes.find((v) => v.family === path.dataset.family) : null;
            const tone = vote?.verdict === 'FAIL' ? 'danger' : vote ? 'pass' : 'normal';
            const strand = light(path, tone, motion, animate, branchMs, entering ? trunkMs : 0);
            strand.setAttribute('data-reviewer', path.dataset.family);
            pending.append(strand);
            path.classList.add('carrying', tone);
          }
        } else pending.append(light(active, sceneTone, motion, animate));
        surface.append(pending);
      }
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
        const segment = item.closest('.delivery');
        item.beginElementAt(
          (lead +
            Number(segment.dataset.delay) +
            (item.parentNode.classList.contains('arrival') || item.classList.contains('after-flight')
              ? Number(segment.dataset.duration)
              : 0)) /
            1000,
        );
      }
    }
  }
  root.MissionMap = { draw, description, nodes, duration: flightMs + 160 };
})(globalThis);
