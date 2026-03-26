/**
 * Express API for the multi-tool chatbot.
 * Phase 1: health check, placeholder chat route, structured logging.
 * Agent + LangChain tools are wired in a later phase.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { logInfo, logError } = require("./tools/logger");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Allow the browser UI (any origin in dev; tighten if you deploy publicly)
app.use(cors());
app.use(express.json());

// API routes before static files so paths like /health are never swallowed by static middleware
/** Liveness / grading sanity check */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * Chat endpoint — placeholder until the LangChain agent is implemented.
 * Expects JSON body, e.g. { "message": "..." } (shape may evolve with the UI).
 */
app.post("/api/chat", (req, res) => {
  try {
    const { message } = req.body || {};

    logInfo("Incoming POST /api/chat", {
      hasMessage: typeof message === "string",
      messageLength: typeof message === "string" ? message.length : 0,
    });

    // Placeholder response — replace with agent.invoke (or stream) later
    res.json({
      reply:
        "Server is running. The LangChain agent is not connected yet — implement tools and ReAct in src/agent next.",
      echo: typeof message === "string" ? message : null,
    });
  } catch (err) {
    logError("Error handling POST /api/chat", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Static files for the chat UI (add public/index.html in the UI phase)
app.use(express.static(path.join(__dirname, "..", "public")));

const server = app.listen(PORT);

server.once("listening", () => {
  const addr = server.address();
  // addr is null if listen failed before binding; should not happen if this event fired
  const boundPort = addr && typeof addr === "object" ? addr.port : PORT;
  logInfo("Server started", { port: boundPort });
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    logError("Port already in use — another process is using this port", {
      port: PORT,
      hint: "Stop the other app, or set PORT in .env to a free port (e.g. 3001). On macOS you can run: lsof -i :" + PORT,
    });
  } else {
    logError("Server failed to start", {
      code: err && err.code,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  process.exit(1);
});
