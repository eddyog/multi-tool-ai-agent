/**
 * Simple in-memory chat history keyed by sessionId (no database).
 * Message shape matches common chat roles for later LangChain wiring.
 */

/** @typedef {{ role: 'user' | 'assistant' | 'system'; content: string }} ChatMessage */

/** @type {Map<string, ChatMessage[]>} */
const sessions = new Map();

/**
 * @param {string} sessionId
 * @returns {ChatMessage[]}
 */
function getHistory(sessionId) {
  if (!sessionId) return [];
  return sessions.get(sessionId) ? [...sessions.get(sessionId)] : [];
}

/**
 * @param {string} sessionId
 * @param {ChatMessage} message
 */
function appendMessage(sessionId, message) {
  if (!sessionId) return;
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  sessions.get(sessionId).push(message);
}

/**
 * @param {string} sessionId
 */
function clearSession(sessionId) {
  if (!sessionId) return;
  sessions.delete(sessionId);
}

/**
 * @returns {number}
 */
function sessionCount() {
  return sessions.size;
}

module.exports = {
  getHistory,
  appendMessage,
  clearSession,
  sessionCount,
};
