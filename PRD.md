# Product Requirements Document (PRD)

## Problem

Students and reviewers need a **single place to ask questions** that sometimes require **calculation**, sometimes **up-to-date information from the web**, and sometimes **answers grounded in a fixed document set**. A plain chatbot without tools cannot do all three reliably; this project delivers a **multi-tool agent** that picks the right capability per question.

## Product

A **ReAct-style** chat agent (LangChain.js) exposed through a **simple web chat UI**, backed by an Express API. The agent uses **tools** instead of guessing: math → calculator, fresh facts → Tavily, internal knowledge → RAG with **explicit source attribution**.

## Features

- **Chat UI** — Send messages and see replies in the browser (plain HTML/CSS/JS).  
- **Calculator tool** — Evaluates math expressions safely (e.g. via `mathjs`).  
- **Web search tool** — Search via **Tavily** (`@langchain/tavily`).  
- **RAG tool** — Vector search over **at least five real documents**; responses include **where** the information came from (document/source labels).  
- **Conversation memory** — Follow-up questions retain prior turns in the session.  
- **Structured logging** — JSON logs for server lifecycle, requests, and **tool invocations** (name, args, results).  
- **Health check** — `GET /health` for “is the server up?”  

## Required tools (assignment)

| Tool        | Role                                      |
|------------|--------------------------------------------|
| Calculator | Numeric / symbolic math from user text     |
| Tavily     | Web search for current or external facts   |
| RAG        | Grounded answers from ingested documents   |

## Success criteria

- Repo is **runnable** from README instructions (`npm install`, `.env` from `.env.example`, `npm start` or `npm run dev`).  
- Agent demonstrates **ReAct** behavior: visible **tool use** and sensible routing.  
- RAG answers **attribute sources**; calculator and search tools behave predictably.  
- **Memory** works across multiple turns in one conversation.  
- Logs are **structured** and sufficient for grading (tool boundaries visible).  
- Documentation (**context**, **PRD**, **Roadmap**) matches what the code actually does.  

## Non-goals

- User accounts, login, or roles.  
- Production databases or persistent multi-user chat history (unless added later as a stretch).  
- TypeScript rewrite, React/Vue SPA, or microservices — unless the course explicitly requires a change.  
- “Polished product” UX beyond a clear, working chat interface and stable API.  
