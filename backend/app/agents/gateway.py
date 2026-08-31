"""Agent gateway / policy enforcement layer.

Every tool invocation in the deterministic agent pipeline passes through
the gateway so it can be authorized against the fleet registry, timed,
and attributed to an agent principal. Authorized calls accumulate spans
into a single trace record persisted to the ``traces`` collection.
"""

import time
from datetime import datetime, timezone
from typing import Any, Callable

from app.agents.registry import AGENT_ROLES, touch_agent
from app.services.firestore import create_document, list_documents


class PolicyDenied(Exception):
    """Raised when an agent tries to invoke a tool it is not granted."""

    def __init__(self, agent_id: str, tool: str | None):
        self.agent_id = agent_id
        self.tool = tool
        super().__init__(
            f"Policy denied: agent '{agent_id}' is not authorized to "
            f"invoke '{tool or 'unknown'}'"
        )


def authorize(agent_id: str, tool: str | None) -> None:
    """Validate an agent principal against the registry capability matrix."""
    if agent_id not in AGENT_ROLES:
        raise PolicyDenied(agent_id, tool)

    if tool is not None and tool not in AGENT_ROLES[agent_id]["capabilities"]:
        raise PolicyDenied(agent_id, tool)


def _next_trace_id() -> str:
    numbers = []

    for item in list_documents("traces"):
        document_id = item.get("id", "")

        if document_id.startswith("TRC-"):
            try:
                numbers.append(int(document_id[4:]))
            except ValueError:
                continue

    return f"TRC-{max(numbers, default=0) + 1:03d}"


class AgentTraceBuilder:
    """Authorizes + times agent tool calls and records one trace document.

    When ``active`` is False the spans are still collected — policy is
    always enforced — but no trace is persisted and invocation counters
    are not bumped. This keeps scenario-engine runs isolated.
    """

    def __init__(
        self,
        incident_id: str,
        requested_by: str = "operator-1",
        mode: str = "deterministic",
        active: bool = True,
    ):
        self.incident_id = incident_id
        self.requested_by = requested_by
        self.mode = mode
        self.active = active
        self.spans: list[dict[str, Any]] = []
        self._started = time.perf_counter()

    def run(
        self,
        agent_id: str,
        tool: str | None,
        fn: Callable,
        *args,
        **kwargs,
    ):
        """Authorize the call, time it, append a span, return the result."""
        authorize(agent_id, tool)

        if self.active:
            touch_agent(agent_id)

        start = time.perf_counter()
        status = "COMPLETED"

        try:
            return fn(*args, **kwargs)
        except Exception:
            status = "ERROR"
            raise
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)

            self.spans.append(
                {
                    "agent": agent_id,
                    "tool": tool,
                    "status": status,
                    "duration_ms": duration_ms,
                }
            )

    def complete(self, status: str = "COMPLETED") -> dict[str, Any]:
        total_ms = round((time.perf_counter() - self._started) * 1000, 1)

        if self.active:
            record_id = _next_trace_id()
        else:
            record_id = "TRC-000"

        record = {
            "id": record_id,
            "incident_id": self.incident_id,
            "mode": self.mode,
            "status": status,
            "requested_by": self.requested_by,
            "total_ms": total_ms,
            "spans": self.spans,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

        if self.active:
            create_document("traces", record_id, record)

        return record