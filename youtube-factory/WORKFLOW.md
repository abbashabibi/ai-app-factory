# Production workflow

## Job states

`IDEA -> RESEARCHED -> SCRIPTED -> ASSETS_READY -> RENDERED -> QA_PASSED -> UPLOADED -> ANALYZED`

Any failure is recorded with the stage, error, provider response, and retry count. A retry resumes from the failed stage rather than regenerating everything.

## Quality gates

- Original script and useful creator value
- No unsupported factual claims when research is required
- Asset licensing/provenance recorded
- No prohibited or deceptive impersonation
- Audio and video render successfully
- Captions are present when configured
- Title/description are generated and validated
- AI disclosure flag is determined before upload
- Upload remains private until the publishing policy permits public/scheduled release

## Publishing modes

- `private`: safest initial integration test
- `unlisted`: controlled review
- `scheduled`: automated publishing at an approved time
- `public`: only after all gates pass
