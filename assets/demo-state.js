window.DEMO_STATE = {
  "schema_version": "1.0",
  "generated_at": "2026-10-02T10:00:00Z",
  "mode": "demo",
  "agents": [
    {
      "id": "worker-01",
      "label": "Worker 01",
      "status": "online",
      "role": "code worker",
      "surface": "local",
      "quota_state": "unknown"
    },
    {
      "id": "worker-02",
      "label": "Worker 02",
      "status": "busy",
      "role": "independent reviewer",
      "surface": "cloud_async",
      "quota_state": "unknown"
    },
    {
      "id": "worker-03",
      "label": "Worker 03",
      "status": "online",
      "role": "independent reviewer",
      "surface": "cloud",
      "quota_state": "unknown"
    },
    {
      "id": "worker-04",
      "label": "Worker 04",
      "status": "limited",
      "role": "independent reviewer",
      "surface": "cloud",
      "quota_state": "unknown"
    },
    {
      "id": "worker-05",
      "label": "Worker 05",
      "status": "online",
      "role": "fallback worker",
      "surface": "hybrid",
      "quota_state": "unknown"
    },
    {
      "id": "worker-06",
      "label": "Worker 06",
      "status": "offline",
      "role": "code worker",
      "surface": "cloud",
      "quota_state": "unknown"
    }
  ],
  "queue_summary": {
    "queued": 1,
    "running": 1,
    "blocked": 1
  }
};
