/**
 * Tavily web search as a LangChain StructuredTool-style wrapper with JSON logging.
 */

const { DynamicStructuredTool } = require("@langchain/core/tools");
const { TavilySearch } = require("@langchain/tavily");
const { z } = require("zod");
const { logInfo, logError } = require("./logger");

const TOOL_NAME = "web_search";

const MAX_DIGEST_CHARS = 320;
const MAX_SNIPPET_CHARS = 220;

/**
 * Turn Tavily JSON into a conservative, clearly sectioned string for the agent.
 * Separates a cautious summary from raw source links/snippets so the model does not over-claim.
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
  const results = Array.isArray(d.results) ? d.results : [];
  if (results.length === 0) {
    return "No search results returned. There is nothing to summarize.";
  }

  const snippetLens = results.map((r) => ((r.content || "").trim().length));
  const thinSnippets = snippetLens.length > 0 && snippetLens.every((n) => n < 90);

  const summaryBlock = [];
  summaryBlock.push(
    "This section is ONLY a loose recap of what the search API returned. " +
      "Do not state facts as certain unless they appear clearly in the snippets under SOURCES. " +
      "If anything matters, confirm it by opening the links."
  );

  if (typeof d.answer === "string" && d.answer.trim()) {
    let digest = d.answer.replace(/\s+/g, " ").trim();
    if (digest.length > MAX_DIGEST_CHARS) {
      digest = `${digest.slice(0, MAX_DIGEST_CHARS)}…`;
    }
    summaryBlock.push(
      "Automated digest (may be incomplete or wrong; treat as hints only): " + digest
    );
  } else {
    summaryBlock.push(
      "No short digest was provided. Infer only what the source snippets below actually say—do not fill gaps with assumptions."
    );
  }

  const caveats = [];
  if (results.length >= 2) {
    caveats.push(
      "Several sources were retrieved; they may disagree or reflect different dates or angles."
    );
  }
  if (thinSnippets) {
    caveats.push("Snippets are very short—answers based on this search should be treated as preliminary and verified.");
  }
  if (caveats.length) {
    summaryBlock.push(caveats.join(" "));
  }
  summaryBlock.push(
    "If the question needs high confidence, say the user should verify using the URLs below."
  );

  const sourceLines = [];
  let i = 1;
  for (const r of results) {
    const title = r.title || "Untitled";
    const url = r.url || "(no URL)";
    const rawSnip = (r.content || "").replace(/\s+/g, " ").trim();
    const snippet = rawSnip.slice(0, MAX_SNIPPET_CHARS);
    const snipPart = snippet
      ? `\n   Excerpt: ${snippet}${rawSnip.length > MAX_SNIPPET_CHARS ? "…" : ""}`
      : "\n   Excerpt: (none)";
    sourceLines.push(`${i}. ${title}\n   Link: ${url}${snipPart}`);
    i += 1;
  }

  return (
    "=== SUMMARY (from search only; may need verification) ===\n" +
    summaryBlock.join("\n\n") +
    "\n\n=== SOURCES (use these to verify; do not invent beyond excerpts) ===\n" +
    sourceLines.join("\n\n")
  );
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
    description:
      tavily.description +
      " When you answer, stick to what the tool output (especially SOURCES excerpts) actually supports; " +
      "if results are thin or mixed, say the user should verify via the links.",
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
