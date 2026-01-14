"""Classer client implementation."""

import os
from typing import Optional

import httpx

from .exceptions import ClasserError
from .types import (
    ClassifyResponse,
    MatchResponse,
    ScoreResponse,
    TagResponse,
    Usage,
)


class ClasserClient:
    """Client for the Classer API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 30.0,
    ):
        """
        Initialize the Classer client.

        Args:
            api_key: API key for authentication. Falls back to CLASSER_API_KEY env var.
            base_url: Base URL for the API. Falls back to CLASSER_BASE_URL env var
                      or https://api.classer.ai.
            timeout: Request timeout in seconds.
        """
        self.api_key = api_key or os.environ.get("CLASSER_API_KEY", "")
        self.base_url = (
            base_url or os.environ.get("CLASSER_BASE_URL") or "https://api.classer.ai"
        )
        self.timeout = timeout

    def _request(self, endpoint: str, body: dict) -> dict:
        """Make a POST request to the API."""
        url = f"{self.base_url}{endpoint}"

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        response = httpx.post(url, json=body, headers=headers, timeout=self.timeout)

        if not response.is_success:
            detail = None
            try:
                error_data = response.json()
                detail = error_data.get("detail")
            except Exception:
                pass
            raise ClasserError(
                f"Request failed with status {response.status_code}",
                status=response.status_code,
                detail=detail,
            )

        return response.json()

    def _parse_usage(self, data: dict) -> Optional[Usage]:
        """Parse usage from response data."""
        if "usage" in data and data["usage"]:
            u = data["usage"]
            return Usage(
                prompt_tokens=u["prompt_tokens"],
                completion_tokens=u["completion_tokens"],
                total_tokens=u["total_tokens"],
            )
        return None

    def classify(
        self,
        source: str,
        labels: list[str],
        descriptions: Optional[dict[str, str]] = None,
        model: Optional[str] = None,
    ) -> ClassifyResponse:
        """
        Classify text into one of the provided labels.

        Args:
            source: Text to classify.
            labels: List of possible labels (1-26).
            descriptions: Maps label name to description for better accuracy.
            model: Model override.

        Returns:
            ClassifyResponse with label, confidence, and latency_ms.

        Example:
            >>> result = classer.classify(
            ...     source="I can't log in",
            ...     labels=["billing", "technical_support", "sales"]
            ... )
            >>> print(result.label)  # "technical_support"
        """
        body: dict = {"source": source, "labels": labels}
        if descriptions:
            body["descriptions"] = descriptions
        if model:
            body["model"] = model

        data = self._request("/v1/classify", body)
        return ClassifyResponse(
            label=data["label"],
            confidence=data["confidence"],
            latency_ms=data["latency_ms"],
            usage=self._parse_usage(data),
        )

    def tag(
        self,
        source: str,
        labels: list[str],
        descriptions: Optional[dict[str, str]] = None,
        threshold: Optional[float] = None,
        model: Optional[str] = None,
    ) -> TagResponse:
        """
        Tag text with multiple labels above a confidence threshold.

        Args:
            source: Text to tag.
            labels: List of possible labels (2-26).
            descriptions: Maps label name to description for better accuracy.
            threshold: Minimum confidence threshold (0-1). Default: 0.3.
            model: Model override.

        Returns:
            TagResponse with tags, confidences, and latency_ms.

        Example:
            >>> result = classer.tag(
            ...     source="Breaking: Tech stocks surge amid AI boom",
            ...     labels=["politics", "technology", "finance", "sports"],
            ...     threshold=0.3
            ... )
            >>> print(result.tags)  # ["technology", "finance"]
        """
        body: dict = {"source": source, "labels": labels}
        if descriptions:
            body["descriptions"] = descriptions
        if threshold is not None:
            body["threshold"] = threshold
        if model:
            body["model"] = model

        data = self._request("/v1/tag", body)
        return TagResponse(
            tags=data["tags"],
            confidences=data["confidences"],
            latency_ms=data["latency_ms"],
            usage=self._parse_usage(data),
        )

    def match(
        self,
        source: str,
        query: str,
        model: Optional[str] = None,
    ) -> MatchResponse:
        """
        Calculate semantic similarity between source and query (for RAG retrieval).

        Args:
            source: Source document text.
            query: Query to match against.
            model: Model override.

        Returns:
            MatchResponse with score and latency_ms.

        Example:
            >>> result = classer.match(
            ...     source="Our return policy allows refunds within 30 days.",
            ...     query="Can I get a refund?"
            ... )
            >>> print(result.score)  # 0.95
        """
        body: dict = {"source": source, "query": query}
        if model:
            body["model"] = model

        data = self._request("/v1/match", body)
        return MatchResponse(
            score=data["score"],
            latency_ms=data["latency_ms"],
            usage=self._parse_usage(data),
        )

    def score(
        self,
        source: str,
        attribute: str,
        description: Optional[str] = None,
        model: Optional[str] = None,
    ) -> ScoreResponse:
        """
        Score text on a specific attribute (0-1 scale).

        Args:
            source: Text to score.
            attribute: Attribute to score.
            description: Description of the attribute for better accuracy.
            model: Model override.

        Returns:
            ScoreResponse with score and latency_ms.

        Example:
            >>> result = classer.score(
            ...     source="This is URGENT! We need help immediately!",
            ...     attribute="urgency"
            ... )
            >>> print(result.score)  # 0.92
        """
        body: dict = {"source": source, "attribute": attribute}
        if description:
            body["description"] = description
        if model:
            body["model"] = model

        data = self._request("/v1/score", body)
        return ScoreResponse(
            score=data["score"],
            latency_ms=data["latency_ms"],
            usage=self._parse_usage(data),
        )
