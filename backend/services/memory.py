import chromadb
from pathlib import Path
from services.ollama import generate_embedding

CHROMA_DIR = Path(__file__).parent.parent / "chroma_data"

_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None


def get_chroma_client() -> chromadb.ClientAPI:
    """Get or create the persistent ChromaDB client."""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return _client


def get_collection() -> chromadb.Collection:
    """Get or create the journal entries collection."""
    global _collection
    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(
            name="journal_entries",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def init_memory() -> None:
    """Initialize ChromaDB collection. Safe to call multiple times."""
    get_collection()
    print(f"[OK] ChromaDB initialized at {CHROMA_DIR}")
    collection = get_collection()
    count = collection.count()
    print(f"  -> {count} entries in memory")


async def store_entry(entry_id: int, text: str, metadata: dict | None = None) -> None:
    """Embed and store a journal entry in ChromaDB."""
    collection = get_collection()
    embedding = await generate_embedding(text)

    entry_metadata = metadata or {}
    entry_metadata["entry_id"] = entry_id

    collection.upsert(
        ids=[str(entry_id)],
        embeddings=[embedding],
        documents=[text],
        metadatas=[entry_metadata],
    )


async def search_similar(query: str, n: int = 5) -> list[dict]:
    """
    Search for the top-N semantically similar entries.

    Returns a list of dicts with 'document', 'metadata', and 'distance' keys.
    """
    collection = get_collection()

    if collection.count() == 0:
        return []

    query_embedding = await generate_embedding(query)

    # Don't request more results than exist
    actual_n = min(n, collection.count())

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=actual_n,
        include=["documents", "metadatas", "distances"],
    )

    entries = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            entries.append({
                "document": doc,
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0.0,
            })

    return entries
