# Deploy Sumi to Railway

Deploy the Sumi monorepo (Python FastAPI backend + Next.js frontend) as **2 Railway services** using Dockerfiles. Railway provides internal networking so the frontend can proxy API calls to the backend without exposing it publicly.

## Railway Setup

1. **Create Railway project** at https://railway.com/dashboard
2. **Add Backend service**: New Service → GitHub Repo → set Root Directory to `backend`
3. **Add Frontend service**: New Service → GitHub Repo → set Root Directory to `frontend`
4. **Backend env vars** (set in Railway service settings):
   - `USE_BEDROCK=1`
   - `AWS_REGION=us-east-1`
   - `ANTHROPIC_MODEL=global.anthropic.claude-opus-4-5-20251101-v1:0`
   - `ANTHROPIC_AWS_BEARER_TOKEN_BEDROCK=<token>`
   - `GOOGLE_API_KEY=<key>`
   - `ANTHROPIC_API_KEY=<key>` (fallback if Bedrock disabled)
   - `CORS_ORIGINS=["https://<frontend-domain>.up.railway.app"]`
5. **Frontend env vars**:
   - `BACKEND_URL=http://backend.railway.internal:<backend-port>` (Railway private networking)
6. **Frontend public domain**: Settings → Networking → Generate Domain
7. **Backend**: Keep private (no public domain needed — frontend proxies all requests)

## Verification

1. Push code to GitHub (or connect repo to Railway)
2. Railway auto-builds both services from Dockerfiles
3. Visit the frontend's public Railway URL
4. Submit a topic → select style → generate → confirm infographic appears
5. Check Railway logs for backend to verify Bedrock URL construction

## Known Limitations (acceptable for testing)

- **Ephemeral storage**: Generated images are stored on the container filesystem. Lost on redeploy. Users should download immediately.
- **In-memory job state**: Job status is stored in a Python dict. Lost on redeploy.
- **No persistent database**: Would need PostgreSQL + S3 for a durable production deployment.
