# Getting Started

## Prerequisites

- Docker Engine 24.0+ and Docker Compose v2+
- Git

## Run the full stack

```bash
git clone https://github.com/CDG-CAPITAL-FINANCE/CHECK-PLAN-GENERATOR-AGENTS.git
cd CHECK-PLAN-GENERATOR-AGENTS
cp .env.example .env
# Edit .env: set GOOGLE_API_KEY, GROQ_API_KEY, SECRET_KEY
docker-compose up -d --build
```

## Access points

| Service | URL |
|---|---|
| Frontend dashboard | http://localhost:3000 |
| Spring Boot API gateway | http://localhost:8000 |
| FastAPI AI service docs | http://localhost:8057/check-planner/api/v1/docs |

## Required environment variables

See the table in the main [README](../../README.md#%EF%B8%8F-environment-variables) — at minimum you need `GOOGLE_API_KEY` and a 64-char `SECRET_KEY` for JWT signing. `GROQ_API_KEY` is optional but enables fallback when Gemini quota is exhausted.

## Running CI checks locally

CI (`.github/workflows/ci.yml`) lints and tests each service. Check that file directly for the exact commands per service (Python/`check_planner`, Java/`backend`, Next.js/`frontend`), since they differ by stack.
