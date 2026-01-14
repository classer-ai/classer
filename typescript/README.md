# classer-ai

Low-cost, fast AI classification API. 10x cheaper than GPT, <200ms latency.

## Installation

```bash
npm install classer-ai
```

## Quick Start

```typescript
import { classify, tag, match, score } from "classer-ai";

// Set your API key
process.env.CLASSER_API_KEY = "your-api-key";

// Classify text into categories
const result = await classify({
  source: "I can't log in and need a password reset.",
  labels: ["billing", "technical_support", "sales", "spam"]
});
console.log(result.label);      // "technical_support"
console.log(result.confidence); // 0.94

// With descriptions for better accuracy
const lead = await classify({
  source: "We need a solution for 500 users, what's your enterprise pricing?",
  labels: ["hot", "warm", "cold"],
  descriptions: {
    "hot": "Ready to buy, asking for pricing or demo",
    "warm": "Interested but exploring options",
    "cold": "Just browsing, no clear intent"
  }
});
console.log(lead.label); // "hot"

// Multi-label tagging
const tags = await tag({
  source: "Breaking: Tech stocks surge amid AI boom",
  labels: ["politics", "technology", "finance", "sports"],
  threshold: 0.3
});
console.log(tags.tags); // ["technology", "finance"]

// RAG retrieval scoring
const relevance = await match({
  source: "Our return policy allows refunds within 30 days.",
  query: "Can I get a refund?"
});
console.log(relevance.score); // 0.98

// Attribute scoring
const urgency = await score({
  source: "This is URGENT! We need help immediately!",
  attribute: "urgency"
});
console.log(urgency.score); // 0.92
```

## Configuration

```bash
export CLASSER_API_KEY=your-api-key
```

## API Reference

### `classify(request)`

Classify text into exactly one of the provided labels.

```typescript
const result = await classify({
  source: string,           // Text to classify
  labels: string[],         // 1-26 possible labels
  descriptions?: Record<string, string>,  // Maps label name to description for better accuracy
  model?: string            // Optional model override
});

// Returns
{
  label: string,       // Selected label
  confidence: number,  // 0-1 confidence score
  latency_ms: number   // Processing time
}
```

### `tag(request)`

Multi-label classification - returns all labels above threshold.

```typescript
const result = await tag({
  source: string,
  labels: string[],
  descriptions?: Record<string, string>,
  threshold?: number,  // Default: 0.3
  model?: string
});

// Returns
{
  tags: string[],         // Labels above threshold
  confidences: number[],  // Confidence for each tag
  latency_ms: number
}
```

### `match(request)`

Semantic similarity for RAG retrieval.

```typescript
const result = await match({
  source: string,  // Document text
  query: string,   // Search query
  model?: string
});

// Returns
{
  score: number,     // 0-1 relevance score
  latency_ms: number
}
```

### `score(request)`

Score text on a specific attribute.

```typescript
const result = await score({
  source: string,
  attribute: string,      // e.g., "urgency", "toxicity", "quality"
  description?: string,   // Optional attribute description
  model?: string
});

// Returns
{
  score: number,     // 0-1 score
  latency_ms: number
}
```

## License

MIT
