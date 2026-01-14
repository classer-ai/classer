# Local Development Setup

## Prerequisites

- Node.js 20+
- Python 3.10+
- Docker
- Google Cloud account (for OAuth)

## 1. Database Setup

### Option A: Docker (recommended)

```bash
docker run -d \
  --name classer-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

### Option B: Use dev stage database

```bash
# Get connection string from SST
cd /path/to/stimy-app/backend
sst shell --stage dev
echo $DATABASE_URL
# Copy the URL for .env.local
```

## 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services > OAuth consent screen**
   - Choose External
   - Fill in app name, support email
   - Add scopes: `email`, `profile`, `openid`
4. Navigate to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Application type: Web application
5. Add authorized origins:
   ```
   http://localhost:3000
   ```
6. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Copy Client ID and Client Secret

## 3. Frontend Setup

```bash
cd classer/frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres

# Auth
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run database migrations:

```bash
npx drizzle-kit push
```

Start the frontend:

```bash
npm run dev
```

Frontend runs at: http://localhost:3000

## 4. API Setup

```bash
cd classer/api

# Create virtual environment (optional)
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variable
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres

# Start API
uvicorn main:app --reload --port 8000
```

API runs at: http://localhost:8000

## 5. Verify Setup

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. After login, go to /api-keys
4. Create an API key
5. Test the API:

```bash
curl -X POST http://localhost:8000/v1/classify \
  -H "Authorization: Bearer clsr_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I love this product!",
    "categories": ["positive", "negative", "neutral"]
  }'
```

## Running Tests

### Frontend tests

```bash
cd classer/frontend
npm test
```

### API tests

```bash
cd classer/api
python -m pytest tests/ -v
```

## Troubleshooting

### Database connection error

- Check PostgreSQL is running: `docker ps`
- Verify DATABASE_URL is correct
- Check port 5432 is not in use

### Google OAuth error

- Verify redirect URI matches exactly
- Check Client ID/Secret are correct
- Ensure OAuth consent screen is configured

### API key not working

- Run database migrations: `npx drizzle-kit push`
- Check API is connected to same database as frontend
