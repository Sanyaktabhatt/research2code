from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    codegen,
    embeddings,
    execution,
    files,
    graph,
    health,
    knowledge,
    orchestrator,
    papers,
    projects,
    rag,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(papers.router, tags=["papers"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(knowledge.router, tags=["knowledge"])
api_router.include_router(embeddings.router, tags=["embeddings"])
api_router.include_router(rag.router, tags=["rag"])
api_router.include_router(graph.router, tags=["graph"])
api_router.include_router(orchestrator.router, tags=["orchestrator"])
api_router.include_router(codegen.router, tags=["codegen"])
api_router.include_router(execution.router, tags=["execution"])
