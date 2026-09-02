# Product Architecture

## Product layers

1. **Web SaaS** — customer workspace, projects, videos, channels, analytics, license and settings.
2. **Backend API** — authentication, licensing, projects, jobs, integrations and audit logs.
3. **AI Orchestrator** — provider-neutral planning and execution of research, scripting, assets, rendering and QA.
4. **Integration adapters** — YouTube OAuth/API, AI providers, voice, visual generation, storage and notifications.
5. **Build/Artifact layer** — Codemagic for Android builds and artifact delivery.
6. **Android companion** — mobile client using the same account/backend and license state.

## Project lifecycle

`IDEA → RESEARCHED → SCRIPTED → ASSETS_READY → RENDERED → QA_PASSED → UPLOADED → ANALYZED`

Each stage is resumable and must record errors and provider responses without exposing secrets.

## Commercial model

The product supports a Lifetime License. License ownership and entitlement state are server-side. Variable third-party usage can remain quota-based or separately billed.

## Production boundary

Code in this repository must remain deployable without committing secrets. Production requires external configuration for database, authentication, payment, notification providers, YouTube OAuth, AI providers, hosting and Android signing/build services.
