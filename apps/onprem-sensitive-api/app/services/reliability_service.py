def calculate_reliability_score(
    text,
    symptoms,
    dangers
):

    score = 1.0

    if len(text) < 5:
        score -= 0.4

    if len(symptoms) == 0:
        score -= 0.3

    if len(dangers) > 0:
        score += 0.1

    score = max(
        0.0,
        min(score, 1.0)
    )

    return round(score, 2)