import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.ollama import generate_response
from services.memory import store_entry, search_similar
from services.journal import save_entry, get_today_conversation

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    entry_id: int


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Process a chat message:
    1. Retrieve relevant past entries via semantic search
    2. Build context-augmented prompt
    3. Generate AI response via Ollama
    4. Save both messages to SQLite
    5. Embed and store both in ChromaDB
    """
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Step 1: Retrieve relevant past context via RAG
    similar_entries = await search_similar(user_message, n=5)
    context = ""
    if similar_entries:
        context_parts = []
        for entry in similar_entries:
            meta = entry.get("metadata", {})
            date = meta.get("date", "unknown date")
            role = meta.get("role", "unknown")
            context_parts.append(f"[{date}] ({role}): {entry['document']}")
        context = "\n".join(context_parts)

    # Step 2: Get today's conversation for multi-turn coherence
    today_entries = get_today_conversation()
    conversation_history = [
        {"role": e["role"], "content": e["content"]}
        for e in today_entries
    ]

    # Step 3: Generate response from Ollama
    try:
        full_response = ""
        async for chunk in generate_response(user_message, context, conversation_history):
            full_response += chunk
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to get response from Ollama: {str(e)}. Is Ollama running?",
        )

    if not full_response:
        raise HTTPException(status_code=503, detail="Empty response from Ollama")

    # Step 4: Save both messages to SQLite
    user_entry_id = save_entry("user", user_message)
    assistant_entry_id = save_entry("assistant", full_response)

    # Step 5: Embed and store in ChromaDB (best-effort, don't fail the request)
    try:
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        date_str = now.strftime("%Y-%m-%d")

        await store_entry(
            user_entry_id,
            user_message,
            {"role": "user", "date": date_str},
        )
        await store_entry(
            assistant_entry_id,
            full_response,
            {"role": "assistant", "date": date_str},
        )
    except Exception as e:
        # Log but don't fail — the entry is already saved in SQLite
        print(f"[WARN] Failed to store embeddings: {e}")

    return ChatResponse(response=full_response, entry_id=user_entry_id)


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """
    Stream a chat response via Server-Sent Events (SSE).

    Events:
      - data: {"chunk": "..."} — partial response text
      - data: {"done": true, "entry_id": N, "response": "..."} — completion signal
    """
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Retrieve context
    similar_entries = await search_similar(user_message, n=5)
    context = ""
    if similar_entries:
        context_parts = []
        for entry in similar_entries:
            meta = entry.get("metadata", {})
            date = meta.get("date", "unknown date")
            role = meta.get("role", "unknown")
            context_parts.append(f"[{date}] ({role}): {entry['document']}")
        context = "\n".join(context_parts)

    today_entries = get_today_conversation()
    conversation_history = [
        {"role": e["role"], "content": e["content"]}
        for e in today_entries
    ]

    async def event_stream():
        full_response = ""
        try:
            async for chunk in generate_response(user_message, context, conversation_history):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Save entries
        user_entry_id = save_entry("user", user_message)
        assistant_entry_id = save_entry("assistant", full_response)

        # Embed (best-effort)
        try:
            from datetime import datetime, timezone

            now = datetime.now(timezone.utc)
            date_str = now.strftime("%Y-%m-%d")
            await store_entry(
                user_entry_id,
                user_message,
                {"role": "user", "date": date_str},
            )
            await store_entry(
                assistant_entry_id,
                full_response,
                {"role": "assistant", "date": date_str},
            )
        except Exception as e:
            print(f"[WARN] Failed to store embeddings: {e}")

        yield f"data: {json.dumps({'done': True, 'entry_id': user_entry_id, 'response': full_response})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
