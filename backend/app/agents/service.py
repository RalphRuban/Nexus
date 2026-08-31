from datetime import datetime, timezone

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agents.agents import build_simulation_workflow, build_workflow
from app.agents.gateway import AgentTraceBuilder
from app.agents.schemas import (
    AgentAnalysis,
    AgentStep,
    DecisionRecommendation,
    ResourceRecommendation,
    RiskAssessment,
)
from app.agents.tools import (
    analyze_risk,
    assess_resources,
    geospatial_roads,
    recommend_response,
    research_incident,
)
from app.config import AGENT_LLM_MODE
from app.services.firestore import create_document, list_documents

_APP_NAME = "nexus_agents"

_session_service = InMemorySessionService()

_runner: Runner | None = None
_simulation_runner: Runner | None = None


def _get_runner() -> Runner:
    global _runner

    if _runner is None:
        workflow, _ = build_workflow()

        _runner = Runner(
            agent=workflow,
            app_name=_APP_NAME,
            session_service=_session_service,
        )

    return _runner


def _get_simulation_runner() -> Runner:
    global _simulation_runner

    if _simulation_runner is None:
        workflow, _ = build_simulation_workflow()

        _simulation_runner = Runner(
            agent=workflow,
            app_name=_APP_NAME,
            session_service=_session_service,
        )

    return _simulation_runner


def _next_log_id() -> str:
    logs = list_documents("activity")

    numbers = []

    for item in logs:
        document_id = item.get("id", "")

        if document_id.startswith("LOG-"):
            try:
                numbers.append(int(document_id[4:]))
            except ValueError:
                continue

    return f"LOG-{max(numbers, default=0) + 1:03d}"


def _log(message: str, actor: str = "AGENT", severity: str = "INFO") -> None:
    create_document(
        "activity",
        _next_log_id(),
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor": actor,
            "message": message,
            "severity": severity,
        },
    )


async def _run_workflow(incident_id: str, user_id: str) -> list[str]:
    runner = _get_runner()

    session = await _session_service.create_session(
        app_name=_APP_NAME,
        user_id=user_id,
    )

    message = types.Content(
        parts=[
            types.Part(
                text=(
                    f"Run the full analysis pipeline for incident "
                    f"{incident_id}."
                )
            )
        ]
    )

    executed: list[str] = []

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=message,
    ):
        if event.content is not None:
            parts = getattr(event.content, "parts", [])

            text = "".join(
                getattr(part, "text", "") or ""
                for part in parts
            ).strip()

            if text:
                executed.append(event.author)

    return executed


async def run_simulation_workflow(
    incident_id: str,
    user_id: str = "simulation-1",
) -> list[str]:
    """Execute the Simulation agent through its dedicated ADK workflow."""
    runner = _get_simulation_runner()

    session = await _session_service.create_session(
        app_name=_APP_NAME,
        user_id=user_id,
    )

    message = types.Content(
        parts=[
            types.Part(
                text=(
                    f"Simulate a what-if scenario for incident "
                    f"{incident_id}."
                )
            )
        ]
    )

    executed: list[str] = []

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=message,
    ):
        if event.content is not None:
            parts = getattr(event.content, "parts", [])

            text = "".join(
                getattr(part, "text", "") or ""
                for part in parts
            ).strip()

            if text:
                executed.append(event.author)

    return executed


