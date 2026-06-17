from datetime import datetime, timezone
from database.db import get_db


def save_entry(role: str, content: str) -> int:
    """
    Save a journal entry to SQLite.

    Returns the entry ID.
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    timestamp_str = now.isoformat()

    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO entries (date, timestamp, role, content) VALUES (?, ?, ?, ?)",
            (date_str, timestamp_str, role, content),
        )
        return cursor.lastrowid  # type: ignore[return-value]


def get_entry_by_id(entry_id: int) -> dict | None:
    """Retrieve a single entry by ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, date, timestamp, role, content FROM entries WHERE id = ?",
            (entry_id,),
        ).fetchone()
        if row:
            return dict(row)
        return None


def get_entries_by_date(date: str) -> list[dict]:
    """Get all entries for a specific date (YYYY-MM-DD), ordered by timestamp."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, date, timestamp, role, content FROM entries WHERE date = ? ORDER BY timestamp ASC",
            (date,),
        ).fetchall()
        return [dict(row) for row in rows]


def get_all_entries_grouped() -> list[dict]:
    """
    Return all entries grouped by date, newest date first.

    Returns a list of:
      { "date": "YYYY-MM-DD", "entry_count": N, "entries": [...] }
    """
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, date, timestamp, role, content FROM entries ORDER BY timestamp ASC",
        ).fetchall()

    # Group by date
    groups: dict[str, list[dict]] = {}
    for row in rows:
        entry = dict(row)
        date = entry["date"]
        if date not in groups:
            groups[date] = []
        groups[date].append(entry)

    # Sort by date descending (newest first)
    result = []
    for date in sorted(groups.keys(), reverse=True):
        entries = groups[date]
        result.append({
            "date": date,
            "entry_count": len(entries),
            "entries": entries,
        })

    return result


def get_recent_days(limit: int = 30) -> list[dict]:
    """
    Get recent days with entry counts for the sidebar.

    Returns a list of: { "date": "YYYY-MM-DD", "entry_count": N }
    """
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT date, COUNT(*) as entry_count
            FROM entries
            GROUP BY date
            ORDER BY date DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]


def get_today_conversation() -> list[dict]:
    """Get today's conversation entries for multi-turn context."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return get_entries_by_date(today)
