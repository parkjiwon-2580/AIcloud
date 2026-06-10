from rapidfuzz import fuzz
import re

FUZZY_THRESHOLD = 80

def fuzzy_contains(
    pattern: str,
    text: str,
    morphs: list
) -> bool:

    # 짧은 단어는 fuzzy 금지
    if len(pattern) <= 1:
        return False

    # 형태소 비교
    for morph in morphs:

        similarity = fuzz.ratio(
            pattern,
            morph
        )

        if similarity >= FUZZY_THRESHOLD:
            return True

    # 단어 비교
    words = re.findall(
        r"[가-힣]+",
        text
    )

    for word in words:

        similarity = fuzz.partial_ratio(
            pattern,
            word
        )

        if similarity >= FUZZY_THRESHOLD:
            return True

    return False