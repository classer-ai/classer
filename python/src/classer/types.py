"""Type definitions for the Classer SDK."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ClassifyResponse:
    """Response from single-label classification."""

    label: Optional[str] = None
    confidence: Optional[float] = None
    tokens: int = 0
    visual_tokens: int = 0
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
    visual_tokens: int = 0
    latency_ms: float = 0.0
    cached: bool = False


@dataclass
class BatchClassifyResult:
    """Single result item in a batch classify response."""

    label: Optional[str] = None
    confidence: Optional[float] = None
    tokens: int = 0
    visual_tokens: int = 0
    error: Optional[str] = None
    cached: bool = False


@dataclass
class BatchClassifyResponse:
    """Response from batch single-label classification."""

    results: list[BatchClassifyResult] = field(default_factory=list)
    total_tokens: int = 0
    latency_ms: float = 0.0


@dataclass
class BatchTagResult:
    """Single result item in a batch tag response."""

    labels: list[TagLabel] = field(default_factory=list)
    tokens: int = 0
    visual_tokens: int = 0
    error: Optional[str] = None
    cached: bool = False


@dataclass
class BatchTagResponse:
    """Response from batch multi-label tagging."""

    results: list[BatchTagResult] = field(default_factory=list)
    total_tokens: int = 0
    latency_ms: float = 0.0
