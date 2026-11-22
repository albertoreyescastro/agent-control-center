/* Fast adapter checks without network, timers or a browser dependency. */
'use strict';
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
class Node {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.disabled = false;
    this.scrollHeight = 0;
    this.clientHeight = 0;
    this.scrollTop = 0;
    this.value = '';
    this.text = '';
  }
  set textContent(v) {
    this.text = String(v);
    this.children = [];
  }
  get textContent() {
    return this.text + this.children.map((n) => n.textContent).join(' ');
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes) {
    this.children = nodes;
    this.text = '';
  }
  addEventListener(key, fn) {
    this.listeners[key] = fn;
  }
  click() {
    if (!this.disabled) this.listeners.click?.();
  }
  focus() {}
  scrollIntoView() {}
  setAttribute() {}
  contains() {
    return false;
  }
  querySelectorAll() {
    return [];
  }
  querySelector() {
    return this.children[0];
  }
}
function setup(invalid = false) {
  const roots = new Map(),
    timers = new Map();
  let next = 0;
  const get = (id) => {
    if (!roots.has(id)) roots.set(id, new Node());
    return roots.get(id);
  };
  const doc = {
    getElementById: get,
    createElement: (tag) => new Node(tag),
    createTextNode: (s) => {
      const n = new Node();
      n.textContent = s;
      return n;
    },
    addEventListener() {},
    hidden: false,
  };
  const env = {
    document: doc,
    performance: { now: () => 1000 },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    setTimeout: (fn) => {
      timers.set(++next, fn);
      return next;
    },
    clearTimeout: (id) => timers.delete(id),
    console,
  };
  env.window = env;
  const context = vm.createContext(env);
  for (const file of ['demo-state', 'fixtures', 'simulation'])
    vm.runInContext(fs.readFileSync('assets/' + file + '.js', 'utf8'), context);
  if (invalid) env.DEMO_STATE.mode = 'untrusted';
  env.MissionMap = { nodes: new Proxy({}, { get: () => ['Node'] }), draw() {}, description: () => '' };
  vm.runInContext(fs.readFileSync('assets/app.js', 'utf8'), context);
  return { get, timers };
}
const d = setup();
assert.equal(d.get('scenarios').children.filter((n) => n.dataset.scenario).length, 6);
assert.match(d.get('thread').textContent, /What should we fix first/);
d.get('choices').children[0].click();
assert.match(d.get('activeTitle').textContent, /registered/);
const old = [...d.timers.values()][0];
assert.equal(typeof old, 'function');
d.get('play').click();
assert.equal(d.timers.size, 0);
old();
assert.match(d.get('activeTitle').textContent, /registered/);
d.get('resetDemo').click();
old();
assert.match(d.get('activeTitle').textContent, /Awaiting a task/);
d.get('message').value = 'Test empty CSV exports';
d.get('send').click();
assert.match(d.get('thread').textContent, /Test empty CSV/);
d.get('scenarios')
  .children.find((n) => n.dataset.scenario === 'verification')
  .click();
assert.match(d.get('thread').textContent, /Approval requested/);
assert.equal(d.timers.size, 0);
const broken = setup(true);
assert.match(broken.get('scenarioStatus').textContent, /rejected/);
assert.equal(broken.get('scenarios').children.length, 0);
console.log(
  'DOM adapter passed: initial chat, all presets, typed and suggested intake, stale timers, pause, reset, human gate and invalid fixture.',
);
