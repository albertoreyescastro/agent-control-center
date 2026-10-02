# Agent Control Center

**Privacy-safe observability for resilient multi-agent AI orchestration.**

Agent Control Center is a public portfolio interface for visualising the health, routing and execution state of a heterogeneous AI-agent system across local and cloud workers. It focuses on the operational layer that becomes important once a multi-agent prototype meets reality: quotas, unavailable providers, durable queues, leases, retries, independent review and human gates.

> **Current mode:** sanitized portfolio demo. The public UI does **not** connect to the private orchestration repository and does not expose live credentials, private prompts or operational endpoints.

## What the demo shows

- Interactive orchestration topology with agent availability and activity.
- Agent inspector for current role, sanitized work state, provider surface and observable quota state.
- Durable queue and recent event stream.
- Explicit unavailable/limited states instead of pretending every provider is healthy.
- Responsive UI designed for desktop and mobile.
- A strict allow-listed public telemetry schema for a future sanitized snapshot feed.

## Architecture boundary

A separate offline exporter constructs generic public aliases and queue counts from a validated private snapshot. The browser renders fixed demo state; the exporter is never part of the browser.

The key rule is simple: **the public browser never receives credentials and never reads the private harness directly.** A future live feed must be generated upstream by a fail-closed sanitizer and conform to `public-state.schema.json`.

See [SECURITY.md](SECURITY.md) for the publication boundary.

## Engineering themes

This project demonstrates patterns including adaptive capability-aware routing, quota/circuit-breaker state, durable task execution, bounded recovery, heterogeneous cloud/local workers, independent review and human-in-the-loop controls.

The dashboard is intentionally an observability surface first. It does not provide public controls capable of starting agents, spending quota, changing routing or merging code.

## Portfolio context

Built by **Alberto Reyes Castro** as an AI engineering portfolio project. AI agents are used as engineering tools within the development workflow; architecture decisions, validation boundaries and publication controls are documented so the project can be discussed and defended technically rather than presented as a black-box AI-generated demo.

## Run locally

No build step or dependencies are required.

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Open the loopback address on port 8000.

## Security

This repository is public by design. Do not commit secrets or copy raw state from the private orchestration system. Review [SECURITY.md](SECURITY.md) before adding telemetry fields.

## Status

V1 is merged and published. V2 is a separate review candidate; its PR does not change the deployed V1 or Pages configuration. A human must explicitly approve the V2 merge.

## Client-only failover scenario

Simulate a reviewer outage to see activity move to a fallback node. Reset returns to the fixed scenario. These controls change demo data only; they do not retry, route or invoke actual work.

Validation and the merge/publication gates are documented in [VALIDATION.md](VALIDATION.md).

## V2 scenario lab

Six local simulations explain normal routing, reviewer outage, quota fencing, heartbeat loss, bounded retry and independent verification before a closed human merge gate. Play/pause, step and reset change only finite client-side fixtures. Packet animation follows the active worker; motion stops with playback and honors reduced motion. Switching scenarios cancels prior timers.

The trust-boundary diagram describes real architectural principles, not a connected telemetry feed. Public state remains the V1 finite contract; unknown quota/health is never inferred as measured. No task content, private logs or provider identifiers are added.

The site has no framework, build step, runtime dependency or CDN. A separate hash-locked Playwright driver is used only by read-only CI against Chrome already installed on the hosted runner. It never installs a browser or enters the shipped page. CI produces sanitized screenshots at desktop/tablet/mobile widths.
