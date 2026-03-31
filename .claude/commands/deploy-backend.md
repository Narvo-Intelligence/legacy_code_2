---
description: Deploy the backend to Google Cloud Run. Builds Docker image and deploys via Cloud Build.
---
## Pre-Deploy Checks

!`cd backend && python -c "import server; print('✅ Server module imports OK')" 2>&1 || echo "❌ Import error — fix before deploying"`

!`git status --short`

## Deploy Steps

1. Ensure all changes are committed and pushed to `main`
2. Run the Cloud Build deployment:

```bash
gcloud builds submit --config cloudbuild.yaml
```

3. After deploy, verify:
   - Health: https://api.narvo.news/api/health
   - Swagger: https://api.narvo.news/docs

4. Check Sentry dashboard for any new errors (if SENTRY_DSN is configured)
5. If changes affect the Morning Briefing pipeline, verify Cloud Scheduler job fires correctly

## Rollback

If something breaks, Cloud Run keeps previous revisions. Roll back via:
```bash
gcloud run services update-traffic narvo-backend --to-revisions=PREVIOUS_REVISION=100
```
