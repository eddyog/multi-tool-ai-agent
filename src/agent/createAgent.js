/**
 * LangChain.js createAgent (ReAct) with calculator, Tavily search, and RAG tools.
 */

require("dotenv").config();

const { createAgent } = require("langchain");
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");

const { createCalculatorTool } = require("../tools/calculatorTool");
const { createWebSearchTool } = require("../tools/webSearchTool");
const { createRagTool } = require("../tools/ragTool");
const { getSystemPrompt } = require("./prompts");

/** @type {ReturnType<typeof createAgent> | null} */
let cachedAgent = null;

/**
 * Build (or rebuild) the agent graph.
 */
function buildAgent() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to run the agent.");
  }

  const temperature = Number.parseFloat(process.env.OPENAI_TEMPERATURE ?? "0");
  const model = new ChatOpenAI({
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    temperature: Number.isFinite(temperature) ? temperature : 0,
  });

  const tools = [createCalculatorTool(), createWebSearchTool(), createRagTool()];

  return createAgent({
    model,
    tools,
    systemPrompt: getSystemPrompt(),
  });
}

/**
 * Singleton agent (good enough for this assignment; restart server to pick up env changes).
 */
function getAgent() {
  if (!cachedAgent) {
    cachedAgent = buildAgent();
  }
  return cachedAgent;
}

/**
 * @param {unknown} content
 */
function normalizeMessageContent(content) {
  if (typeof content === "string") {
    const t = content.trim();
    return t || "Sorry, the model returned an empty message.";
  }
  if (Array.isArray(content)) {
    const texts = content
      .filter((b) => b && typeof b === "object" && b.type === "text" && typeof b.text === "string")
      .map((b) => b.text);
    if (texts.length) return texts.join("\n").trim();
    return content.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("\n");
  }
  if (content == null) return "Sorry, empty response.";
  return String(content);
}

/**
 * Last AI message in the trace is typically the final natural-language reply.
 * @param {{ messages?: unknown[] }} result
 */
function extractAssistantReply(result) {
  const msgs = result?.messages || [];
  /** @type {import("@langchain/core/messages").AIMessage | null} */
  let lastAi = null;
  for (const m of msgs) {
    if (AIMessage.isInstance(m)) lastAi = m;
  }
  if (!lastAi) {
    return "Sorry, I did not get a response from the model.";
  }
  return normalizeMessageContent(lastAi.content);
}

/**
 * Run one user turn with prior session history (no LangGraph checkpointer — memory is in memoryStore).
 * @param {{ history: { role: string, content: string }[], message: string }} params
 */
async function runAgentTurn({ history, message }) {
  const agent = getAgent();

  /** @type {import("@langchain/core/messages").BaseMessage[] } */
  const messages = [];
  for (const m of history) {
    if (m.role === "user") messages.push(new HumanMessage(m.content));
    else if (m.role === "assistant") messages.push(new AIMessage(m.content));
  }
  messages.push(new HumanMessage(message));

  const result = await agent.invoke(
    { messages },
    { recursionLimit: Number.parseInt(process.env.AGENT_RECURSION_LIMIT || "50", 10) || 50 }
  );

  return extractAssistantReply(result);
}

module.exports = {
  buildAgent,
  getAgent,
  runAgentTurn,
  extractAssistantReply,
};
