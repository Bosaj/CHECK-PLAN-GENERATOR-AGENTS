# 🔒 Security Policy — CDG Capital

## Supported Versions

Only the latest `main` release of this software is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Directives & Best Practices

1. **API Key & Secret Confidentiality**:
   - Never commit raw API keys (`GOOGLE_API_KEY`, `GROQ_API_KEY`, `SECRET_KEY`, GitHub PATs) into source control.
   - Use environment variables or secret store solutions (AWS Secrets Manager, HashiCorp Vault).
   - If a key is accidentally committed, rotate it immediately in the cloud provider console.

2. **File Ingestion & Path Traversal**:
   - All uploaded PDFs are sanitized using strict filename regular expressions to prevent path traversal (`../`) vulnerabilities.
   - Upload size is capped at 50MB (`MAX_UPLOAD_BYTES`).

3. **API & CORS Hardening**:
   - CORS is restricted via `ALLOWED_ORIGINS` environment variables. Wildcard `*` is prohibited in production deployments.
   - Rate limiting (`slowapi`) enforces call boundaries on sensitive LLM endpoints.

## Reporting a Vulnerability

If you discover a security vulnerability within this repository, please do **NOT** open a public issue.

Instead, notify the CDG Capital Engineering Security Team directly:
- **Email**: `security@cdgcapital.ma`
- **Lead Maintainer**: Oussama ELHADJI (`@Bosaj`)

Please include a detailed proof-of-concept and steps to reproduce. We aim to acknowledge reports within 24 hours and issue patches within 5 business days.
