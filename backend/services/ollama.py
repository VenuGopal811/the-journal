import httpx
from typing import AsyncGenerator

OLLAMA_BASE_URL = "http://localhost:11434"
CHAT_MODEL = "llama3.2"
EMBED_MODEL = "nomic-embed-text"

SYSTEM_PROMPT = (
    "You are The Journal -- a private, empathetic AI companion and diary keeper. "
    "The user talks to you like a friend. Your job is to listen, respond thoughtfully, "
    "and help them reflect. You have access to their past journal entries as context. "
    "Never mention that you are an AI unless directly asked. Be warm, concise, and human. "
    "Never be preachy.Don't analyze the user's emotions unless they explicitly ask you to. "
    "Don't label what they're feeling. Just respond naturally like a friend who's paying attention. "
    "If they share something, engage with the content, not the feeling behind it."
    "Never assume or project emotional states onto the user. If they say I'm going to my Mausi's place, 
    that's just a fact don't read nervousness or excitement into it."
)


async def generate_response(
    user_message: str,
    context: str = "",
    conversation_history: list[dict[str, str]] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Stream a response from Ollama using the chat API.

    Yields chunks of the response text as they arrive.
    """
    messages: list[dict[str, str]] = []

    # Build system prompt with optional RAG context
    system_content = SYSTEM_PROMPT
    if context:
        system_content += (
            "\n\nRelevant past journal context:\n"
            f"{context}"
        )

    messages.append({"role": "system", "content": system_content})

    # Include recent conversation history for multi-turn coherence
    if conversation_history:
        messages.extend(conversation_history[-10:])  # Last 10 messages max

    messages.append({"role": "user", "content": user_message})

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": CHAT_MODEL,
                "messages": messages,
                "stream": True,
            },
        ) as response:
            response.raise_for_status()
            import json

            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    if "message" in data and "content" in data["message"]:
                        chunk = data["message"]["content"]
                        if chunk:
                            yield chunk
                except json.JSONDecodeError:
                    continue


async def generate_response_full(
    user_message: str,
    context: str = "",
    conversation_history: list[dict[str, str]] | None = None,
) -> str:
    """Non-streaming variant that returns the full response as a string."""
    chunks: list[str] = []
    async for chunk in generate_response(user_message, context, conversation_history):
        chunks.append(chunk)
    return "".join(chunks)


async def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector for the given text using Ollama."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/embed",
            json={
                "model": EMBED_MODEL,
                "input": text,
            },
        )
        response.raise_for_status()
        data = response.json()
        # Ollama /api/embed returns {"embeddings": [[...]]}
        return data["embeddings"][0]


async def check_ollama_health() -> bool:
    """Check if Ollama is reachable and the required models are available."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m["name"].split(":")[0] for m in models]
                has_chat = CHAT_MODEL in model_names
                has_embed = EMBED_MODEL in model_names
                if not has_chat:
                    print(f"[WARN] Model '{CHAT_MODEL}' not found. Run: ollama pull {CHAT_MODEL}")
                if not has_embed:
                    print(f"[WARN] Model '{EMBED_MODEL}' not found. Run: ollama pull {EMBED_MODEL}")
                return has_chat and has_embed
            return False
    except httpx.ConnectError:
        print("[WARN] Cannot connect to Ollama. Is it running? Start with: ollama serve")
        return False
