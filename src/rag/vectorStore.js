/**
 * Simple file-backed vector store for local RAG.
 * Embeddings are produced by OpenAIEmbeddings during ingest; at query time we
 * load from disk and rank by cosine similarity (in-memory after load).
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "vector-store.json");

/** @type {{ pageContent: string, metadata: Record<string, string>, embedding: number[] }[] | null} */
let cache = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Cosine similarity between two equal-length vectors.
 * @param {number[]} a
 * @param {number[]} b
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Replace in-memory entries and persist to disk.
 * @param {{ pageContent: string, metadata: Record<string, string>, embedding: number[] }[]} entries
 */
function saveEntries(entries) {
  ensureDataDir();
  cache = entries;
  fs.writeFileSync(STORE_FILE, JSON.stringify(entries), "utf8");
}

/**
 * Load entries from disk into memory (cached).
 * @returns {Promise<{ pageContent: string, metadata: Record<string, string>, embedding: number[] }[]>}
 */
async function loadEntries() {
  if (cache) return cache;
  if (!fs.existsSync(STORE_FILE)) {
    cache = [];
    return cache;
  }
  const raw = fs.readFileSync(STORE_FILE, "utf8");
  cache = JSON.parse(raw);
  return cache;
}

/**
 * Clear cache (e.g. after re-ingest in same process).
 */
function clearCache() {
  cache = null;
}

/**
 * @param {number[]} queryEmbedding
 * @param {number} k
 * @returns {Promise<{ pageContent: string, metadata: Record<string, string>, score: number }[]>}
 */
async function similaritySearch(queryEmbedding, k = 4) {
  const entries = await loadEntries();
  if (entries.length === 0) return [];

  const scored = entries.map((e) => ({
    pageContent: e.pageContent,
    metadata: e.metadata || {},
    score: cosineSimilarity(queryEmbedding, e.embedding),
  }));

  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, k);
}

function getStorePath() {
  return STORE_FILE;
}

module.exports = {
  saveEntries,
  loadEntries,
  clearCache,
  similaritySearch,
  getStorePath,
};
