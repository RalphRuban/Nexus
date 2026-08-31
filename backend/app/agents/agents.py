from google.adk import Agent, Workflow

from app.agents.llm import build_llm
from app.agents.tools import (
    analyze_risk,
    assess_resources,
    geospatial_roads,
    recommend_response,
    research_incident,
    simulate_scenario,
)
from app.config import AGENT_LLM_MODE, AGENT_MODEL


def _model():
    return build_llm(AGENT_LLM_MODE)


def build_agents():
    research_agent = Agent(
        name="research",
        model=_model(),
        instruction=(
            "You are the Research agent. Call research_incident with the "
            "incident id and report the findings as JSON."
        ),
        tools=[research_incident],
    )

    risk_agent = Agent(
        name="risk",
        model=_model(),
        instruction=(
            "You are the Risk agent. Call analyze_risk with the incident id "
            "and report the risk assessment as JSON."
        ),
        tools=[analyze_risk],
    )

    geospatial_agent = Agent(
        name="geospatial",
        model=_model(),
        instruction=(
            "You are the Geospatial agent. Call geospatial_roads with the "
            "incident id and report road constraints as JSON."
        ),
        tools=[geospatial_roads],
    )

    resource_agent = Agent(
        name="resource",
        model=_model(),
        instruction=(
            "You are the Resource agent. Call assess_resources with the "
            "incident id and report resource availability as JSON."
        ),
        tools=[assess_resources],
    )

    coordinator_agent = Agent(
        name="coordinator",
        model=_model(),
        instruction=(
            "You are the Coordinator agent. Synthesize the specialist "
            "findings into a concise summary."
        ),
    )

    decision_agent = Agent(
        name="decision",
        model=_model(),
        instruction=(
            "You are the Decision agent. Call recommend_response with the "
            "incident id and report the recommended action as JSON."
        ),
        tools=[recommend_response],
    )

    simulation_agent = Agent(
        name="simulation",
        model=_model(),
        instruction=(
            "You are the Simulation agent. Call simulate_scenario with the "
            "incident id, scenario name and JSON mutations to evaluate a "
            "what-if scenario."
        ),
        tools=[simulate_scenario],
    )

    return {
        "research": research_agent,
        "risk": risk_agent,
        "geospatial": geospatial_agent,
        "resource": resource_agent,
        "coordinator": coordinator_agent,
        "decision": decision_agent,
        "simulation": simulation_agent,
    }


def build_workflow():
    agents = build_agents()

    workflow = Workflow(
        name="nexus_analysis",
        description="NEXUS crisis analysis pipeline",
        edges=[
            ("START", agents["research"]),
            (agents["research"], agents["risk"]),
            (agents["risk"], agents["geospatial"]),
            (agents["geospatial"], agents["resource"]),
            (agents["resource"], agents["coordinator"]),
            (agents["coordinator"], agents["decision"]),
        ],
    )

    return workflow, agents


def build_simulation_workflow():
    """Dedicated on-demand workflow for the Simulation agent."""
    agents = build_agents()

    workflow = Workflow(
        name="nexus_simulation",
        description="NEXUS what-if scenario evaluation",
        edges=[
            ("START", agents["simulation"]),
        ],
    )

    return workflow, agents["simulation"]
