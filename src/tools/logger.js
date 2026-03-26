/**
 * Structured JSON logging — one JSON object per line for easy parsing and grading.
 * Each entry includes: type, message, timestamp, and optional metadata.
 */

/**
 * @param {"info"|"error"} level
 * @param {string} message
 * @param {Record<string, unknown>} [metadata]
 */
function buildEntry(level, message, metadata) {
  const entry = {
    type: level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (metadata != null && typeof metadata === "object" && Object.keys(metadata).length > 0) {
    entry.metadata = metadata;
  }

  return entry;
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [metadata]
 */
function logInfo(message, metadata) {
  console.log(JSON.stringify(buildEntry("info", message, metadata)));
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [metadata]
 */
function logError(message, metadata) {
  console.error(JSON.stringify(buildEntry("error", message, metadata)));
}

module.exports = { logInfo, logError };
