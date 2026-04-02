# [classer-ai](https://classer.ai)

AI text classification API. No training, no prompt engineering - just pass text and labels.

**From $0.08/1M tokens** · **Real-time latency** · **Beats GPT-5.4 mini accuracy** · **Zero training required**

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
  text: "Text to classify",
  labels: ["label1", "label2"],   // 1-200 possible labels
  descriptions: { label1: "Description for better accuracy" },
  priority: "standard",           // "standard" (default, <1s) or "fast" (<200ms)
  cache: true,                    // set to false to bypass cache
  image: undefined,               // image URL or base64 string (or array)
  file: undefined,                // PDF/DOCX — URL or base64 string
});

result.label          // selected label
result.confidence     // 0-1 confidence score
result.tokens         // total tokens used
result.visual_tokens  // image tokens (when image or file provided)
result.latency_ms     // processing time in ms
result.cached         // whether served from cache
```

### `tag(request)`

Multi-label tagging — returns all labels above a confidence threshold.

```typescript
const result = await tag({
  text: "Text to tag",
  labels: ["label1", "label2"],
  threshold: 0.5,                 // default: 0.5
  priority: "standard",
  image: undefined,               // image URL or base64 string (or array)
  file: undefined,                // PDF/DOCX — URL or base64 string
});

for (const t of result.labels) {
  console.log(`${t.label}: ${t.confidence}`);
}
```

### `classifyBatch(request)`

Classify multiple texts in a single request.

```typescript
const result = await classifyBatch({
  texts: ["I can't log in", "What's the pricing?"],
  labels: ["billing", "technical", "sales"],
  file: undefined,                // shared file for all texts
  image: undefined,               // shared image for all texts
});

for (const r of result.results) {
  console.log(`${r.label}: ${r.confidence}`);
}

result.total_tokens    // total across all texts
result.latency_ms      // total request time
```

### `tagBatch(request)`

Tag multiple texts in a single request.

```typescript
const result = await tagBatch({
  texts: ["Tech stocks surge", "Election results"],
  labels: ["politics", "technology", "finance"],
  threshold: 0.5,
});

for (const r of result.results) {
  for (const t of r.labels ?? []) {
    console.log(`${t.label}: ${t.confidence}`);
  }
}
```

### Image and file inputs

```typescript
const result = await classify({
  image: base64String,
  labels: ["cat", "dog", "bird"]
});

const result = await classify({
  file: base64String,
  labels: ["invoice", "receipt", "contract"]
});
```

`image` accepts a base64 string, URL, or an array of either. `file` accepts a base64 string or URL. Both work with `classify`, `tag`, and batch methods.

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
