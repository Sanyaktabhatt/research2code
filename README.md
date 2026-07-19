# Research2Code

Converts uploaded ML research papers into fully reproducible, runnable ML
projects: paper parsing → LLM knowledge extraction → vector/graph indexing →
retrieval-augmented Q&A → multi-agent code generation → isolated Docker
execution with MLflow/TensorBoard tracking.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - system diagram, pipeline stages, request-vs-worker execution model
- [Deployment guide](docs/DEPLOYMENT.md) - Docker Compose quick start, production checklist
- [Environment variables](docs/ENVIRONMENT.md) - every setting, defaults, and which secrets must change in production
- [API documentation](docs/API.md) - endpoint groups, auth, errors, rate limits (full schema at `/docs`)

## Local development

```bash
cd backend
cp .env.example .env
docker compose up -d postgres redis minio neo4j mlflow tensorboard
docker compose run --rm api alembic upgrade head
docker compose up -d api celery_worker
```

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

CI (`.github/workflows/ci.yml`) runs all of the above plus an Alembic
migration check and a Docker image build on every push/PR to `main`.
