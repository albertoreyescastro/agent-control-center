/* Responsive, keyboard-operable projection of a single recorded transition. */
(function (root) {
  'use strict';
  const nodes = {
    operator: ['Operator', '↗', 69, 132, 62, 65],
    coordinator: ['Coordinator', '⌘', 214, 132, 201, 65],
    ledger: ['State ledger', '▤', 214, 222, 201, 140],
    router: ['Router', '⑂', 365, 132, 169, 235],
    local: ['Local', '⌁', 505, 99, 67, 312],
    cloud: ['Cloud', '◇', 505, 166, 259, 312],
    candidate: ['Candidate', '±', 644, 132, 162, 388],
    validator: ['Validator', '✓', 644, 233, 257, 459],
    council: ['Council', '◎', 505, 233, 161, 530],
    verdict: ['Verdict', '∴', 365, 233, 63, 459],
    gate: ['Human gate', '⌑', 679, 49, 62, 600],
    registry: ['Policy / pool', '≡', 365, 49, 273, 206],
    reconciler: ['Reconciler', '↻', 214, 49, 65, 149],
    observer: ['Control room', '◉', 69, 222, 66, 212],
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
  function draw({ surface, s, small, motion, selected, onPick, onLink, playing, animate }) {
    const event = s.log.at(-1);
    const points = Object.fromEntries(
      Object.entries(nodes).map(([k, v]) => [k, small ? v.slice(4) : v.slice(2, 4)]),
    );
    const focused = surface.contains(document.activeElement)
      ? document.activeElement.dataset.node
      : null;
    surface.replaceChildren();
    surface.setAttribute('viewBox', small ? '0 0 340 645' : '0 0 774 291');
    const paths = [...links];
    if (event && !paths.some(([a, b]) => a === event.from && b === event.to))
      paths.push([event.from, event.to]);
    for (const [a, b] of paths) {
      const [x, y] = points[a],
        [u, v] = points[b];
      let path = 'M' + x + ' ' + y + ' L' + u + ' ' + v;
      if (a === 'gate' && b === 'operator')
        path = small
          ? 'M62 600 C5 600 5 599 5 529 L5 99 Q5 65 62 65'
          : 'M679 49 Q677 13 630 13 L118 13 Q69 13 69 132';
      if (a === 'verdict' && b === 'gate')
        path = small
          ? 'M63 459 L62 600'
          : 'M365 233 Q358 275 414 275 L710 275 Q758 275 758 223 L758 82 Q758 49 679 49';
      if (a === 'reconciler' && b === 'ledger' && !small)
        path = 'M214 49 Q289 49 288 107 L288 176 Q288 222 214 222';
      if (a === 'verdict' && b === 'router')
        path = small ? 'M63 459 C8 348 17 246 169 235' : 'M365 233 Q308 186 365 132';
      const active = event && event.from === a && event.to === b;
      const tone = active
        ? event.tone
        : a === 'gate' || b === 'gate'
          ? 'human'
          : a === 'verdict' && b === 'router'
            ? 'danger'
            : 'normal';
      surface.append(svg('path', { d: path, class: 'wire ' + tone + (active ? ' active' : '') }));
      const rail = svg('path', {
        d: path,
        class: 'rail-hit',
        role: 'button',
        tabindex: 0,
        'aria-label': 'Inspect ' + nodes[a][0] + ' to ' + nodes[b][0],
      });
      rail.addEventListener('click', () => onLink(a, b));
      rail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onLink(a, b);
        }
      });
      surface.append(rail);
      if (active && animate && !motion) {
        const packet = svg('circle', { r: 4, class: 'packet ' + tone });
        const movement = svg('animateMotion', {
          path,
          dur: '0.42s',
          repeatCount: 1,
          fill: 'freeze',
          begin: 'indefinite',
        });
        packet.append(movement);
        surface.append(packet);
        movement.beginElement();
      }
    }
    for (const [key, [label, icon]] of Object.entries(nodes)) {
      const [x, y] = points[key],
        off = (key === 'local' && !s.pc) || (key === 'cloud' && (!s.transport || !s.pools.cloud));
      const n = svg('g', {
        role: 'button',
        tabindex: 0,
        'aria-label': 'Inspect ' + label + (off ? ', offline' : ''),
        'aria-pressed': key === selected,
        'data-node': key,
        class:
          'station' +
          (key === selected ? ' chosen' : '') +
          (event?.to === key ? ' current' : '') +
          (off ? ' off' : ''),
      });
      const width = small ? 108 : 120;
      n.append(
        svg('rect', { x: x - width / 2, y: y - 20, width, height: 40, rx: 8 }),
        svg('text', { x: x - width / 2 + 10, y: y + 5, class: 'symbol' }, icon),
        svg('text', { x: x + 8, y: y + 5, 'text-anchor': 'middle' }, label),
      );
      if (s.owner === key && !s.lost)
        n.append(
          svg('circle', {
            cx: x + width / 2 - 6,
            cy: y - 13,
            r: 4,
            class: playing ? 'pulse' : 'still-beat',
          }),
        );
      n.addEventListener('click', () => onPick(key));
      n.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(key);
        }
      });
      surface.append(n);
    }
    if (focused) surface.querySelector('[data-node="' + focused + '"]')?.focus({ preventScroll: true });
  }
  root.MissionMap = { draw, description, nodes };
})(globalThis);
