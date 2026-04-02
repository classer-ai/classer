# [classer](https://classer.ai)

AI text classification API. No training, no prompt engineering - just pass text and labels.

**From $0.08/1M tokens** · **Real-time latency** · **Beats GPT-5.4 mini accuracy** · **Zero training required**

See [benchmarks](https://classer.ai/benchmarks).

[Website](https://classer.ai) · [Docs](https://docs.classer.ai) · [Dashboard](https://classer.ai/dashboard)

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
    threshold=0.5
)
for t in result.labels:
    print(f"{t.label}: {t.confidence}")
# technology: 0.92
# finance: 0.78
```

## Configuration

No API key is needed to get started. To unlock higher rate limits, get an API key from [classer.ai/api-keys](https://classer.ai/api-keys).

```bash
export CLASSER_API_KEY=your-api-key
```

Or configure programmatically:

```python
from classer import ClasserClient

client = ClasserClient(
    api_key="your-api-key"
)
```

## API Reference

### `classify(text, labels, ...)`

Classify text into exactly one of the provided labels.

```python
result = classer.classify(
    text="Text to classify",
    labels=["label1", "label2"],  # 1-200 possible labels
    descriptions={"label1": "Description for better accuracy"},
    priority="standard",   # "standard" (default, <1s) or "fast" (<200ms)
    cache=True,            # set to False to bypass cache
    image=None,            # image URL or base64 string (or list)
    file=None,             # PDF/DOCX — local path, URL, or base64 string
)

result.label          # selected label
result.confidence     # 0-1 confidence score
result.tokens         # total tokens used
result.visual_tokens  # image tokens (when image or file provided)
result.latency_ms     # processing time in ms
result.cached         # whether served from cache
```

### `tag(text, labels, ...)`

Multi-label tagging — returns all labels above a confidence threshold.

```python
result = classer.tag(
    text="Text to tag",
    labels=["label1", "label2"],
    threshold=0.5,         # default: 0.5
    priority="standard",
    image=None,            # image URL or base64 string (or list)
    file=None,             # PDF/DOCX — local path, URL, or base64 string
)

for t in result.labels:
    print(f"{t.label}: {t.confidence}")
```

### `classify_batch(texts, labels, ...)`

Classify multiple texts in a single request.

```python
result = classer.classify_batch(
    texts=["I can't log in", "What's the pricing?"],
    labels=["billing", "technical", "sales"],
    file=None,             # shared file for all texts
    image=None,            # shared image for all texts
)

for r in result.results:
    print(f"{r.label}: {r.confidence}")

result.total_tokens    # total across all texts
result.latency_ms      # total request time
```

### `tag_batch(texts, labels, ...)`

Tag multiple texts in a single request.

```python
result = classer.tag_batch(
    texts=["Tech stocks surge", "Election results"],
    labels=["politics", "technology", "finance"],
    threshold=0.5,
)

for r in result.results:
    for t in r.labels:
        print(f"{t.label}: {t.confidence}")
```

### Image and file inputs

```python
result = classer.classify(
    image=base64_string,
    labels=["cat", "dog", "bird"]
)

result = classer.classify(
    file="invoice.pdf",
    labels=["invoice", "receipt", "contract"]
)
```

`image` accepts a base64 string, URL, or a list of either. `file` accepts a local path, base64 string, or URL. Both work with `classify`, `tag`, and batch methods.

## Error Handling

```python
from classer import ClasserError

try:
    result = classer.classify(text="hello", labels=["a", "b"])
except ClasserError as e:
    print(e.status)  # HTTP status code
    print(e.detail)  # Error detail from API
```

## Documentation

Full API reference and guides at [docs.classer.ai](https://docs.classer.ai).

## GitHub

[github.com/classer-ai/classer-python](https://github.com/classer-ai/classer-python)

## License

MIT
