# FAQ

**Why three separate services (Next.js, Spring Boot, FastAPI) instead of one backend?**
Each does a distinct job: Spring Boot owns auth/persistence/routing (the team's Java expertise), FastAPI owns the LangGraph AI pipeline (Python's ML/LLM ecosystem), and Next.js owns the UI. This also lets each service scale and deploy independently via its own Dockerfile.

**What happens if the Gemini API quota is exhausted mid-run?**
The AI service's LLM pool automatically retries with backoff and rotates to secondary keys (`GOOGLE_API_KEY1`) or falls back to Groq Llama 3 (`GROQ_API_KEY`) if configured.

**Why both RapidOCR and Tesseract?**
RapidOCR (PaddleOCR ONNX) is the primary, higher-accuracy engine; Tesseract serves as a fallback if RapidOCR fails on a given document.

**What's the maximum PDF size I can upload?**
50MB by default (`MAX_UPLOAD_BYTES=52428800`), configurable via environment variable.

**Where do generated control plans get saved?**
To `PLANS_DIR` (default `/app/plans`), as formatted `.xlsx` files produced by the Excel Formatter step.

**Who do I ask about a specific part of the system?**
See the Team table on [Home](Home) — responsibilities are split by area (agents/OCR, LLM integration, full-stack/gateway, data/Excel structuring).
