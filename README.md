# 📓 The Journal

A fully local, AI-powered journaling web app. Chat with an empathetic AI companion that listens, reflects, and remembers — everything stays on your device.

**No cloud. No telemetry. No accounts.**

![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Stack](https://img.shields.io/badge/Ollama-000000?style=flat&logo=ollama&logoColor=white)
![Stack](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)

---

## How It Works

1. You type a message in the chat UI
2. The backend retrieves semantically similar past entries from **ChromaDB**
3. Context is injected into the **Ollama** prompt (RAG)
4. The AI responds with awareness of your history
5. Both your message and the AI's response are saved as dated journal entries in **SQLite**
6. Entries are embedded and stored in **ChromaDB** for future retrieval

```
┌─────────────┐     HTTP/SSE     ┌──────────────┐     HTTP     ┌─────────┐
│   React UI  │ ◄──────────────► │   FastAPI    │ ◄──────────► │ Ollama  │
│   :5173     │                  │   :8000      │              │ :11434  │
└─────────────┘                  └──────┬───────┘              └─────────┘
                                        │
                                 ┌──────┴───────┐
                                 │              │
                              SQLite        ChromaDB
                            journal.db     chroma_data/
```

---

## Prerequisites

- **[Ollama](https://ollama.ai)** installed and running
- **Python 3.11+**
- **Node.js 18+**

---

## Quick Start

### 1. Pull the AI models

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

---

## Project Structure

```
the-journal/
├── backend/
│   ├── main.py                  # FastAPI app + lifecycle
│   ├── database/
│   │   ├── db.py                # SQLite setup + connection manager
│   │   └── journal.db           # Auto-created on first run
│   ├── routes/
│   │   ├── chat.py              # POST /chat, POST /chat/stream
│   │   └── entries.py           # GET /entries, /entries/{date}, /search
│   ├── services/
│   │   ├── ollama.py            # Ollama client (chat + embeddings)
│   │   ├── memory.py            # ChromaDB vector store (RAG)
│   │   └── journal.py           # Journal CRUD operations
│   ├── chroma_data/             # ChromaDB persistent storage
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.tsx         # Chat interface with streaming
│   │   │   ├── Sidebar.tsx      # Date navigation + view toggle
│   │   │   └── EntryViewer.tsx  # Diary entry display
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Chat view
│   │   │   └── Diary.tsx        # Diary view with search
│   │   ├── api.ts               # API client
│   │   ├── types.ts             # TypeScript types
│   │   ├── App.tsx              # Root component
│   │   └── index.css            # Design tokens + global styles
│   ├── index.html
│   ├── vite.config.ts           # Vite + Tailwind + API proxy
│   └── package.json
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | Send a message, get AI response (non-streaming) |
| `POST` | `/chat/stream` | Send a message, stream AI response via SSE |
| `GET` | `/entries` | All entries grouped by date (newest first) |
| `GET` | `/entries/recent-days` | Recent days with entry counts |
| `GET` | `/entries/{date}` | Entries for a specific date (YYYY-MM-DD) |
| `GET` | `/search?q=query` | Semantic search over past entries |
| `GET` | `/health` | Health check (includes Ollama status) |

### Example: Send a message

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I had a really good day today"}'
```

### Example: Semantic search

```bash
curl "http://localhost:8000/search?q=feeling%20happy"
```

---

## RAG Pipeline

- **Embeddings**: `nomic-embed-text` via Ollama (`/api/embed`)
- **Vector Store**: ChromaDB with cosine similarity
- **Retrieval**: Top-5 semantically similar past entries per query
- **Injection**: Retrieved entries are prepended to the system prompt as context

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| Backend | FastAPI, Python 3.11+ |
| Database | SQLite (stdlib `sqlite3`) |
| AI Model | Ollama (llama3.2) |
| Embeddings | Ollama (nomic-embed-text) |
| Vector Store | ChromaDB (persistent, local) |

---

## Privacy

Everything runs locally on your machine:
- No data leaves your device
- No API keys needed
- No user accounts
- No telemetry or analytics
- Database files are stored in the `backend/` directory

---

## License

MIT
