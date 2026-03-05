# classer-ai

Low-cost, fast AI classification API. 10x cheaper than GPT, <200ms latency.

## Installation

```bash
npm install classer-ai
```

## Quick Start

```typescript
import { classify, tag } from "classer-ai";

// Set your API key
process.env.CLASSER_API_KEY = "your-api-key";

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
  threshold: 0.3
});
for (const t of tagged.labels) {
  console.log(`${t.label}: ${t.confidence}`);
}
// technology: 0.92
// finance: 0.78
```

## Configuration

```bash
export CLASSER_API_KEY=your-api-key
```

Or configure programmatically:

```typescript
import { ClasserClient } from "classer-ai";

const client = new ClasserClient({
  apiKey: "your-api-key",
  baseUrl: "https://api.classer.ai"  // optional
});
```

## API Reference

### `classify(request)`

Classify text into exactly one of the provided labels.

```typescript
const result = await classify({
  text: string,             // Text to classify
  labels?: string[],        // 1-100 possible labels
  classifier?: string,      // Saved classifier name or "name@vN"
  descriptions?: Record<string, string>,
  model?: string,
  speed?: "fast" | "standard",  // "fast" (default, <200ms) or "standard" (<1s)
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
  labels?: string[],        // 1-100 possible labels
  classifier?: string,      // Saved classifier name or "name@vN"
  descriptions?: Record<string, string>,
  threshold?: number,       // Default: 0.3
  model?: string,
  speed?: "fast" | "standard",  // "fast" (default, <200ms) or "standard" (<1s)
  cache?: boolean           // Set to false to bypass cache. Default: true
});

// Returns TagResponse
result.labels       // Array of { label, confidence }
result.tokens       // Total tokens used
result.latency_ms   // Processing time in ms
result.cached       // Whether served from cache
```

## License

MIT
