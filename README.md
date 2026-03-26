# Multi-Tool AI Agent — Flex the Lion

<p align="center">
  <img src="public/assets/flex-logo.png" alt="Flex Logo" width="300" />
</p>
A **LangChain.js** multi-tool chat agent with a **Flex the Lion** themed web UI—built for **IS 590R (Applied AI Projects)** at BYU. Flex helps with math, web search, course MongoDB notes, general gym and fitness questions, and follow-ups using **session memory**.

## Demo Video

[![Watch the demo video](./assets/demo-thumbnail.png)](https://www.youtube.com/watch?v=z3ltPy5k-xc)

---

## Project overview

This project is a **ReAct-style** agent (via LangChain **`createAgent`**) exposed through a small **Express** API and a **plain HTML/CSS/JavaScript** chat interface. Users talk to **Flex the Lion**, who can call tools when appropriate and keep context within a browser session.

**Supported capabilities include:**

- **Calculator tool** — safe math via `mathjs` (no `eval`)
- **Tavily web search** — current events and live facts from the web
- **RAG** over **local** MongoDB-themed markdown in `docs/`, with **source attribution** in replies
- **Conversation memory** — in-memory history per `sessionId`
- **Web chat UI** — dark theme, responsive layout, **Flex branding**
- **Flex mascot states** — pose and status change with prompts (thinking while loading, math, workout, thanks, one-time “tired” milestone, answered after replies, and more)
- **General gym / fitness help** — practical, **non-medical** guidance in the system prompt (not a substitute for a professional)

---

## Features and functionality

- **Math** — Arithmetic, percentages, roots, and related expressions through the calculator tool.
- **Web search** — Questions that need up-to-date or external information (requires `TAVILY_API_KEY`).
- **MongoDB document Q&A** — Answers grounded in ingested `docs/*.md` with **Sources** surfaced when the knowledge base is used.
- **Follow-ups** — Same-session memory so you can ask for shorter summaries, clarifications, or next steps.
- **Gym / fitness** — General workout ideas, exercises, and beginner-friendly tips; **not** medical or personalized clinical advice.
- **Dynamic mascot (Flex)** — Client-side states including **thinking** (loading), **math**, **workout** (alternates between two images), **love** (thanks / positive messages), **tired** (one-time moment after five user prompts), **answered** (after a reply), plus a **curious** default for general prompts.
- **Structured JSON logging** — Tool and API activity logged as one JSON line per event (server-side).
- **Health check** — `GET /health` returns `{ "status": "ok" }`.

---

## Tech stack

| Technology | Role |
|------------|------|
| **Node.js** | Runtime (≥ 20 recommended) |
| **Express** | HTTP server, API routes, static `public/` files |
| **LangChain.js** | `createAgent`, ReAct loop, tool binding |
| **OpenAI** | Chat completions and embeddings (`@langchain/openai`) |
| **Tavily** | Web search tool (`@langchain/tavily`) |
| **HTML / CSS / JavaScript** | Chat UI (no React) |
| **mathjs** | Calculator tool |

---

## Project structure

```text
public/                 # Chat UI: index.html, styles.css, app.js; Flex assets in public/assets/
docs/                   # Markdown sources for RAG (sample MongoDB-topic notes)
src/
  server.js             # Express: /health, POST /api/chat, static files
  agent/
    prompts.js          # System instructions (Flex persona + tool rules)
    createAgent.js      # Agent factory and turn runner
    memoryStore.js      # In-memory chat history by sessionId
  tools/
    calculatorTool.js
    webSearchTool.js
    ragTool.js
    logger.js
  rag/
    vectorStore.js      # File-backed vectors + similarity search
    ingestDocs.js       # Chunk, embed, write vector store
    data/               # vector-store.json (generated; gitignored)
.env.example            # Template for environment variables
```

---

## Setup and installation

Follow these steps on your machine after cloning the repository.

1. **Clone the repository** (replace `<repo-url>` with your Git remote):

   ```bash
   git clone https://github.com/eddyog/multi-tool-ai-agent.git
   cd multi-tool-ai-agent
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables** — copy `.env.example` to `.env` and fill in your keys (see [Environment variables](#environment-variables) below).

4. **Ingest documents for RAG** (required before relying on the knowledge base):

   ```bash
   npm run ingest
   ```

   This generates `src/rag/data/vector-store.json`. Re-run **`npm run ingest`** whenever you change files under `docs/`.

5. **Start the server** — development mode with auto-restart:

   ```bash
   npm run dev
   ```

   Or production-style:

   ```bash
   npm start
   ```

6. **Open the app** in a browser: [http://localhost:3000](http://localhost:3000) (or the port set in `PORT`).  
   **Health check:** [http://localhost:3000/health](http://localhost:3000/health)

---

## Environment variables

Create a **`.env`** file in the project root. You can start from **`.env.example`**.

**Required / common entries:**

```env
OPENAI_API_KEY=
TAVILY_API_KEY=
PORT=3000
```

| Variable | Notes |
|----------|--------|
| `OPENAI_API_KEY` | **Required** for the chat model and embeddings (ingestion + RAG). |
| `TAVILY_API_KEY` | Optional for web search; if omitted, the search tool reports that search is unavailable. |
| `PORT` | Optional; defaults to **3000** if unset. |

**Optional (see `.env.example` or project docs):** `OPENAI_CHAT_MODEL`, `OPENAI_TEMPERATURE`, `AGENT_RECURSION_LIMIT`.

---

## How to use

1. Start the server (`npm run dev` or `npm start`) and open **http://localhost:3000**.
2. Read the **welcome** message from Flex and optional **starter prompts** (chips) for quick ideas.
3. Type a message in the box and press **Enter** to send ( **Shift+Enter** for a new line).
4. Watch the **mascot** and **status label** update while Flex **thinks**, then read the reply. If the model used the knowledge base, check the **Sources** section when present.
5. Ask **follow-ups** in the same tab—your **session** is remembered until you clear site data or the server restarts (memory is **in-memory**, not a database).

---

## Sample prompts

| Category | Example |
|----------|---------|
| **Math** | “What is `sqrt(256) + 15%` of 200 in one expression?” |
| **Web search** | “What is a short recent update on MongoDB Atlas?” *(needs `TAVILY_API_KEY`)* |
| **MongoDB docs (RAG)** | “From our docs: when should I embed vs reference another collection?” |
| **Gym / fitness** | “Suggest a simple 3-day beginner gym split with rest days.” |
| **Follow-up (memory)** | After a long answer: “Can you give a shorter summary?” |
| **Thank-you / fun** | “Thanks, Flex!” or “You’re awesome—love this UI.” |

---

## Demo video

**[Watch the demo video](https://www.youtube.com/watch?v=z3ltPy5k-xc)** 

This link is intended for the **course submission**: a short, unedited screen recording of the **web UI** showing Flex using **multiple tools** (for example calculator, web search, and RAG). Record after `npm run ingest` and with valid keys in `.env` as required by the assignment.

---

## Screenshots and branding

Flex uses several poses in the UI; here is the **answered** state after Flex completes a reply:

<p align="center">
  <img src="public/assets/flex-answered.png" alt="Flex Answered" width="300" />
</p>
---

## Notes and limitations

- This repository is a **school assignment demo**, not a production product.
- **Vector retrieval** uses **locally ingested** markdown under `docs/`; quality depends on those documents and on running **`npm run ingest`** after changes.
- **Gym and fitness** answers are **general and educational** only; Flex is **not** a medical professional—see the system prompt and UI copy for disclaimers.
- **Session memory** lives **in memory** on the server and is cleared when the process stops; there is **no** end-user authentication or persistent database in the baseline scope.

---

## Additional documentation

- **`context.md`** — Project context  
- **`PRD.md`** — Requirements and non-goals  
- **`Roadmap.md`** — Phased checklist  

## License

ISC (see `package.json`).
