from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.db import init_db
from services.memory import init_memory
from services.ollama import check_ollama_health
from routes.chat import router as chat_router
from routes.entries import router as entries_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle."""
    print("-" * 50)
    print("[The Journal] Starting up...")
    print("-" * 50)

    # Initialize SQLite database
    init_db()
    print("[OK] SQLite database initialized")

    # Initialize ChromaDB
    init_memory()

    # Check Ollama health
    healthy = await check_ollama_health()
    if healthy:
        print("[OK] Ollama is running with required models")
    else:
        print("[WARN] Ollama check failed -- chat will not work until resolved")

    print("-" * 50)
    print("[The Journal] Ready")
    print("-" * 50)

    yield

    # Shutdown
    print("[The Journal] Shutting down...")


app = FastAPI(
    title="The Journal",
    description="A private, local AI-powered journaling companion",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(chat_router, tags=["Chat"])
app.include_router(entries_router, tags=["Entries"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    ollama_ok = await check_ollama_health()
    return {
        "status": "ok",
        "ollama": "connected" if ollama_ok else "disconnected",
    }
