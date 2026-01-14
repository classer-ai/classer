"""Classer SDK - Low-cost, fast AI classification API."""

from .client import ClasserClient
from .exceptions import ClasserError
from .types import (
    ClassifyResponse,
    MatchResponse,
    ScoreResponse,
    TagResponse,
    Usage,
)

__all__ = [
    "ClasserClient",
    "ClasserError",
    "ClassifyResponse",
    "TagResponse",
    "MatchResponse",
    "ScoreResponse",
    "Usage",
]

# Default client instance
_default_client: ClasserClient | None = None


def _get_default_client() -> ClasserClient:
    global _default_client
    if _default_client is None:
        _default_client = ClasserClient()
    return _default_client


def classify(
    source: str,
    labels: list[str],
    descriptions: dict[str, str] | None = None,
    model: str | None = None,
) -> ClassifyResponse:
    """Classify text into one of the provided labels."""
    return _get_default_client().classify(source, labels, descriptions, model)


def tag(
    source: str,
    labels: list[str],
    descriptions: dict[str, str] | None = None,
    threshold: float | None = None,
    model: str | None = None,
) -> TagResponse:
    """Tag text with multiple labels above a confidence threshold."""
    return _get_default_client().tag(source, labels, descriptions, threshold, model)


def match(
    source: str,
    query: str,
    model: str | None = None,
) -> MatchResponse:
    """Calculate semantic similarity between source and query."""
    return _get_default_client().match(source, query, model)


def score(
    source: str,
    attribute: str,
    description: str | None = None,
    model: str | None = None,
) -> ScoreResponse:
    """Score text on a specific attribute (0-1 scale)."""
    return _get_default_client().score(source, attribute, description, model)
