# Classer

AI text classification API. No training, no prompt engineering - just pass text and labels.

**From $0.08/1M tokens** · **<200ms latency** · **Beats GPT-5 mini accuracy** · **Zero training required**

See [benchmarks](https://classer.ai/benchmarks).

[Website](https://classer.ai) · [Docs](https://docs.classer.ai) · [Dashboard](https://classer.ai/dashboard)

## Quick Start

```bash
pip install classer     # Python
npm install classer-ai  # TypeScript
```

```python
import classer

result = classer.classify(
    text="I can't log in to my account",
    labels=["billing", "technical", "sales"]
)

print(result.label)      # "technical"
print(result.confidence) # 0.94
```

```typescript
import { classify } from "classer-ai";

const result = await classify({
  text: "I can't log in to my account",
  labels: ["billing", "technical", "sales"]
});

console.log(result.label);      // "technical"
console.log(result.confidence); // 0.94
```

No API key needed to get started. For higher rate limits, get a free key at [classer.ai/api-keys](https://classer.ai/api-keys).

## Features

**Classify** - single-label classification, pick the one best label:

```python
result = classer.classify(
    text="We need pricing for 500 users",
    labels=["hot", "warm", "cold"],
    descriptions={
        "hot": "Ready to buy, asking for pricing or demo",
        "warm": "Interested but exploring options",
        "cold": "Just browsing, no clear intent"
    }
)
# result.label = "hot"
```

**Tag** - multi-label tagging, return all labels above a threshold:

```python
result = classer.tag(
    text="Breaking: Tech stocks surge amid AI boom",
    labels=["politics", "technology", "finance", "sports"],
    threshold=0.5
)
for t in result.labels:
    print(f"{t.label}: {t.confidence}")
# technology: 0.92
# finance: 0.78
```

**Fast Batch** - process millions of texts at $0.08/1M tokens:

```bash
# 1. Create a batch job
curl -X POST https://api.classer.ai/v1/batch \
  -H "Authorization: Bearer $CLASSER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"labels": ["billing", "technical", "sales"], "mode": "single"}'

# 2. Upload your NDJSON file (one {"text": "..."} per line)
curl -X POST "$UPLOAD_URL" -F "key=$INPUT_KEY" -F "file=@input.ndjson"

# 3. Start processing
curl -X POST "https://api.classer.ai/v1/batch/$JOB_ID/start" \
  -H "Authorization: Bearer $CLASSER_API_KEY"

# 4. Poll until completed, then download results
curl "https://api.classer.ai/v1/batch/$JOB_ID/results" \
  -H "Authorization: Bearer $CLASSER_API_KEY"
```

Up to 5GB per file. See the [Fast Batch docs](https://docs.classer.ai/api-reference/batch) for the full workflow.

## Speed Tiers

| Speed | Price / 1M tokens | Latency |
|-------|-------------------|---------|
| **Fast** | $0.60 | <200ms P95 |
| **Standard** | $0.20 | <1s P95 |
| **Fast Batch** | $0.08 | <15min P95 |

Every account gets **10M free tokens/month** - no credit card required.

## SDKs

| SDK | Install | Source |
|-----|---------|--------|
| Python | `pip install classer` | [./python](./python) |
| TypeScript | `npm install classer-ai` | [./typescript](./typescript) |

## Use Cases

- **Support ticket routing** - route to billing, technical, or sales
- **Lead scoring** - classify inbound leads as hot, warm, or cold
- **Content moderation** - detect spam, toxicity, or inappropriate content
- **Document tagging** - auto-tag articles with multiple categories

## Error Handling

```python
from classer import ClasserClient, ClasserError

client = ClasserClient(api_key="your-key")

try:
    result = client.classify(text="Hello", labels=["greeting", "question"])
except ClasserError as e:
    print(e.status)  # HTTP status code
    print(e.detail)  # Error detail from API
```

## Links

- [Documentation](https://docs.classer.ai)
- [API Reference](https://docs.classer.ai/api-reference/overview)
- [Python SDK Reference](https://docs.classer.ai/sdks/python)
- [TypeScript SDK Reference](https://docs.classer.ai/sdks/typescript)
- [Pricing](https://docs.classer.ai/pricing)

## License

MIT
