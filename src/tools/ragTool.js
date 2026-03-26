/**
 * RAG tool: retrieve from local vector store and answer with citations (title + source path).
 */

const { DynamicStructuredTool } = require("@langchain/core/tools");
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { z } = require("zod");
const { logInfo, logError } = require("./logger");
const { similaritySearch, loadEntries } = require("../rag/vectorStore");

const TOOL_NAME = "knowledge_base";

/**
 * @returns {import("@langchain/core/tools").DynamicStructuredTool}
 */
function createRagTool() {
  return new DynamicStructuredTool({
    name: TOOL_NAME,
    description:
      "Look up information from the course knowledge base (MongoDB developer notes in docs/). " +
      "Use for concepts covered in those documents. Input: a clear question string.",
    schema: z.object({
      question: z.string().describe("Question to answer using ingested documentation"),
    }),
    func: async ({ question }) => {
      logInfo("Tool call: knowledge_base", {
        tool: TOOL_NAME,
        arguments: { question },
      });

      if (!process.env.OPENAI_API_KEY) {
        logError("Tool call: knowledge_base missing OPENAI_API_KEY", { tool: TOOL_NAME });
        return "Knowledge base is unavailable: OPENAI_API_KEY is not set.";
      }

      try {
        const entries = await loadEntries();
        if (entries.length === 0) {
          logInfo("Tool result: knowledge_base empty store", { tool: TOOL_NAME });
          return (
            "No indexed documents were found. Run `npm run ingest` after adding markdown files to docs/ " +
            "so the vector store is built."
          );
        }

        const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
        const queryVec = await embeddings.embedQuery(question);
        const hits = await similaritySearch(queryVec, 4);

        const contextBlocks = hits.map((h, i) => {
          const title = h.metadata.title || "Unknown title";
          const source = h.metadata.source || h.metadata.path || "unknown source";
          return `[#${i + 1}] Title: ${title}\nSource: ${source}\n(Similarity: ${h.score.toFixed(4)})\n${h.pageContent}`;
        });

        const context = contextBlocks.join("\n\n---\n\n");

        const model = new ChatOpenAI({
          model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
          temperature: 0,
        });

        const sys = new SystemMessage(
          "You are a careful assistant. Answer ONLY using the provided context. " +
            "If the context is insufficient, say so. " +
            "At the end, add a short 'Sources:' section listing each distinct title and source path/url you used from the context blocks."
        );
        const human = new HumanMessage(
          `Context from knowledge base:\n\n${context}\n\nQuestion: ${question}`
        );

        const res = await model.invoke([sys, human]);
        const text =
          typeof res.content === "string" ? res.content : JSON.stringify(res.content);

        logInfo("Tool result: knowledge_base", {
          tool: TOOL_NAME,
          arguments: { question },
          chunksUsed: hits.length,
          sources: hits.map((h) => ({
            title: h.metadata.title,
            source: h.metadata.source || h.metadata.path,
            score: Number(h.score.toFixed(4)),
          })),
          outputPreview: text.slice(0, 800),
        });

        return text;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError("Tool call: knowledge_base error", {
          tool: TOOL_NAME,
          arguments: { question },
          error: msg,
        });
        return `Knowledge base error: ${msg}`;
      }
    },
  });
}

module.exports = { createRagTool };
