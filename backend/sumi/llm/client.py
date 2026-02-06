import json
import logging
from urllib.parse import quote

import anthropic
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from sumi.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singleton clients
# ---------------------------------------------------------------------------

_anthropic_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


_cerebras_client = None


def _get_cerebras():
    global _cerebras_client
    if _cerebras_client is None:
        import openai

        _cerebras_client = openai.AsyncOpenAI(
            api_key=settings.cerebras_api_key,
            base_url="https://api.cerebras.ai/v1",
        )
    return _cerebras_client


CEREBRAS_MODEL = "gpt-oss-120b"

# ---------------------------------------------------------------------------
# Anthropic provider
# ---------------------------------------------------------------------------


async def _anthropic_invoke(
    system: str | list[dict],
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> dict:
    """Invoke Claude via the Anthropic SDK.

    ``system`` can be a plain string (single text block) or a list of
    structured content blocks with optional ``cache_control``.
    """
    client = _get_client()
    response = await client.messages.create(
        model=model or settings.claude_model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )
    return {"content": [{"type": b.type, "text": b.text} for b in response.content]}


async def _bedrock_invoke(
    system: str | list[dict],
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> dict:
    """Invoke Claude via AWS Bedrock REST API with bearer token auth."""
    resolved_model = model or settings.anthropic_model or settings.claude_model
    url = (
        f"https://bedrock-runtime.{settings.aws_region}.amazonaws.com"
        f"/model/{quote(resolved_model, safe='')}/invoke"
    )
    logger.info("Bedrock request: %s", url)

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system,
        "messages": [{"role": "user", "content": user_message}],
    }

    async with httpx.AsyncClient(timeout=300) as http:
        resp = await http.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.anthropic_aws_bearer_token_bedrock}",
                "Content-Type": "application/json",
            },
            json=body,
        )
        resp.raise_for_status()
        return resp.json()


async def _invoke(
    system: str | list[dict],
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> dict:
    """Route to Bedrock or Anthropic SDK based on config."""
    fn = _bedrock_invoke if settings.use_bedrock else _anthropic_invoke
    return await fn(
        system,
        user_message,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def chat(
    system: str | list[dict],
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Send a message to Claude and return the text response."""
    result = await _invoke(
        system,
        user_message,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return result["content"][0]["text"]


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def chat_json(
    system: str | list[dict],
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.5,
) -> dict:
    """Send a message to Claude and parse the JSON response."""
    result = await _invoke(
        system,
        user_message,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    text = result["content"][0]["text"]
    # Handle markdown code blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return json.loads(text.strip())


# ---------------------------------------------------------------------------
# Cerebras provider (OpenAI-compatible)
# ---------------------------------------------------------------------------


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def cerebras_chat(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Send a message to Cerebras GPT-OSS and return the text response."""
    client = _get_cerebras()
    response = await client.chat.completions.create(
        model=model or CEREBRAS_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def cerebras_chat_json(
    system: str,
    user_message: str,
    *,
    model: str | None = None,
    max_tokens: int = 4096,
    temperature: float = 0.5,
) -> dict:
    """Send a message to Cerebras GPT-OSS and parse the JSON response."""
    text = await cerebras_chat(
        system,
        user_message,
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    # Handle markdown code blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return json.loads(text.strip())
