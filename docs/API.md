# API Documentation

The full, always-up-to-date API reference is FastAPI's generated OpenAPI
schema:

- Interactive docs: `GET /docs` (Swagger UI)
- Alternative docs: `GET /redoc`
- Raw schema: `GET /openapi.json`

All routes are versioned under `API_V1_PREFIX` (default `/api/v1`).

## Endpoint groups

| Prefix | Purpose |
|---|---|
| `/health` | Liveness/readiness (see [DEPLOYMENT.md](DEPLOYMENT.md)) |
| `/auth` | Signup, login, refresh, `/auth/me` |
| `/projects` | Project CRUD |
| `/papers`, `/files` | Paper upload/processing, versioned file storage |
| `/knowledge` | Knowledge extraction trigger/read, re-extraction |
| `/embeddings` | Embedding generation trigger/read |
| `/rag` | Retrieval-augmented Q&A, incl. a streaming WebSocket |
| `/graph` | Knowledge graph queries |
| `/orchestrator` | Multi-agent orchestrator entrypoint, incl. streaming WebSocket |
| `/codegen` | Code generation trigger/read/download, incl. progress WebSocket |
| (execution) `/generated-projects/{id}/execution-runs`, `/execution-runs/*` | Trigger/cancel/compare training runs, log/TensorBoard access, progress WebSocket |

`/metrics` (Prometheus) and `/health` live outside the versioned prefix, at
the application root.

## Authentication

Bearer JWT via `Authorization: Bearer <access_token>`, obtained from
`POST /auth/login` or `POST /auth/signup`. WebSocket endpoints can't send
custom headers during the handshake, so they instead take the access token as
a `?token=` query parameter (see `get_current_user_ws`).

Tokens are short-lived (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, default 60m);
refresh via `POST /auth/refresh` with the longer-lived refresh token
(`JWT_REFRESH_TOKEN_EXPIRE_DAYS`, default 7d).

## Errors

Domain errors (not found, permission denied, invalid state) return a JSON
body `{"detail": "..."}` with an appropriate 4xx status. Unhandled server
errors return a generic `{"detail": "Internal server error"}` with status
500 - the real exception is logged server-side, tagged with the request's
`X-Request-ID` (also echoed back in the response headers) for correlation.

## Rate limits

Requests are rate-limited per client (IP, or bearer token once authenticated)
using a Redis-backed fixed window (`RATE_LIMIT_MAX_REQUESTS` per
`RATE_LIMIT_WINDOW_SECONDS`, default 120/60s). Exceeding it returns `429`
with a `Retry-After` header.
