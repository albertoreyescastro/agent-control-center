# V2 validation and recovery checkpoint

## Canonical state

V1 is merged, browser-validated and published per owner confirmation. V2 is PR #2 on `feat/control-center-v2`; it is not merged or deployed. Main was verified at `e6901628068741ed31584715506818dacf8dd398`. V2 does not modify Pages configuration, any private repository or the personal website.

Validated implementation head: `f26bece2e6b6a1f504f45c1c36b8f385497d9df0`. [Exact-head CI run 37052869327](https://github.com/albertoreyescastro/agent-control-center/actions/runs/37052869327) passed on 2026-10-02. Pull-request CI checks GitHub's synthetic merge against main. A later documentation-only checkpoint must also pass its own exact-head CI; obtain the canonical final head and check from [PR #2](https://github.com/albertoreyescastro/agent-control-center/pull/2).

## Deterministic evidence

- 20 Python boundary/leakage/schema regressions PASS.
- 440 assertions across all six scenario frame sequences PASS.
- DOM behavior PASS: 39 transitions, reset, terminal gate, focus/hover, stale callbacks, reduced-motion changes, hidden-tab pause and malformed demo fail-closed state.
- JavaScript syntax and public inventory/schema/CSP/no-unsafe-sink validation PASS.

Run `python -B scripts/validate_public.py`, `python -B -m unittest discover -s tests -v`, `node tests/simulation.cjs`, `node tests/dom-smoke.cjs` and syntax checks for the three asset scripts. CI executes these checks before browser QA.

## Real-browser evidence

Chrome **154.0.8037.57** on the standard hosted Ubuntu runner rendered the actual pages. This is real browser validation, separate from the deterministic DOM test.

- Widths 1440, 1024, 768, 390 and 320: PASS.
- All six scenarios at every width, step-to-gate and reset: PASS (30 scenario/viewport combinations).
- All worker inspections; mobile touch; desktop hover and restored selection: PASS.
- Real keyboard navigation, 50 Tab traversals, visible focus, inspector relationships and accordion activation: PASS.
- Playback/pause and reduced-motion CSS/SVG behavior: PASS.
- Horizontal overflow: 0; clipped topology nodes: 0; console/runtime/HTTP asset errors: 0 at every width.
- Six same-origin requests per viewport; no external telemetry requests. No CSP error was reported.
- Malformed browser demo payload: rejected, no worker nodes, controls disabled.
- Desktop/tablet/mobile full-page screenshots were visually inspected after correcting the capture scroll position. Hero, topology, inspector, trust boundary and final sections remain readable without overlap.

The `public-v2-browser-evidence` CI artifact contains screenshots and results for 14 days. Screenshot markers in the job log also preserve public-only image evidence. The browser driver is integrity-locked, installed with scripts disabled in runner temporary storage, and uses already-installed Chrome. No browser download, provider or AI credit is required.

## Security and review

The V1 finite public schema and bundled fixture remain unchanged. Simulation narratives are authored finite fixtures, not arbitrary operational text. Unknown telemetry remains Unknown/Not observable. The browser retains `connect-src 'none'`, external-only local scripts/styles and text-only DOM rendering. There is no provider, write/admin or merge endpoint.

Primary Codex source review covered stale timer rejection, attempt ceilings, closed terminal gates, focus stability, malformed payload rejection, public inventory, unsafe sinks and dependency boundaries. No new blocking finding remains in this bounded public implementation. Pattern scanners cannot prove absence of deliberately encoded secrets; diff review remains necessary. CI is read-only, uses pinned Actions and does not retain checkout credentials.

## Limits and next action

Firefox/Safari and assistive-technology testing were not performed. Keyboard and semantic basics passed in Chrome; this is not a complete accessibility conformance audit. Demonstrations measure no real provider health, quota or independent model-family outcome.

**NEXT_ACTION:** review the exact PR head and successful CI, then obtain explicit human V2 merge approval. Do not merge or deploy autonomously. V1 remains deployed until the owner authorizes the merge. Existing Pages configuration is unchanged; this checkpoint does not authorize publication or workflow/settings changes.

Earlier V1 checkpoints are preserved in Git history; their pre-publication/browser blockers are superseded by the owner's V1 status and the V2 evidence above.

## Core validation and external README observation

The `validate` job blocks on public/schema/privacy tests, README assets and exact-byte screenshot checks, JavaScript syntax, simulation/DOM behavior, deterministic observation regressions and local Chrome dashboard QA. It makes no GitHub.com rendering request.

`GitHub README observation` is a separate read-only check of the exact PR head (or main push SHA), at 1200/390 px in light/dark themes. All existing image, link, keyboard, layout and typography assertions remain blocking in that check. A loaded README assertion fails it. Transport/HTTP access failures receive at most one bounded retry; missing articles are not treated as proof of an outage. Unobserved rendering fails visibly with BLOCKED diagnostics and an anonymous screenshot, never PASS. No blanket continue-on-error or timeout increase is used. Required-check policy is a separate owner decision; do not infer visual acceptance from a green core job alone.

Diagnosis of the earlier post-merge failure: scanner, 30 Python tests, 440 simulation assertions, 39 DOM transitions and local dashboard browser checks passed. Identical-source PR rendering had passed, but the main run timed out waiting for an article. The old run retained no page/status diagnostics, so its specific external/selector cause is unknown. This change prevents that ambiguity from erasing core evidence and adds diagnostics for future failures. No website or deployment behavior changes.
