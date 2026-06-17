from fastapi import APIRouter, HTTPException, Query
from services.journal import (
    get_all_entries_grouped,
    get_entries_by_date,
    get_recent_days,
)
from services.memory import search_similar

router = APIRouter()


@router.get("/entries")
async def list_entries():
    """Return all entries grouped by date, newest first."""
    groups = get_all_entries_grouped()
    return {"groups": groups}


@router.get("/entries/recent-days")
async def recent_days(limit: int = Query(default=30, ge=1, le=365)):
    """Return recent days with entry counts for the sidebar."""
    days = get_recent_days(limit=limit)
    return {"days": days}


@router.get("/entries/{date}")
async def entries_by_date(date: str):
    """
    Return entries for a specific date (YYYY-MM-DD).

    Validates date format before querying.
    """
    # Validate date format
    import re

    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD.",
        )

    entries = get_entries_by_date(date)
    return {"date": date, "entries": entries, "entry_count": len(entries)}


@router.get("/search")
async def semantic_search(q: str = Query(..., min_length=1, description="Search query")):
    """
    Semantic search over past entries via ChromaDB.

    Returns the top matching entries ranked by relevance.
    """
    try:
        results = await search_similar(q, n=10)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Search failed: {str(e)}. Is Ollama running?",
        )

    formatted = []
    for r in results:
        formatted.append({
            "content": r["document"],
            "date": r["metadata"].get("date", ""),
            "role": r["metadata"].get("role", ""),
            "entry_id": r["metadata"].get("entry_id", ""),
            "relevance": round(1 - r["distance"], 4),  # Convert distance to similarity
        })

    return {"query": q, "results": formatted}
