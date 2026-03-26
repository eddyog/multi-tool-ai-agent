/**
 * Tavily web search as a LangChain StructuredTool-style wrapper with JSON logging.
 */

const { DynamicStructuredTool } = require("@langchain/core/tools");
const { TavilySearch } = require("@langchain/tavily");
const { z } = require("zod");
const { logInfo, logError } = require("./logger");

const TOOL_NAME = "web_search";

/**
 * Turn Tavily JSON into a short readable string for the agent.
 * @param {unknown} data
 */
function formatTavilyResults(data) {
  if (!data || typeof data !== "object") {
    return "No search results.";
  }
  const d = /** @type {{ error?: string; answer?: string; results?: { title?: string; url?: string; content?: string }[] }} */ (
    data
  );
  if (d.error) {
    return `Search error: ${d.error}`;
  }
  const lines = [];
  if (d.answer) {
    lines.push(`Summary: ${d.answer}`);
  }
  const results = Array.isArray(d.results) ? d.results : [];
  if (results.length === 0) {
    return lines.length ? lines.join("\n") : "No search results returned.";
  }
  for (const r of results) {
    const title = r.title || "Untitled";
    const url = r.url || "";
    const snippet = (r.content || "").replace(/\s+/g, " ").trim().slice(0, 400);
    lines.push(`- ${title} (${url})\n  ${snippet}`);
  }
  return lines.join("\n\n");
}

/**
 * @returns {import("@langchain/core/tools").DynamicStructuredTool}
 */
function createWebSearchTool() {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey || !String(apiKey).trim()) {
    return new DynamicStructuredTool({
      name: TOOL_NAME,
      description:
        "Search the web for current events, news, and facts using Tavily. Use a short, focused query string.",
      schema: z.object({
        query: z.string().describe("Search query"),
      }),
      func: async ({ query }) => {
        logInfo("Tool call: web_search (skipped)", {
          tool: TOOL_NAME,
          arguments: { query },
          output: "TAVILY_API_KEY missing",
        });
        return "Web search is unavailable: TAVILY_API_KEY is not set in the environment.";
      },
    });
  }

  const tavily = new TavilySearch({
    maxResults: 5,
    tavilyApiKey: apiKey.trim(),
    includeAnswer: true,
  });

  return new DynamicStructuredTool({
    name: TOOL_NAME,
    description: tavily.description,
    schema: z.object({
      query: z.string().describe("Search query"),
    }),
    func: async ({ query }) => {
      logInfo("Tool call: web_search", {
        tool: TOOL_NAME,
        arguments: { query },
      });
      try {
        const raw = await tavily.invoke({ query });
        if (raw && typeof raw === "object" && "error" in raw && raw.error) {
          logError("Tool result: web_search API error", {
            tool: TOOL_NAME,
            arguments: { query },
            error: String(raw.error),
          });
          return `Search failed: ${raw.error}`;
        }
        const text = formatTavilyResults(raw);
        const count = raw && typeof raw === "object" && Array.isArray(raw.results) ? raw.results.length : 0;
        logInfo("Tool result: web_search", {
          tool: TOOL_NAME,
          arguments: { query },
          resultsCount: count,
          outputPreview: text.slice(0, 600),
        });
        return text;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError("Tool call: web_search exception", {
          tool: TOOL_NAME,
          arguments: { query },
          error: msg,
        });
        return `Search failed: ${msg}`;
      }
    },
  });
}

module.exports = { createWebSearchTool };
