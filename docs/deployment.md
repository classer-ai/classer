# Deployment Guide

Classer is deployed using SST (Serverless Stack) to AWS.

## Prerequisites

- AWS account with credentials configured
- SST CLI (`npm install -g sst`)
- Google OAuth credentials

## Stages

| Stage | Purpose | URL |
|-------|---------|-----|
| `dev` | Development/testing | dev.classer.ai |
| `production` | Live production | classer.ai |

## First-Time Setup

### 1. Set Secrets

```bash
cd /path/to/stimy-app/backend

# Development
sst secret set ClasserGoogleClientId "your-client-id" --stage dev
sst secret set ClasserGoogleClientSecret "your-client-secret" --stage dev
sst secret set ClasserAuthSecret "$(openssl rand -base64 32)" --stage dev

# Production
sst secret set ClasserGoogleClientId "your-client-id" --stage production
sst secret set ClasserGoogleClientSecret "your-client-secret" --stage production
sst secret set ClasserAuthSecret "$(openssl rand -base64 32)" --stage production
```

### 2. Configure Google OAuth

Add authorized redirect URIs in Google Cloud Console:

**Development:**
```
https://dev.classer.ai/api/auth/callback/google
```

**Production:**
```
https://classer.ai/api/auth/callback/google
```

### 3. Deploy

```bash
# Development
sst deploy --stage dev

# Production
sst deploy --stage production
```

### 4. Run Database Migrations

After first deploy:

```bash
cd classer/frontend

# For dev
DATABASE_URL=$(sst shell --stage dev -- printenv DATABASE_URL)
npx drizzle-kit push

# For production
DATABASE_URL=$(sst shell --stage production -- printenv DATABASE_URL)
npx drizzle-kit push
```

## Updating

### Code Changes

```bash
# Deploy changes
sst deploy --stage dev

# Or for production
sst deploy --stage production
```

### Database Schema Changes

1. Update schema in `frontend/src/db/schema/`
2. Generate migration:
   ```bash
   npx drizzle-kit generate
   ```
3. Push changes:
   ```bash
   npx drizzle-kit push
   ```

## Infrastructure

### Resources Created

| Resource | Type | Description |
|----------|------|-------------|
| ClasserPostgres | RDS PostgreSQL | User data, API keys |
| ClasserFrontend | Next.js (Lambda) | Web application |
| ClasserApi | ECS Fargate | Classification API |
| ClasserApiCdn | CloudFront | HTTPS for API |
| ClasserLlmGateway | ECS Fargate | AI model gateway |

### Environment Variables

**Frontend:**
- `DATABASE_URL` - PostgreSQL connection
- `AUTH_SECRET` - Session encryption
- `AUTH_GOOGLE_ID` - OAuth client ID
- `AUTH_GOOGLE_SECRET` - OAuth client secret
- `AUTH_URL` - Base URL for auth
- `NEXT_PUBLIC_API_URL` - Classer API URL

**API:**
- `DATABASE_URL` - PostgreSQL connection
- `LLM_GATEWAY_URL` - AI gateway URL

## Monitoring

### Logs

```bash
# Frontend logs
sst logs ClasserFrontend --stage dev

# API logs
sst logs ClasserApi --stage dev
```

### Database

Connect to database:

```bash
sst shell --stage dev
psql $DATABASE_URL
```

## Rollback

```bash
# List recent deployments
sst list --stage production

# Rollback to previous version
sst deploy --stage production --from <deployment-id>
```

## Costs

Estimated monthly costs (dev stage):

| Resource | Cost |
|----------|------|
| RDS t4g.micro | ~$15 |
| ECS Fargate (API) | ~$10 |
| ECS Fargate (LLM Gateway) | ~$10 |
| CloudFront | ~$1 |
| Lambda (Frontend) | ~$1 |
| **Total** | **~$37/month** |

Production costs vary based on traffic.
