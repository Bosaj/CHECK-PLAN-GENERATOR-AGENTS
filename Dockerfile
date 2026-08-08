# syntax=docker/dockerfile:1
FROM python:3.12-alpine3.20

WORKDIR /app

# Install system dependencies for OCR and PyMuPDF
RUN apk add --no-cache \
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

CMD ["python", "-m", "check_planner.route"]
