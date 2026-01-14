# API Reference

## Base URL

| Environment | URL |
|-------------|-----|
| Production | https://api.classer.ai |
| Development | https://dev-api.classer.ai |
| Local | http://localhost:8000 |

## Authentication

All API requests require an API key in the Authorization header:

```
Authorization: Bearer clsr_live_your_api_key_here
```

Get your API key from the [dashboard](https://classer.ai/api-keys).

## Endpoints

### Classify Text

Classify text into one of the provided categories.

**POST** `/v1/classify`

#### Request

```json
{
  "text": "I absolutely love this product! Best purchase ever.",
  "categories": ["positive", "negative", "neutral"],
  "model": "claude-sonnet"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Text to classify |
| `categories` | string[] | Yes | List of possible categories |
| `model` | string | No | Model to use (default: claude-sonnet) |

#### Response

```json
{
  "category": "positive",
  "confidence": 0.95,
  "reasoning": "The text contains strongly positive language...",
  "usage": {
    "input_tokens": 45,
    "output_tokens": 12,
    "total_tokens": 57
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | Selected category |
| `confidence` | number | Confidence score (0-1) |
| `reasoning` | string | Explanation for classification |
| `usage` | object | Token usage for billing |

#### Example

```bash
curl -X POST https://api.classer.ai/v1/classify \
  -H "Authorization: Bearer clsr_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The service was terrible and the food was cold.",
    "categories": ["positive", "negative", "neutral"]
  }'
```

### Health Check

Check API health status.

**GET** `/health`

#### Response

```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

## Error Responses

### 401 Unauthorized

```json
{
  "detail": "Invalid API key"
}
```

Causes:
- Missing Authorization header
- Invalid API key format
- API key not found
- API key revoked or expired

### 400 Bad Request

```json
{
  "detail": "Text is required"
}
```

Causes:
- Missing required fields
- Invalid field values

### 500 Internal Server Error

```json
{
  "detail": "Classification failed"
}
```

Causes:
- AI model error
- Internal processing error

## Rate Limits

| Plan | Requests/minute | Requests/day |
|------|-----------------|--------------|
| Free | 10 | 100 |
| Pro | 100 | 10,000 |
| Enterprise | Unlimited | Unlimited |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## SDKs

### TypeScript/JavaScript

```bash
npm install classer-ai
```

```typescript
import { ClasserClient } from 'classer-ai';

const classer = new ClasserClient({
  apiKey: 'clsr_live_...'
});

const result = await classer.classify({
  text: 'Great product!',
  categories: ['positive', 'negative', 'neutral']
});

console.log(result.category); // "positive"
```

### Python

```bash
pip install classer-ai
```

```python
from classer import ClasserClient

client = ClasserClient(api_key="clsr_live_...")

result = client.classify(
    text="Great product!",
    categories=["positive", "negative", "neutral"]
)

print(result.category)  # "positive"
```

## Webhooks (Coming Soon)

Configure webhooks to receive classification results asynchronously.

## Changelog

### v1.0.0 (2025-01-14)
- Initial release
- Text classification endpoint
- API key authentication
- Usage tracking
