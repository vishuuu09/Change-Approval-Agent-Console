import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from sqlalchemy import select

from .config import settings
from .db import Base, SessionLocal, engine
from .logging_conf import setup_logging
from .models import User
from .routers_auth import router as auth_router
from .routers_changes import router as changes_router
from .security import hash_password

REQS = Counter("http_requests_total", "HTTP requests", ["method", "path", "status"])
LAT = Histogram("http_request_seconds", "Request latency", ["method", "path"])
log = logging.getLogger("app")

DEMO_USERS = [("viewer1", "viewer"), ("engineer1", "engineer"), ("approver1", "approver")]


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for name, role in DEMO_USERS:  # demo seed users only
            if db.scalar(select(User).where(User.username == name)) is None:
                db.add(User(username=name, password_hash=hash_password(settings.demo_password), role=role))
        db.commit()
    yield


app = FastAPI(title="Change-Approval Agent Console", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(changes_router)


@app.middleware("http")
async def metrics_mw(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    route = request.scope.get("route")
    path = route.path if route else request.url.path  # template path keeps labels low-cardinality
    elapsed = time.perf_counter() - start
    REQS.labels(request.method, path, response.status_code).inc()
    LAT.labels(request.method, path).observe(elapsed)
    log.info(
        "request",
        extra={"ctx": {"method": request.method, "path": path, "status": response.status_code,
                       "ms": round(elapsed * 1000, 1)}},
    )
    return response


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
