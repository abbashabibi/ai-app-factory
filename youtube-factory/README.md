# YouTube Automation Factory

Professional pipeline for turning a content brief into a YouTube-ready video and, when authorized, publishing it through the YouTube API.

## Pipeline

1. Topic/brief intake
2. Topic research and originality checks
3. Script + scene plan
4. Voice/audio generation
5. Visual asset generation or licensed asset retrieval
6. Automated video assembly
7. Captions, title, description, tags and thumbnail
8. QA: duration, audio, render, metadata, policy/disclosure checks
9. YouTube upload/scheduling through OAuth
10. Post-publication analytics
11. Feedback loop for future topics

## Design principles

- Human/creator ownership of the channel and OAuth authorization
- No hard-coded secrets
- Idempotent jobs and resumable pipeline stages
- Explicit provenance for generated and third-party assets
- Automatic AI-disclosure decisioning where applicable
- Never publish content that fails required QA checks
- Avoid impersonation, copyright abuse, spam, and mass-produced low-value content

## Provider adapters

The factory should use provider adapters rather than hard-code one AI vendor. This keeps text, voice, image/video, rendering and storage providers replaceable.

## Publishing

YouTube publishing uses the official API with OAuth credentials. Publishing is disabled until the channel authorization and required secrets are configured.
