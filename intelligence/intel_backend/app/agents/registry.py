"""Agent registry — register, discover, and run agents by name or group."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from .base import AgentResult, BaseAgent

logger = logging.getLogger("agent.registry")


class AgentRegistry:
    """Central registry for all NXT//LINK agents."""

    def __init__(self) -> None:
        self._agents: dict[str, BaseAgent] = {}
        self._last_run: dict[str, datetime] = {}
        self._last_result: dict[str, AgentResult] = {}

    def register(self, agent: BaseAgent) -> None:
        """Register an agent instance."""
        self._agents[agent.name] = agent
        logger.info("Registered agent: %s (%s)", agent.name, agent.group)

    def get(self, name: str) -> BaseAgent | None:
        """Get an agent by name."""
        return self._agents.get(name)

    def list_agents(self) -> list[dict[str, Any]]:
        """List all registered agents with their status."""
        result = []
        for name, agent in self._agents.items():
            result.append(
                {
                    "name": name,
                    "group": agent.group,
                    "description": agent.description,
                    "cadence_hours": agent.cadence_hours,
                    "last_run": self._last_run.get(name),
                    "last_success": (
                        self._last_result[name].success
                        if name in self._last_result
                        else None
                    ),
                }
            )
        return result

    def list_groups(self) -> list[str]:
        """Return unique group names."""
        return sorted({a.group for a in self._agents.values()})

    async def run_agent(self, name: str) -> AgentResult:
        """Run a single agent by name."""
        agent = self._agents.get(name)
        if agent is None:
            return AgentResult(success=False, errors=[f"Agent '{name}' not found"])
        result = await agent.execute()
        self._last_run[name] = datetime.now(timezone.utc)
        self._last_result[name] = result
        return result

    async def run_group(self, group: str) -> dict[str, AgentResult]:
        """Run all agents in a group concurrently."""
        agents = [a for a in self._agents.values() if a.group == group]
        if not agents:
            logger.warning("No agents in group '%s'", group)
            return {}
        tasks = [a.execute() for a in agents]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        out: dict[str, AgentResult] = {}
        now = datetime.now(timezone.utc)
        for agent, res in zip(agents, results):
            if isinstance(res, Exception):
                res = AgentResult(success=False, errors=[str(res)])
            out[agent.name] = res
            self._last_run[agent.name] = now
            self._last_result[agent.name] = res
        return out

    async def run_all(self) -> dict[str, AgentResult]:
        """Run every registered agent concurrently."""
        tasks = [a.execute() for a in self._agents.values()]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        out: dict[str, AgentResult] = {}
        now = datetime.now(timezone.utc)
        for agent, res in zip(self._agents.values(), results):
            if isinstance(res, Exception):
                res = AgentResult(success=False, errors=[str(res)])
            out[agent.name] = res
            self._last_run[agent.name] = now
            self._last_result[agent.name] = res
        return out


# Global registry instance
registry = AgentRegistry()
