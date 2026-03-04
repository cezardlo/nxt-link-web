"""Base agent class for NXT//LINK discovery agents."""

import time
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentResult:
    """Result returned by every agent run."""

    success: bool
    entities_found: int = 0
    signals_found: int = 0
    errors: list[str] = field(default_factory=list)
    duration_seconds: float = 0.0
    data: dict[str, Any] = field(default_factory=dict)


class BaseAgent(ABC):
    """Abstract base class for all NXT//LINK agents.

    Subclasses must set `name`, `description`, `group` and implement `run()`.
    Call `execute()` to run with timing, logging, and error handling.
    """

    name: str = "base"
    description: str = ""
    group: str = "general"
    cadence_hours: int = 24

    def __init__(self) -> None:
        self.logger = logging.getLogger(f"agent.{self.name}")

    @abstractmethod
    async def run(self) -> AgentResult:
        """Execute the agent's main logic. Must be implemented by subclasses."""
        ...

    async def health_check(self) -> bool:
        """Return True if the agent can operate (API keys present, etc.)."""
        return True

    async def execute(self) -> AgentResult:
        """Run the agent with timing, logging, and error handling."""
        start = time.monotonic()
        self.logger.info("[%s] Starting...", self.name)
        try:
            result = await self.run()
            result.duration_seconds = time.monotonic() - start
            self.logger.info(
                "[%s] Done in %.1fs — %d entities, %d signals",
                self.name,
                result.duration_seconds,
                result.entities_found,
                result.signals_found,
            )
            return result
        except Exception as exc:
            elapsed = time.monotonic() - start
            self.logger.error("[%s] Failed: %s", self.name, exc)
            return AgentResult(
                success=False, errors=[str(exc)], duration_seconds=elapsed
            )
