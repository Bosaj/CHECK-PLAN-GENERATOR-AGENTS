FROM python:3.12-slim-bookworm

WORKDIR /app

# Upgrade system packages for security patches and install dependencies
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir hatchling && pip install --no-cache-dir -e .

COPY check_planner/ check_planner/

EXPOSE 8000

ENV PORT=8000
ENV HOST=0.0.0.0

CMD ["python", "-m", "check_planner.route"]
