/**
 * One-shot ingestion: read markdown from docs/, chunk, embed with OpenAI, save vector store.
 * Run: npm run ingest  (requires OPENAI_API_KEY and populated docs/*.md)
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { logInfo, logError } = require("../tools/logger");
const { saveEntries, clearCache } = require("./vectorStore");

const DOCS_DIR = path.join(__dirname, "..", "..", "docs");
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;

/**
 * Parse simple YAML-like frontmatter (title, source) and body.
 * @param {string} raw
 * @param {string} fallbackTitle
 * @param {string} fallbackSource
 */
function parseMarkdownDoc(raw, fallbackTitle, fallbackSource) {
  const meta = {
    title: fallbackTitle,
    source: fallbackSource,
  };
  let body = raw;

  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---\n", 4);
    if (end !== -1) {
      const fm = raw.slice(4, end);
      body = raw.slice(end + 5);
      for (const line of fm.split("\n")) {
        const m = line.match(/^(\w+)\s*:\s*(.+)$/);
        if (m) {
          const key = m[1].trim();
          let val = m[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key === "title" || key === "source") meta[key] = val;
        }
      }
    }
  }

  return { meta, body: body.trim() };
}

/**
 * Split text into overlapping character windows (easy to follow, no extra deps).
 * @param {string} text
 */
function chunkText(text) {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return [];
  const chunks = [];
  let start = 0;
  while (start < t.length) {
    const end = Math.min(start + CHUNK_SIZE, t.length);
    const piece = t.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= t.length) break;
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
    if (start >= t.length) break;
  }
  return chunks;
}

async function main() {
  logInfo("ingest: start", { docsDir: DOCS_DIR });

  if (!process.env.OPENAI_API_KEY) {
    logError("ingest: missing OPENAI_API_KEY", {});
    process.exit(1);
  }

  if (!fs.existsSync(DOCS_DIR)) {
    logError("ingest: docs directory not found", { path: DOCS_DIR });
    process.exit(1);
  }

  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("."));

  if (files.length < 5) {
    logError("ingest: need at least 5 markdown files in docs/", { count: files.length, files });
    process.exit(1);
  }

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

  /** @type {{ pageContent: string, metadata: Record<string, string>, embedding: number[] }[]} */
  const allEntries = [];

  for (const file of files) {
    const fullPath = path.join(DOCS_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const relPath = `docs/${file}`;
    const { meta, body } = parseMarkdownDoc(raw, file.replace(/\.md$/i, ""), relPath);

    const chunks = chunkText(body);
    logInfo("ingest: file processed", {
      file,
      title: meta.title,
      source: meta.source,
      chunkCount: chunks.length,
    });

    if (chunks.length === 0) continue;

    const vectors = await embeddings.embedDocuments(chunks);

    for (let i = 0; i < chunks.length; i += 1) {
      allEntries.push({
        pageContent: chunks[i],
        metadata: {
          title: meta.title,
          source: meta.source,
          path: relPath,
          chunkIndex: String(i),
        },
        embedding: vectors[i],
      });
    }
  }

  clearCache();
  saveEntries(allEntries);

  logInfo("ingest: complete", {
    documents: files.length,
    totalChunks: allEntries.length,
    storePath: path.join(__dirname, "data", "vector-store.json"),
  });
}

main().catch((err) => {
  logError("ingest: fatal", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
