"""Classer client implementation."""

import base64
import os
from typing import Optional

import httpx

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


class ClasserClient:
    """Client for the Classer API."""

    BASE_URL = "https://api.classer.ai"

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        batch_timeout: float = 600.0,
    ):
        """
        Initialize the Classer client.

        Args:
            api_key: API key for authentication. Falls back to CLASSER_API_KEY env var.
            timeout: Request timeout in seconds for classify/tag.
            batch_timeout: Request timeout in seconds for batch methods. Default: 600 (10 min).
        """
        self.api_key = api_key or os.environ.get("CLASSER_API_KEY", "")
        self.timeout = timeout
        self.batch_timeout = batch_timeout

    def _request(self, endpoint: str, body: dict, timeout: float | None = None) -> dict:
        """Make a POST request to the API."""
        url = f"{self.BASE_URL}{endpoint}"

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        request_timeout = timeout or self.timeout
        try:
            response = httpx.post(url, json=body, headers=headers, timeout=request_timeout)
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
        text: str = "",
        labels: Optional[list[str]] = None,
        classifier: Optional[str] = None,
        descriptions: Optional[dict[str, str]] = None,
        priority: Optional[str] = None,
        cache: Optional[bool] = None,
        threshold: Optional[float] = None,
        image: Optional[str | list[str]] = None,
        file: Optional[str] = None,
    ) -> dict:
        """Build a request body dict, omitting None/empty fields."""
        body: dict = {}
        if text:
            body["text"] = text
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
        if image is not None:
            body["image"] = image
        if file is not None:
            body["file"] = ClasserClient._resolve_file(file)
        return body

    @staticmethod
    def _resolve_file(file: str) -> str:
        """If file is a local path, read and base64-encode it. Otherwise pass through as URL or base64."""
        if file.startswith(("http://", "https://")):
            return file
        if os.path.isfile(file):
            try:
                with open(file, "rb") as f:
                    return base64.b64encode(f.read()).decode()
            except OSError as e:
                raise ClasserError(f"Failed to read file: {file}", detail=str(e)) from e
        # Looks like a file path but doesn't exist
        if file.endswith((".pdf", ".docx")):
            raise ClasserError(f"File not found: {file}")
        return file

    def classify(
        self,
        text: str = "",
        labels: Optional[list[str]] = None,
        classifier: Optional[str] = None,
        descriptions: Optional[dict[str, str]] = None,
        priority: Optional[str] = None,
        cache: Optional[bool] = None,
        image: Optional[str | list[str]] = None,
        file: Optional[str] = None,
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
            image: Image URL or base64 string (or list). Max 20 images.
            file: PDF or DOCX file — local path, URL, or base64 string. Max 20 pages.

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
            image=image, file=file,
        )

        data = self._request("/v1/classify", body)

        return ClassifyResponse(
            label=data.get("label"),
            confidence=data.get("confidence"),
            tokens=data.get("tokens", 0),
            visual_tokens=data.get("visual_tokens", 0),
            latency_ms=data.get("latency_ms", 0),
            cached=data.get("cached", False),
        )

    def tag(
        self,
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
            image: Image URL or base64 string (or list). Max 20 images.
            file: PDF or DOCX file — local path, URL, or base64 string. Max 20 pages.

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
            image=image, file=file,
        )

        data = self._request("/v1/tag", body)

        tag_labels = [
            TagLabel(label=item["label"], confidence=item["confidence"])
            for item in data.get("labels") or []
        ]

        return TagResponse(
            labels=tag_labels,
            tokens=data.get("tokens", 0),
            visual_tokens=data.get("visual_tokens", 0),
            latency_ms=data.get("latency_ms", 0),
            cached=data.get("cached", False),
        )

    def classify_batch(
        self,
        texts: list[str],
        labels: Optional[list[str]] = None,
        classifier: Optional[str] = None,
        descriptions: Optional[dict[str, str]] = None,
        cache: Optional[bool] = None,
        image: Optional[str | list[str]] = None,
        file: Optional[str] = None,
    ) -> BatchClassifyResponse:
        """
        Classify multiple texts in a single request (single-label).

        Args:
            texts: List of texts to classify (1-1000).
            labels: List of possible labels (1-200).
            classifier: Saved classifier name or "name@vN" reference.
            descriptions: Maps label name to description for better accuracy.
            cache: Set to False to bypass cache. Default: True.
            image: Shared image for all texts — URL or base64 string (or list).
            file: Shared PDF or DOCX file — local path, URL, or base64 string.

        Returns:
            BatchClassifyResponse with results list (same order as input texts).
        """
        if not labels and not classifier:
            raise ClasserError("Either 'labels' or 'classifier' must be provided")

        body = self._build_body(
            labels=labels, classifier=classifier,
            descriptions=descriptions, cache=cache,
            image=image, file=file,
        )
        body["texts"] = texts

        data = self._request("/v1/classify/batch", body, timeout=self.batch_timeout)

        results = []
        for item in data.get("results") or []:
            cache_info = item.get("cache")
            results.append(BatchClassifyResult(
                label=item.get("label"),
                confidence=item.get("confidence"),
                tokens=item.get("tokens", 0),
                visual_tokens=item.get("visual_tokens", 0),
                error=item.get("error"),
                cached=cache_info.get("hit", False) if cache_info else False,
            ))

        return BatchClassifyResponse(
            results=results,
            total_tokens=data.get("total_tokens", 0),
            latency_ms=data.get("latency_ms", 0),
        )

    def tag_batch(
        self,
        texts: list[str],
        labels: Optional[list[str]] = None,
        classifier: Optional[str] = None,
        descriptions: Optional[dict[str, str]] = None,
        threshold: Optional[float] = None,
        cache: Optional[bool] = None,
        image: Optional[str | list[str]] = None,
        file: Optional[str] = None,
    ) -> BatchTagResponse:
        """
        Tag multiple texts in a single request (multi-label).

        Args:
            texts: List of texts to tag (1-1000).
            labels: List of possible labels (1-200).
            classifier: Saved classifier name or "name@vN" reference.
            descriptions: Maps label name to description for better accuracy.
            threshold: Confidence threshold (0-1). Default: 0.5.
            cache: Set to False to bypass cache. Default: True.
            image: Shared image for all texts — URL or base64 string (or list).
            file: Shared PDF or DOCX file — local path, URL, or base64 string.

        Returns:
            BatchTagResponse with results list (same order as input texts).
        """
        if not labels and not classifier:
            raise ClasserError("Either 'labels' or 'classifier' must be provided")

        body = self._build_body(
            labels=labels, classifier=classifier,
            descriptions=descriptions, threshold=threshold,
            cache=cache, image=image, file=file,
        )
        body["texts"] = texts

        data = self._request("/v1/tag/batch", body, timeout=self.batch_timeout)

        results = []
        for item in data.get("results") or []:
            cache_info = item.get("cache")
            item_labels = [
                TagLabel(label=l["label"], confidence=l["confidence"])
                for l in item.get("labels") or []
            ]
            results.append(BatchTagResult(
                labels=item_labels,
                tokens=item.get("tokens", 0),
                visual_tokens=item.get("visual_tokens", 0),
                error=item.get("error"),
                cached=cache_info.get("hit", False) if cache_info else False,
            ))

        return BatchTagResponse(
            results=results,
            total_tokens=data.get("total_tokens", 0),
            latency_ms=data.get("latency_ms", 0),
        )
