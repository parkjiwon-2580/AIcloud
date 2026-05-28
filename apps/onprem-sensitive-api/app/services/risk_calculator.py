def calculate_risk_level(
    symptoms,
    dangers
):

    if len(dangers) > 0:
        return "high"

    if (
        "발열" in symptoms and
        "활동성 저하" in symptoms
    ):
        return "medium"

    return "low"