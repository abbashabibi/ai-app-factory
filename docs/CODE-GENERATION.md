# Code Generation Pipeline

The factory now has a dedicated Code Generation Agent between UI/UX specification and source commit.

## Runtime flow

`ASSETS_READY` → `POST /api/v1/projects/:id/source/generate` → validated source manifest → `POST /api/v1/projects/:id/source/commit` → GitHub commit → `RENDERED`

The generator uses the configured OpenAI Responses API provider and returns UTF-8 text files only. The manifest is validated before it can reach GitHub.

## Safety gates

- Maximum 50 files per generation.
- Maximum 200 KB per file.
- Maximum 2 MB total generated source.
- Absolute paths, traversal paths and directory-only paths are rejected.
- Duplicate paths are rejected.
- Secrets and binary artifacts are prohibited by the generation contract.
- A build is not reported as successful until Codemagic returns a finished successful build.

## Production note

The current backend uses in-memory project state for the development pipeline. Before commercial launch, project state, accounts, authentication, job queues and audit logs must move to durable production infrastructure.
