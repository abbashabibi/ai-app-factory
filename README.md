# Abbas AI App Factory

An agent-first pipeline for turning an app idea into a tested Android APK.

## Pipeline

1. App idea / requirements
2. AI specification and architecture
3. Source-code generation
4. Automated QA checks
5. GitHub source of truth
6. Cloud Android build
7. APK artifact retrieval
8. Delivery to the user

## Build backend

The initial design targets Codemagic for cloud Android builds. The repository will contain the build configuration and automation glue without storing secrets in source control.

## Security

API tokens, signing credentials, and other secrets must be supplied through environment variables or the CI provider's secret store. Never commit secrets to this repository.
