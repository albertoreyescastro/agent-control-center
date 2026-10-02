# Security & public-data boundary

This repository is intentionally public. It contains the portfolio UI and a **public telemetry contract only**. The production orchestration harness is maintained separately and is not exposed by this site.

## Never publish

- API keys, access tokens, cookies, secrets, credentials, webhook secrets or signed URLs.
- Raw prompts, model responses, private task payloads or full operational logs.
- Private repository names/paths, internal endpoints, account IDs, emails or billing identifiers.
- Environment dumps, stack traces containing paths/secrets, or provider responses that have not been sanitized.
- Exact quota/balance data unless the provider exposes it safely and publication is explicitly intended.

## Publication model

The browser must never read the private harness directly. Any future live integration must be **push-only from a sanitizer** into an allow-listed public snapshot matching `public-state.schema.json`. Unknown fields fail closed. Public values use finite enums and generic numbered aliases. Task summaries, private events, exact token/quota data and unrestricted strings are excluded. Sanitization happens before data enters this repository. The sanitizer must also reject credential-like patterns and URLs before publication.

The UI must label simulated/demo data as such. Missing telemetry is rendered as unknown/not observable rather than inferred.

## Reporting

If you find sensitive information in this repository, do not open a public issue containing it. Contact the repository owner privately.

## Browser and CI enforcement

The browser has connect-src none, external-only scripts/styles and text-only DOM rendering. Keyboard/tap inspection and reduced-motion behavior are explicit. CI scans its own detector source, rejects unknown files and validates payloads with duplicate-key/type/timestamp checks. A deliberate source-code encoding can evade any pattern scanner; independent diff review remains required. Require the validation job through repository protection before using CI as a mandatory gate. No Pages workflow is installed.

## V2 simulations

Scenario identifiers and narratives are finite authored fixtures, structurally separate from any exported snapshot. The browser validates the unchanged six-worker demo contract before mounting; a malformed payload disables all simulation controls. New simulation source is included in the unsafe-sink/leakage scan. No real quota amounts or model-family independence are inferred. Unknown health remains explicit. All scenes end at a closed human gate; no mutation endpoint exists.
