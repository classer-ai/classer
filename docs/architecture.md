# Architecture Overview

## System Diagram

```
                                    ┌─────────────────────────────────┐
                                    │         Google OAuth            │
                                    └────────────────┬────────────────┘
                                                     │
                                                     ▼
┌──────────────┐    HTTPS    ┌─────────────────────────────────────────┐
│              │◄───────────►│            CloudFront CDN               │
│   Browser    │             └─────────────────────────────────────────┘
│              │                    │                    │
└──────────────┘                    ▼                    ▼
                         ┌──────────────────┐  ┌──────────────────┐
                         │  Classer Frontend │  │   Classer API    │
                         │    (Next.js)      │  │   (FastAPI)      │
                         │    Lambda@Edge    │  │   ECS Fargate    │
                         └────────┬─────────┘  └────────┬─────────┘
                                  │                     │
                                  │                     ▼
                                  │            ┌──────────────────┐
                                  │            │   LLM Gateway    │
                                  │            │   ECS Fargate    │
                                  │            └────────┬─────────┘
                                  │                     │
                                  ▼                     ▼
                         ┌─────────────────────────────────────────┐
                         │              PostgreSQL (RDS)            │
                         │  ┌─────────┐ ┌─────────┐ ┌────────────┐ │
                         │  │ users   │ │api_keys │ │  sessions  │ │
                         │  └─────────┘ └─────────┘ └────────────┘ │
                         └─────────────────────────────────────────┘
```

## Components

### Frontend (Next.js)

- **Runtime:** AWS Lambda@Edge via OpenNext
- **Framework:** Next.js 16 with App Router
- **Auth:** NextAuth.js v5 with database sessions
- **ORM:** Drizzle ORM
- **Styling:** Tailwind CSS

**Responsibilities:**
- User authentication (Google Sign-In)
- API key management UI
- Dashboard and settings pages

### Classer API (FastAPI)

- **Runtime:** AWS ECS Fargate
- **Framework:** FastAPI with asyncpg
- **Load Balancer:** Application Load Balancer + CloudFront

**Responsibilities:**
- Text classification endpoints
- API key validation
- Usage tracking
- Request routing to LLM Gateway

### LLM Gateway

- **Runtime:** AWS ECS Fargate + Vast.ai GPU workers
- **Scaling:** Auto-scales based on queue depth
- **Models:** Claude Sonnet, Claude Haiku

**Responsibilities:**
- AI model inference
- Request queuing
- Model load balancing

### Database (PostgreSQL)

- **Runtime:** AWS RDS PostgreSQL 16
- **Instance:** t4g.micro (dev), t4g.small+ (prod)

**Tables:**
- `users` - User accounts
- `accounts` - OAuth provider links
- `sessions` - Active sessions
- `api_keys` - API keys (hashed)
- `api_key_usage` - Usage tracking

## Data Flow

### Authentication Flow

```
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth
3. Google returns auth code
4. NextAuth exchanges code for tokens
5. User info saved to database
6. Session created, cookie set
7. User redirected to dashboard
```

### API Request Flow

```
1. Client sends request with API key
2. CloudFront terminates SSL, forwards to ALB
3. FastAPI receives request
4. API key validated against database (hash comparison)
5. Request forwarded to LLM Gateway
6. LLM Gateway processes with AI model
7. Response returned to client
8. Usage tracked in database
```

### API Key Lifecycle

```
1. User creates key in dashboard
2. Random key generated: clsr_live_<random>
3. Key shown once to user
4. SHA256 hash stored in database
5. User makes API calls with key
6. On each call: hash key, compare to stored hash
7. User revokes key → is_active = false
```

## Security

### API Key Security

- Keys are never stored in plain text
- SHA256 hashing for storage
- Only key prefix shown in UI (`clsr_live_abc...`)
- Keys validated via hash comparison

### Session Security

- Database sessions (not JWT)
- HTTP-only cookies
- 30-day expiration
- Sessions encrypted with AUTH_SECRET

### Network Security

- All traffic over HTTPS
- Database in private VPC subnet
- Security groups restrict access
- CloudFront for DDoS protection

## Scaling

### Frontend

- Lambda auto-scales with traffic
- CloudFront caches static assets
- Database connection pooling

### API

- ECS auto-scaling based on CPU/memory
- ALB distributes traffic
- Async database operations

### LLM Gateway

- Vast.ai workers scale based on queue
- MIN_WORKERS: 0 (dev), 1 (prod)
- GPU auto-provisioning

## Monitoring

### Logs

- CloudWatch Logs for all services
- Structured JSON logging
- Log retention: 30 days

### Metrics

- CloudWatch Metrics
- Custom metrics for API usage
- Alerts for errors and latency

### Tracing

- AWS X-Ray (optional)
- Request ID propagation
