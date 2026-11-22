'use strict';
(() => {
  const $ = (id) => document.getElementById(id),
    sim = window.Simulation;
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  function button(label, fn, cls) {
    const n = el('button', label, cls);
    n.type = 'button';
    n.addEventListener('click', fn);
    return n;
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)'),
    narrow = matchMedia('(max-width:760px)');
  let serial = 1,
    s = sim.initial(serial),
    journal = [],
    shown = 0,
    selection = 'operator',
    playing = false,
    timer,
    epoch = 0,
    mapStamp = '',
    beatStamp = '',
    overview = false,
    guardUntil = 0;
  function stop() {
    playing = false;
    epoch++;
    clearTimeout(timer);
  }
  function schedule() {
    clearTimeout(timer);
    if (!playing || sim.waiting.has(s.phase) || document.hidden || motion.matches) return;
    const ticket = ++epoch,
      run = s.run,
      at = s.log.length;
    timer = setTimeout(
      () => {
        if (ticket === epoch && run === s.run && playing) dispatch({ type: 'tick', at });
      },
      s.kind === 'csv' ? 3750 : 4700,
    );
  }
  function apply(data) {
    const event = { run: s.run, ...data };
    if (event.type === 'incident' && event.key === 'restart')
      s = journal.reduce(sim.reduce, sim.initial(serial));
    s = sim.reduce(s, event);
    journal.push(event);
  }
  function dispatch(data) {
    const last = s.log.length;
    apply(data);
    if (s.log.length !== last) selection = s.log.at(-1).to;
    if (sim.terminal.has(s.phase)) stop();
    render();
    schedule();
  }
  function reset() {
    stop();
    s = sim.initial(++serial);
    journal = [];
    shown = 0;
    selection = 'operator';
    mapStamp = '';
    overview = false;
    guardUntil = 0;
    $('thread').replaceChildren();
    $('message').value = '';
    $('newMessage').hidden = true;
    $('evidence').open = false;
    $('disrupt').open = false;
    render();
  }
  function scrollLatest() {
    const t = $('thread');
    t.scrollTop = t.scrollHeight;
    $('newMessage').hidden = true;
  }
  function viewEvidence(card) {
    $('evidence').open = true;
    for (const n of $('proof').querySelectorAll('[data-sha]'))
      n.open = n.dataset.sha === card.sha && n.dataset.task === String(card.task);
    $('evidence').querySelector('summary').focus();
    $('evidence').scrollIntoView({ block: 'center' });
  }
  function cardControls(n, card) {
    if (card.phase === 'scope') {
      for (const [key, label] of [
        ['exclude', 'Active rows only'],
        ['include', 'Include archived rows'],
      ])
        n.append(button(label, () => reply(card.id, key), 'reply'));
    } else {
      const dl = el('dl');
      for (const [k, v] of [
        ['Action', card.action],
        ['Scope', card.scope],
        ['Candidate', 'v' + card.version + ' · ' + card.sha.slice(0, 12)],
        ['On approval', card.outcome],
        ['Evidence', card.checks + ' checks passed · ' + card.reviews],
      ]) {
        dl.append(el('dt', k), el('dd', v));
      }
      n.append(
        dl,
        button('View evidence', () => viewEvidence(card)),
      );
      for (const [key, label] of [
        ['approve', card.phase === 'confirm' ? 'Confirm approval' : 'Approve'],
        ['reject', 'Reject'],
      ])
        n.append(
          button(label, () => reply(card.id, key), key === 'approve' ? 'reply primary' : 'reply'),
        );
    }
    n.dataset.question = card.id;
  }
  function reply(id, value, text) {
    if (id !== s.question) return;
    dispatch({ type: 'answer', id, value, text });
    if (sim.terminal.has(s.phase)) $('choices').querySelector('button')?.focus({ preventScroll: true });
    else $('message').focus({ preventScroll: true });
  }
  function chat() {
    const thread = $('thread'),
      near = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 32;
    const added = s.messages.length > shown;
    for (const m of s.messages.slice(shown)) {
      const n = el(
        'div',
        undefined,
        'bubble ' + (m.who === 'you' ? 'you' : 'desk') + (m.card ? ' decision' : ''),
      );
      n.append(el('small', m.who === 'you' ? 'YOU' : 'CONTROL DESK'), el('span', m.text));
      if (m.card) cardControls(n, m.card);
      thread.append(n);
    }
    shown = s.messages.length;
    for (const n of thread.querySelectorAll('[data-question]'))
      for (const b of n.querySelectorAll('.reply')) b.disabled = n.dataset.question !== s.question;
    if (added) {
      if (near) scrollLatest();
      else $('newMessage').hidden = false;
    }
    const choices = $('choices');
    choices.replaceChildren();
    if (s.phase === 'idle') {
      for (const [kind, title] of Object.entries(sim.tasks)) {
        const primary = kind === 'csv' && !s.ambiguous;
        const b = button(
          primary ? 'Try a task' : title,
          () => begin({ type: 'choose', kind }),
          primary ? 'primary' : '',
        );
        if (primary) b.append(el('small', title));
        choices.append(b);
      }
    } else if (sim.terminal.has(s.phase)) {
      choices.append(
        button(
          'Try another task',
          () => {
            reset();
            $('message').focus();
          },
          'primary',
        ),
      );
    }
    $('message').disabled = !(s.phase === 'idle' || s.question);
    $('send').disabled = $('message').disabled;
    $('message').placeholder = s.question
      ? 'Reply to this question…'
      : s.phase === 'idle'
        ? 'Message the team…'
        : sim.terminal.has(s.phase)
          ? 'Mission closed'
          : 'Team is working…';
    $('chat-hint').textContent = s.question
      ? 'Reply by button or text · no time limit'
      : s.phase === 'idle'
        ? 'Enter to send · two local export tasks'
        : sim.terminal.has(s.phase)
          ? 'Session stays here until you start again.'
          : 'Updates and decisions arrive here.';
  }
  function begin(e) {
    if (s.phase !== 'idle') return;
    playing = !motion.matches;
    dispatch(e);
  }
  function send() {
    const input = $('message'),
      text = input.value.trim();
    if (!text || input.disabled) return;
    if (s.phase === 'idle') {
      input.value = '';
      begin({ type: 'message', text });
      return;
    }
    const value = text.toLowerCase().replace(/[.!?]+$/, '');
    const words =
      s.phase === 'scope'
        ? {
            yes: 'include',
            include: 'include',
            'include archived rows': 'include',
            no: 'exclude',
            exclude: 'exclude',
            'active rows only': 'exclude',
          }
        : { approve: 'approve', confirm: 'approve', 'confirm approval': 'approve', reject: 'reject' };
    if (!Object.hasOwn(words, value)) {
      $('chat-hint').textContent = 'Choose a reply on the open question to confirm your meaning.';
      return;
    }
    input.value = '';
    reply(s.question, words[value], text);
  }
  function presets(id, variant) {
    reset();
    const csv = !['normal', 'outage', 'quota', 'verification'].includes(id);
    apply({
      type: 'choose',
      kind: variant === 'next' ? 'csv' : csv ? 'csv' : 'empty',
      options: {
        sensitive: id === 'verification',
        ending:
          variant === 'next' ? 'next' : id === 'verification' ? 'manual' : csv ? 'manual' : 'complete',
      },
    });
    function until(phase) {
      for (let i = 0; s.phase !== phase && i < 35; i++) {
        if (s.phase === 'scope') apply({ type: 'answer', id: s.question, value: 'exclude' });
        else if (!sim.waiting.has(s.phase)) apply({ type: 'tick', at: s.log.length });
        else break;
      }
    }
    const target = {
      normal: 'route',
      outage: 'council',
      quota: 'select',
      heartbeat: 'work',
      retry: 'council',
      verification: 'gate',
    }[id];
    until(target);
    if (variant === 'limit') {
      apply({ type: 'tick', at: s.log.length });
      until('council');
      apply({ type: 'incident', key: 'finding' });
    }
    $('thread').replaceChildren();
    shown = 0;
    selection = s.log.at(-1).to;
    render();
    scrollLatest();
    $('lab').scrollIntoView({ block: 'start' });
    $('step').disabled
      ? $('thread').focus({ preventScroll: true })
      : $('step').focus({ preventScroll: true });
  }
  function inspector() {
    const n = $('inspector');
    n.replaceChildren(
      el('b', window.MissionMap.nodes[selection][0] + ' · Why this happened '),
      document.createTextNode(window.MissionMap.description(selection, s)),
    );
  }
  function draw(animate) {
    $('mapField').dataset.mode = overview ? 'overview' : 'follow';
    $('followMap').setAttribute('aria-pressed', String(!overview));
    $('overviewMap').setAttribute('aria-pressed', String(overview));
    window.MissionMap.draw({
      overview,
      mini: $('miniMap'),
      surface: $('map'),
      s,
      playing,
      small: narrow.matches,
      motion: motion.matches,
      selected: selection,
      animate,
      onLink: (a, b) => {
        stop();
        controls();
        $('nodeDetails').open = true;
        const seen = s.log
          .slice()
          .reverse()
          .find((e) => e.from === a && e.to === b);
        $('inspector').replaceChildren(
          el('b', window.MissionMap.nodes[a][0] + ' → ' + window.MissionMap.nodes[b][0] + ' '),
          document.createTextNode(
            seen ? seen.detail : 'This connection has not carried an event in this mission.',
          ),
        );
      },
      onPick: (key) => {
        stop();
        $('nodeDetails').open = true;
        selection = key;
        controls();
        draw(false);
        inspector();
      },
    });
    inspector();
  }
  function evidence() {
    const n = $('proof');
    n.replaceChildren();
    if (!s.revisions.length) {
      n.append(el('p', 'The diff and check results appear when the worker submits a candidate.'));
      return;
    }
    for (const c of s.revisions.slice().reverse()) {
      const detail = el('details');
      detail.open = c === sim.current(s);
      detail.dataset.sha = c.sha;
      detail.dataset.task = String(c.task);
      detail.append(
        el('summary', 'Task ' + c.task + ' · candidate v' + c.version + ' · ' + c.sha.slice(0, 12)),
        el(
          'p',
          'Draft PR #' +
            c.pr +
            ' · base ' +
            c.base.slice(0, 12) +
            ' · parent ' +
            c.parent.slice(0, 12) +
            ' · ' +
            c.scope,
        ),
        el('p', 'Immutable revision · ' + c.sha),
        el('pre', c.diff.join('\n')),
      );
      for (const t of c.validation?.items || [])
        detail.append(
          el(
            'p',
            (t.pass ? 'PASS' : 'FAIL') +
              ' · ' +
              t.name +
              ' · expected ' +
              JSON.stringify(t.expected) +
              ' · observed ' +
              JSON.stringify(t.actual),
          ),
        );
      if (!c.validation) detail.append(el('p', 'Awaiting exact-version evidence.'));
      if (c.review)
        detail.append(
          el('p', (c.review.pass ? 'PASS' : 'BLOCK') + ' · ' + c.review.families.join(' + ')),
        );
      if (c.finding)
        detail.append(
          el(
            'p',
            'src/export.js · ' +
              c.finding.name +
              ' · expected ' +
              JSON.stringify(c.finding.expected) +
              ' · observed ' +
              JSON.stringify(c.finding.actual),
          ),
        );
      n.append(detail);
    }
    n.append(
      button('Back to conversation', () => {
        $('thread').focus();
        scrollLatest();
      }),
    );
  }
  function controls() {
    $('play').disabled = sim.waiting.has(s.phase) || motion.matches;
    $('play').textContent = playing && !sim.waiting.has(s.phase) ? 'Pause' : 'Play';
    $('step').disabled = sim.waiting.has(s.phase);
    $('resetDemo').disabled = s.phase === 'idle' && !s.ambiguous;
    $('clock').textContent = 'Logical clock · ' + String(s.clock).padStart(2, '0');
    const c = sim.current(s);
    $('budget').textContent = s.policy
      ? 'Task ' +
        s.task +
        ' · attempt ' +
        s.attempt +
        ' · claims ' +
        s.cycleAttempts +
        '/2 this cycle · repairs ' +
        s.fixes +
        '/1' +
        (c ? ' · v' + c.version : '')
      : '';
    $('runId').textContent = s.policy ? 'Mission ' + String(s.run).padStart(3, '0') : 'Standby';
    const last = s.log.at(-1);
    $('activeTitle').textContent = last?.title || 'Awaiting a task';
    $('scenarioStatus').textContent =
      (last?.detail || 'Send a message to start the workflow.') +
      (s.owner
        ? ' Owner: ' + s.owner + ' · last heartbeat ' + s.beat + ' · lease to ' + s.lease + '.'
        : '');
    $('sceneTitle').textContent = $('activeTitle').textContent;
    $('sceneDetail').textContent = last?.detail || 'Send a message to start the workflow.';
    $('scenePlay').textContent = $('play').textContent;
    $('scenePlay').disabled = $('play').disabled;
    $('sceneStep').disabled = $('step').disabled;
    const monitor = $('workerMonitor');
    const stale = s.lost && !!s.previous && !s.owner;
    const live = !!s.owner && !s.lost;
    monitor.dataset.health = live ? 'healthy' : s.owner ? 'lost' : stale ? 'stale' : 'idle';
    monitor.dataset.pulsing = String(live && playing && !sim.waiting.has(s.phase) && !document.hidden);
    const sample = live ? [s.run, s.task, s.attempt, s.beat].join('/') : '';
    if (sample && sample !== beatStamp && !motion.matches && !document.hidden) {
      monitor.querySelector('.trace-wave').animate?.(
        [
          { strokeDasharray: '120', strokeDashoffset: 120 },
          { strokeDasharray: '120', strokeDashoffset: 0 },
        ],
        { duration: 1100, easing: 'ease-out' },
      );
    }
    beatStamp = sample;
    $('heartState').textContent = live
      ? 'Heartbeat · ' + (s.owner === 'local' ? 'Local executor' : 'Cloud executor')
      : s.owner
        ? 'Heartbeat lost · ' + s.owner
        : stale
          ? 'Lease expired · attempt fenced'
          : s.attempt
            ? 'Heartbeat · lease released'
            : 'Heartbeat · standby';
    $('heartDetail').textContent = s.owner
      ? 'Attempt ' + s.attempt + ' · last beat T' + s.beat + ' · lease until T' + s.lease
      : stale
        ? 'Attempt ' + s.previous.attempt + ' · waiting for a new claim'
        : s.attempt
          ? 'No current lease'
          : 'Waiting for a worker lease';
    $('events').replaceChildren(
      ...s.log
        .slice()
        .reverse()
        .map((e) => {
          const li = el('li', e.title);
          li.append(el('small', 'Tick ' + e.clock + ' · ' + e.detail));
          return li;
        }),
    );
    const incidents = $('incidents'),
      context = $('contextIncident');
    incidents.replaceChildren();
    context.replaceChildren();
    const allowed = Object.entries(sim.disruptions).filter(([, v]) => v[1](s));
    if (!allowed.length)
      incidents.append(el('p', 'Disruptions become available at the relevant workflow step.'));
    function trigger(key) {
      stop();
      dispatch({ type: 'incident', key });
    }
    for (const [key, [label]] of allowed) incidents.append(button(label, () => trigger(key)));
    const preferred = {
      intake: 'pc',
      route: 'pc',
      select: 'quota',
      work: s.previous ? 'late' : 'heartbeat',
      feedback: 'ack',
      validate: 'check',
      council: 'reviewer',
      gate: 'old',
    }[s.phase];
    if (allowed.some(([k]) => k === preferred))
      context.append(
        button('Try a disruption · ' + sim.disruptions[preferred][0], () => trigger(preferred)),
      );
  }
  function render() {
    chat();
    controls();
    evidence();
    const stamp = s.run + '/' + s.log.length,
      changed = stamp !== mapStamp;
    mapStamp = stamp;
    if (changed && !motion.matches && s.log.length)
      guardUntil = performance.now() + window.MissionMap.duration;
    draw(changed);
  }
  try {
    sim.validateDemo(window.DEMO_STATE);
  } catch {
    $('scenarioStatus').textContent = 'Demo payload rejected. No worker connection.';
    return;
  }
  function setView(wide) {
    overview = wide;
    draw(false);
  }
  $('followMap').addEventListener('click', () => setView(false));
  $('overviewMap').addEventListener('click', () => setView(true));
  $('map').addEventListener('focusin', (e) => {
    if (overview || !e.target.getBoundingClientRect) return;
    const a = e.target.getBoundingClientRect(),
      v = $('map').getBoundingClientRect();
    if (a.right < v.left || a.left > v.right || a.bottom < v.top || a.top > v.bottom) setView(true);
  });
  if (document.fullscreenEnabled && $('mapField').requestFullscreen) {
    $('expandMap').hidden = false;
    $('expandMap').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await $('mapField').requestFullscreen();
      } catch {
        setView(true);
      }
    });
    document.addEventListener('fullscreenchange', () => {
      const name = document.fullscreenElement ? 'Exit expanded map' : 'Expand map';
      $('expandMap').setAttribute('aria-label', name);
      $('expandMap').title = name;
      draw(false);
    });
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw(false)).observe($('map'));
  $('newMessage').addEventListener('click', scrollLatest);
  $('send').addEventListener('click', send);
  $('message').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && !e.repeat) {
      e.preventDefault();
      send();
    }
  });
  $('step').addEventListener('click', () => {
    stop();
    const paused = $('map').animationsPaused?.();
    const remaining = (paused ? 0 : guardUntil) - performance.now(),
      run = s.run,
      at = s.log.length,
      ticket = epoch;
    if (!motion.matches && remaining > 0) {
      timer = setTimeout(() => {
        if (run === s.run && ticket === epoch) dispatch({ type: 'tick', at });
      }, remaining);
      controls();
    } else dispatch({ type: 'tick', at });
  });
  $('play').addEventListener('click', () => {
    if (playing) {
      stop();
      $('map').pauseAnimations?.();
    } else {
      playing = true;
      $('map').unpauseAnimations?.();
    }
    controls();
    draw(false);
    schedule();
  });
  $('scenePlay').addEventListener('click', () => $('play').click());
  $('sceneStep').addEventListener('click', () => $('step').click());
  $('resetDemo').addEventListener('click', () => {
    reset();
    $('message').focus();
  });
  $('explore').addEventListener('click', () => {
    $('presets').open = true;
  });
  for (const [id, name, summary] of sim.scenarios) {
    const b = button(name, () => presets(id));
    b.dataset.scenario = id;
    b.append(el('small', summary));
    $('scenarios').append(b);
  }
  for (const [label, id, variant] of [
    ['Repair limit exhausted', 'retry', 'limit'],
    ['Two-phase mission', 'normal', 'next'],
  ])
    $('scenarios').append(button(label, () => presets(id, variant)));
  function layout() {
    if (!narrow.matches) $('map-details').open = true;
    draw(false);
  }
  $('disrupt').addEventListener('toggle', () => {
    if ($('disrupt').open) {
      stop();
      controls();
    }
  });
  $('evidence').addEventListener('toggle', () => {
    if ($('evidence').open) {
      stop();
      controls();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
      controls();
    }
  });
  motion.addEventListener('change', () => {
    stop();
    render();
  });
  narrow.addEventListener('change', layout);
  render();
  layout();
})();
