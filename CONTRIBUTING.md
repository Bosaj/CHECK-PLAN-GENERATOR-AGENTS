# 🤝 Contributing Guidelines — CDG Capital

Thank you for contributing to **Check Plan Generator Agents**. This project adheres to strict engineering guidelines to maintain production readiness, security, and clean architecture.

---

## 👥 Engineering Team & Domain Ownership

- **Oussama ELHADJI** (`@Bosaj`): AI Lead & LangGraph Architect (`check_planner/agents/`, `check_planner/retriever/`)
- **Adama COULIBALY** (`@startlingadama`): AI Engineer (`check_planner/regulation_chunker/`, `check_planner/llm/`)
- **Hamza IDRISSI** (`@IdrHamza`): Full-Stack Engineer (`backend/`, `frontend/`)
- **Chaymae ADIHAJI** (`@Chaymaadihaji`): Data Engineer (`plans/`, `clients/`, `tests/`)

---

## 🌿 Branching Strategy

We follow a domain-separated feature branch workflow:

- `main`: Production-ready release branch. All PRs require review and CI check pass.
- `ai`: Agent development, LangGraph state graph modifications, OCR pipeline updates.
- `backend`: Java Spring Boot Gateway, Security configurations, MongoDB models.
- `frontend`: Next.js 15 UI, dashboards, component library.

---

## 📝 Commit Conventions

All commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(ai): add verifier agent node to state graph`
- `fix(security): restrict CORS allowed origins to production domain`
- `fix(backend): correct JWT token expiration check`
- `docs(readme): add docker compose quick-start instructions`
- `refactor(chunker): optimize regex regex pattern matching for section extraction`

---

## 🧪 Pull Request Checklist

Before submitting a Pull Request:
1. Ensure no hardcoded secrets or API keys exist in `.env` or codebase.
2. Run linters:
   - Python: `ruff check check_planner/`
   - Frontend: `npm run lint` (inside `frontend/`)
3. Verify tests pass: `pytest tests/`
4. Confirm `docker-compose up -d --build` builds cleanly without errors.
