#!/usr/bin/env python3
import json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
TEXT_EXT={".html",".css",".js",".json",".md",".yml",".yaml",".txt"}
DENY=[
 re.compile(r"ghp_[A-Za-z0-9]{20,}"),
 re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
 re.compile(r"AIza[A-Za-z0-9_-]{20,}"),
 re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
 re.compile(r"(?i)authorization\s*:\s*bearer\s+[A-Za-z0-9._-]{10,}"),
]
FORBIDDEN_LITERAL=["-work-event-test-20260926","automation/state/providers.json","automation/queue/"]
errors=[]
for p in ROOT.rglob("*"):
 if not p.is_file() or ".git" in p.parts or p.suffix not in TEXT_EXT: continue
 text=p.read_text("utf-8",errors="ignore")
 for rx in DENY:
  if rx.search(text): errors.append(f"{p.relative_to(ROOT)}: credential-like pattern")
 for lit in FORBIDDEN_LITERAL:
  if lit in text: errors.append(f"{p.relative_to(ROOT)}: private implementation reference {lit!r}")
json.loads((ROOT/"public-state.schema.json").read_text("utf-8"))
html=(ROOT/"index.html").read_text("utf-8")
for marker in ["SANITIZED DEMO","DEMO TOPOLOGY","SIMULATED STREAM"]:
 if marker not in html: errors.append(f"index.html: missing demo marker {marker!r}")
if errors:
 print("\n".join(errors)); raise SystemExit(1)
print("public-surface validation: PASS")
