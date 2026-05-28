def is_negated(
    text: str,
    pattern: str
) -> bool:

    negation_patterns = [

        f"{pattern} 없",
        f"{pattern} 안",
        f"{pattern} 아니",

        f"{pattern}은 없",
        f"{pattern}는 없",
        f"{pattern}이 없",
        f"{pattern}가 없",

        f"{pattern}은 아니",
        f"{pattern}는 아니",

        f"{pattern} 안 나",
        f"{pattern} 안 해"
    ]

    for neg in negation_patterns:

        if neg in text:
            return True

    return False