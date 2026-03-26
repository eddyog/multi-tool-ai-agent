# Roadmap

Phased checklist for the multi-tool agent. Check boxes as you complete each phase.

## Setup

- [x] Node project with Express, LangChain.js dependencies, and scripts (`start` / `dev`)
- [x] `.env.example`, `.gitignore`, and course-friendly repo layout (`src/`, `public/`, `docs/`)
- [x] Cursor project rules (`.cursor/rules/project.mdc`)
- [x] `context.md`, `PRD.md`, `README.md` aligned with the assignment

## Backend

- [x] Express server with JSON body parsing, CORS, `GET /health`
- [ ] `POST /api/chat` wired to the real agent (currently placeholder)
- [ ] Centralized error handling and consistent JSON error responses (keep simple)

## Tools

- [ ] Calculator tool (safe `mathjs` evaluation)
- [ ] Tavily web search tool (`@langchain/tavily`)
- [ ] Tool descriptions clear enough for the model to choose correctly

## RAG

- [ ] At least **5 real documents** ingested into a vector store
- [ ] Retrieval + tool that returns **text + source labels** for attribution
- [ ] Ingest script or documented one-time setup (if not using persistent store)

## Memory

- [ ] Multi-turn conversation memory for the agent (session-scoped)
- [ ] Memory cleared or scoped per session/tab as appropriate for the UI

## UI

- [ ] `public/` chat page: input, message list, call to `/api/chat`
- [ ] Show user vs assistant messages; optional loading state
- [ ] (Stretch) streamed tokens in the UI

## Polish

- [ ] Structured logs for every tool call (name, args, result summary)
- [ ] README: setup, env vars, how to run ingest/RAG, demo tips
- [ ] **5+ meaningful git commits** (setup → tools → agent → UI → RAG → polish)
- [ ] Record **2-minute demo video** (unedited screen capture of UI + tools)

### Stretch (extra credit)

- [ ] Streaming responses in the web UI
- [ ] Fourth custom tool
- [ ] Persistent vector store (documents survive restart)
- [ ] ~1-page agent proposal write-up (separate doc or `docs/`)
