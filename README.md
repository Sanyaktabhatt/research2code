# Research2Code

Research2Code turns an uploaded ML research paper into a fully reproducible,
runnable ML project. Upload a PDF, and it walks the paper through parsing,
LLM-driven knowledge extraction, vector + graph indexing, a retrieval-augmented
chat assistant, multi-agent code generation, and isolated Docker execution
with MLflow/TensorBoard tracking — end to end, with every intermediate
artifact (parsed sections, embeddings, the knowledge graph, generated source
files, training logs, checkpoints) inspectable in the UI.

## What it does, feature by feature

### Authentication
Email/password signup and login (JWT access + refresh tokens, bcrypt-hashed
passwords), plus optional "Continue with Google/GitHub" OAuth — a provider
only appears once its client id/secret are configured server-side. A user can
have a password, one or more linked OAuth providers, or both.

### Dashboard
An overview of everything happening across your projects: usage stats
(total projects, papers tracked, generated projects, execution runs), a
project-status distribution chart, dependency health for every backing
service (Postgres/Redis/Neo4j/MinIO), recent projects/papers, active
codegen/execution jobs, a recent-activity feed, and the latest generated
projects and experiment runs.

### Projects
Create a project, upload one or more paper PDFs to it, and track its
progress through a 10-stage pipeline tracker (Uploaded → Parsing →
Embedding Generation → RAG Ready → Knowledge Extraction → Knowledge Graph →
Code Generation → Execution Ready → Running → Completed). Parsing and
paper-level embedding generation happen automatically; knowledge extraction,
code generation, and execution runs are explicitly triggered from Quick
Actions once their prerequisites are ready.

Each project opens into a workspace with eight tabs:

1. **Overview** — pipeline status, Quick Actions (upload, extract knowledge,
   generate embeddings, generate project, trigger execution run), and a
   summary card per pipeline stage.
2. **Paper** — the parsed PDF viewer: page-by-page rendering, a section/
   figure/table/equation outline, in-document search, and jump-to-citation
   navigation from the AI Assistant.
3. **Knowledge** — the structured `ExtractedKnowledge` the LLM pulled from
   the paper: task/domain, datasets, model architecture, hyperparameters,
   training pipeline, evaluation metrics, reported results, ablations,
   limitations, future work, and external resources — each with its own
   confidence score.
4. **Knowledge Graph** — an interactive, force-directed graph (React Flow)
   of the same extraction, rendered as typed nodes/relationships in Neo4j;
   independently versioned per extraction.
5. **AI Assistant** — a persistent, streaming chat over the paper via
   retrieval-augmented generation: hybrid vector + full-text search fused
   with Reciprocal Rank Fusion, streamed token-by-token over a WebSocket,
   every claim backed by a clickable citation that jumps to the source page.
6. **Generated Project** — the versioned, LLM-authored PyTorch project: a
   file tree/code viewer (Monaco), a quality report (validator-flagged
   issues), a generation summary (framework, AMP/DDP, MLflow/TensorBoard
   hooks), diffs between versions, and a one-click ZIP download.
7. **Experiments** — every execution run of the generated project: live
   logs, resource usage (CPU/GPU/memory), metrics, artifacts, links out to
   the matching MLflow run and TensorBoard board, and run-to-run comparison.
8. **Artifacts** — every file the pipeline has produced for the project in
   one searchable, filterable, groupable browser: the source paper,
   knowledge-extraction/embedding exports, the generated project ZIP,
   checkpoints, execution logs, and MLflow/TensorBoard outputs — with a
   storage summary and per-file preview/download.

### AI Assistant (deep dive)
Every chat turn retrieves relevant chunks (paper sections, figure/table/
equation captions, extracted knowledge entities), builds a token-budgeted
context block, and streams a cited answer. A separate multi-agent
orchestrator (LangGraph: Planner → Retrieval/Graph/Research Analyst/
CodeGen/Experiment Planner/Reviewer) handles requests that need more than a
single retrieval turn, such as "generate a full project from this paper."

### Code generation
Given a completed knowledge extraction, an LLM (via a provider-agnostic
`get_chat_model()` — Anthropic, OpenAI, Google Gemini, or any OpenRouter
model) authors the paper-specific model/dataset/loss/metrics code; the rest
of the project (training loop, config, Dockerfile, checkpointing, AMP/DDP,
MLflow + TensorBoard hooks, tests) comes from Jinja2 templates. The result is
validated, quality-scored, versioned, and packaged as a downloadable ZIP.

### Execution
Runs a generated project's `train.py` in an isolated, sibling Docker
container (Docker-outside-of-Docker), streaming logs and CPU/GPU/memory
metrics back over Redis pub/sub + WebSocket, with metrics/params/artifacts
tracked in MLflow and a live TensorBoard board for the run.

### Settings
Edit your display name, and see your account's role/status/member-since —
all backed by a real `PATCH /auth/me`, not just local UI state.

## Architecture at a glance

Next.js (App Router) frontend talking to a FastAPI backend; long-running work
(parsing, extraction, embeddings, graph building, code generation, execution)
runs on Celery workers, with progress streamed back over Redis pub/sub and
WebSockets. Data lives in Postgres (+pgvector for embeddings), Neo4j (the
knowledge graph), and MinIO (files/artifacts, S3-compatible); MLflow and
TensorBoard track training runs.

For the full system diagram, the request-path-vs-worker-path execution
model, and every pipeline stage's implementation, see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system diagram, pipeline stages, request-vs-worker execution model
- [Deployment guide](docs/DEPLOYMENT.md) — Docker Compose quick start, production checklist
- [Environment variables](docs/ENVIRONMENT.md) — every setting, defaults, and which secrets must change in production
- [API documentation](docs/API.md) — endpoint groups, auth, errors, rate limits (full schema at `/docs`)

## Local development

Backend:

```bash
cd backend
cp .env.example .env
docker compose up -d postgres redis minio neo4j mlflow tensorboard
docker compose run --rm api alembic upgrade head
docker compose up -d api celery_worker
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the API at `NEXT_PUBLIC_API_BASE_URL` (defaults to
`http://localhost:8000/api/v1`) — see
[frontend/src/config/env.ts](frontend/src/config/env.ts) for every frontend
env var.

## Running tests

Tests need a real Postgres (with `pgvector`) and Redis - the same ones
`docker compose up postgres redis` gives you:

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Linting & type-checking

```bash
cd backend
ruff check .
black --check .
mypy app
```

```bash
cd frontend
npm run lint
npm run typecheck
```

CI (`.github/workflows/ci.yml`) runs all of the above plus an Alembic
migration check and a Docker image build on every push/PR to `main`.
