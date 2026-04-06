from dataclasses import dataclass
from typing import Literal


StateName = Literal[
    "Emerging",
    "Accelerating",
    "Stable",
    "Saturating",
    "Declining",
    "Speculative",
]


@dataclass
class StateInput:
    growth_rate: float
    saturation: float
    geographic_density: float
    maturity_shift: float
    momentum_score: float
    confidence: float


@dataclass
class StateOutput:
    state: StateName
    rationale: str
    confidence: float


def infer_state(signal: StateInput) -> StateOutput:
    if signal.confidence < 0.45:
        return StateOutput(
            state="Speculative",
            rationale="Signal confidence below threshold; trend requires analyst validation.",
            confidence=signal.confidence,
        )

    if signal.growth_rate <= -0.18 and signal.momentum_score < 0.35:
        return StateOutput(
            state="Declining",
            rationale="Negative growth with weak momentum across observed windows.",
            confidence=signal.confidence,
        )

    if signal.growth_rate > 0.30 and signal.momentum_score >= 0.72 and signal.saturation < 0.70:
        return StateOutput(
            state="Accelerating",
            rationale="Strong growth and momentum with remaining headroom before saturation.",
            confidence=signal.confidence,
        )

    if 0.08 <= signal.growth_rate <= 0.30 and signal.momentum_score >= 0.58:
        return StateOutput(
            state="Emerging",
            rationale="Growth is positive and momentum sustained, with market still forming.",
            confidence=signal.confidence,
        )

    if signal.saturation >= 0.78 and signal.growth_rate >= 0:
        return StateOutput(
            state="Saturating",
            rationale="Adoption is broad but incremental growth is flattening.",
            confidence=signal.confidence,
        )

    return StateOutput(
        state="Stable",
        rationale="Signals indicate steady movement without major acceleration or contraction.",
        confidence=signal.confidence,
    )

