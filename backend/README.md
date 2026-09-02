# AI App Factory Backend

Initial backend foundation for the production license lifecycle.

## Endpoints

- `GET /health` — service health check.
- `POST /api/v1/licenses/issue` — development/admin issuance endpoint; production must require admin authentication and a verified paid order.
- `POST /api/v1/licenses/activate` — validates a license key and binds an account/device.

## Production hardening still required

This foundation intentionally uses an in-memory store so the API contract and core rules can be tested without infrastructure. Before production:

1. Replace the in-memory store with PostgreSQL/Prisma or equivalent durable storage.
2. Require authenticated admin authorization for issuance.
3. Connect issuance to a verified payment webhook with idempotency.
4. Add email/SMS notification adapters.
5. Add authentication, rate limiting, audit-log persistence and observability.
6. Add YouTube OAuth and AI provider adapters.
7. Configure deployment secrets outside GitHub source control.