def _compute_deterministic(
    incident_id: str,
    requested_by: str = "operator-1",
    record_trace: bool = True,
) -> AgentAnalysis:
    builder = AgentTraceBuilder(
        incident_id=incident_id,
        requested_by=requested_by,
        mode="deterministic",
        active=record_trace,
    )

    research = builder.run(
        "research", "research_incident", research_incident, incident_id
    )
    risk = builder.run("risk", "analyze_risk", analyze_risk, incident_id)
    roads = builder.run(
        "geospatial", "geospatial_roads", geospatial_roads, incident_id
    )
    resources = builder.run(
        "resource", "assess_resources", assess_resources, incident_id
    )
    builder.run("coordinator", None, lambda: None)
    decision = builder.run(
        "decision", "recommend_response", recommend_response, incident_id
    )

    now = datetime.now(timezone.utc)

    incident = research["incident"]

    zones_summary = ", ".join(
        zone.get("name", zone.get("id"))
        for zone in research["zones"]
    )

    weather_summary = research.get("weather_summary", {})
    ward_population = research.get("ward_population", 0)

    steps = [
        AgentStep(
            agent="research",
            status="COMPLETED",
            summary=(
                f"Found {research['signal_count']} relevant signal(s) "
                f"across {research['zone_count']} affected zone(s) "
                f"({zones_summary}) covering {ward_population:,} "
                f"residents; peak rainfall "
                f"{weather_summary.get('peak_rainfall_mm', 0):g} mm "
                f"across {weather_summary.get('count', 0):,} "
                f"weather record(s)."
            ),
            timestamp=now,
        ),
        AgentStep(
            agent="risk",
            status="COMPLETED",
            summary=(
                f"Computed risk score {risk['score']} "
                f"({risk['level']})."
            ),
            timestamp=now,
        ),
        AgentStep(
            agent="geospatial",
            status="COMPLETED",
            summary=(
                f"Found {roads['constrained_roads']} constrained "
                f"road(s) of {roads['total_roads']}."
            ),
            timestamp=now,
        ),
        AgentStep(
            agent="resource",
            status="COMPLETED",
            summary=(
                f"Available: {resources['shelters']} shelter(s), "
                f"{resources['hospitals']} hospital(s), "
                f"{resources['teams']} team(s)."
            ),
            timestamp=now,
        ),
        AgentStep(
            agent="coordinator",
            status="COMPLETED",
            summary=(
                f"Coordinated specialist findings for {incident_id}."
            ),
            timestamp=now,
        ),
        AgentStep(
            agent="decision",
            status="COMPLETED",
            summary=(
                f"Recommended action: {decision['action']} "
                f"({decision['priority']}, confidence "
                f"{decision['confidence']}%)."
            ),
            timestamp=now,
        ),
    ]

    builder.complete()

    return AgentAnalysis(
        incident_id=incident_id,
        summary=(
            f"Analysis of {incident.get('title')}: risk is "
            f"{risk['level']} with {research['total_population']} "
            "people across the affected zones."
        ),
        risk=RiskAssessment(**risk),
        roads_affected=roads["affected"],
        resources=ResourceRecommendation(**resources),
        recommendation=DecisionRecommendation(**decision),
        confidence=decision["confidence"],
        steps=steps,
        mode="deterministic",
        completed_at=now,
    )


async def analyze_incident(
    incident_id: str,
    user_id: str = "operator-1",
    actor: str = "AGENT",
    log_activity: bool = True,
    requested_by: str = "operator-1",
    record_trace: bool = True,
):
    executed = await _run_workflow(incident_id, user_id)

    if log_activity:
        _log(
            f"Agent pipeline executed for incident {incident_id} "
            f"(agents: {', '.join(executed) or 'none'})",
            actor=actor,
            severity="INFO",
        )

    return _compute_deterministic(
        incident_id,
        requested_by=requested_by,
        record_trace=record_trace,
    )


def compute_deterministic(incident_id: str) -> AgentAnalysis:
    """Run the deterministic pipeline directly (no ADK workflow, no trace)."""
    return _compute_deterministic(incident_id, record_trace=False)


def get_traces(limit: int = 20) -> list[dict]:
    """Most-recent gateway trace records, newest first."""
    traces = list_documents("traces")

    return sorted(
        traces,
        key=lambda item: item.get("completed_at", ""),
        reverse=True,
    )[:limit]


def get_agent_activity() -> list[dict]:
    logs = list_documents("activity", {"actor": "AGENT"})

    return sorted(
        logs,
        key=lambda item: item.get("timestamp", ""),
        reverse=True,
    )


def log_scenario_activity(incident_id: str) -> None:
    _log(
        f"Scenario run executed for incident {incident_id}",
        actor="SCENARIO",
        severity="INFO",
    )
