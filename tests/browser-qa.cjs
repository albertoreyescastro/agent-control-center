/* Local UI acceptance. The app receives only bundled static resources. */
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const origin = process.env.QA_ORIGIN || 'http://' + ['127', '0', '0', '1'].join('.') + ':8765';
const out = process.env.QA_OUTPUT || 'browser-evidence';
async function run() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.QA_CHROME_CHANNEL || undefined,
    executablePath: process.env.QA_BROWSER_PATH || undefined,
  });
  const results = [];
  try {
    for (const width of [1440, 1366, 1024, 768, 390, 320]) {
      const mobile = width <= 390;
      const page = await browser.newPage({
        viewport: { width, height: mobile ? 844 : 900 },
        hasTouch: mobile,
        isMobile: mobile,
        reducedMotion: 'reduce',
      });
      page.setDefaultTimeout(4500);
      const errors = [],
        requests = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('response', (r) => {
        if (r.status() >= 400) errors.push('Broken asset');
      });
      page.on('request', (r) => requests.push(r.url()));
      await page.goto(origin, { waitUntil: 'networkidle' });
      const initial = requests.length;
      const loc = (id) => page.locator('#' + id),
        text = (id) => loc(id).innerText();
      const btn = (name) => page.getByRole('button', { name, exact: true });
      async function press(n) {
        if (mobile) await n.tap();
        else await n.click();
      }
      async function toggle(id, open = true) {
        if ((await loc(id).evaluate((n) => n.open)) !== open) await press(loc(id).locator('> summary'));
      }
      async function advance(title) {
        for (let i = 0; i < 30; i++) {
          if ((await text('activeTitle')).includes(title)) return;
          if ((await btn('Active rows only').count()) && (await btn('Active rows only').isEnabled()))
            await press(btn('Active rows only'));
          else {
            assert(await loc('step').isEnabled(), 'Next step available: ' + (await text('activeTitle')));
            await press(loc('step'));
          }
        }
        throw Error('Transition missing: ' + title);
      }
      async function preset(key) {
        await press(loc('explore'));
        await press(page.locator('[data-scenario="' + key + '"]'));
      }
      async function incident(label) {
        await toggle('disrupt');
        await press(loc('incidents').getByRole('button', { name: label, exact: true }));
      }
      async function reset() {
        await press(loc('resetDemo'));
      }
      async function shot(name) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(out, name + '-' + width + '.png') });
      }
      const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      assert(await noOverflow());
      assert.equal(await page.locator('[data-scenario]').count(), 6);
      assert.equal(await page.locator('h1').count(), 1);
      assert(
        await page
          .locator('a[href^="#"]')
          .evaluateAll((links) => links.every((a) => document.getElementById(a.hash.slice(1)))),
      );
      if ([1440, 390].includes(width)) await shot('welcome');
      await loc('message').focus();
      await page.keyboard.press('Tab');
      assert(
        await loc('send').evaluate(
          (n) => n === document.activeElement && getComputedStyle(n).outlineStyle !== 'none',
        ),
      );
      await loc('message').fill('<img> change the export');
      await loc('message').press('Enter');
      assert.match(await text('thread'), /Which export task/);
      assert.equal(await loc('thread').locator('img').count(), 0);
      await press(btn('Add a regression test for empty exports.'));
      assert.match(await text('scenarioStatus'), /<img>/);
      await reset();
      await loc('message').fill('Test an empty CSV export');
      await press(loc('send'));
      assert.equal(await loc('thread').locator('.you').count(), 1);
      await advance('Decision returned');
      await press(btn('Approve'));
      await press(btn('Confirm approval'));
      assert.equal(await text('activeTitle'), 'Mission completed');
      await press(btn('Try another task'));
      await press(page.getByRole('button', { name: /^Try a task/ }));
      await advance('Scope needs');
      await loc('message').fill('include archived rows');
      await loc('message').press('Enter');
      assert.match(await text('scenarioStatus'), /Include archived/);
      await advance('Decision returned');
      assert.match(await text('thread'), /v2/);
      await press(btn('View details'));
      assert.match(await text('proof'), /Literal quote is escaped/);
      assert.match(await text('proof'), /All rows, including archived/);
      await press(btn('Back to conversation'));
      await press(btn('Reject'));
      assert.equal(await text('activeTitle'), 'Mission rejected');
      await preset('heartbeat');
      assert.match(await text('chatPhase'), /Heartbeat lost/);
      assert.match(await text('scenarioStatus'), /retains its lease/);
      if ([1440, 390].includes(width)) await shot('lost-heartbeat');
      await press(loc('step'));
      assert.match(await text('scenarioStatus'), /existing attempt/);
      await advance('Attempt 2 claimed');
      await incident('Deliver late result');
      assert.equal(await text('activeTitle'), 'Late result discarded');
      await incident('Restart the coordinator');
      assert.match(await text('scenarioStatus'), /Owner: cloud/);
      await preset('normal');
      await incident('Turn PC off');
      await advance('Attempt 1 claimed');
      assert.match(await text('scenarioStatus'), /Owner: cloud/);
      await advance('Routine feedback answered');
      await incident('Lose feedback acknowledgement');
      await advance('Feedback acknowledgement recovered');
      assert.match(await text('scenarioStatus'), /No resend/);
      await advance('Candidate v1');
      await incident('Remove check evidence');
      await advance('Mission blocked');
      assert.match(await text('scenarioStatus'), /Evidence missing/);
      await preset('quota');
      await incident('Exhaust a quota pool');
      await press(loc('step'));
      assert.match(await text('scenarioStatus'), /Local work fenced/);
      await preset('quota');
      await incident('Exhaust a quota pool');
      await incident('Exhaust a quota pool');
      await advance('Mission blocked');
      await preset('outage');
      await incident('Take reviewer offline');
      await press(loc('step'));
      assert.match(await text('scenarioStatus'), /Open-weight GPT \+ GLM \+ Meta Llama/);
      await preset('outage');
      for (let i = 0; i < 3; i++) await incident('Take reviewer offline');
      await advance('Mission blocked');
      await preset('retry');
      await advance('Bounded repair queued');
      await advance('Candidate v2');
      await incident('Use an old approval');
      assert.match(await text('scenarioStatus'), /Stale v1/);
      await press(loc('explore'));
      await press(btn('Repair limit exhausted'));
      await advance('Mission blocked');
      assert.match(await text('scenarioStatus'), /Repair budget exhausted/);
      await preset('normal');
      await advance('Candidate v1');
      await incident('Fail a check');
      await advance('Mission blocked');
      assert.match(await text('scenarioStatus'), /Check failed/);
      await press(loc('explore'));
      await press(btn('Two-phase mission'));
      await advance('Decision returned');
      await press(btn('Approve'));
      await press(btn('Confirm approval'));
      await advance('Phase B queued');
      await advance('Decision returned');
      await press(btn('Approve').last());
      await press(btn('Confirm approval').last());
      assert.equal(await text('activeTitle'), 'Mission completed');
      await preset('verification');
      await loc('thread').evaluate((t) => (t.scrollTop = 0));
      await loc('message').fill('approve');
      await loc('message').press('Enter');
      assert(await loc('newMessage').isVisible());
      assert.equal(await loc('thread').evaluate((t) => t.scrollTop), 0);
      await press(loc('newMessage'));
      assert(await btn('Confirm approval').isEnabled());
      await preset('verification');
      const first = btn('Approve');
      await press(first);
      assert(await first.isDisabled());
      assert(await btn('Confirm approval').isEnabled());
      await press(btn('Confirm approval'));
      assert.equal(await text('activeTitle'), 'Authorised for manual merge');
      if ([1440, 390].includes(width)) await shot('authorised');
      await toggle('map-details');
      const node = page.locator('[data-node="cloud"]');
      await node.focus();
      await node.press('Enter');
      assert.match(await text('inspector'), /historical walkthrough/);
      assert(await noOverflow());
      assert.equal(await page.locator('animateMotion').count(), 0);
      assert.equal(await page.locator('.station').count(), 20);
      const additionalRequests = requests.length - initial;
      assert.equal(additionalRequests, 0, 'No network after load');
      assert.deepEqual(errors, []);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await loc('thread').locator('.bubble').count(), 1);
      if (width === 1440) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.clock.install();
        await press(page.getByRole('button', { name: /^Try a task/ }));
        await page.clock.runFor(3900);
        assert.match(await text('activeTitle'), /Mission recorded/);
        assert.equal(await page.locator('animateMotion').count(), 1);
        await press(loc('play'));
        const title = await text('activeTitle');
        await page.clock.runFor(16000);
        assert.equal(await text('activeTitle'), title);
        await reset();
        await page.clock.runFor(16000);
        assert.match(await text('activeTitle'), /Awaiting a task/);
      }
      results.push({
        width,
        interaction: mobile ? 'touch' : 'mouse and keyboard',
        consoleErrors: errors.length,
        additionalRequests,
        overflow: false,
      });
      await page.close();
      console.log('Browser PASS ' + width);
    }
    const flight = await browser.newPage({
      viewport: { width: 1366, height: 900 },
      reducedMotion: 'no-preference',
    });
    await flight.goto(origin);
    await flight.locator('#explore').click();
    await flight.locator('[data-scenario=normal]').click();
    await flight.waitForFunction(
      () => document.getElementById('activeTitle').textContent === 'Attempt 1 claimed',
    );
    assert.equal(await flight.locator('#workerMonitor').getAttribute('data-health'), 'healthy');
    assert.equal(await flight.locator('[data-node=local] .inline-ecg.healthy').count(), 1);
    await flight.waitForTimeout(250);
    const movement = await flight.locator('#map').evaluate((map) => {
      map.pauseAnimations();
      const path = map.querySelector('.wire.active'),
        packet = map.querySelector('.photon');
      const animation = packet.querySelector('animateMotion');
      const start = animation.getStartTime(),
        duration = animation.getSimpleDuration();
      const positions = [];
      const errors = [];
      for (const t of [0.1, 0.5, 0.9]) {
        map.setCurrentTime(start + duration * t);
        const local = new DOMPoint()
          .matrixTransform(packet.getScreenCTM())
          .matrixTransform(map.getScreenCTM().inverse());
        const expected = path.getPointAtLength(path.getTotalLength() * t);
        errors.push(Math.hypot(local.x - expected.x, local.y - expected.y));
        positions.push(local);
      }
      map.setCurrentTime(start + duration + 0.3);
      const arrival = Number(getComputedStyle(map.querySelector('.arrival')).opacity);
      map.unpauseAnimations();
      return {
        errors,
        distance: Math.hypot(positions[2].x - positions[0].x, positions[2].y - positions[0].y),
        arrival,
      };
    });
    assert(Math.max(...movement.errors) < 2, JSON.stringify(movement));
    assert(movement.distance > 45 && movement.arrival > 0.4, JSON.stringify(movement));
    await flight.locator('#overviewMap').click();
    assert.equal(await flight.locator('#map').evaluate((m) => m.viewBox.baseVal.width), 1910);
    await flight.locator('#followMap').click();
    assert(await flight.locator('#map').evaluate((m) => m.viewBox.baseVal.width < 1200));
    await flight.locator('#contextIncident button').click();
    assert.equal(await flight.locator('#play').innerText(), 'Pause');
    assert.equal(await flight.locator('#workerMonitor').getAttribute('data-health'), 'lost');
    assert.equal(await flight.locator('[data-node=local] .inline-ecg.lost').count(), 1);
    assert.equal(await flight.locator('.owner-pulse').count(), 0);
    await flight.emulateMedia({ reducedMotion: 'reduce' });
    await flight.waitForSelector('.photon', { state: 'detached' });
    for (
      let i = 0;
      i < 4 && (await flight.locator('#workerMonitor').getAttribute('data-health')) !== 'stale';
      i++
    )
      await flight.locator('#step').click();
    assert.equal(await flight.locator('#workerMonitor').getAttribute('data-health'), 'stale');
    await flight.locator('#step').click();
    assert.match(await flight.locator('#heartState').innerText(), /Jules/);
    assert.match(await flight.locator('#heartDetail').innerText(), /Attempt 2/);
    await flight.locator('#disrupt > summary').click();
    await flight
      .locator('#incidents')
      .getByRole('button', { name: 'Drop heartbeat', exact: true })
      .click();
    for (let i = 0; i < 3; i++) await flight.locator('#step').click();
    assert.equal(await flight.locator('#chatPhase').innerText(), 'Mission blocked');
    assert.match(await flight.locator('#heartDetail').innerText(), /recovery blocked/);
    assert.match(await flight.locator('#thread .bubble').last().innerText(), /No eligible route/);
    console.log('Browser PASS travelling packet, arrival, follow camera and heartbeat recovery');
    await flight.close();
    const recovery = await browser.newPage({ reducedMotion: 'no-preference' });
    await recovery.goto(origin);
    await recovery.clock.install();
    await recovery.locator('#explore').click();
    await recovery.locator('[data-scenario=heartbeat]').click();
    const status = () => recovery.locator('#activeTitle').innerText();
    for (const name of [
      'Heartbeat lost',
      'Awaiting lease expiry',
      'Expired attempt fenced',
      'Attempt 2 claimed',
    ]) {
      assert.equal(await status(), name);
      assert((await recovery.locator('#thread .bubble').last().innerText()).includes(name));
      await recovery.clock.runFor(3450);
    }
    await recovery.clock.runFor(3450);
    assert.equal(await status(), 'Scope needs a decision');
    await recovery.getByRole('button', { name: 'Active rows only' }).click();
    await recovery.clock.runFor(3450 * 3);
    assert.equal(await status(), 'Council convened');
    assert.match(await recovery.locator('#chatPhase').innerText(), /Review council/);
    assert.equal(await recovery.locator('[data-node=council] .node-name').count(), 3);
    assert.match(
      await recovery.locator('#thread .bubble').last().innerText(),
      /Llama 3.1 8B, GPT-OSS 20B, GLM 4.7 Flash/,
    );
    await recovery.close();
    console.log('Browser PASS automatic heartbeat recovery and phase-accurate Telegram council');
    const council = await browser.newPage({
      viewport: { width: 1366, height: 900 },
      reducedMotion: 'no-preference',
    });
    await council.goto(origin);
    await council.clock.install();
    for (const [preset, fail] of [
      ['retry', true],
      ['outage', false],
    ]) {
      await council.locator('#explore').click();
      await council.locator('[data-scenario="' + preset + '"]').click();
      for (const leg of ['in', 'out']) {
        if (leg === 'out') await council.clock.runFor(fail ? 3450 : 4350);
        const metrics = await council.locator('#map').evaluate((map, leg) => {
          const trunk = map.querySelector('.delivery:not([data-reviewer])');
          const branches = [...map.querySelectorAll('.delivery[data-reviewer]')];
          const wire = map.querySelector('.wire.active');
          const join = wire.getPointAtLength(leg === 'in' ? wire.getTotalLength() : 0);
          let gaps = [],
            positions = [];
          map.pauseAnimations();
          const branch = branches[0],
            anim = branch.querySelector('animateMotion');
          map.setCurrentTime(anim.getStartTime() + anim.getSimpleDuration() / 2);
          for (const b of branches) {
            const path = [...map.querySelectorAll('[data-leg="' + leg + '"]')].find(
              (p) => p.dataset.family === b.dataset.reviewer,
            );
            const socket = path.getPointAtLength(leg === 'in' ? 0 : path.getTotalLength());
            gaps.push(Math.hypot(socket.x - join.x, socket.y - join.y));
            const photon = b.querySelector('.photon');
            const point = new DOMPoint()
              .matrixTransform(photon.getScreenCTM())
              .matrixTransform(map.getScreenCTM().inverse());
            const middle = path.getPointAtLength(path.getTotalLength() / 2);
            if (
              Math.hypot(point.x - middle.x, point.y - middle.y) > 2 ||
              Number(getComputedStyle(photon).opacity) < 0.8
            )
              throw Error('Reviewer pulse missed its curve');
            positions.push(point.y);
          }
          map.unpauseAnimations();
          return {
            gaps,
            positions,
            red: branches.filter((b) => b.classList.contains('danger')).length,
            start: Number(trunk.dataset.delay),
            branchStart: Number(branch.dataset.delay),
          };
        }, leg);
        assert.equal(metrics.gaps.length, 3);
        assert(
          Math.max(...metrics.gaps) < 0.1 &&
            Math.max(...metrics.positions) - Math.min(...metrics.positions) > 25,
        );
        assert.equal(metrics.red, leg === 'out' && fail ? 1 : 0);
        assert.equal(metrics.start < metrics.branchStart, leg === 'in');
      }
      await council.clock.runFor(fail ? 3450 : 4350);
      assert.match(
        await council.locator('#activeTitle').innerText(),
        fail ? /repair queued/i : /Human gate opened/,
      );
      if (fail) assert.equal(await council.locator('.packet-actions').count(), 0);
      else {
        await council.clock.runFor(4350);
        const packet = council.locator('.bubble.decision').last();
        assert.match(await packet.innerText(), /Independent review · 3\/3 passed/);
        assert.match(await packet.innerText(), /Billing OFF · Overage OFF/);
        await packet.getByRole('button', { name: /Pause project/ }).click();
        assert(await packet.getByRole('button', { name: 'Approve', exact: true }).isDisabled());
        await packet.getByRole('button', { name: /Resume project/ }).click();
        assert(await packet.getByRole('button', { name: 'Approve', exact: true }).isEnabled());
      }
    }
    assert(
      await council
        .locator('.engineer-portrait')
        .evaluate((img) => img.complete && img.naturalWidth === 400),
    );
    await council.close();
    console.log(
      'Browser PASS council split, individual votes, merge, both verdicts and approval packet',
    );
    const bad = await browser.newPage();
    await bad.route('**/assets/demo-state.js', (r) =>
      r.fulfill({
        contentType: 'application/javascript',
        body: 'window.DEMO_STATE = {mode:"unexpected"};',
      }),
    );
    await bad.goto(origin);
    assert.match(await bad.locator('#scenarioStatus').innerText(), /rejected/);
    assert(await bad.locator('#send').isDisabled());
    fs.writeFileSync(
      path.join(out, 'results.json'),
      JSON.stringify({ browser: browser.version(), results }, null, 2),
    );
  } finally {
    await browser.close();
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
