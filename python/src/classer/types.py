"""Type definitions for the Classer SDK."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ClassifyResponse:
    """Response from single-label classification."""

    label: Optional[str] = None
    confidence: Optional[float] = None
    tokens: int = 0
    latency_ms: float = 0.0
    cached: bool = False


@dataclass
class TagLabel:
    """Single label with confidence in a tag response."""

    label: str
    confidence: float


@dataclass
class TagResponse:
    """Response from multi-label tagging."""

    labels: list[TagLabel] = field(default_factory=list)
    tokens: int = 0
    latency_ms: float = 0.0
    cached: bool = False
