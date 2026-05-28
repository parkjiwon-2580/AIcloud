import re

def normalize_text(
    text: str
) -> str:

    text = re.sub(
        r"[^가-힣0-9\s]",
        " ",
        text
    )

    return text.strip()