'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  vm = require('node:vm');
const sim = require('../assets/simulation.js');
let cases = 0;
function test(name, fn) {
  fn();
  cases++;
  console.log('PASS ' + name);
}
function desk(kind = 'csv', options = {}) {
  const run = 7,
    journal = [];
  let state = sim.initial(run);
  function event(e) {
    const input = { run, ...e };
    journal.push(input);
    state = sim.reduce(state, input);
  }
  function tick() {
    event({ type: 'tick', at: state.log.length });
  }
  function until(phase) {
    for (let i = 0; state.phase !== phase && i < 40; i++) {
      if (state.phase === 'scope') reply('exclude');
      else if (!sim.waiting.has(state.phase)) tick();
      else break;
    }
    assert.equal(state.phase, phase);
  }
  function reply(value, id = state.question) {
    event({ type: 'answer', value, id });
  }
  if (kind) event({ type: 'choose', kind, options });
  return {
    get s() {
      return state;
    },
    event,
    tick,
    until,
    reply,
    incident: (key) => event({ type: 'incident', key }),
    replay: () => journal.reduce(sim.reduce, sim.initial(run)),
  };
}
test('Six presets and closed public fixture contract', () => {
  assert.equal(new Set(sim.scenarios.map((x) => x[0])).size, 6);
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync('assets/demo-state.js', 'utf8'), ctx);
  const payload = ctx.window.DEMO_STATE;
  sim.validateDemo(payload);
  for (const mutate of [
    (s) => (s.mode = 'snapshot'),
    (s) => (s.extra = 1),
    (s) => (s.queue_summary.running = true),
    (s) => (s.agents[0].label = '<img>'),
    (s) => (s.agents[0].quota_state = 'paid'),
    (s) => s.agents.pop(),
    (s) => (s.generated_at = 'undated'),
    (s) => (s.agents[0].status = 'live'),
  ]) {
    const v = structuredClone(payload);
    mutate(v);
    assert.throws(() => sim.validateDemo(v));
  }
});
test('Unknown request stays inert until interpreted; original title preserved', () => {
  const d = desk(null);
  d.event({ type: 'message', text: '<img> redesign the output' });
  assert.equal(d.s.phase, 'idle');
  d.event({ type: 'choose', kind: 'empty' });
  assert.equal(d.s.title, '<img> redesign the output');
});
test('Local, cloud, transport, access, quota and zero-overage', () => {
  const d = desk('empty');
  d.until('work');
  assert.equal(d.s.owner, 'local');
  for (const key of ['pc', 'quota']) {
    const d = desk('empty');
    d.incident(key);
    d.until('work');
    assert.equal(d.s.owner, 'cloud');
    assert(d.s.fenced);
  }
  for (const key of ['quota', 'access', 'transport']) {
    const d = desk('empty');
    d.incident('quota');
    d.incident(key);
    d.until('blocked');
    assert.equal(d.s.attempt, 0);
    assert.equal(d.s.owner, null);
  }
});
test('Lease survives a lost heartbeat, fence precedes reassignment, stale packet rejected', () => {
  const d = desk('empty');
  d.until('work');
  d.incident('heartbeat');
  const expiry = d.s.lease;
  d.tick();
  assert.equal(d.s.owner, 'local');
  assert(d.s.clock < expiry);
  d.tick();
  assert.equal(d.s.owner, null);
  d.tick();
  assert.equal(d.s.owner, 'cloud');
  assert.equal(d.s.attempt, 2);
  d.until('validate');
  const c = sim.current(d.s);
  d.incident('late');
  assert.deepEqual(sim.current(d.s), c);
  assert.match(d.s.log.at(-1).title, /discarded/);
  assert.deepEqual(d.replay(), d.s);
});
test('Routine feedback reconciled once, scope changes the export fixture', () => {
  for (const answer of ['include', 'exclude']) {
    const d = desk();
    d.until('feedback');
    d.incident('ack');
    d.until('scope');
    assert.equal(d.s.log.filter((x) => x.title === 'Routine feedback answered once').length, 1);
    const q = d.s.question;
    d.tick();
    assert.equal(d.s.question, q);
    d.reply(answer);
    d.reply('exclude', q);
    d.until('review');
    const fixture = sim.current(d.s);
    assert.equal(fixture.validation.items[1].actual.includes('Lake'), answer === 'include');
  }
});
test('Read-only validation, missing evidence and failing check halt council', () => {
  for (const key of ['check', 'missing']) {
    const d = desk();
    d.until('validate');
    d.incident(key);
    d.tick();
    assert.equal(d.s.phase, 'blocked');
    assert.equal(d.s.reviews, null);
    assert.equal(d.s.checks?.pass, key === 'check' ? false : undefined);
  }
});
test('Unavailable review is distinct from a finding; family counts depend on policy', () => {
  for (const sensitive of [false, true]) {
    const d = desk('empty', { sensitive });
    d.until('council');
    d.incident('reviewer');
    d.tick();
    assert.equal(d.s.reviews.families.length, sensitive ? 3 : 2);
    assert(!d.s.reviews.families.includes(d.s.executorFamily));
    const b = desk('empty', { sensitive });
    b.until('council');
    for (let i = 0; i < 3; i++) b.incident('reviewer');
    b.tick();
    assert.equal(b.s.phase, 'blocked');
    assert.match(b.s.log.at(-1).detail, /Review unavailable/);
    assert.equal(b.s.fixes, 0);
  }
});
test('Repair changes the immutable diff, reruns exact checks, keeps old evidence', () => {
  const d = desk();
  d.until('repair');
  const v1 = sim.current(d.s);
  assert(!v1.finding.pass);
  assert.deepEqual(
    v1.review.votes.map((v) => v.verdict),
    ['PASS', 'FAIL', 'PASS'],
  );
  assert(v1.review.votes.every((v) => v.sha === v1.sha));
  d.tick();
  assert.equal(d.s.checks, null);
  assert.equal(d.s.reviews, null);
  d.until('gate');
  const v2 = sim.current(d.s);
  assert(v2.validation.items.find((x) => x.name.includes('Literal')).pass);
  assert.notEqual(v1.sha, v2.sha);
  assert.notDeepEqual(v1.diff, v2.diff);
  assert.equal(d.s.checks.sha, v2.sha);
  assert.equal(v1.validation.sha, v1.sha);
  assert.equal(d.s.reviews.sha, v2.sha);
  d.incident('old');
  assert.equal(d.s.phase, 'gate');
  d.reply('approve');
  assert.equal(d.s.phase, 'confirm');
  d.reply('approve');
  assert.equal(d.s.phase, 'manual');
});
test('Second blocking case exhausts repair budget', () => {
  const d = desk();
  d.until('repair');
  d.tick();
  d.until('council');
  d.incident('finding');
  d.tick();
  assert.equal(d.s.phase, 'blocked');
  assert.equal(d.s.fixes, 1);
  assert.match(d.s.log.at(-1).detail, /Multiline/);
});
test('Approval stage, rejection, replays, old mission and exact revision', () => {
  const d = desk('empty', { sensitive: true, ending: 'manual' });
  d.until('gate');
  const first = d.s.question;
  d.reply('approve', first.replace(sim.current(d.s).sha, 'other'));
  assert.equal(d.s.phase, 'gate');
  d.reply('approve');
  const second = d.s.question;
  assert.notEqual(first, second);
  assert.equal(d.s.phase, 'confirm');
  d.reply('approve', first);
  assert.equal(d.s.phase, 'confirm');
  d.reply('approve');
  assert.equal(d.s.phase, 'manual');
  const prev = structuredClone(d.s);
  d.reply('reject', second);
  assert.deepEqual(d.s, prev);
  assert.deepEqual(
    sim.reduce(sim.initial(8), { run: 7, type: 'answer', id: first, value: 'approve' }),
    sim.initial(8),
  );
  const b = desk();
  b.until('gate');
  b.reply('reject');
  assert.equal(b.s.phase, 'rejected');
});
test('Exactly one phase B inside the same mission reaches terminal completion', () => {
  const d = desk('csv', { ending: 'next', sensitive: false });
  d.until('gate');
  const q = d.s.question;
  d.reply('approve');
  d.reply('approve', q);
  assert.equal(d.s.task, 2);
  assert.equal(d.s.kind, 'empty');
  assert.equal(sim.current(d.s), undefined);
  d.until('gate');
  assert.equal(d.s.checks.items[0].name, 'Empty export retains header');
  d.reply('approve');
  assert.equal(d.s.phase, 'complete');
  assert.equal(d.s.log.filter((e) => e.title === 'Phase B queued once').length, 1);
});
test('Stale clock tokens and immutable previous states', () => {
  const d = desk('empty'),
    before = structuredClone(d.s);
  d.tick();
  const fresh = structuredClone(d.s);
  d.event({ type: 'tick', at: before.log.length });
  assert.deepEqual(d.s, fresh);
  assert.equal(before.phase, 'intake');
});
test('Walkthrough names, independent sensitive votes and named local fallback', () => {
  const d = desk('empty');
  d.incident('busy');
  d.until('work');
  assert.equal(d.s.log.at(-1).to, 'localB');
  assert.match(d.s.messages.at(-1).text, /Codex B owns attempt 1/);
  d.until('council');
  assert.deepEqual(
    sim.reviewers(d.s).members.map((m) => m.name),
    ['Llama 3.1 8B', 'GPT-OSS 20B', 'GLM 4.7 Flash'],
  );
  assert.match(d.s.messages.at(-1).text, /Council convened/);
  d.tick();
  assert.equal(new Set(d.s.reviews.families).size, 3);
  const h = desk();
  h.until('work');
  h.incident('heartbeat');
  for (const title of [
    'Heartbeat lost',
    'Awaiting lease expiry',
    'Expired attempt fenced',
    'Attempt 2 claimed',
  ]) {
    assert.equal(h.s.log.at(-1).title, title);
    assert(h.s.messages.at(-1).text.includes(title));
    h.tick();
  }
  assert.equal(h.s.executorFamily, 'Google');
  h.incident('restore');
  assert.equal(h.s.owner, 'cloud');
  h.until('repair');
  h.until('work');
  assert.equal(h.s.owner, 'local');
  assert.equal(h.s.executorFamily, 'OpenAI');
  assert.deepEqual(h.replay(), h.s);
});
console.log(cases + ' scenario contract groups passed.');
