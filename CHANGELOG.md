# Changelog

All notable changes to this project are documented here, derived from git history. Dates are commit dates (UTC as recorded by git), grouped by day/theme. Two early version tags exist (`v0.1.0`, `v0.1.1`, both August 2025) but cover only the first dozen prototype commits — everything since is grouped by date instead, since that's what actually reflects the project's development.

## [Unreleased]

Everything below is committed to the working tree but **not yet committed to git** — a single extended debugging session that started from "the website is slow" and ended up tracing five chained frontend/backend contract mismatches, most of which had been silently broken since the Aug 7–8 2026 backend/frontend merge.

### Fixed

- **Docker/infra**: `frontend/Dockerfile`'s `builder`/`runner` stages never ran `apk upgrade` (only the `deps` stage did) — added it to both. Fixed a real `docker-compose.yml` bug: the Java backend was mapped `8080:8080` and `NEXT_PUBLIC_API_URL` pointed at `:8080`, but `application.properties` has `server.port=8081` — the compose stack could never actually connect frontend→backend. Fixed the port mapping, the env var, and `backend/Dockerfile`'s stale `EXPOSE 8080`. Removed the obsolete `version:` key Compose itself was warning about.
- **Editor config**: `.vscode/settings.json` had the same fabricated Docker DX/LTeX keys as the other two repos (silently doing nothing since they don't exist in the installed extension), plus an invalid `[dockerfile]` formatter id and a reference to an uninstalled Ruff extension. Corrected all three.
- **Dark theme**: the "Règlements" document list and the règlement-upload preview used hardcoded `bg-gray-50`/`text-gray-500`, rendering as a bright white block against the dark theme. Switched to the app's existing `bg-muted`/`text-muted-foreground` tokens (`execute-agent/page.jsx`, `create/page.jsx`).
- **Console warnings**: added `autoComplete` to all 6 password fields (profile + login/register), fixed a `next/image` aspect-ratio warning on the CDG logo (Tailwind preflight was forcing `height: auto` against the fixed props), added `app/icon.png` so Next's auto-favicon convention stops 404ing.
- **Missing fetch timeouts**: `agent-service.js`'s `getAgentById` and several GET paths in `execution-service.js` had no `AbortController` timeout at all (unlike their siblings, capped at 400ms) — a backend that accepted the connection but responded slowly could hang navigation indefinitely instead of falling back. Added a shared `fetchWithTimeout` helper to both files. Parallelized the dashboard's and history page's independent backend calls (`Promise.allSettled`/`Promise.all`), which had been awaited sequentially, doubling the fallback delay.
- **Login/register identity bug** (root cause of "an agent is running but the dashboard doesn't show it"): `app/page.jsx` minted a brand-new `"user-" + Date.now()` id on *every* login/register submission instead of looking one up by email — so returning users got a different `userId` each session, and every list filtered by that id (agents, executions) silently lost everything from the previous session. Added `findOrCreateUserByEmail` in `lib/user-store.js`, which persists an email→id mapping and reuses it. Also removed `handleRegister`'s unconditional `localStorage.setItem('executions', '[]')`, which wiped the *entire shared* executions array (not scoped to the new user) on every single registration.
- **Règlement-fetch contract mismatch** (root cause of "the agent didn't generate anything"): `execute-agent/page.jsx` checked a `reglement.id` field to decide whether a règlement existed, then called a separate `downloadReglementFile(id)` — but the backend's actual `GET /reglements/by-agent` response has no `id` field at all; it embeds the full file inline as base64 in `pdfData`. The code always concluded "not found" and bailed out before ever calling the analysis API. Fixed to decode `pdfData` directly.
- **CORS wildcard+credentials bug on the Python service**: the real (non-preflight) response from `check_planner`'s `/generate` carried `Access-Control-Allow-Origin: *` together with `Access-Control-Allow-Credentials: true` — browsers always reject that combination. Root cause: `check_planner` runs via plain `uvicorn ... --port 8057` with **no `--reload`** (see `run_platform.py` at the repo root), so the running process was stale relative to the already-correct CORS config in source. Fixed by restarting it — no code change needed here, just a documented gotcha (any change to this service requires a manual restart).
- **Missing base64 data on re-execution**: `create/page.jsx`'s `handleReglementUpload` never set a `fileDataBase64` field on its `reglement` state, so the `localStorage` fallback copy of the uploaded document (`executeAgent_documents`) was always metadata-only. The *actual* bytes only ever lived in a one-time-use `sessionStorage` entry, deleted after first use — so a fresh agent's first execution worked, but any execution after that threw `"Document X n'a pas de données base64"`. Fixed by computing the base64 once via `FileReader` and reusing it for both storage locations. (Agents created *before* this fix have no recovery path — that data was never persisted server-side — re-creating the agent is the only fix for those.)
- **Dev-overlay noise**: `check-planner-service.js`'s background `sendToBackend` call used `console.error` inside an already-caught, deliberately non-fatal branch — Next.js's dev overlay treats *any* `console.error`, even a handled one, as an "Unhandled Error" popup. Downgraded to `console.warn`.
- **The deepest bug**: `check_planner`'s `POST /generate` is declared `response_model=AgentResult` and always returns JSON (`{rg_path, max_pages, max_rgs, output_file}`) — `output_file` is only a *server-side filesystem path*; the agent genuinely writes a real `.xlsx` there via `pandas.DataFrame.to_excel`, but **no endpoint anywhere in the Python service ever served those bytes**. The frontend didn't know this and force-downloaded the small JSON response itself, renamed `.xlsx` — hence Excel's "format or extension is not valid." Added `GET /download/{filename}` to `check_planner/route.py` (reusing the existing path-traversal-safe `_sanitize_filename` helper), and fixed `check-planner-service.js` to parse the JSON, fetch the real bytes from the new endpoint, and only then trigger the download. Verified against the user's actual 3MB PDF directly via curl: 30 pages processed, a real 9.9KB `.xlsx` with a valid `PK` zip signature written to disk and served correctly.
- **Dead display fields**: the "Plan de contrôle" results tab rendered `checkPlanResults.message`/`.details`, fields `AgentResult` never has (degraded silently, no crash, just showed nothing). Now shows the real fields (pages analyzed, règlements processed, filename) plus a re-download link.

### Audited (found, confirmed dead code, left alone)

A full diff of every frontend `fetch` URL against every backend `@*Mapping`/Python route found three more mismatches — but grepping `app/` confirmed nothing currently calls them, so they're unreachable, not active bugs: `agent-service.js`'s invoice functions (`/agents/{id}/invoices*`) and mission-order functions (`/agents/{id}/mission-order*`) have no backend controller at all (only 5 controllers exist: Agent, Auth, Execution, ReglementDeGestion, User); `execution-service.js`'s plain `updateExecutionStatus` (`PUT /executions/{id}`) likewise has no matching mapping (only `/complete` and `/fail` exist). Also confirmed `/api/plan-controle/upload/{id}`, called by the now-`console.warn`'d `sendToBackend` above, has zero matching route anywhere in `backend/src`.

### Verified

A real Playwright browser session (installed to a scratch directory, not the project's `node_modules`) drove: register → create agent → upload a real règlement → execute → re-execute after a reload (forcing the fallback path) → confirmed a genuine downloadable `.xlsx`. A separate full crawl (register → dashboard → agents list → create → history → profile → agent invoices page → execute-agent reloaded → result page) found **zero console errors on every page**.

## 2026-08-08 — The big cleanup day (~50 commits)

### Added

- Docker & Docker Compose configs, `.editorconfig`, production `.gitignore` (`cf7c8f9`)
- GitHub Actions CI workflow, iterated from a self-hosted runner to standard cloud runners, with several npm/pip resiliency fixes along the way (`26ed9b7`, `7a67a59`, `ebb4a22`, `853cbd8`, `35ef0d5`, `b8c3607`)
- Comprehensive unit/integration test suites plus ruff linter fixes (`6431614`), PDF splitter and retriever test fixes (`786173d`, `d3c558c`)
- Premium README, `SECURITY.md`, `LICENSE`, `CONTRIBUTING.md`, `CODEOWNERS` (`73def7e`)

### Fixed

- Frontend/backend integration: added a `completeExecution` method and fast `AbortController` timeouts across services "for instant zero-lag navigation" (`703d729`) — the same class of fix extended further in this session's Unreleased section above
- `ReferenceError: execution is not defined` in `startExecution`'s catch block (`14ecf91`)
- Backend-offline fallback to `localStorageService` restored across all frontend services (`4f80db5`)
- Extensive Java cleanup: null safety across services/controllers, deprecations, unused imports, `JwtUtils` migrated off `java.util.Date` to `java.time.Instant`, several rounds of SonarLint rule fixes (`java:S120`, `S1611`, `S6201`, `S1192`, `S2737`, `S112`, `S8688`, `S5411`, `S4502`, `S1168`, `S2139`, `S2583`, `S2143`) (`94df2cf`, `7594e61`, `85c50c7`, `60b5dda`, `fca3957`, `74a7634`, `5414946`, `c14fdf8`)
- SonarLint fixes in `execution-service.js` (`S7759`, `S7773`, `S3776`) and across agent/execution/user services (`S2486`, `S1534`, `S6582`) (`e596bfd`, `8cf5713`)
- Model selection optimization in `gemini.py`; locked ESLint config (`4add689`)

### Security

- CORS wildcard tightened, upload paths hardened, filename sanitization added, an `ErrorBoundary` introduced, CI pipeline hardened (`373f505`) — the sanitization helper this introduced (`_sanitize_filename`) is exactly what the new `/download/{filename}` endpoint reuses in the Unreleased section above
- SonarLint secret/injection rules resolved (`secrets:S6689`, `python:S1192`, `S3516`, `S7503`, `javascript:S1128`, `typescript:S9011`) plus a workflow schema warning (`73274f4`, `da16279`)
- `plans/`, `*.xlsx`, `uploads/` added to `.gitignore` to stop generated files from being committed (`d8b157b`)

### Changed

- **Frontend + backend merged into one repo**: Next.js frontend and Spring Boot Java backend moved into subdirectories on `main` (`464249e`) — this is the point the current `frontend/` + `backend/` layout was established
- Direct client-session authentication fixed in login/register handlers (`223666b`) — an earlier attempt at the same identity problem this session's Unreleased fix (`findOrCreateUserByEmail`) resolves more completely
- Docker base image chased the CVE scanner through the same pattern as the other two repos: alpine base images upgraded, legacy `ENV` format fixed, then `cgr.dev/chainguard` (0-CVE) attempted and **reverted** back to Alpine "while investigating Chainguard" (`56ac78e`, `8505665`, `bae99e4`, `de1efe0`, `d6d0fcb`, `8720d12`)
- Frontend Dockerfile optimized for production Next.js build; switched to `npm install --legacy-peer-deps` directly (`0487fab`, `3a677a2`)
- Docker DX's static CVE scanner warning suppressed in VS Code settings (`9c42215`) — using the same fabricated setting keys this session's Unreleased section found and corrected

## 2026-08-07 — Merge day

- Merged Next.js frontend and Spring Boot backend into subdirectories on `main` (`464249e`)
- SonarLint fixes in `check_planner` (`2c94aa0`)
- Direct client-session authentication fixes in login/register handlers (`223666b`)
- Backend-offline fallback to `localStorageService` across all services (`4f80db5`)
- `ReferenceError: execution is not defined` fix in `startExecution` (`14ecf91`)
- SonarLint fixes in `execution-service.js` (`e596bfd`)
- `completeExecution` method plus fast `AbortController` timeouts added across services (`703d729`)
- SonarLint fixes across agent/execution/user services (`8cf5713`)

## 2026-08-01 — OCR integration

- Integrated RapidOCR (PaddleOCR ONNX engine) for document extraction (`737e5a1`)
- Fixed `requirements.txt` for Windows Python 3.12 compatibility (`4c9444f`)

## 2025-08 – 2025-09 — Initial prototype (`v0.1.0`, `v0.1.1`)

- Project kickoff: "check planner agent" (`a7e2c46`, tagged `v0.1.0` at `acac9a9`)
- Client SDK, README (`9bf3e21`, `455eca2`)
- Logger and verifier agent; several rounds of "stable version"/"requirements"/"ocr update" (`ce939ac`, `50bf890`, `acac9a9`, `c0e3c99`)
- Specific plans folder (`baa0077`, tagged `v0.1.1`)
- LLM chunker; bug fixes; multiple model iterations (`e6fdc42`, `d656210`, `dcb3f7f`)
- Test suite, Dockerfile, planner/verifier agents formalized, full requirements, config, `.env` variables (`c2cef77`, `0864d57`, `bcc40c8`, `8c0fb42`, `517566c`, `5790b30`, `c1e280d`, `5332ef9`, `73a8ba8`)
