# syntax=docker/dockerfile:1
FROM python:3.13-alpine3.22

WORKDIR /app

# Patch all OS packages first to eliminate known CVEs, then install build deps
RUN apk upgrade --no-cache && apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-fra \
    build-base \
    gcompat \
    libstdc++ \
    glib \
    mesa-gl

COPY pyproject.toml .
RUN pip install --no-cache-dir hatchling && pip install --no-cache-dir -e .

COPY check_planner/ check_planner/

EXPOSE 8000

ENV PORT=8000
ENV HOST="0.0.0.0"

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["python", "-m", "check_planner.route"]
