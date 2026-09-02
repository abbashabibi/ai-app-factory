# Production Completion Checklist

## Implemented in repository
- GitHub source-of-truth structure
- Lifetime licensing model and secure key hashing foundation
- License activation/device binding foundation
- Project pipeline service and API
- Unified backend routing for license + project APIs
- Admin API-key gate for license issuance when configured
- Responsive Persian web dashboard foundation
- Android companion project skeleton
- Codemagic Android debug build workflow
- CI workflow for backend tests and web build
- YouTube Factory workflow and QA gates

## Still requires external infrastructure/credentials
1. PostgreSQL (or another durable production database)
2. Production authentication/session provider
3. HTTPS hosting for backend and web
4. Payment provider + signed webhook endpoint
5. Email/SMS provider for license delivery and account notifications
6. YouTube OAuth client and channel authorization
7. AI provider credentials and model routing
8. Durable job queue + worker/render infrastructure
9. Codemagic account/app connection and signing credentials for release APK
10. Production domain, secrets, monitoring, backups, and rate limiting

## Release gate
Do not claim the product is production-ready until the external items above are configured and end-to-end tested. A local or repository scaffold is not an APK, hosted SaaS, or authorized YouTube publisher by itself.
