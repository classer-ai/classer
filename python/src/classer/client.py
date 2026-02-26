"""Classer client implementation."""

import os
from typing import Optional

import httpx

from .exceptions import ClasserError
from .types import (
    ClassifyResponse,
    TagLabel,
    TagResponse,
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
            base_url: Base URL for the API. Defaults to https://api.classer.ai.
            timeout: Request timeout in seconds.
        """
        self.api_key = api_key or os.environ.get("CLASSER_API_KEY", "")
        self.base_url = base_url or "https://api.classer.ai"
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

    def classify(
        self,
        text: str,
        labels: Optional[list[str]] = None,
        classifier: Optional[str] = None,
        descriptions: Optional[dict[str, str]] = None,
        model: Optional[str] = None,
    ) -> ClassifyResponse:
        """
        Classify text into one of the provided labels (single-label).

        Args:
            text: Text to classify.
            labels: List of possible labels (1-100).
            classifier: Saved classifier name or "name@vN" reference.
            descriptions: Maps label name to description for better accuracy.
            model: Model override.

        Returns:
            ClassifyResponse with label and confidence.

        Example:
            >>> result = classer.classify(
            ...     text="I can't log in",
            ...     labels=["billing", "technical_support", "sales"]
            ... )
            >>> print(result.label)  # "technical_support"
        """
        body: dict = {"text": text}
        if classifier:
            body["classifier"] = classifier
        if labels:
            body["labels"] = labels
        if descriptions:
            body["descriptions"] = descriptions
        if model:
            body["model"] = model

        data = self._request("/v1/classify", body)

        return ClassifyResponse(
            label=data.get("label"),
            confidence=data.get("confidence"),
            tokens=data.get("tokens", 0),
            latency_ms=data.get("latency_ms", 0),
            cached=data.get("cached", False),
        )

    def tag(
        self,
        text: str,
        labels: Optional[list[str]] = None,
        classifier: Optional[str] = None,
        descriptions: Optional[dict[str, str]] = None,
        model: Optional[str] = None,
        threshold: Optional[float] = None,
    ) -> TagResponse:
        """
        Tag text with multiple labels that exceed a confidence threshold.

        Args:
            text: Text to tag.
            labels: List of possible labels (1-100).
            classifier: Saved classifier name or "name@vN" reference.
            descriptions: Maps label name to description for better accuracy.
            model: Model override.
            threshold: Confidence threshold (0-1). Default: 0.3.

        Returns:
            TagResponse with labels list (each has label and confidence).

        Example:
            >>> result = classer.tag(
            ...     text="Breaking: Tech stocks surge amid AI boom",
            ...     labels=["politics", "technology", "finance", "sports"],
            ...     threshold=0.3
            ... )
            >>> for tag in result.labels:
            ...     print(f"{tag.label}: {tag.confidence}")
        """
        body: dict = {"text": text}
        if classifier:
            body["classifier"] = classifier
        if labels:
            body["labels"] = labels
        if descriptions:
            body["descriptions"] = descriptions
        if model:
            body["model"] = model
        if threshold is not None:
            body["threshold"] = threshold

        data = self._request("/v1/tag", body)

        tag_labels = [
            TagLabel(label=item["label"], confidence=item["confidence"])
            for item in data.get("labels") or []
        ]

        return TagResponse(
            labels=tag_labels,
            tokens=data.get("tokens", 0),
            latency_ms=data.get("latency_ms", 0),
            cached=data.get("cached", False),
        )
