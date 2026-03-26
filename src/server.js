/**
 * Express API for the multi-tool chatbot: health, static UI, agent-backed chat.
 */

require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const path = require("path");

const { logInfo, logError } = require("./tools/logger");
const { getHistory, appendMessage } = require("./agent/memoryStore");
const { runAgentTurn } = require("./agent/createAgent");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// API routes before static files so paths like /health are never swallowed by static middleware
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * Chat with the LangChain agent. Body: { sessionId?: string, message: string }
 * If sessionId is omitted, a new one is created and returned in the response.
 */
app.post("/api/chat", async (req, res) => {
  try {
    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    let sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    logInfo("Incoming POST /api/chat", {
      sessionId,
      messageLength: message.length,
      hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    });

    if (!message) {
      return res.status(400).json({ error: "message is required (non-empty string)", sessionId });
    }

    if (!process.env.OPENAI_API_KEY) {
      logError("POST /api/chat rejected: missing OPENAI_API_KEY", { sessionId });
      return res.status(503).json({
        error: "Server is not configured: set OPENAI_API_KEY in .env",
        sessionId,
      });
    }

    const history = getHistory(sessionId);

    const reply = await runAgentTurn({ history, message });

    appendMessage(sessionId, { role: "user", content: message });
    appendMessage(sessionId, { role: "assistant", content: reply });

    logInfo("POST /api/chat response", {
      sessionId,
      replyLength: reply.length,
      replyPreview: reply.slice(0, 400),
    });

    res.json({ reply, sessionId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError("Error handling POST /api/chat", { error: msg });
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use(express.static(path.join(__dirname, "..", "public")));

const server = app.listen(PORT);

server.once("listening", () => {
  const addr = server.address();
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
