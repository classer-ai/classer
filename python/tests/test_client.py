"""Tests for the Classer SDK."""

import os
from unittest.mock import MagicMock, patch

import pytest

from classer import (
    ClasserClient,
    ClasserError,
    ClassifyResponse,
    MatchResponse,
    ScoreResponse,
    TagResponse,
    classify,
    match,
    score,
    tag,
)


class TestClasserClient:
    """Tests for ClasserClient class."""

    def test_constructor_uses_default_base_url(self):
        client = ClasserClient()
        assert client.base_url == "https://api.classer.ai"

    def test_constructor_accepts_custom_config(self):
        client = ClasserClient(
            api_key="test-key",
            base_url="https://custom.api.com",
        )
        assert client.api_key == "test-key"
        assert client.base_url == "https://custom.api.com"

    def test_constructor_reads_api_key_from_environment(self):
        with patch.dict(os.environ, {"CLASSER_API_KEY": "env-api-key"}):
            client = ClasserClient()
            assert client.api_key == "env-api-key"

    def test_constructor_reads_base_url_from_environment(self):
        with patch.dict(os.environ, {"CLASSER_BASE_URL": "https://env.classer.ai"}):
            client = ClasserClient()
            assert client.base_url == "https://env.classer.ai"


class TestClassify:
    """Tests for classify method."""

    @patch("classer.client.httpx.post")
    def test_classify_text_successfully(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "technical_support",
            "confidence": 0.94,
            "latency_ms": 45,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.classify(
            source="I can't log in",
            labels=["billing", "technical_support", "sales"],
        )

        assert isinstance(result, ClassifyResponse)
        assert result.label == "technical_support"
        assert result.confidence == 0.94
        assert result.latency_ms == 45

        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][0] == "https://api.classer.ai/v1/classify"
        assert call_args[1]["headers"]["Authorization"] == "Bearer test-key"

    @patch("classer.client.httpx.post")
    def test_classify_includes_descriptions(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "hot",
            "confidence": 0.92,
            "latency_ms": 38,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.classify(
            source="I need enterprise pricing for 500 users",
            labels=["hot", "warm", "cold"],
            descriptions={
                "hot": "Ready to buy",
                "warm": "Interested but exploring",
                "cold": "Just browsing",
            },
        )

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body["descriptions"] == {
            "hot": "Ready to buy",
            "warm": "Interested but exploring",
            "cold": "Just browsing",
        }

    @patch("classer.client.httpx.post")
    def test_classify_handles_api_errors(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 400
        mock_response.json.return_value = {"detail": "labels cannot be empty"}
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")

        with pytest.raises(ClasserError) as exc_info:
            client.classify(source="test", labels=[])

        assert exc_info.value.status == 400
        assert exc_info.value.detail == "labels cannot be empty"

    @patch("classer.client.httpx.post")
    def test_classify_handles_network_errors(self, mock_post):
        mock_post.side_effect = Exception("Network error")

        client = ClasserClient(api_key="test-key")

        with pytest.raises(Exception, match="Network error"):
            client.classify(source="test", labels=["a", "b"])


class TestTag:
    """Tests for tag method."""

    @patch("classer.client.httpx.post")
    def test_tag_text_with_multiple_labels(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "tags": ["technology", "finance"],
            "confidences": [0.65, 0.42],
            "latency_ms": 52,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.tag(
            source="Tech stocks surge amid AI boom",
            labels=["politics", "technology", "finance", "sports"],
            threshold=0.3,
        )

        assert isinstance(result, TagResponse)
        assert "technology" in result.tags
        assert "finance" in result.tags
        assert len(result.confidences) == 2

    @patch("classer.client.httpx.post")
    def test_tag_uses_default_threshold(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "tags": ["technology"],
            "confidences": [0.85],
            "latency_ms": 48,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.tag(
            source="AI is transforming industries",
            labels=["technology", "sports"],
        )

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert "threshold" not in body  # Server uses default

    @patch("classer.client.httpx.post")
    def test_tag_returns_empty_when_nothing_matches(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "tags": [],
            "confidences": [],
            "latency_ms": 35,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.tag(
            source="Random unrelated text",
            labels=["sports", "politics"],
            threshold=0.9,
        )

        assert len(result.tags) == 0


class TestMatch:
    """Tests for match method."""

    @patch("classer.client.httpx.post")
    def test_match_returns_high_score_for_relevant_content(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "score": 0.98,
            "latency_ms": 42,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.match(
            source="Our return policy allows refunds within 30 days.",
            query="Can I get a refund?",
        )

        assert isinstance(result, MatchResponse)
        assert result.score > 0.9

    @patch("classer.client.httpx.post")
    def test_match_returns_low_score_for_irrelevant_content(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "score": 0.05,
            "latency_ms": 38,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.match(
            source="The weather is sunny today.",
            query="How do I reset my password?",
        )

        assert result.score < 0.2

    @patch("classer.client.httpx.post")
    def test_match_sends_correct_request_body(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "score": 0.75,
            "latency_ms": 40,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.match(
            source="Document content here",
            query="Search query",
        )

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body["source"] == "Document content here"
        assert body["query"] == "Search query"


class TestScore:
    """Tests for score method."""

    @patch("classer.client.httpx.post")
    def test_score_text_on_urgency(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "score": 0.92,
            "latency_ms": 35,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.score(
            source="URGENT! System is down! Need immediate help!",
            attribute="urgency",
        )

        assert isinstance(result, ScoreResponse)
        assert result.score > 0.8

    @patch("classer.client.httpx.post")
    def test_score_includes_description(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "score": 0.65,
            "latency_ms": 40,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.score(
            source="This product is okay, nothing special.",
            attribute="satisfaction",
            description="Customer satisfaction level",
        )

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body["description"] == "Customer satisfaction level"


class TestDefaultExports:
    """Tests for module-level convenience functions."""

    @patch("classer.client.httpx.post")
    def test_classify_function_works(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "greeting",
            "confidence": 0.95,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        result = classify(
            source="Hello there!",
            labels=["greeting", "question", "complaint"],
        )

        assert result.label == "greeting"

    @patch("classer.client.httpx.post")
    def test_tag_function_works(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "tags": ["news", "technology"],
            "confidences": [0.8, 0.6],
            "latency_ms": 45,
        }
        mock_post.return_value = mock_response

        result = tag(
            source="Apple announces new iPhone",
            labels=["news", "technology", "sports"],
        )

        assert "news" in result.tags

    @patch("classer.client.httpx.post")
    def test_match_function_works(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "score": 0.88,
            "latency_ms": 38,
        }
        mock_post.return_value = mock_response

        result = match(
            source="Python is a programming language",
            query="What programming languages exist?",
        )

        assert result.score > 0.5

    @patch("classer.client.httpx.post")
    def test_score_function_works(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "score": 0.25,
            "latency_ms": 33,
        }
        mock_post.return_value = mock_response

        result = score(
            source="The meeting is scheduled for next week",
            attribute="urgency",
        )

        assert result.score < 0.5


class TestClasserError:
    """Tests for ClasserError exception."""

    @patch("classer.client.httpx.post")
    def test_error_contains_status_and_detail(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 422
        mock_response.json.return_value = {"detail": "Validation error"}
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")

        with pytest.raises(ClasserError) as exc_info:
            client.classify(source="", labels=["a"])

        assert exc_info.value.status == 422
        assert exc_info.value.detail == "Validation error"

    @patch("classer.client.httpx.post")
    def test_error_handles_non_json_responses(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 500
        mock_response.json.side_effect = Exception("Invalid JSON")
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")

        with pytest.raises(ClasserError) as exc_info:
            client.classify(source="test", labels=["a", "b"])

        assert exc_info.value.status == 500
        assert exc_info.value.detail is None


class TestRequestHeaders:
    """Tests for request header handling."""

    @patch("classer.client.httpx.post")
    def test_includes_authorization_header_when_api_key_set(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="my-secret-key")
        client.classify(source="test", labels=["a", "b"])

        call_args = mock_post.call_args
        assert call_args[1]["headers"]["Authorization"] == "Bearer my-secret-key"

    @patch("classer.client.httpx.post")
    def test_no_authorization_header_when_api_key_empty(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        with patch.dict(os.environ, {}, clear=True):
            client = ClasserClient(api_key="")
            client.classify(source="test", labels=["a", "b"])

        call_args = mock_post.call_args
        assert "Authorization" not in call_args[1]["headers"]

    @patch("classer.client.httpx.post")
    def test_always_includes_content_type_header(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient()
        client.classify(source="test", labels=["a", "b"])

        call_args = mock_post.call_args
        assert call_args[1]["headers"]["Content-Type"] == "application/json"


class TestCustomBaseUrl:
    """Tests for custom base URL handling."""

    @patch("classer.client.httpx.post")
    def test_uses_custom_base_url(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(base_url="https://custom.classer.ai")
        client.classify(source="test", labels=["a", "b"])

        call_args = mock_post.call_args
        assert call_args[0][0] == "https://custom.classer.ai/v1/classify"

    @patch("classer.client.httpx.post")
    def test_reads_base_url_from_environment(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        with patch.dict(os.environ, {"CLASSER_BASE_URL": "https://env.classer.ai"}):
            client = ClasserClient()
            client.classify(source="test", labels=["a", "b"])

        call_args = mock_post.call_args
        assert call_args[0][0] == "https://env.classer.ai/v1/classify"
