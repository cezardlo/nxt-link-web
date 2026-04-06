from dataclasses import dataclass

from app.state.engine import StateOutput


@dataclass
class NarrativeInput:
    mission: str
    current_movement: str
    risk: str
    opportunity_gap: str
    deployment_readiness: str
    confidence_level: float


def generate_executive_brief(input_data: NarrativeInput, state: StateOutput) -> dict[str, str]:
    confidence_text = (
        "High" if input_data.confidence_level >= 0.78 else "Moderate" if input_data.confidence_level >= 0.55 else "Low"
    )
    return {
        "MISSION": input_data.mission.strip(),
        "CURRENT_MOVEMENT": f"{input_data.current_movement} State: {state.state}. {state.rationale}",
        "RISK": input_data.risk.strip(),
        "OPPORTUNITY_GAP": input_data.opportunity_gap.strip(),
        "DEPLOYMENT_READINESS": input_data.deployment_readiness.strip(),
        "CONFIDENCE_LEVEL": f"{confidence_text} ({round(input_data.confidence_level * 100)}%)",
    }

