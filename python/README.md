# classer

Low-cost, fast AI classification API. 10x cheaper than GPT, <200ms latency.

## Installation

```bash
pip install classer
```

## Quick Start

```python
import classer

# Single-label classification
result = classer.classify(
    text="I can't log in and need a password reset.",
    labels=["billing", "technical_support", "sales", "spam"]
)
print(result.label)      # "technical_support"
print(result.confidence) # 0.94

# With descriptions for better accuracy
lead = classer.classify(
    text="We need a solution for 500 users, what's your enterprise pricing?",
    labels=["hot", "warm", "cold"],
    descriptions={
        "hot": "Ready to buy, asking for pricing or demo",
        "warm": "Interested but exploring options",
        "cold": "Just browsing, no clear intent"
    }
)
print(lead.label)  # "hot"

# Multi-label tagging
result = classer.tag(
    text="Breaking: Tech stocks surge amid AI boom",
    labels=["politics", "technology", "finance", "sports"],
    threshold=0.3
)
for t in result.labels:
    print(f"{t.label}: {t.confidence}")
# technology: 0.92
# finance: 0.78
```

## Configuration

```bash
export CLASSER_API_KEY=your-api-key
```

Or configure programmatically:

```python
from classer import ClasserClient

client = ClasserClient(
    api_key="your-api-key",
    base_url="https://api.classer.ai"  # optional
)
```

## API Reference

### `classify(text, labels=None, classifier=None, descriptions=None, model=None)`

Classify text into exactly one of the provided labels.

```python
result = classer.classify(
    text="Text to classify",
    labels=["label1", "label2"],  # 1-100 possible labels
    descriptions={"label1": "Description for better accuracy"},
    model="qwen"
)

result.label        # Selected label
result.confidence   # 0-1 confidence score
result.tokens       # Total tokens used
result.latency_ms   # Processing time in ms
result.cached       # Whether served from cache
```

### `tag(text, labels=None, classifier=None, descriptions=None, model=None, threshold=None)`

Multi-label tagging — returns all labels above a confidence threshold.

```python
result = classer.tag(
    text="Text to tag",
    labels=["label1", "label2"],  # 1-100 possible labels
    descriptions={"label1": "Description"},
    threshold=0.3  # Default: 0.3
)

for t in result.labels:
    print(f"{t.label}: {t.confidence}")

result.tokens       # Total tokens used
result.latency_ms   # Processing time in ms
result.cached       # Whether served from cache
```

## License

MIT
