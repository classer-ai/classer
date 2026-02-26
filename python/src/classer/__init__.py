"""Classer SDK - Low-cost, fast AI classification API."""

from typing import Optional

from .client import ClasserClient
from .exceptions import ClasserError
from .types import (
    ClassifyResponse,
    TagLabel,
    TagResponse,
)

__all__ = [
    "ClasserClient",
    "ClasserError",
    "ClassifyResponse",
    "TagLabel",
    "TagResponse",
    "classify",
    "tag",
]

# Default client instance
_default_client: ClasserClient | None = None


def _get_default_client() -> ClasserClient:
    global _default_client
    if _default_client is None:
        _default_client = ClasserClient()
    return _default_client


def classify(
    text: str,
    labels: Optional[list[str]] = None,
    classifier: Optional[str] = None,
    descriptions: Optional[dict[str, str]] = None,
    model: Optional[str] = None,
) -> ClassifyResponse:
    """Classify text into one of the provided labels (single-label)."""
    return _get_default_client().classify(text, labels, classifier, descriptions, model)


def tag(
    text: str,
    labels: Optional[list[str]] = None,
    classifier: Optional[str] = None,
    descriptions: Optional[dict[str, str]] = None,
    model: Optional[str] = None,
    threshold: Optional[float] = None,
) -> TagResponse:
    """Tag text with multiple labels (multi-label)."""
    return _get_default_client().tag(text, labels, classifier, descriptions, model, threshold)
