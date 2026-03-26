# Multi-tool AI Agent

A **LangChain.js** chat **agent** (ReAct-style) with **three tools** — calculator, **Tavily** web search, and **RAG** over real documents — plus **conversation memory** and a **simple web UI**. Built for an individual **IS 590R** project (Dev Units 7–8).

## Features (target)

| Area | What you get |
|------|----------------|
| **Tools** | Safe calculator (`mathjs`), web search (Tavily), RAG with **source attribution** |
| **Agent** | ReAct pattern: model decides when to call which tool |
| **Memory** | Multi-turn context in a session |
| **API** | Express server — chat endpoint + health check |
| **UI** | Plain HTML/CSS/JS in `public/` (to be wired) |
| **Logging** | Structured JSON logs (tool calls, args, results) |

## Tech stack

- **Node.js** + **Express**
- **LangChain.js:** `langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/tavily`
- **Math:** `mathjs`
- **No** auth, **no** database (per assignment baseline)

## Quick start

1. **Clone** the repo and install dependencies:

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env` and add your keys:

   - `OPENAI_API_KEY` — from [OpenAI](https://platform.openai.com/)
   - `TAVILY_API_KEY` — from [Tavily](https://www.tavily.com/)
   - `PORT` — optional (defaults to `3000`)

3. **Run the server:**

   ```bash
   npm start
   ```

   For auto-reload during development:

   ```bash
   npm run dev
   ```

4. **Health check:** open or curl `http://localhost:3000/health` — expect `{ "status": "ok" }`.

5. **Chat API (placeholder):** `POST /api/chat` with JSON body — agent wiring comes in a later phase.

## Project layout

```text
src/
  server.js      # Express app (API + static files)
  agent/         # Agent / ReAct wiring (next)
  tools/         # LangChain tools + logging helpers
  rag/           # Embeddings, vector store, ingest
  utils/         # Small shared helpers
public/          # Chat UI (HTML/CSS/JS)
docs/            # Optional extra notes
```

## Documentation

- **`context.md`** — Purpose, architecture, constraints  
- **`PRD.md`** — Problem, features, success criteria, non-goals  
- **`Roadmap.md`** — Phased checklist and progress  

## Project status

| Phase | Status |
|--------|--------|
| Repo + Express skeleton + logging | **Done** |
| LangChain agent + three tools | **Not started** |
| RAG ingest + attribution | **Not started** |
| Chat UI + memory | **Not started** |
| Polish + demo video + commit history | **Not started** |

## License

ISC (see `package.json`).
