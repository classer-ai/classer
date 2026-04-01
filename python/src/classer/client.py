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

    BASE_URL = "https://api.classer.ai"

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
    ):
        """
        Initialize the Classer client.

        Args:
            api_key: API key for authentication. Falls back to CLASSER_API_KEY env var.
            timeout: Request timeout in seconds.
        """
        self.api_key = api_key or os.environ.get("CLASSER_API_KEY", "")
        self.timeout = timeout

    def _request(self, endpoint: str, body: dict) -> dict:
        """Make a POST request to the API."""
        url = f"{self.BASE_URL}{endpoint}"

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            response = httpx.post(url, json=body, headers=headers, timeout=self.timeout)
        except httpx.TimeoutException as e:
            raise ClasserError("Request timed out", detail=str(e)) from e
        except httpx.HTTPError as e:
            raise ClasserError(f"Request failed: {e}", detail=str(e)) from e

        if not response.is_success:
            detail = None
            try:
                error_data = response.json()
                detail = error_data.get("detail") if isinstance(error_data, dict) else None
            except (ValueError, TypeError):
                detail = response.text[:200] if response.text else None
            if detail is None and response.status_code == 401:
                detail = "Invalid or missing API key"
            raise ClasserError(
                f"Request failed with status {response.status_code}",
                status=response.status_code,
                detail=detail,
            )

        return response.json()

    @staticmethod
    def _build_body(
        text: str,
        labels: Optional[list[str]] = None,
        classifier: Optional[str] = None,
        descriptions: Optional[dict[str, str]] = None,
        priority: Optional[str] = None,
        cache: Optional[bool] = None,
        threshold: Optional[float] = None,
    ) -> dict:
        """Build a request body dict, omitting None/empty fields."""
        body: dict = {"text": text}
        if classifier:
            body["classifier"] = classifier
        if labels is not None:
            body["labels"] = labels
        if descriptions is not None:
            body["descriptions"] = descriptions
        if threshold is not None:
            body["threshold"] = threshold
        if priority:
            body["priority"] = priority
        if cache is not None:
            body["cache"] = cache
        return body

    def classify(
        self,
        text: str,
        labels: Optional[list[str]] = None,
        classifier: Optional[str] = None,
        descriptions: Optional[dict[str, str]] = None,
        priority: Optional[str] = None,
        cache: Optional[bool] = None,
    ) -> ClassifyResponse:
        """
        Classify text into one of the provided labels (single-label).

        Args:
            text: Text to classify.
            labels: List of possible labels (1-200).
            classifier: Saved classifier name or "name@vN" reference.
            descriptions: Maps label name to description for better accuracy.
            priority: Priority tier — "standard" (default, <1s) or "fast" (<200ms).
            cache: Set to False to bypass cache. Default: True.

        Returns:
            ClassifyResponse with label and confidence.

        Example:
            >>> result = classer.classify(
            ...     text="I can't log in",
            ...     labels=["billing", "technical_support", "sales"]
            ... )
            >>> print(result.label)  # "technical_support"
        """
        if not labels and not classifier:
            raise ClasserError("Either 'labels' or 'classifier' must be provided")

        body = self._build_body(
            text, labels=labels, classifier=classifier,
            descriptions=descriptions, priority=priority, cache=cache,
        )

        data = self._request("/v1/classify", body)

        return ClassifyResponse(
            label=data.get("label"),
            confidence=data.get("confidence"),
            tokens=data.get("tokens", 0),
            latency_ms=data.get("latency_ms", 0),
            cached=data.get("cached", False),
            public=data.get("public"),
        )

    def tag(
        self,
        text: str,
        labels: Optional[list[str]] = None,
        classifier: Optional[str] = None,
        descriptions: Optional[dict[str, str]] = None,
        threshold: Optional[float] = None,
        priority: Optional[str] = None,
        cache: Optional[bool] = None,
    ) -> TagResponse:
        """
        Tag text with multiple labels that exceed a confidence threshold.

        Args:
            text: Text to tag.
            labels: List of possible labels (1-200).
            classifier: Saved classifier name or "name@vN" reference.
            descriptions: Maps label name to description for better accuracy.
            threshold: Confidence threshold (0-1). Default: 0.5.
            priority: Priority tier — "standard" (default, <1s) or "fast" (<200ms).
            cache: Set to False to bypass cache. Default: True.

        Returns:
            TagResponse with labels list (each has label and confidence).

        Example:
            >>> result = classer.tag(
            ...     text="Breaking: Tech stocks surge amid AI boom",
            ...     labels=["politics", "technology", "finance", "sports"],
            ...     threshold=0.5
            ... )
            >>> for tag in result.labels:
            ...     print(f"{tag.label}: {tag.confidence}")
        """
        if not labels and not classifier:
            raise ClasserError("Either 'labels' or 'classifier' must be provided")

        body = self._build_body(
            text, labels=labels, classifier=classifier,
            descriptions=descriptions, threshold=threshold,
            priority=priority, cache=cache,
        )

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
            public=data.get("public"),
        )
