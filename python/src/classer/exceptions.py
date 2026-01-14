"""Exception classes for the Classer SDK."""

from typing import Optional


class ClasserError(Exception):
    """Base exception for Classer SDK errors."""

    def __init__(
        self,
        message: str,
        status: Optional[int] = None,
        detail: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status = status
        self.detail = detail

    def __str__(self) -> str:
        parts = [self.message]
        if self.status:
            parts.append(f"(status: {self.status})")
        if self.detail:
            parts.append(f"- {self.detail}")
        return " ".join(parts)
