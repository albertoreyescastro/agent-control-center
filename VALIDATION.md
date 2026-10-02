# Validation and recovery checkpoint

Status: implementation under review; no publication. This frontend always renders simulated data. The failover button changes client-only demo state and invokes no workers.

Run `python -B scripts/validate_public.py`, `python -B -m unittest discover -s tests -v`, and `node --check assets/app.js`.

The public scanner uses an explicit file inventory, strict UTF-8, symlink rejection and credential/private-identifier checks. The detector scans its own source; test strings are constructed without embedding a complete secret-shaped fixture. Unknown files fail closed. New files require an explicit reviewed inventory change.

The contract validator supports only the project's documented closed schema subset. Unsupported keywords fail closed. Generic aliases and finite role/status values replace free-text operational fields. This reduces accidental data leakage; it is not proof that arbitrary encoded secrets can be detected.

CI uses a pinned checkout, contents:read, no persisted credentials, no provider calls and no dependency downloads. Branch protection must require the check before merge to make it an enforced repository gate.

Historical NEXT_ACTION (superseded below): finish independent review and exact-head validation, then obtain explicit human merge approval. Pages remains disabled until separate publication approval. No direct private telemetry connection exists.

## Takeover validation — 2026-10-02

- Public-surface validator: PASS, including detector-source scanning.
- Python adversarial contract/scanner tests: 13/13 PASS.
- Node DOM interaction smoke: PASS for inspection, failover/reset, role preservation and reduced-motion SVG removal.
- JavaScript syntax, JSON/YAML parsing and diff whitespace: PASS locally.
- Visual Chromium desktop/mobile and accessibility layout verification: BLOCKED. Runtime Chromium binary is absent; standard browser download failed. DOM smoke is not a rendering engine and cannot establish visual layout, contrast or assistive-technology behavior.
- Publication: not performed. This remains a simulated demo with connect-src none.

Historical NEXT_ACTION (superseded below): run `node tests/dom-smoke.cjs` and deterministic checks on the exact PR head; inspect the interface in a real browser at 390px and 1440px with keyboard and reduced motion, then obtain explicit merge approval. Separate publication approval is required for Pages.

Independent local source review: no remaining high/medium blockers in this bounded implementation. The review covered the contract, scanner, rendering, CSP and simulation/motion paths. It used a separate reviewer in the same model family; no cross-provider review or premium worker call was made. A real-browser rendering check remains the merge-readiness limitation.

## Current final adversarial checkpoint

Current suite: 16/16 Python tests PASS, boundary scanner PASS, Node DOM simulation PASS. Runtime demo payload rejection, nested metadata-directory scanning, focus/hover handlers, resumed/reduced SVG motion and narrower percentage node bounds are covered. CSP/static markup checks PASS. No real browser rendered this head. Local Chromium remains absent; available cloud browser rejects localhost with net::ERR_BLOCKED_BY_CLIENT. No dependency installed and no site published. Desktop/mobile layout, actual keyboard focus visibility, contrast, overflow, console/CSP runtime and assistive technology QA remain OPEN. Final source review used the primary OpenAI Codex model only; heterogeneous included/free review was unavailable. Earlier independent same-family review was on the previous head.

NEXT_ACTION: human review plus real-browser 390px/1440px, keyboard/tap/hover, focus, inspector, motion, stale/unknown and runtime/CSP checks before unconditional merge readiness. Separate explicit merge approval and publication/deployment approval remain required.
