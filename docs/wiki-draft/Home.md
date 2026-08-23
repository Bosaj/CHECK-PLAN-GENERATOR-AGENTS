# Check Plan Generator Agents — Wiki

An enterprise AI platform for **CDG Capital** that automates extraction, verification, and transformation of financial management regulations (*Reglements de Gestion*) into structured compliance control plans exported as Excel spreadsheets.

## Quick Links

- [Getting Started](Getting-Started) - environment setup and running the full stack
- [Architecture](Architecture) - the LangGraph agent pipeline and service topology
- [FAQ](FAQ) - common questions about the platform

## Tech Stack at a Glance

- AI engine: Python 3.11, LangGraph, LangChain, Google Gemini / Groq Llama 3
- OCR: RapidOCR (PaddleOCR ONNX) with Tesseract fallback
- API gateway: Java 17, Spring Boot 3.5, Spring Security, JWT, MongoDB
- Frontend: Next.js 15 (App Router), TailwindCSS, Radix UI
- Docker Compose orchestration, GitHub Actions CI/CD

## Team

Oussama ELHADJI ([@Bosaj](https://github.com/Bosaj)) - AI Lead and Agent Architect. Adama COULIBALY ([@startlingadama](https://github.com/startlingadama)) - AI Engineer and LLM Specialist. Hamza IDRISSI ([@IdrHamza](https://github.com/IdrHamza)) - Full-Stack Engineer. Chaymae ADIHAJI ([@Chaymaadihaji](https://github.com/Chaymaadihaji)) - Data Engineer.
