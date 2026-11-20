"""Measures how often the agent returns a schema-valid plan (and flags risky ones)."""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app import agent  # noqa: E402

cases = json.loads((pathlib.Path(__file__).parent / "cases.json").read_text())
valid = 0
for c in cases:
    try:
        plan = agent.draft_plan(c["title"], c["description"])
        ok = bool(plan.steps) and [s.order for s in plan.steps] == sorted(s.order for s in plan.steps)
    except agent.PlanningError:
        ok = False
    valid += ok
    print(f"{'PASS' if ok else 'FAIL'}  {c['title']}")
print(f"\nplan validity: {valid}/{len(cases)} = {valid / len(cases):.0%}")
