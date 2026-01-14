"""Type definitions for the Classer SDK."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Usage:
    """Token usage information."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass
class ClassifyResponse:
    """Response from single-label classification."""

    label: str
    confidence: float
    latency_ms: float
    usage: Optional[Usage] = None


@dataclass
class TagResponse:
    """Response from multi-label classification."""

    tags: list[str]
    confidences: list[float]
    latency_ms: float
    usage: Optional[Usage] = None


@dataclass
class MatchResponse:
    """Response from semantic similarity scoring."""

    score: float
    latency_ms: float
    usage: Optional[Usage] = None


@dataclass
class ScoreResponse:
    """Response from attribute scoring."""

    score: float
    latency_ms: float
    usage: Optional[Usage] = None
