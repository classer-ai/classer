# [classer-ai](https://classer.ai)

AI text classification API. No training, no prompt engineering - just pass text and labels.

**From $0.08/1M tokens** · **<200ms latency** · **Beats GPT-5 mini accuracy** · **Zero training required**

See [benchmarks](https://classer.ai/benchmarks).

[Website](https://classer.ai) · [Docs](https://docs.classer.ai) · [Dashboard](https://classer.ai/dashboard)

## Installation

```bash
npm install classer-ai
```

## Quick Start

```typescript
import { classify, tag } from "classer-ai";

// Single-label classification
const result = await classify({
  text: "I can't log in and need a password reset.",
  labels: ["billing", "technical_support", "sales", "spam"]
});
console.log(result.label);      // "technical_support"
console.log(result.confidence); // 0.94

// With descriptions for better accuracy
const lead = await classify({
  text: "We need a solution for 500 users, what's your enterprise pricing?",
  labels: ["hot", "warm", "cold"],
  descriptions: {
    hot: "Ready to buy, asking for pricing or demo",
    warm: "Interested but exploring options",
    cold: "Just browsing, no clear intent"
  }
});
console.log(lead.label); // "hot"

// Multi-label tagging
const tagged = await tag({
  text: "Breaking: Tech stocks surge amid AI boom",
  labels: ["politics", "technology", "finance", "sports"],
  threshold: 0.5
});
for (const t of tagged.labels) {
  console.log(`${t.label}: ${t.confidence}`);
}
// technology: 0.92
// finance: 0.78
```

## Configuration

No API key is needed to get started. To unlock higher rate limits, get an API key from [classer.ai/api-keys](https://classer.ai/api-keys).

```bash
export CLASSER_API_KEY=your-api-key
```

Or configure programmatically:

```typescript
import { ClasserClient } from "classer-ai";

const client = new ClasserClient({
  apiKey: "your-api-key"
});
```

## API Reference

### `classify(request)`

Classify text into exactly one of the provided labels.

```typescript
const result = await classify({
  text: string,             // Text to classify
  labels?: string[],        // 1-200 possible labels
  classifier?: string,      // Saved classifier name or "name@vN"
  descriptions?: Record<string, string>,
  priority?: "fast" | "standard",  // "standard" (default, <1s) or "fast" (<200ms)
  cache?: boolean           // Set to false to bypass cache. Default: true
});

// Returns ClassifyResponse
result.label        // Selected label
result.confidence   // 0-1 confidence score
result.tokens       // Total tokens used
result.latency_ms   // Processing time in ms
result.cached       // Whether served from cache
```

### `tag(request)`

Multi-label tagging — returns all labels above a confidence threshold.

```typescript
const result = await tag({
  text: string,
  labels?: string[],        // 1-200 possible labels
  classifier?: string,      // Saved classifier name or "name@vN"
  descriptions?: Record<string, string>,
  threshold?: number,       // Default: 0.5
  priority?: "fast" | "standard",  // "standard" (default, <1s) or "fast" (<200ms)
  cache?: boolean           // Set to false to bypass cache. Default: true
});

// Returns TagResponse
result.labels       // Array of { label, confidence }
result.tokens       // Total tokens used
result.latency_ms   // Processing time in ms
result.cached       // Whether served from cache
```

## Error Handling

```typescript
import { ClasserError } from "classer-ai";

try {
  const result = await classify({ text: "hello", labels: ["a", "b"] });
} catch (e) {
  if (e instanceof ClasserError) {
    console.error(e.status);  // HTTP status code
    console.error(e.detail);  // Error detail from API
  }
}
```

## Documentation

Full API reference and guides at [docs.classer.ai](https://docs.classer.ai).

## GitHub

[github.com/classer-ai/classer-js](https://github.com/classer-ai/classer-js)

## License

MIT
