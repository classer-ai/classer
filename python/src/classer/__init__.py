"""Classer SDK - Low-cost, fast AI classification API."""

from typing import Optional

from .client import ClasserClient
from .exceptions import ClasserError
from .types import (
    BatchClassifyResponse,
    BatchClassifyResult,
    BatchTagResponse,
    BatchTagResult,
    ClassifyResponse,
    TagLabel,
    TagResponse,
)

__all__ = [
    "ClasserClient",
    "ClasserError",
    "BatchClassifyResponse",
    "BatchClassifyResult",
    "BatchTagResponse",
    "BatchTagResult",
    "ClassifyResponse",
    "TagLabel",
    "TagResponse",
    "classify",
    "classify_batch",
    "tag",
    "tag_batch",
]

# Default client instance
_default_client: ClasserClient | None = None


def _get_default_client() -> ClasserClient:
    global _default_client
    if _default_client is None:
        _default_client = ClasserClient()
    return _default_client


def classify(
    text: str = "",
    labels: Optional[list[str]] = None,
    classifier: Optional[str] = None,
    descriptions: Optional[dict[str, str]] = None,
    priority: Optional[str] = None,
    cache: Optional[bool] = None,
    image: Optional[str | list[str]] = None,
    file: Optional[str] = None,
) -> ClassifyResponse:
    """Classify text into one of the provided labels (single-label).

    See ClasserClient.classify for full parameter documentation.
    """
    return _get_default_client().classify(
        text, labels=labels, classifier=classifier,
        descriptions=descriptions, priority=priority, cache=cache,
        image=image, file=file,
    )


def classify_batch(
    texts: list[str],
    labels: Optional[list[str]] = None,
    classifier: Optional[str] = None,
    descriptions: Optional[dict[str, str]] = None,
    cache: Optional[bool] = None,
    image: Optional[str | list[str]] = None,
    file: Optional[str] = None,
) -> BatchClassifyResponse:
    """Classify multiple texts in a single request (single-label).

    See ClasserClient.classify_batch for full parameter documentation.
    """
    return _get_default_client().classify_batch(
        texts, labels=labels, classifier=classifier,
        descriptions=descriptions, cache=cache,
        image=image, file=file,
    )


def tag(
    text: str = "",
    labels: Optional[list[str]] = None,
    classifier: Optional[str] = None,
    descriptions: Optional[dict[str, str]] = None,
    threshold: Optional[float] = None,
    priority: Optional[str] = None,
    cache: Optional[bool] = None,
    image: Optional[str | list[str]] = None,
    file: Optional[str] = None,
) -> TagResponse:
    """Tag text with multiple labels (multi-label).

    See ClasserClient.tag for full parameter documentation.
    """
    return _get_default_client().tag(
        text, labels=labels, classifier=classifier,
        descriptions=descriptions, threshold=threshold,
        priority=priority, cache=cache,
        image=image, file=file,
    )


def tag_batch(
    texts: list[str],
    labels: Optional[list[str]] = None,
    classifier: Optional[str] = None,
    descriptions: Optional[dict[str, str]] = None,
    threshold: Optional[float] = None,
    cache: Optional[bool] = None,
    image: Optional[str | list[str]] = None,
    file: Optional[str] = None,
) -> BatchTagResponse:
    """Tag multiple texts in a single request (multi-label).

    See ClasserClient.tag_batch for full parameter documentation.
    """
    return _get_default_client().tag_batch(
        texts, labels=labels, classifier=classifier,
        descriptions=descriptions, threshold=threshold,
        cache=cache, image=image, file=file,
    )
