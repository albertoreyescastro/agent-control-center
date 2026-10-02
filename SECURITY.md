# Security & public-data boundary

This repository is intentionally public. It contains the portfolio UI and a **public telemetry contract only**. The production orchestration harness is maintained separately and is not exposed by this site.

## Never publish

- API keys, access tokens, cookies, secrets, credentials, webhook secrets or signed URLs.
- Raw prompts, model responses, private task payloads or full operational logs.
- Private repository names/paths, internal endpoints, account IDs, emails or billing identifiers.
- Environment dumps, stack traces containing paths/secrets, or provider responses that have not been sanitized.
- Exact quota/balance data unless the provider exposes it safely and publication is explicitly intended.

## Publication model

The browser must never read the private harness directly. Any future live integration must be **push-only from a sanitizer** into an allow-listed public snapshot matching `public-state.schema.json`. Unknown fields fail closed. Free-text public fields are length- and character-constrained to reduce accidental leakage. Sanitization happens before data enters this repository. The sanitizer must also reject credential-like patterns and URLs before publication.

The UI must label simulated/demo data as such. Missing telemetry is rendered as unknown/not observable rather than inferred.

## Reporting

If you find sensitive information in this repository, do not open a public issue containing it. Contact the repository owner privately.
