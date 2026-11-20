# Change-Approval Agent Console

An LLM agent drafts infrastructure change plans; **nothing executes until an authorized human approves**.
Every step is written to an audit log.

## Features
- FastAPI + SQLAlchemy (PostgreSQL in Docker, SQLite for local/tests)
- JWT auth and role-based access control (viewer / engineer / approver), role read from the DB on every request
- Approval gate: `execute` returns 409 unless status is `approved`; requesters cannot approve their own request
- Pydantic validation on all input and on LLM output; planning failures are recorded, never crash the request
- Audit trail per request, structured JSON logs, Prometheus `/metrics`
- pytest suite, plan-validity eval script, Docker Compose, GitHub Actions CI

## Run
```bash
docker compose up --build        # API on http://localhost:8000/docs
# or locally
cd backend && pip install -r requirements-dev.txt
uvicorn app.main:app --reload
pytest -q
python evals/run_eval.py
```
Demo users (password from `DEMO_PASSWORD`): `viewer1`, `engineer1`, `approver1`.
Set `ANTHROPIC_API_KEY` to use a real LLM; otherwise a deterministic stub planner is used.

## Flow
engineer `POST /changes` -> agent drafts plan -> `pending_approval` -> approver `POST /changes/{id}/approve|reject` -> engineer `POST /changes/{id}/execute`

## Design notes
- Least privilege: every route declares the minimum role it needs.
- Separation of duties: reviewer must differ from requester.
- Demo seed users and mock execution are for demonstration only.

## Frontend (React + TypeScript)
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173, proxies /api to the backend on :8000
npm test         # Vitest + Testing Library
npm run build
```
- Role-aware UI: approvers see Approve/Reject (never on their own requests), engineers see New request and Execute, viewers are read-only. The server enforces every rule; the UI only mirrors it.
- Accessibility: semantic landmarks, skip link, labelled form fields, `role="alert"`/`role="status"` messages, visible keyboard focus, status shown as text (not colour alone), reduced-motion support.
- Check it with Lighthouse (Chrome DevTools) and add the score here once you have run it.
