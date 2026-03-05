"""Tests for the Classer SDK."""

import os
from unittest.mock import MagicMock, patch

import pytest

from classer import (
    ClasserClient,
    ClasserError,
    ClassifyResponse,
    TagResponse,
    TagLabel,
    classify,
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

    def test_constructor_explicit_api_key_overrides_env(self):
        with patch.dict(os.environ, {"CLASSER_API_KEY": "env-key"}):
            client = ClasserClient(api_key="explicit-key")
            assert client.api_key == "explicit-key"

    def test_constructor_default_timeout(self):
        client = ClasserClient()
        assert client.timeout == 30.0

    def test_constructor_custom_timeout(self):
        client = ClasserClient(timeout=10.0)
        assert client.timeout == 10.0

    @patch("classer.client.httpx.post")
    def test_passes_timeout_to_httpx(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(timeout=5.0)
        client.classify(text="test", labels=["a", "b"])

        call_args = mock_post.call_args
        assert call_args[1]["timeout"] == 5.0


class TestClassify:
    """Tests for classify method."""

    @patch("classer.client.httpx.post")
    def test_classify_text_successfully(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "technical_support",
            "confidence": 0.94,
            "tokens": 101,
            "latency_ms": 45,
            "cached": False,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.classify(
            text="I can't log in",
            labels=["billing", "technical_support", "sales"],
        )

        assert isinstance(result, ClassifyResponse)
        assert result.label == "technical_support"
        assert result.confidence == 0.94
        assert result.tokens == 101
        assert result.latency_ms == 45
        assert result.cached is False

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
            text="I need enterprise pricing for 500 users",
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
            client.classify(text="test", labels=[])

        assert exc_info.value.status == 400
        assert exc_info.value.detail == "labels cannot be empty"

    @patch("classer.client.httpx.post")
    def test_classify_handles_network_errors(self, mock_post):
        mock_post.side_effect = Exception("Network error")

        client = ClasserClient(api_key="test-key")

        with pytest.raises(Exception, match="Network error"):
            client.classify(text="test", labels=["a", "b"])

    @patch("classer.client.httpx.post")
    def test_classify_does_not_send_mode(self, mock_post):
        """classify() should NOT send mode in the request body."""
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.classify(text="test", labels=["a", "b"])

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert "mode" not in body
        assert "threshold" not in body

    @patch("classer.client.httpx.post")
    def test_classify_with_classifier_param(self, mock_post):
        """classify() sends classifier instead of labels when provided."""
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "billing",
            "confidence": 0.88,
            "latency_ms": 42,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.classify(text="test", classifier="support-tickets@v2")

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body["classifier"] == "support-tickets@v2"
        assert "labels" not in body
        assert result.label == "billing"

    @patch("classer.client.httpx.post")
    def test_classify_with_model_override(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.classify(text="test", labels=["a", "b"], model="openai/gpt-4o-mini")

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body["model"] == "openai/gpt-4o-mini"

    @patch("classer.client.httpx.post")
    def test_classify_omits_none_optional_fields(self, mock_post):
        """Optional params that are None should not appear in the request body."""
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.classify(text="test", labels=["a", "b"])

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body == {"text": "test", "labels": ["a", "b"]}

    @patch("classer.client.httpx.post")
    def test_classify_defaults_when_fields_missing(self, mock_post):
        """tokens and cached should default when absent from response."""
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "label": "a",
            "confidence": 0.9,
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.classify(text="test", labels=["a", "b"])

        assert result.tokens == 0
        assert result.cached is False


class TestTag:
    """Tests for tag method."""

    @patch("classer.client.httpx.post")
    def test_tag_with_multiple_labels(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [
                {"label": "technology", "confidence": 0.65},
                {"label": "finance", "confidence": 0.42},
            ],
            "tokens": 200,
            "latency_ms": 52,
            "cached": False,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.tag(
            text="Tech stocks surge amid AI boom",
            labels=["politics", "technology", "finance", "sports"],
            threshold=0.3,
        )

        assert isinstance(result, TagResponse)
        assert len(result.labels) == 2
        assert result.labels[0].label == "technology"
        assert result.labels[0].confidence == 0.65
        assert result.labels[1].label == "finance"
        assert result.tokens == 200
        assert result.cached is False

        call_args = mock_post.call_args
        assert call_args[0][0] == "https://api.classer.ai/v1/tag"

    @patch("classer.client.httpx.post")
    def test_tag_sends_threshold(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [{"label": "technology", "confidence": 0.85}],
            "latency_ms": 48,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.tag(
            text="AI is transforming industries",
            labels=["technology", "sports"],
            threshold=0.5,
        )

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body["threshold"] == 0.5

    @patch("classer.client.httpx.post")
    def test_tag_returns_empty_when_nothing_matches(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [],
            "latency_ms": 35,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.tag(
            text="Random unrelated text",
            labels=["sports", "politics"],
            threshold=0.9,
        )

        assert result.labels == []

    @patch("classer.client.httpx.post")
    def test_tag_returns_empty_when_labels_is_null(self, mock_post):
        """API may return null instead of empty array."""
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": None,
            "latency_ms": 35,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.tag(text="test", labels=["a", "b"])

        assert result.labels == []

    @patch("classer.client.httpx.post")
    def test_tag_does_not_send_mode(self, mock_post):
        """tag() should NOT send mode in the request body."""
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [{"label": "a", "confidence": 0.8}],
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.tag(text="test", labels=["a", "b"])

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert "mode" not in body

    @patch("classer.client.httpx.post")
    def test_tag_omits_threshold_when_not_provided(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [{"label": "a", "confidence": 0.8}],
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.tag(text="test", labels=["a", "b"])

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert "threshold" not in body

    @patch("classer.client.httpx.post")
    def test_tag_with_classifier_param(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [{"label": "urgent", "confidence": 0.91}],
            "latency_ms": 55,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.tag(text="test", classifier="priority-tagger")

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body["classifier"] == "priority-tagger"
        assert "labels" not in body
        assert result.labels[0].label == "urgent"

    @patch("classer.client.httpx.post")
    def test_tag_with_descriptions(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [{"label": "tech", "confidence": 0.85}],
            "latency_ms": 40,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.tag(
            text="test",
            labels=["tech", "sports"],
            descriptions={"tech": "Technology news", "sports": "Sports news"},
        )

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body["descriptions"] == {
            "tech": "Technology news",
            "sports": "Sports news",
        }

    @patch("classer.client.httpx.post")
    def test_tag_with_model_override(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [{"label": "a", "confidence": 0.8}],
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        client.tag(text="test", labels=["a", "b"], model="openai/gpt-4o-mini")

        call_args = mock_post.call_args
        body = call_args[1]["json"]
        assert body["model"] == "openai/gpt-4o-mini"

    @patch("classer.client.httpx.post")
    def test_tag_handles_api_errors(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 422
        mock_response.json.return_value = {"detail": "At least 2 labels required"}
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")

        with pytest.raises(ClasserError) as exc_info:
            client.tag(text="test", labels=["only_one"])

        assert exc_info.value.status == 422
        assert exc_info.value.detail == "At least 2 labels required"

    @patch("classer.client.httpx.post")
    def test_tag_defaults_when_fields_missing(self, mock_post):
        """tokens and cached should default when absent from response."""
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [{"label": "a", "confidence": 0.8}],
            "latency_ms": 50,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.tag(text="test", labels=["a", "b"])

        assert result.tokens == 0
        assert result.cached is False

    @patch("classer.client.httpx.post")
    def test_tag_latency_ms(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [],
            "latency_ms": 203,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")
        result = client.tag(text="test", labels=["a", "b"])

        assert result.latency_ms == 203


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
            text="Hello there!",
            labels=["greeting", "question", "complaint"],
        )

        assert result.label == "greeting"

    @patch("classer.client.httpx.post")
    def test_tag_function_works(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [
                {"label": "news", "confidence": 0.8},
                {"label": "technology", "confidence": 0.6},
            ],
            "latency_ms": 45,
        }
        mock_post.return_value = mock_response

        result = tag(
            text="Apple announces new iPhone",
            labels=["news", "technology", "sports"],
        )

        assert len(result.labels) == 2
        assert result.labels[0].label == "news"


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
            client.classify(text="", labels=["a"])

        assert exc_info.value.status == 422
        assert exc_info.value.detail == "Validation error"

    @patch("classer.client.httpx.post")
    def test_error_handles_non_json_responses(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 500
        mock_response.json.side_effect = ValueError("Invalid JSON")
        mock_post.return_value = mock_response

        client = ClasserClient(api_key="test-key")

        with pytest.raises(ClasserError) as exc_info:
            client.classify(text="test", labels=["a", "b"])

        assert exc_info.value.status == 500
        assert exc_info.value.detail is None

    def test_error_str_includes_status_and_detail(self):
        err = ClasserError("Request failed", status=429, detail="Rate limit exceeded")
        assert "429" in str(err)
        assert "Rate limit exceeded" in str(err)

    def test_error_str_without_detail(self):
        err = ClasserError("Request failed", status=500)
        assert "500" in str(err)
        assert str(err) == "Request failed (status: 500)"

    def test_error_str_without_status(self):
        err = ClasserError("Something went wrong")
        assert str(err) == "Something went wrong"


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
        client.classify(text="test", labels=["a", "b"])

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
            client.classify(text="test", labels=["a", "b"])

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
        client.classify(text="test", labels=["a", "b"])

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
        client.classify(text="test", labels=["a", "b"])

        call_args = mock_post.call_args
        assert call_args[0][0] == "https://custom.classer.ai/v1/classify"

    @patch("classer.client.httpx.post")
    def test_tag_uses_correct_endpoint(self, mock_post):
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {
            "labels": [{"label": "a", "confidence": 0.9}],
            "latency_ms": 30,
        }
        mock_post.return_value = mock_response

        client = ClasserClient(base_url="https://custom.classer.ai")
        client.tag(text="test", labels=["a", "b"])

        call_args = mock_post.call_args
        assert call_args[0][0] == "https://custom.classer.ai/v1/tag"
