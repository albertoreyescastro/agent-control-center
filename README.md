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

```
PRIVATE CONTROL PLANE                     PUBLIC PORTFOLIO
┌─────────────────────────┐               ┌──────────────────────────┐
│ durable queue / router  │               │ Agent Control Center     │
│ workers / leases        │   sanitizer   │ static GitHub Pages UI   │
│ provider state / logs   │ ────────────> │ allow-listed snapshot    │
│ secrets / raw prompts   │   PUSH ONLY   │ no secrets / raw logs    │
└─────────────────────────┘               └──────────────────────────┘
```

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
python -m http.server 8000
```

Open `http://localhost:8000`.

## Security

This repository is public by design. Do not commit secrets or copy raw state from the private orchestration system. Review [SECURITY.md](SECURITY.md) before adding telemetry fields.

## Status

V1 UI is under review. GitHub Pages should only be enabled after the public surface has been reviewed for sensitive information.
