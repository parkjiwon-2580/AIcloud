from fastapi import APIRouter

from app.schemas.analyze_request import (
    AnalyzeRequest
)

from app.services.symptom_extractor import (
    extract_symptoms
)

from app.services.danger_detector import (
    detect_danger_signs
)

from app.services.risk_calculator import (
    calculate_risk_level
)

from app.services.reliability_service import (
    calculate_reliability_score
)

router = APIRouter()

@router.post("/analyze")
def analyze(
    request: AnalyzeRequest
):

    symptoms = extract_symptoms(
        request.text
    )

    dangers = detect_danger_signs(
        request.text
    )

    risk_level = calculate_risk_level(
        symptoms,
        dangers
    )

    reliability_score = (
        calculate_reliability_score(
            request.text,
            symptoms,
            dangers
        )
    )

    return {

        "original_text":
            request.text,

        "symptoms":
            symptoms,

        "danger_signs":
            dangers,

        "risk_level":
            risk_level,

        "reliability_score":
            reliability_score
    }