# syntax=docker/dockerfile:1
# Using Chainguard Python image — continuously rebuilt, 0 CVEs
FROM cgr.dev/chainguard/python:latest-dev

WORKDIR /app

# Wolfi (Chainguard's OS) supports apk — tesseract available in Wolfi repo
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-fra \
    build-base \
    glib

COPY pyproject.toml .
RUN pip install --no-cache-dir hatchling && pip install --no-cache-dir -e .

COPY check_planner/ check_planner/

EXPOSE 8000

ENV PORT=8000
ENV HOST="0.0.0.0"

# Chainguard images run as nonroot (uid 65532) by default — no USER needed

CMD ["python", "-m", "check_planner.route"]
