# classer

Low-cost, fast AI classification API. 10x cheaper than GPT, <200ms latency.

## Installation

```bash
pip install classer
```

## Quick Start

```python
from classer import classify, tag, match, score

# Classify text into categories
result = classify(
    source="I can't log in and need a password reset.",
    labels=["billing", "technical_support", "sales", "spam"]
)
print(result.label)      # "technical_support"
print(result.confidence) # 0.94

# With descriptions for better accuracy
lead = classify(
    source="We need a solution for 500 users, what's your enterprise pricing?",
    labels=["hot", "warm", "cold"],
    descriptions={
        "hot": "Ready to buy, asking for pricing or demo",
        "warm": "Interested but exploring options",
        "cold": "Just browsing, no clear intent"
    }
)
print(lead.label)  # "hot"

# Multi-label tagging
result = tag(
    source="Breaking: Tech stocks surge amid AI boom",
    labels=["politics", "technology", "finance", "sports"],
    threshold=0.3
)
print(result.tags)  # ["technology", "finance"]

# RAG retrieval scoring
relevance = match(
    source="Our return policy allows refunds within 30 days.",
    query="Can I get a refund?"
)
print(relevance.score)  # 0.98

# Attribute scoring
urgency = score(
    source="This is URGENT! We need help immediately!",
    attribute="urgency"
)
print(urgency.score)  # 0.92
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

result = client.classify(
    source="Hello",
    labels=["greeting", "question"]
)
```

## API Reference

### `classify(source, labels, descriptions=None, model=None)`

Classify text into exactly one of the provided labels.

```python
result = classify(
    source="Text to classify",
    labels=["label1", "label2"],  # 1-26 possible labels
    descriptions={"label1": "Description for better accuracy"},
    model="optional-model-override"
)

# Returns ClassifyResponse
result.label        # Selected label
result.confidence   # 0-1 confidence score
result.latency_ms   # Processing time
result.usage        # Optional token usage
```

### `tag(source, labels, descriptions=None, threshold=None, model=None)`

Multi-label classification - returns all labels above threshold.

```python
result = tag(
    source="Text to tag",
    labels=["label1", "label2"],
    descriptions={"label1": "Description"},
    threshold=0.3,  # Default: 0.3
    model=None
)

# Returns TagResponse
result.tags         # Labels above threshold
result.confidences  # Confidence for each tag
result.latency_ms   # Processing time
result.usage        # Optional token usage
```

### `match(source, query, model=None)`

Semantic similarity for RAG retrieval.

```python
result = match(
    source="Document text",
    query="Search query",
    model=None
)

# Returns MatchResponse
result.score        # 0-1 relevance score
result.latency_ms   # Processing time
result.usage        # Optional token usage
```

### `score(source, attribute, description=None, model=None)`

Score text on a specific attribute.

```python
result = score(
    source="Text to score",
    attribute="urgency",  # e.g., "urgency", "toxicity", "quality"
    description="Optional attribute description",
    model=None
)

# Returns ScoreResponse
result.score        # 0-1 score
result.latency_ms   # Processing time
result.usage        # Optional token usage
```

## License

MIT
