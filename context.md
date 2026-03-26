# Context

## Purpose

This repository is a **school project** for IS 590R: a **multi-tool chatbot agent** built with **LangChain.js** that follows the **ReAct** pattern. The agent combines a calculator, web search (Tavily), and RAG over real documents, with **conversation memory** and a **simple web UI**.

## Tech stack

- **Runtime:** Node.js  
- **Server:** Express  
- **Agent / LLM:** LangChain.js (`langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/tavily`)  
- **Math:** `mathjs` (safe evaluation for the calculator tool — not `eval`)  
- **Frontend:** Plain HTML, CSS, and JavaScript under `public/`  
- **Config:** `dotenv` for environment variables  

## Architecture (high level)

- **`src/server.js`** — Express app: API routes (e.g. chat), static files, health check.  
- **`src/agent/`** — Agent graph / ReAct loop wiring (to be implemented).  
- **`src/tools/`** — LangChain tool definitions (calculator, Tavily, RAG) plus shared **structured logging** helpers.  
- **`src/rag/`** — Document loading, chunking, embeddings, and vector retrieval with **source attribution**.  
- **`src/utils/`** — Small shared helpers if needed.  
- **`public/`** — Chat UI assets.  
- **`docs/`** — Extra documentation for the course or project notes.  

## Constraints

- **No authentication** and **no databases** for this phase of the assignment (unless the rubric explicitly adds them later).  
- Keep implementations **straightforward** — avoid over-engineering, extra services, or heavy frameworks on the frontend.  
- **Secrets** only in `.env`; never commit API keys.  
- Course repo rules: **do not** add `.gitignore` entries that hide required grading artifacts (e.g. `.cursor/`, `CLAUDE.md`, `ai/` when the instructor expects them in the repo).

## Assignment goals (reference)

- Three tools: **calculator**, **Tavily web search**, **RAG** (≥5 real documents, answers cite sources).  
- **Multi-turn memory** and a **web UI** (terminal fallback not the target).  
- **Structured logging** including tool calls, arguments, and results.  
- Clear **README**, **PRD**, **Roadmap**, and **context** for reviewers and AI assistants.
