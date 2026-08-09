# syntax=docker/dockerfile:1
# glibc-based, not Alpine: torch (pulled in by sentence-transformers, used by
# check_planner/retriever/params.py's real RAG retrieval) publishes no
# musllinux/Alpine wheels at all - confirmed via a direct build failure
# ("Could not find a version that satisfies torch>=1.11.0 (from versions:
# none)"). Tesseract itself is fine on either base; this project's other
# services already use Debian-family bases for the same reason.
FROM python:3.13-slim-bookworm

WORKDIR /app

# Patch OS packages + install runtime deps in one layer
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    build-essential \
    libstdc++6 \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml requirements.txt ./
RUN pip install --no-cache-dir --timeout 60 --retries 3 hatchling && \
    pip install --no-cache-dir --timeout 60 --retries 3 -r requirements.txt && \
    pip install --no-cache-dir --timeout 60 --retries 3 -e .

COPY check_planner/ check_planner/

# check_planner/__init__.py hardcodes port 8057 (matches run_platform.py's
# local orchestration) - EXPOSE 8000 / ENV PORT here were dead/misleading,
# nothing in the app ever read them.
EXPOSE 8057

# Run as non-root user (fixes docker:S6471) - same style as backend/Dockerfile
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser && \
    chown -R appuser:appgroup /app
USER appuser

# check_planner/route.py has no __main__ guard - it's a router module, not an
# entrypoint. The actual FastAPI app + uvicorn.run() live in
# check_planner/__init__.py; "python -m check_planner.route" (the previous
# CMD) would import it, do nothing, and exit immediately.
CMD ["python", "-m", "check_planner"]
