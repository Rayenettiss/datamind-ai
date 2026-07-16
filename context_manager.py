# context_manager.py
import tiktoken

TOKEN_LIMIT = 5  # or whatever you're testing with
print(f"[context_manager] LOADED — TOKEN_LIMIT={TOKEN_LIMIT}", flush=True)
ENCODING = tiktoken.get_encoding("o200k_base")  # encodage utilisé par GPT-4o


def count_tokens(text: str) -> int:
    return len(ENCODING.encode(text))


def truncate_to_tokens(text: str, max_tokens: int) -> str:
    """Tronque `text` pour qu'il ne dépasse pas `max_tokens`, en gardant le début
    et la fin (souvent les parties les plus informatives d'un stack trace ou d'un
    résultat), et en indiquant clairement qu'une troncature a eu lieu."""
    tokens = ENCODING.encode(text)
    if len(tokens) <= max_tokens:
        return text

    half = max_tokens // 2
    head = ENCODING.decode(tokens[:half])
    tail = ENCODING.decode(tokens[-half:])
    return f"{head}\n\n[... contenu tronqué, {len(tokens) - max_tokens} tokens omis ...]\n\n{tail}"


def enforce_token_budget(prompt: str) -> tuple[str, bool]:
    """Vérifie le prompt complet avant envoi au LLM. S'il dépasse TOKEN_LIMIT,
    le tronque et retourne (prompt_tronqué, True). Sinon (prompt_original, False)."""
    total = count_tokens(prompt)
    if total <= TOKEN_LIMIT:
        return prompt, False

    # On tronque le prompt entier en dernier recours — les appelants peuvent
    # préférer tronquer un morceau spécifique (code, stdout) avant d'en arriver là.
    truncated = truncate_to_tokens(prompt, TOKEN_LIMIT)
    return truncated, True