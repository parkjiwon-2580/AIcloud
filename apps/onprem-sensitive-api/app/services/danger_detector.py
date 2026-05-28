from kiwipiepy import Kiwi

from app.data.danger_signs import (
    DANGER_SIGNS
)

from app.utils.text_normalizer import (
    normalize_text
)

from app.utils.fuzzy_match import (
    fuzzy_contains
)

from app.utils.negation_checker import (
    is_negated
)

kiwi = Kiwi()

def detect_danger_signs(
    text: str
):

    dangers = set()

    normalized_text = normalize_text(
        text
    )

    tokens = kiwi.tokenize(
        normalized_text
    )

    morphs = [

        token.form
        for token in tokens
    ]

    joined_text = " ".join(morphs)

    for danger, patterns in DANGER_SIGNS.items():

        for pattern in patterns:

            matched = (

                pattern in normalized_text or
                pattern in joined_text or

                fuzzy_contains(
                    pattern,
                    normalized_text,
                    morphs
                )
            )

            if matched:

                if not is_negated(
                    normalized_text,
                    pattern
                ):

                    dangers.add(danger)

    return list(dangers)