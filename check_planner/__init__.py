import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .route import router

# ── CORS origins ────────────────────────────────────────────────────────────
# Set ALLOWED_ORIGINS env var as comma-separated list for production.
# Falls back to localhost only.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ── Upload size limit middleware (default: 50 MB) ───────────────────────────
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))


class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method == "POST":
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > MAX_UPLOAD_BYTES:
                return Response(
                    content=f"Fichier trop volumineux (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB).",
                    status_code=413,
                )
        return await call_next(request)


app = FastAPI(
    root_path="/check-planner/api/v1",
    title="Check Planner API",
    description="API d'agents IA pour la génération de plans de contrôle à partir de règlements de gestion.",
    version="1.0.0",
)

app.add_middleware(LimitUploadSizeMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8057, reload=True)
