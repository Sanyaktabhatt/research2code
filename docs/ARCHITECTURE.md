# Architecture

Research2Code turns an uploaded research paper into a reproducible, runnable ML
project. Every stage is a FastAPI request that hands off long-running work to
Celery, with progress streamed back over Redis pub/sub + WebSockets.

## System diagram

```
                                   ┌─────────────────────┐
                                   │        Client        │
                                   └──────────┬───────────┘
                                              │ HTTPS / WSS
                                   ┌──────────▼───────────┐
                                   │      FastAPI API      │
                                   │  (auth, CRUD, RAG,    │
                                   │   orchestrator, ws)   │
                                   └──┬─────┬─────┬───┬────┘
                     ┌────────────────┘     │     │   └───────────────┐
                     │                      │     │                   │
              ┌──────▼──────┐      ┌───────▼───┐ │           ┌───────▼──────┐
              │ PostgreSQL  │      │   Redis    │ │           │    Neo4j      │
              │ (+pgvector) │      │ cache/     │ │           │ knowledge     │
              │             │      │ pubsub/    │ │           │ graph         │
              └──────┬──────┘      │ broker     │ │           └───────┬──────┘
                     │             └─────┬──────┘ │                   │
                     │                   │         │                   │
                     │            ┌──────▼─────────▼───┐               │
                     │            │   Celery workers     │◄─────────────┘
                     │            │ (paper parsing,      │
                     │            │  knowledge extraction,│
                     │            │  embeddings, graph,   │
                     │            │  codegen, execution)  │
                     │            └──┬─────────┬───────┬──┘
                     │               │         │       │
                     │        ┌──────▼───┐ ┌───▼───┐ ┌─▼──────────────┐
                     │        │  MinIO   │ │ MLflow │ │ Docker daemon   │
                     │        │ (files,  │ │(tracking│ │ (sibling        │
                     │        │ artifacts)│ │+ artifacts)│ containers,   │
                     │        └──────────┘ └────────┘ │ isolated training)│
                     │                                  └────────┬────────┘
                     │                                           │
                     │                                   ┌───────▼───────┐
                     └───────────────────────────────────┤  TensorBoard   │
                                                           └────────────────┘
```

## Request path vs. worker path

Every model in this codebase is touched through two parallel stacks that must
stay behaviorally identical:

- **FastAPI request path**: async SQLAlchemy session (`AsyncSessionLocal`),
  async Redis client, async Neo4j driver, `.ainvoke()` on LLM calls.
- **Celery worker path**: sync SQLAlchemy session (`SyncSessionLocal`), sync
  Redis client, sync Neo4j driver, `.invoke()` on LLM calls - because Celery
  tasks run outside the asyncio event loop that powers the API process.

Pure logic (query builders, RRF fusion, graph-operation construction,
dependency resolution) is factored out into I/O-free functions/modules that
both stacks call identically, so there is exactly one implementation of any
given piece of business logic even though there are two execution contexts.

## Pipeline stages

1. **Paper processing** (`app/parser`) - PyMuPDF text extraction with a
   Tesseract OCR fallback, section/figure/table/equation splitting.
2. **Knowledge extraction** (`app/agents/paper_parser_agent.py`) - an LLM
   (via a provider-agnostic `get_chat_model()`) produces structured,
   per-entity-confidence-scored `ExtractedKnowledge`.
3. **Embedding & vector indexing** (`app/agents/embedding_*`,
   `app/repositories/embedding_*`) - pluggable embedding providers, stored in
   Postgres via pgvector, searchable by cosine similarity and full-text.
4. **RAG** (`app/services/retrieval_service.py`, `rag_service.py`) - hybrid
   vector + keyword retrieval fused with Reciprocal Rank Fusion, cached in
   Redis, streamed to the client over a WebSocket.
5. **Knowledge graph** (`app/services/knowledge_graph_builder.py`,
   `graph_repository.py`) - a versioned Neo4j snapshot per knowledge
   extraction, queryable independently of the vector index.
6. **Multi-agent orchestrator** (`app/workflows/graph_builder.py`, LangGraph)
   - a Planner agent routes each request across Retrieval/Graph/Research
     Analyst/CodeGen/Experiment Planner/Reviewer/Documentation agents,
     sharing state and combining RAG + graph context into one final answer.
7. **Code generation** (`app/codegen`) - Jinja2 templates + LLM-authored
   sections produce a full, versioned, runnable PyTorch project (training
   loop, AMP/DDP, checkpointing, MLflow/TensorBoard hooks), validated and
   packaged as a ZIP.
8. **Execution platform** (`app/execution`) - Docker-outside-of-Docker runs
   the generated project in an isolated sibling container, streaming logs and
   resource metrics over Redis pub/sub, tracking params/metrics/artifacts in
   MLflow, and exposing a TensorBoard URL.

## Cross-cutting concerns (this hardening pass)

- **Reliability**: structured JSON logs with request-correlation IDs,
  `/health/live` + `/health/ready`, FastAPI `lifespan`-driven graceful
  shutdown, consistent Celery retry/backoff, circuit breakers around
  LLM/embedding/MinIO calls (`app/utils/circuit_breaker.py`).
- **Security**: Redis-backed rate limiting, security headers, CORS,
  zip-slip-safe archive extraction, streamed/capped file uploads, a
  startup-time refusal to run with default secrets outside `development`.
- **Observability**: Prometheus metrics at `/metrics`
  (`app/observability/metrics.py`) covering HTTP, Celery queues/tasks,
  execution runs, LLM/embedding latency, vector search, and Neo4j query
  timing; optional OpenTelemetry tracing (`OTEL_ENABLED=true`).
- **Performance**: tuned SQLAlchemy/Redis/Neo4j connection pools, a
  batched (not per-row) ownership check for multi-run comparisons.

See [ENVIRONMENT.md](ENVIRONMENT.md) for every setting and
[DEPLOYMENT.md](DEPLOYMENT.md) for how to run this in production.
