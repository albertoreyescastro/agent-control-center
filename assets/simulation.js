/* One event reducer for the operator desk and every scenario preset. */
(function (root) {
  'use strict';
  const project = typeof module === 'object' ? require('./fixtures.js') : root.ExportProject;
  const scenarios = [
    ['normal', 'Normal routing', 'From intake to a human decision.'],
    ['outage', 'Reviewer outage', 'Replace a missing reviewer.'],
    ['quota', 'Quota fence', 'Route around a fenced pool.'],
    ['heartbeat', 'Heartbeat lost', 'Recover a lease and challenge the new owner.'],
    ['retry', 'Bounded recovery', 'Inspect a finding and repair its candidate.'],
    ['verification', 'Human merge gate', 'Confirm a sensitive manual action.'],
  ];
  const waiting = new Set([
    'idle',
    'scope',
    'gate',
    'confirm',
    'complete',
    'manual',
    'rejected',
    'blocked',
  ]);
  const terminal = new Set(['complete', 'manual', 'rejected', 'blocked']);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function initial(run) {
    return {
      run,
      task: 1,
      phase: 'idle',
      kind: null,
      title: '',
      clock: 0,
      policy: null,
      pc: true,
      codexABusy: false,
      executorFamily: null,
      pools: { local: true, cloud: true },
      transport: true,
      projectAccess: true,
      fenced: false,
      attempt: 0,
      cycleAttempts: 0,
      owner: null,
      lease: 0,
      beat: null,
      lost: false,
      previous: null,
      lateSeen: false,
      revisions: [],
      checks: null,
      reviews: null,
      fixes: 0,
      stage: 0,
      question: null,
      archived: false,
      feedback: 'unasked',
      offline: 0,
      forceFinding: false,
      checkFault: false,
      missing: false,
      log: [],
      messages: [
        { who: 'desk', text: 'You’re operating a small engineering team. What should we fix first?' },
      ],
    };
  }
  const current = (s) => s.revisions.filter((c) => c.task === s.task).at(-1);
  const workerNames = { local: 'Codex A', localB: 'Codex B', cloud: 'Jules' };
  function station(s, key) {
    return key === 'local' && s.codexABusy ? 'localB' : key;
  }
  function workerName(s, key) {
    return workerNames[station(s, key)];
  }
  function record(s, from, to, title, detail, tone = 'normal') {
    s.log.push({
      from: station(s, from),
      to: station(s, to),
      title,
      detail,
      tone,
      clock: s.clock,
      task: s.task,
      attempt: s.attempt,
      sha: current(s)?.sha || null,
    });
  }
  function say(s, text, who = 'desk', card = null) {
    s.messages.push({ text, who, card });
  }
  function block(s, from, reason) {
    s.phase = 'blocked';
    s.owner = null;
    s.question = null;
    record(s, from, 'ledger', 'Mission blocked', reason, 'danger');
    say(s, reason);
  }
  function ask(s, phase) {
    s.phase = phase;
    const c = current(s);
    s.question = [s.run, s.task, phase, c?.sha || 'scope', s.stage].join('/');
    if (phase === 'scope')
      return say(s, 'Should the export include archived rows?', 'desk', { id: s.question, phase });
    const action =
      s.policy.ending === 'manual'
        ? 'Authorise manual merge'
        : s.policy.ending === 'next' && s.task === 1
          ? 'Queue the empty-export test'
          : 'Complete this mission';
    say(s, phase === 'confirm' ? 'Second confirmation required' : 'Approval requested', 'desk', {
      id: s.question,
      phase,
      action,
      scope: c.scope,
      outcome:
        s.policy.sensitive && s.stage === 1
          ? 'Ask for a separate second confirmation.'
          : action === 'Authorise manual merge'
            ? 'Leave the merge to a human.'
            : action === 'Queue the empty-export test'
              ? 'Start phase B in this mission.'
              : 'Close the scoped task.',
      sha: c.sha,
      version: c.version,
      checks: s.checks.items.length,
      reviews: s.reviews.families.join(', '),
      task: s.task,
    });
  }
  function start(s, kind, title, options = {}) {
    s.kind = kind;
    s.title = title;
    s.phase = 'intake';
    s.policy = {
      sensitive: options.sensitive !== false,
      ending: options.ending || (kind === 'empty' ? 'complete' : 'manual'),
      maxAttempts: 2,
      maxFixes: 1,
      includedOnly: true,
    };
    record(s, 'operator', 'coordinator', 'Task registered', title + ' · policy fixed for this mission.');
    say(s, 'Mission opened. Cloudflare Workers is recording the task and its review policy.');
  }
  function recognised(text) {
    if (/\b(empty|blank|zero|no rows)\b/i.test(text) && /export|csv|test|row/i.test(text))
      return 'empty';
    if (/comma|surname|family name/i.test(text) && /name|csv|export|cell/i.test(text)) return 'csv';
    return null;
  }
  function phaseStatus(s) {
    const c = current(s);
    switch (s.phase) {
      case 'select':
        return s.lost && s.previous ? 'Lease expired · reassigning' : 'Checking eligible workers';
      case 'work':
        return s.lost
          ? 'Heartbeat lost · awaiting lease expiry'
          : workerName(s, s.owner) + ' · executing';
      case 'produce':
        return workerName(s, s.owner) + ' · preparing candidate';
      case 'validate':
        return 'Validating v' + c.version;
      case 'review':
        return 'Checks passed · scheduling review';
      case 'council':
        return 'Review council · v' + c.version;
      case 'repair':
        return 'Correction requested · v' + c.version;
      case 'verdict':
        return 'Review passed · v' + c.version;
      default:
        return {
          idle: 'Awaiting a task',
          intake: 'Recording mission',
          route: 'Routing task',
          feedback: 'Feedback triage',
          scope: 'Waiting for your scope decision',
          handoff: 'Preparing approval',
          gate: 'Waiting for your approval',
          confirm: 'Waiting for your confirmation',
          manual: 'Authorised for manual merge',
          complete: 'Mission completed',
          rejected: 'Mission rejected',
          blocked: 'Mission blocked',
        }[s.phase];
    }
  }
  function fit(s, worker) {
    if (worker === 'local' && !s.pc) return 'PC offline';
    if (!s.pools[worker]) return 'Included pool fenced';
    if (s.owner) return 'Active lease exists';
    if (worker === 'cloud' && !s.fenced) return 'Local work has no fence';
    if (worker === 'cloud' && !s.transport) return 'Transport evidence missing';
    if (worker === 'cloud' && !s.projectAccess) return 'Project access unverified';
    return 'Code capability, fresh fixture and included pool verified';
  }
  function route(s) {
    let worker = 'local';
    if (fit(s, worker) !== 'Code capability, fresh fixture and included pool verified') {
      if (!s.owner) s.fenced = true;
      worker = 'cloud';
    }
    const reason = fit(s, worker);
    if (!reason.startsWith('Code capability'))
      return block(
        s,
        'router',
        'No eligible route. Local: ' +
          fit(s, 'local') +
          '. Cloud: ' +
          reason +
          '. Additional spend is disabled.',
      );
    if (s.cycleAttempts >= s.policy.maxAttempts)
      return block(s, 'router', 'Execution attempt budget exhausted.');
    s.attempt++;
    s.cycleAttempts++;
    s.owner = worker;
    s.executorFamily = worker === 'cloud' ? 'Google' : 'OpenAI';
    s.lost = false;
    s.beat = s.clock;
    s.lease = s.clock + 2;
    s.phase = 'work';
    record(
      s,
      'router',
      worker,
      'Attempt ' + s.attempt + ' claimed',
      workerName(s, worker) +
        ' owns attempt ' +
        s.attempt +
        '. ' +
        reason +
        '. ' +
        (worker === 'cloud' ? 'Local work fenced before handoff.' : 'Local execution preferred.'),
    );
  }
  function revise(s) {
    const version = s.fixes + 1,
      c = project.candidate(s.kind, version, s.archived);
    c.task = s.task;
    c.pr = 40 + s.task;
    c.parent = current(s)?.sha || c.base;
    s.revisions.push(c);
    s.phase = 'validate';
    s.checks = null;
    s.reviews = null;
    record(
      s,
      s.owner,
      'candidate',
      'Candidate v' + version + ' ready',
      'Draft PR #' +
        c.pr +
        ' · ' +
        c.sha.slice(0, 12) +
        '. Worker completion awaits independent checks.',
    );
    s.owner = null;
  }
  function settleResult(s, packet) {
    if (packet.run !== s.run || packet.task !== s.task) return;
    if (packet.attempt !== s.attempt || packet.owner !== s.owner || s.phase !== 'produce') {
      record(
        s,
        packet.owner,
        'ledger',
        'Late result discarded',
        'Attempt ' + packet.attempt + ' cannot complete attempt ' + s.attempt + '. Candidate unchanged.',
      );
      return;
    }
    revise(s);
  }
  const councilModels = [
    { name: 'Llama 3.1 8B', family: 'Meta Llama' },
    { name: 'GPT-OSS 20B', family: 'Open-weight GPT' },
    { name: 'GLM 4.7 Flash', family: 'GLM' },
  ];
  function reviewers(s) {
    const required = s.policy?.sensitive === false ? 2 : 3;
    // A simulated reserve worker serves the same model; it cannot supply a fourth vote.
    const roster = [...councilModels, { ...councilModels[0], reserve: true }];
    const families = [],
      members = [],
      excluded = [];
    for (const [index, worker] of roster.entries()) {
      const name = worker.name + (worker.reserve ? ' (standby)' : '');
      let reason;
      if (index < s.offline) reason = 'reviewer offline';
      else if (worker.family === s.executorFamily) reason = 'same family as executor';
      else if (families.includes(worker.family)) reason = 'family already represented';
      else if (families.length < required) {
        families.push(worker.family);
        members.push(worker);
      }
      if (reason) excluded.push(name + ' · ' + reason);
    }
    return { required, families, members, excluded };
  }
  function council(s) {
    const c = current(s);
    if (s.checks?.sha !== c.sha || !s.checks.pass)
      return block(s, 'validator', 'Exact-version validation evidence missing.');
    const { required, families, members } = reviewers(s);
    if (families.length < required)
      return block(
        s,
        'council',
        'Review unavailable. Only ' +
          families.length +
          ' of ' +
          required +
          ' eligible independent families remain.',
      );
    const probes = [
      s.forceFinding ? 'multiline' : 'scope',
      s.kind === 'csv' ? 'quote' : 'empty',
      'comma',
    ];
    const votes = members.map(({ name, family }, index) => {
      const check = project.probe(c, probes[index]);
      return { name, family, sha: c.sha, verdict: check.pass ? 'PASS' : 'FAIL', check };
    });
    const failed = votes.find((v) => v.verdict === 'FAIL');
    s.reviews = { sha: c.sha, families, votes, pass: !failed };
    c.review = clone(s.reviews);
    if (failed) {
      const item = failed.check;
      c.finding = item;
      s.forceFinding = false;
      const reason =
        'src/export.js · ' +
        item.name +
        '. Expected ' +
        JSON.stringify(item.expected) +
        ', observed ' +
        JSON.stringify(item.actual) +
        '.';
      if (s.fixes >= s.policy.maxFixes) return block(s, 'council', 'Repair budget exhausted. ' + reason);
      s.phase = 'repair';
      record(s, 'council', 'verdict', 'Council requested a correction', reason, 'danger');
      say(
        s,
        failed.name +
          ' found a failing case in v' +
          c.version +
          ': ' +
          item.name +
          '. One bounded repair is available.',
      );
    } else {
      s.phase = 'verdict';
      record(
        s,
        'council',
        'verdict',
        'Council passed v' + c.version,
        families.join(' + ') +
          ' settled on ' +
          c.sha.slice(0, 12) +
          '. Executor family ' +
          s.executorFamily +
          ' excluded.',
      );
    }
  }
  function tick(s) {
    if (waiting.has(s.phase)) return;
    s.clock++;
    if (s.owner && !s.lost) {
      s.beat = s.clock;
      s.lease = s.clock + 2;
    }
    switch (s.phase) {
      case 'intake':
        s.phase = 'route';
        record(
          s,
          'coordinator',
          'ledger',
          'Mission recorded',
          'Task, fixed policy and pending dispatch saved in the session journal.',
        );
        break;
      case 'route':
        s.phase = 'select';
        record(
          s,
          'ledger',
          'router',
          'Eligibility check',
          'Code task · local preferred · verified included capacity only.',
        );
        break;
      case 'select':
        route(s);
        break;
      case 'work':
        if (s.lost) {
          if (s.clock < s.lease) {
            record(
              s,
              'reconciler',
              'ledger',
              'Awaiting lease expiry',
              'Heartbeat stopped. The existing attempt still owns the task until tick ' + s.lease + '.',
            );
            break;
          }
          s.previous = { owner: s.owner, attempt: s.attempt };
          if (s.owner === 'local') s.pc = false;
          else s.pools.cloud = false;
          s.owner = null;
          s.fenced = true;
          s.phase = 'select';
          record(
            s,
            'reconciler',
            'ledger',
            'Expired attempt fenced',
            'Logical clock reached lease expiry. Reassignment can now proceed.',
            'danger',
          );
          break;
        }
        s.beat = s.clock;
        s.lease = s.clock + 2;
        if (s.feedback === 'unasked') {
          s.feedback = 'sent';
          s.phase = 'feedback';
          record(
            s,
            s.owner,
            'feedback',
            'Routine feedback answered once',
            'Policy already covers running the regression checks. One answer recorded.',
          );
          break;
        }
        s.phase = 'produce';
        record(s, 'ledger', s.owner, 'Execution resumed', 'Current attempt owns the chosen scope.');
        break;
      case 'feedback':
        if (s.feedback === 'uncertain') {
          s.feedback = 'reconciled';
          record(
            s,
            'reconciler',
            'ledger',
            'Feedback acknowledgement recovered',
            'Receipt matched the original answer. No resend.',
          );
          break;
        }
        if (s.kind === 'csv' && s.task === 1) {
          record(
            s,
            'feedback',
            'operator',
            'Scope needs a decision',
            'Archived rows change the export contract.',
            'human',
          );
          ask(s, 'scope');
        } else {
          s.phase = 'produce';
          record(
            s,
            'ledger',
            s.owner,
            'Test scope confirmed',
            'An empty export must retain the header.',
          );
        }
        break;
      case 'produce':
        settleResult(s, { run: s.run, task: s.task, owner: s.owner, attempt: s.attempt });
        break;
      case 'validate': {
        const c = current(s);
        if (s.missing)
          return block(
            s,
            'validator',
            'Evidence missing. The read-only validator could not establish a result for this version.',
          );
        const items = project.validate(c, s.checkFault ? 'Name' : 'name');
        s.checks = { sha: c.sha, items, pass: items.every((x) => x.pass) };
        c.validation = clone(s.checks);
        if (!s.checks.pass)
          return block(
            s,
            'validator',
            'Check failed: ' + items.find((i) => !i.pass).name + '. Council was not opened.',
          );
        s.phase = 'review';
        record(
          s,
          'candidate',
          'validator',
          'Read-only checks passed',
          items.length + ' checks match v' + c.version + ' · ' + c.sha.slice(0, 12),
        );
        break;
      }
      case 'review':
        s.phase = 'council';
        record(
          s,
          'validator',
          'council',
          'Council convened',
          'Workers AI requires ' +
            reviewers(s).required +
            ' independent families for v' +
            current(s).version +
            '. Scheduled: ' +
            reviewers(s)
              .members.map((w) => w.name)
              .join(', ') +
            '.',
        );
        break;
      case 'council':
        council(s);
        break;
      case 'repair':
        s.fixes++;
        s.cycleAttempts = 0;
        s.checks = null;
        s.reviews = null;
        s.question = null;
        s.phase = 'select';
        record(
          s,
          'verdict',
          'router',
          'Bounded repair queued',
          'Findings attached. Previous evidence retired. A fresh claim is required.',
          'danger',
        );
        break;
      case 'verdict':
        s.phase = 'handoff';
        record(
          s,
          'verdict',
          'gate',
          'Human gate opened',
          'A scoped decision is ready for this version.',
          'human',
        );
        break;
      case 'handoff':
        s.stage = 1;
        record(
          s,
          'gate',
          'operator',
          'Decision returned to Telegram',
          'Only the displayed candidate and action can be authorised.',
          'human',
        );
        ask(s, 'gate');
        break;
    }
  }
  function answer(s, e) {
    if (!e.id || e.id !== s.question || !['scope', 'gate', 'confirm'].includes(s.phase)) return;
    if (s.phase === 'scope') {
      if (!['include', 'exclude'].includes(e.value)) return;
      s.archived = e.value === 'include';
      s.question = null;
      s.phase = 'produce';
      s.beat = s.clock;
      s.lease = s.clock + 2;
      say(s, e.text || (s.archived ? 'Include archived rows' : 'Active rows only'), 'you');
      record(
        s,
        'operator',
        s.owner,
        'Scope recorded',
        s.archived ? 'Include archived rows.' : 'Export active rows only.',
        'human',
      );
      return;
    }
    if (
      !['approve', 'reject'].includes(e.value) ||
      s.reviews?.sha !== current(s)?.sha ||
      !s.reviews?.pass
    )
      return;
    say(s, e.text || (e.value === 'approve' ? 'Approve' : 'Reject'), 'you');
    s.question = null;
    if (e.value === 'reject') {
      s.phase = 'rejected';
      record(
        s,
        'operator',
        'ledger',
        'Mission rejected',
        'Operator rejected the requested action for this version.',
        'human',
      );
    } else if (s.policy.sensitive && s.stage === 1) {
      s.stage = 2;
      record(
        s,
        'operator',
        'ledger',
        'First confirmation recorded',
        'A separate confirmation is required.',
        'human',
      );
      ask(s, 'confirm');
      return;
    } else if (s.policy.ending === 'next' && s.task === 1) {
      s.task++;
      s.kind = 'empty';
      s.title = project.tasks.empty;
      s.phase = 'route';
      s.attempt = 0;
      s.cycleAttempts = 0;
      s.fixes = 0;
      s.checks = null;
      s.reviews = null;
      s.previous = null;
      s.lateSeen = false;
      s.feedback = 'unasked';
      s.stage = 0;
      record(s, 'operator', 'ledger', 'Phase B queued once', s.title, 'human');
      say(s, 'Approved. Phase B is queued in the same mission: ' + s.title);
      return;
    } else {
      s.phase = s.policy.ending === 'manual' ? 'manual' : 'complete';
      record(
        s,
        'operator',
        'ledger',
        s.phase === 'manual' ? 'Authorised for manual merge' : 'Mission completed',
        s.phase === 'manual'
          ? 'A human may now merge this exact version manually.'
          : 'The scoped task is complete.',
        'human',
      );
    }
    say(s, s.log.at(-1).title + '. ' + s.log.at(-1).detail);
  }
  const disruptions = {
    pc: ['Turn PC off', (s) => ['intake', 'route', 'select'].includes(s.phase) && s.pc],
    busy: [
      'Make Codex A busy',
      (s) => ['intake', 'route', 'select'].includes(s.phase) && s.pc && s.attempt === 0 && !s.codexABusy,
    ],
    restore: ['Bring PC back online', (s) => !!s.policy && !s.pc && !terminal.has(s.phase)],
    quota: [
      'Exhaust a quota pool',
      (s) => ['intake', 'route', 'select'].includes(s.phase) && (s.pools.local || s.pools.cloud),
    ],
    transport: [
      'Remove cloud transport',
      (s) => ['intake', 'route', 'select'].includes(s.phase) && s.transport,
    ],
    access: [
      'Remove project access',
      (s) => ['intake', 'route', 'select'].includes(s.phase) && s.projectAccess,
    ],
    heartbeat: ['Drop heartbeat', (s) => s.phase === 'work' && !s.lost],
    late: ['Deliver late result', (s) => s.previous && s.attempt > s.previous.attempt && !s.lateSeen],
    ack: ['Lose feedback acknowledgement', (s) => s.phase === 'feedback' && s.feedback === 'sent'],
    check: ['Fail a check', (s) => s.phase === 'validate' && !s.checkFault],
    missing: ['Remove check evidence', (s) => s.phase === 'validate' && !s.missing],
    reviewer: ['Take reviewer offline', (s) => ['review', 'council'].includes(s.phase) && s.offline < 4],
    finding: ['Flag a blocking issue', (s) => s.phase === 'council' && !s.forceFinding],
    old: ['Use an old approval', (s) => current(s)?.version > 1 && !terminal.has(s.phase)],
    restart: ['Restart the coordinator', (s) => !!s.policy && !terminal.has(s.phase)],
  };
  function interrupt(s, key) {
    if (!disruptions[key]?.[1](s)) return;
    let detail,
      from = 'registry',
      to = 'router',
      tone = 'normal';
    switch (key) {
      case 'pc':
        s.pc = false;
        detail = 'Local health is offline. The router will evaluate cloud evidence.';
        break;
      case 'busy':
        s.codexABusy = true;
        detail = 'Codex A is busy. Codex B is next in the local ranking.';
        break;
      case 'restore':
        s.pc = true;
        detail =
          'Local health restored. The next claim may use Codex; an existing lease keeps its owner.';
        break;
      case 'quota': {
        const pool = s.pools.local ? 'local' : 'cloud';
        s.pools[pool] = false;
        detail = 'Fenced ' + pool + ' included pool. No paid fallback.';
        break;
      }
      case 'transport':
        s.transport = false;
        detail = 'Cloud transport evidence removed.';
        break;
      case 'access':
        s.projectAccess = false;
        detail = 'Cloud project access is unverified.';
        break;
      case 'heartbeat':
        s.lost = true;
        from = s.owner;
        to = 'ledger';
        tone = 'danger';
        detail =
          workerName(s, s.owner) +
          ' stopped sending heartbeats. Attempt ' +
          s.attempt +
          ' retains its lease until logical tick ' +
          s.lease +
          '.';
        break;
      case 'late':
        s.lateSeen = true;
        settleResult(s, { ...s.previous, run: s.run, task: s.task });
        return;
      case 'ack':
        s.feedback = 'uncertain';
        from = 'ledger';
        to = 'reconciler';
        detail = 'Send outcome ambiguous. Reconcile the receipt before continuing.';
        break;
      case 'reviewer':
        s.offline++;
        from = 'registry';
        to = 'council';
        detail =
          'Reviewer offline. Eligible independent families remaining: ' +
          (reviewers(s).families.join(', ') || 'none') +
          '.';
        break;
      case 'finding':
        s.forceFinding = true;
        from = 'council';
        to = 'verdict';
        detail = 'Council will exercise an additional edge case.';
        break;
      case 'check':
        s.checkFault = true;
        from = 'candidate';
        to = 'validator';
        detail = 'Injected fixture returns an uppercase header. Check will fail.';
        break;
      case 'missing':
        s.missing = true;
        from = 'candidate';
        to = 'validator';
        detail = 'Exact-version check receipt removed.';
        break;
      case 'old':
        answer(s, {
          id: [s.run, s.task, 'gate', s.revisions.find((c) => c.task === s.task).sha, 1].join('/'),
          value: 'approve',
        });
        from = 'operator';
        to = 'ledger';
        detail = 'Stale v1 approval discarded. Current candidate is v' + current(s).version + '.';
        break;
      case 'restart':
        from = 'reconciler';
        to = 'ledger';
        detail = 'Session journal replayed. Phase, lease and outstanding question restored.';
        break;
    }
    record(s, from, to, key === 'heartbeat' ? 'Heartbeat lost' : disruptions[key][0], detail, tone);
  }
  function reduce(previous, e) {
    if (e.run !== previous.run) return previous;
    const s = clone(previous);
    if (e.type === 'tick' && e.at === s.log.length) tick(s);
    else if (e.type === 'incident') interrupt(s, e.key);
    else if (e.type === 'answer') answer(s, e);
    else if (e.type === 'message' && s.phase === 'idle') {
      const title = String(e.text).trim().slice(0, 240);
      if (!title) return previous;
      const kind = recognised(title);
      say(s, title, 'you');
      if (kind) start(s, kind, title, e.options);
      else {
        s.ambiguous = title;
        say(s, 'Which export task did you mean? Choose an interpretation below.');
      }
    } else if (e.type === 'choose' && s.phase === 'idle' && Object.hasOwn(project.tasks, e.kind)) {
      if (!s.ambiguous) say(s, project.tasks[e.kind], 'you');
      else
        say(
          s,
          'Use the ' +
            (e.kind === 'csv' ? 'comma-separated names fix' : 'empty-export regression test') +
            '.',
          'you',
        );
      start(s, e.kind, s.ambiguous || project.tasks[e.kind], e.options);
    }
    const entry = s.log.at(-1);
    if (
      s.log.length > previous.log.length &&
      !s.messages.slice(previous.messages.length).some((m) => m.who === 'desk')
    ) {
      say(s, entry.title + '. ' + entry.detail);
    }
    return s;
  }
  function validateDemo(s) {
    const closed = (x, k) =>
      x &&
      typeof x === 'object' &&
      !Array.isArray(x) &&
      Object.keys(x).length === k.length &&
      k.every((v) => Object.hasOwn(x, v));
    if (
      !closed(s, ['schema_version', 'generated_at', 'mode', 'agents', 'queue_summary']) ||
      s.schema_version !== '1.0' ||
      s.mode !== 'demo' ||
      typeof s.generated_at !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(s.generated_at) ||
      !Number.isFinite(Date.parse(s.generated_at))
    )
      throw Error('Invalid demo');
    if (!Array.isArray(s.agents) || s.agents.length !== 6) throw Error('Invalid topology');
    s.agents.forEach((a, i) => {
      const n = String(i + 1).padStart(2, '0');
      if (
        !closed(a, ['id', 'label', 'status', 'role', 'surface', 'quota_state']) ||
        a.id !== 'worker-' + n ||
        a.label !== 'Worker ' + n ||
        !['online', 'busy', 'offline', 'limited', 'unknown'].includes(a.status) ||
        !['code worker', 'independent reviewer', 'fallback worker', 'unknown'].includes(a.role) ||
        !['local', 'cloud', 'cloud_async', 'hybrid', 'unknown'].includes(a.surface) ||
        a.quota_state !== 'unknown'
      )
        throw Error('Invalid worker');
    });
    if (
      !closed(s.queue_summary, ['queued', 'running', 'blocked']) ||
      Object.values(s.queue_summary).some((x) => !Number.isInteger(x) || x < 0 || x > 1000000)
    )
      throw Error('Invalid counts');
    return s;
  }
  const api = {
    initial,
    reduce,
    scenarios,
    tasks: project.tasks,
    current,
    reviewers,
    councilModels,
    station,
    workerName,
    phaseStatus,
    disruptions,
    waiting,
    terminal,
    validateDemo,
  };
  if (typeof module === 'object') module.exports = api;
  else root.Simulation = api;
})(globalThis);
