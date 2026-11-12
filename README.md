# Research2Code

Upload an ML research paper and get a runnable PyTorch project. Research2Code
parses the PDF, extracts the methodology, generates the code, and runs it in
Docker with MLflow and TensorBoard tracking. Every intermediate step is
inspectable in the UI.

## Features

- **Auth** — email/password (JWT) plus optional Google/GitHub OAuth.
- **Dashboard** — project stats, system health, recent papers, jobs and runs.
- **Projects** — upload PDFs and track each one through the pipeline. Parsing
  and embeddings run automatically; extraction, code generation and runs are
  started from the project.
- **Paper** — parsed PDF viewer with a section/figure/table/equation outline.
- **Knowledge** — extracted datasets, architecture, hyperparameters, metrics
  and results, each with a confidence score.
- **Knowledge Graph** — the extraction as an interactive graph (Neo4j).
- **AI Assistant** — streaming chat over the paper with page citations.
- **Generated Project** — versioned PyTorch code, quality report, diffs, ZIP
  download. Works with Anthropic, OpenAI, Gemini or any OpenRouter model.
- **Experiments** — isolated Docker runs with live logs, resource usage and
  MLflow/TensorBoard links.
- **Artifacts** — every file the pipeline produced, in one place.

## Stack

Next.js frontend, FastAPI backend, Celery workers, Postgres + pgvector,
Neo4j, Redis, MinIO, MLflow and TensorBoard.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [API](docs/API.md)

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

The frontend expects the API at `NEXT_PUBLIC_API_BASE_URL` (default
`http://localhost:8000/api/v1`).

## Tests and linting

```bash
cd backend
pip install -r requirements-dev.txt
pytest
ruff check . && black --check . && mypy app
```

```bash
cd frontend
npm run lint
npm run typecheck
```

CI runs all of these on every push and PR to `main`.
