/**
 * Plain JS chat client for POST /api/chat — Flex the Lion UI
 */

const STORAGE_KEY = "multi-tool-ai-agent-session";
const ASSISTANT_LABEL = "Flex";

/** Mascot art by conversation state */
const MASCOT_ASSETS = {
  curious: "/assets/flex-curious.png",
  math: "/assets/flex-math.png",
  thinking: "/assets/flex-thinking.png",
  answered: "/assets/flex-answered.png",
  workout: "/assets/flex-workout.png",
  workout2: "/assets/flex-workout2.png",
  love: "/assets/flex-love.png",
  tired: "/assets/flex-tired.png",
};

/** Word-boundary gym / fitness hints (simple keyword list). */
const GYM_KEYWORD_RE =
  /\b(gym|workouts?|routines?|exercises?|sets|reps|dumbbells?|barbells?|chest|back|shoulders?|arms|biceps|triceps|legs|glutes|hamstrings|quads|squats?|bench|deadlifts?|cardio|treadmill|protein|calories|bulk|cut|hypertrophy|strength|muscles?|training|fitness|lifting)\b/i;

const APPRECIATION_RE =
  /\b(thank you|thanks|thank u|thx|appreciate(?:\s+it)?|love this|good job|great job|you'?re awesome|you are awesome|nice work)\b/i;

/** Last user message text (for mascot + thanks detection) */
let lastUserMessageText = "";
/** Edge case: last visible row is user (e.g. stuck request) */
let lastUserSentWasMath = false;
let lastUserSentWasGym = false;
/** Which workout art matched the last gym send (alternates each gym question) */
let lastWorkoutSrc = MASCOT_ASSETS.workout;
/** Count of user messages that looked gym-related; drives workout vs workout2 */
let gymSendCount = 0;
/** Total user prompts this session (for tired milestone) */
let userPromptCount = 0;
/** True when the 5th user prompt should show the one-time tired moment */
let pendingTiredMoment = false;
/** After the tired bit runs (or is skipped), stay off */
let tiredMomentShown = false;
/** While the tired toast + pose is showing, syncMascotIdle must not override */
let tiredSequenceActive = false;

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const loadingEl = document.getElementById("loading");
const mascotEl = document.getElementById("mascot");
const mascotImgEl = document.getElementById("mascot-img");
const mascotStatusEl = document.getElementById("mascot-status");
const mascotTiredToastEl = document.getElementById("mascot-tired-toast");
const mascotRailEl = document.getElementById("mascot-rail");
const mascotRailSpacerEl = document.querySelector(".mascot-rail-spacer");
const composerWrapEl = document.querySelector(".composer-wrap");

/** Viewport-fixed mascot only at this width and above (matches CSS). */
const MASCOT_VIEWPORT_MIN_WIDTH = 641;
const MASCOT_GAP_ABOVE_COMPOSER_PX = 300;

const EXAMPLE_PROMPTS = [
  { type: "Roar-worthy math", text: "Hey Flex — what is sqrt(256) + 15% of 200 in one expression?" },
  { type: "Web safari", text: "Flex, can you search the web for a short update on MongoDB Atlas?" },
  { type: "MongoDB den", text: "Flex, from our docs: when should I embed vs reference another collection?" },
  { type: "Gym buddy", text: "Flex, suggest a simple 3-day beginner gym split with a rest day between lifting days." },
  { type: "Gym buddy", text: "Flex, what are a few solid compound leg exercises I can do with a barbell or dumbbells?" },
  { type: "Gym buddy", text: "Flex, in plain language, what’s the difference between training for strength vs hypertrophy?" },
];

function getSessionId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Linkify URLs only in text segments, not inside HTML tags (so &lt;code&gt; etc. stay intact).
 * @param {string} html
 */
function linkifyOutsideTags(html) {
  return html.split(/(<[^>]+>)/g).map((chunk, i) => {
    if (i % 2 === 1) return chunk;
    return chunk.replace(/https?:\/\/[^\s<&]+/g, (url) => {
      const safe = url.replace(/["')>]+$/, "");
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
    });
  }).join("");
}

/** User bubbles: plain text + links only. */
function formatUserContent(raw) {
  return linkifyOutsideTags(escapeHtml(raw));
}

/**
 * Minimal markdown-style formatting for assistant replies (after escapeHtml).
 * @param {string} raw
 */
function formatAssistantContent(raw) {
  let t = escapeHtml(raw);
  t = t.replace(/`([^`\n]+)`/g, '<code class="md-code">$1</code>');
  t = t.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  const lines = t.split(/\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const hm = line.match(/^(#{1,3}) (.+)$/);
    if (hm) {
      const level = hm[1].length;
      const tag = level >= 3 ? "h4" : "h3";
      out.push(`<${tag} class="md-heading">${hm[2]}</${tag}>`);
      i += 1;
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] (.+)$/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] (.+)$/, "$1"));
        i += 1;
      }
      out.push(`<ul class="md-ul">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. (.+)$/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. (.+)$/, "$1"));
        i += 1;
      }
      out.push(`<ol class="md-ol">${items.map((x) => `<li>${x}</li>`).join("")}</ol>`);
      continue;
    }
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    const chunk = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^#{1,3} /.test(lines[i])
    ) {
      chunk.push(lines[i]);
      i += 1;
    }
    out.push(`<p class="md-p">${chunk.join("<br>")}</p>`);
  }

  return linkifyOutsideTags(out.join(""));
}

/**
 * Simple heuristics: numbers, operators, or common math words → math pose.
 * @param {string} text
 */
function detectMathPrompt(text) {
  const t = String(text).trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (/\d/.test(t)) return true;
  if (/[+\-*/^=×÷]/.test(t)) return true;
  if (
    /\b(calculate|solve|sqrt|plus|minus|times|divide|divided|sum|product|percent|percentage|equation|graph|integral|derivative|logarithm|exponent)\b/i.test(
      lower
    )
  ) {
    return true;
  }
  return false;
}

function detectGymPrompt(text) {
  return GYM_KEYWORD_RE.test(String(text).toLowerCase());
}

function detectAppreciation(text) {
  return APPRECIATION_RE.test(String(text).toLowerCase());
}

/** Next gym send will use this asset (deterministic alternation). */
function peekNextGymSrc() {
  const next = gymSendCount + 1;
  return next % 2 === 1 ? MASCOT_ASSETS.workout : MASCOT_ASSETS.workout2;
}

function applyMascotLabel(label) {
  if (mascotStatusEl && label != null) mascotStatusEl.textContent = label;
}

/** Update status line + mascot image (label always refreshes). */
function applyMascot(src, label) {
  applyMascotLabel(label);
  setMascotSrc(src);
}

/**
 * Idle pose after an assistant message (not during tired sequence).
 * Priority: thanks → love; else answered.
 */
function applyPostAssistantMascot() {
  if (detectAppreciation(lastUserMessageText)) {
    applyMascot(MASCOT_ASSETS.love, "Thanks, friend");
  } else {
    applyMascot(MASCOT_ASSETS.answered, "Still helping");
  }
}

/**
 * Composing in the input: love > math > gym > curious.
 * @param {string} draft
 */
function pickDraftMascot(draft) {
  if (detectAppreciation(draft)) return { src: MASCOT_ASSETS.love, label: "Thanks, friend" };
  if (detectMathPrompt(draft)) return { src: MASCOT_ASSETS.math, label: "Math mode" };
  if (detectGymPrompt(draft)) return { src: peekNextGymSrc(), label: "Workout mode" };
  return { src: MASCOT_ASSETS.curious, label: "Ready" };
}

/**
 * Swap mascot image with a short opacity fade.
 * @param {string} path
 */
function setMascotSrc(path) {
  if (!mascotImgEl || mascotImgEl.getAttribute("src") === path) return;
  mascotImgEl.style.opacity = "0";
  window.setTimeout(() => {
    mascotImgEl.src = path;
    const show = () => {
      mascotImgEl.style.opacity = "1";
    };
    if (mascotImgEl.complete) show();
    else mascotImgEl.addEventListener("load", show, { once: true });
  }, 260);
}

function getLastMessageRole() {
  const items = messagesEl.querySelectorAll(".msg");
  if (!items.length) return null;
  const last = items[items.length - 1];
  if (last.classList.contains("msg-user")) return "user";
  if (last.classList.contains("msg-assistant")) return "assistant";
  return null;
}

/**
 * Idle mascot (not loading). Skipped while thinking is shown via setLoading, and during the tired toast.
 * Priority when typing: love > math > gym > curious. After reply: love if thanks, else answered.
 */
function syncMascotIdle() {
  if (!mascotImgEl || !loadingEl || !mascotEl) return;
  if (!loadingEl.classList.contains("hidden")) return;
  if (tiredSequenceActive) return;

  const draft = inputEl.value.trim();
  if (draft.length > 0) {
    const pick = pickDraftMascot(draft);
    applyMascot(pick.src, pick.label);
    return;
  }

  if (messagesEl.classList.contains("messages--initial")) {
    applyMascot(MASCOT_ASSETS.curious, "Ready");
    return;
  }

  const lastRole = getLastMessageRole();
  if (lastRole === "user") {
    if (detectAppreciation(lastUserMessageText)) applyMascot(MASCOT_ASSETS.love, "Thanks, friend");
    else if (lastUserSentWasMath) applyMascot(MASCOT_ASSETS.math, "Math mode");
    else if (lastUserSentWasGym) applyMascot(lastWorkoutSrc, "Workout mode");
    else applyMascot(MASCOT_ASSETS.curious, "Still helping");
    return;
  }

  if (lastRole === "assistant") {
    if (detectAppreciation(lastUserMessageText)) applyMascot(MASCOT_ASSETS.love, "Thanks, friend");
    else applyMascot(MASCOT_ASSETS.answered, "Still helping");
  }
}

function scrollMessagesSmooth() {
  requestAnimationFrame(() => {
    messagesEl.scrollTo({
      top: messagesEl.scrollHeight,
      behavior: "smooth",
    });
    scheduleMascotViewportPosition();
  });
}

/**
 * Keep Flex pinned to the viewport on desktop: same horizontal band as the layout spacer,
 * and ~300px above the composer (updates on scroll/resize when the page or composer moves).
 */
function updateMascotViewportPosition() {
  if (!mascotRailEl || !mascotRailSpacerEl || !composerWrapEl) return;

  if (window.innerWidth < MASCOT_VIEWPORT_MIN_WIDTH) {
    mascotRailEl.style.left = "";
    mascotRailEl.style.width = "";
    mascotRailEl.style.bottom = "";
    return;
  }

  const spacerRect = mascotRailSpacerEl.getBoundingClientRect();
  mascotRailEl.style.left = `${Math.max(0, spacerRect.left)}px`;
  mascotRailEl.style.width = `${spacerRect.width}px`;

  const cRect = composerWrapEl.getBoundingClientRect();
  const rawBottom = window.innerHeight - cRect.top + MASCOT_GAP_ABOVE_COMPOSER_PX;
  const bottomPx = Math.max(120, Math.min(rawBottom, window.innerHeight - 200));
  mascotRailEl.style.bottom = `${bottomPx}px`;
}

let mascotViewportRaf = false;
function scheduleMascotViewportPosition() {
  if (mascotViewportRaf) return;
  mascotViewportRaf = true;
  requestAnimationFrame(() => {
    mascotViewportRaf = false;
    updateMascotViewportPosition();
  });
}

/** Bounce + gold ring when Flex posts a new reply (CSS on `.mascot--reply-pulse`). */
function triggerMascotBounce() {
  if (!mascotEl) return;
  mascotEl.classList.remove("mascot--reply-pulse");
  void mascotEl.offsetWidth;
  mascotEl.classList.add("mascot--reply-pulse");
  window.setTimeout(() => mascotEl.classList.remove("mascot--reply-pulse"), 900);
}

function autoGrowInput() {
  inputEl.style.height = "auto";
  const max = 180;
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, max)}px`;
}

/**
 * Split assistant text into main body and optional sources block (RAG / model "Sources:" sections).
 * @param {string} raw
 */
function splitAnswerAndSources(raw) {
  if (!raw || typeof raw !== "string") {
    return { main: "", sources: null };
  }

  const patterns = [
    /\r?\n\s*(?:#{1,3}\s*)?(?:\*\*)?Sources(?:\*\*)?\s*:?\s*\r?\n/i,
    /\r?\n={3,}\s*SOURCES[^\r\n]*\r?\n/i,
  ];

  for (const re of patterns) {
    const m = re.exec(raw);
    if (m) {
      return {
        main: raw.slice(0, m.index).trim(),
        sources: raw.slice(m.index + m[0].length).trim(),
      };
    }
  }

  return { main: raw.trim(), sources: null };
}

/**
 * Break sources blob into list items for cards.
 * @param {string} block
 */
function parseSourceItems(block) {
  if (!block) return [];

  const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const items = [];
  let buf = [];

  function flush() {
    if (buf.length) {
      items.push(buf.join("\n"));
      buf = [];
    }
  }

  for (const line of lines) {
    const isNewItem = /^[-•*]\s|^\d+\.\s/.test(line);
    if (isNewItem) {
      flush();
      buf.push(line);
    } else if (/^link:\s*/i.test(line) || /^excerpt:/i.test(line) || /^https?:\/\//i.test(line)) {
      buf.push(line);
    } else if (buf.length) {
      buf.push(line);
    } else {
      buf.push(line);
    }
  }
  flush();

  if (items.length === 0) {
    return block
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 15);
  }

  return items.slice(0, 15);
}

function appendUserMessage(text) {
  lastUserMessageText = text;
  userPromptCount += 1;
  if (userPromptCount === 5 && !tiredMomentShown) pendingTiredMoment = true;

  lastUserSentWasMath = detectMathPrompt(text);
  lastUserSentWasGym = detectGymPrompt(text);
  if (lastUserSentWasGym) {
    gymSendCount += 1;
    lastWorkoutSrc = gymSendCount % 2 === 1 ? MASCOT_ASSETS.workout : MASCOT_ASSETS.workout2;
  }

  const li = document.createElement("li");
  li.className = "msg msg-user";

  const role = document.createElement("span");
  role.className = "msg-role";
  role.textContent = "You";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  const body = document.createElement("div");
  body.className = "msg-body msg-body--plain";
  body.innerHTML = formatUserContent(text);

  bubble.appendChild(body);
  li.appendChild(role);
  li.appendChild(bubble);
  messagesEl.appendChild(li);
  scrollMessagesSmooth();
}

function appendAssistantMessage(text) {
  const li = document.createElement("li");
  li.className = "msg msg-assistant";

  const role = document.createElement("span");
  role.className = "msg-role";
  role.textContent = ASSISTANT_LABEL;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  const { main, sources } = splitAnswerAndSources(text);

  const body = document.createElement("div");
  body.className = "msg-body msg-body--rich";
  body.innerHTML = formatAssistantContent(main || text);

  bubble.appendChild(body);

  if (sources) {
    const items = parseSourceItems(sources);
    if (items.length > 0) {
      const srcWrap = document.createElement("div");
      srcWrap.className = "msg-sources";

      const label = document.createElement("p");
      label.className = "msg-sources-label";
      label.textContent = "Sources";
      srcWrap.appendChild(label);

      const ul = document.createElement("ul");
      ul.className = "source-list";
      for (const item of items) {
        const card = document.createElement("li");
        card.className = "source-card";
        card.innerHTML = formatAssistantContent(item);
        ul.appendChild(card);
      }
      srcWrap.appendChild(ul);
      bubble.appendChild(srcWrap);
    }
  }

  li.appendChild(role);
  li.appendChild(bubble);
  messagesEl.appendChild(li);
  triggerMascotBounce();

  const shouldConsumeTired = pendingTiredMoment && !tiredMomentShown;
  if (shouldConsumeTired) {
    tiredMomentShown = true;
    pendingTiredMoment = false;
  }
  const showTiredMoment = shouldConsumeTired && !detectAppreciation(lastUserMessageText);

  if (showTiredMoment) {
    tiredSequenceActive = true;
    if (mascotTiredToastEl) mascotTiredToastEl.classList.remove("hidden");
    applyMascot(MASCOT_ASSETS.tired, "Still helping");
    window.setTimeout(() => {
      tiredSequenceActive = false;
      if (mascotTiredToastEl) mascotTiredToastEl.classList.add("hidden");
      applyPostAssistantMascot();
      syncMascotIdle();
    }, 4200);
    scrollMessagesSmooth();
    return;
  }

  applyPostAssistantMascot();
  scrollMessagesSmooth();
}

/** Welcome card with example prompts (does not call the API). */
function appendWelcome() {
  messagesEl.classList.add("messages--initial");

  const li = document.createElement("li");
  li.className = "msg msg-assistant msg-welcome";

  const role = document.createElement("span");
  role.className = "msg-role";
  role.textContent = ASSISTANT_LABEL;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  const empty = document.createElement("div");
  empty.className = "welcome-empty";

  const thumb = document.createElement("img");
  thumb.className = "welcome-empty-thumb";
  thumb.src = "/assets/flex-curious.png";
  thumb.alt = "";
  thumb.width = 44;
  thumb.height = 44;
  thumb.decoding = "async";

  const emptyText = document.createElement("div");
  emptyText.className = "welcome-empty-text";

  const title = document.createElement("strong");
  title.className = "welcome-empty-title";
  title.textContent = "Hey — I'm Flex!";

  const sub = document.createElement("span");
  sub.className = "welcome-empty-sub";
  sub.textContent = "Your friendly lion guide. Tap an example or say hi below.";

  emptyText.appendChild(title);
  emptyText.appendChild(sub);
  empty.appendChild(thumb);
  empty.appendChild(emptyText);

  const lead = document.createElement("p");
  lead.className = "welcome-lead";
  lead.textContent =
    "I'm here for quick math, live web search, answers from your MongoDB notes in this project, and general gym & fitness questions (friendly tips only — I'm not a doctor). When I use the knowledge base, I'll show sources so you know where it came from.";

  const secTitle = document.createElement("p");
  secTitle.className = "welcome-section-title";
  secTitle.textContent = "Pick a starter roar";

  const chips = document.createElement("div");
  chips.className = "prompt-chips";

  for (const ex of EXAMPLE_PROMPTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "prompt-chip";
    btn.setAttribute("aria-label", `Use example: ${ex.text}`);

    const typeSpan = document.createElement("span");
    typeSpan.className = "prompt-chip-type";
    typeSpan.textContent = ex.type;

    btn.appendChild(typeSpan);
    btn.appendChild(document.createTextNode(ex.text));

    btn.addEventListener("click", () => {
      inputEl.value = ex.text;
      autoGrowInput();
      inputEl.focus();
    });

    chips.appendChild(btn);
  }

  bubble.appendChild(empty);
  bubble.appendChild(lead);
  bubble.appendChild(secTitle);
  bubble.appendChild(chips);

  li.appendChild(role);
  li.appendChild(bubble);
  messagesEl.appendChild(li);
  scrollMessagesSmooth();
  syncMascotIdle();
}

function appendMessage(role, text) {
  if (role === "user") {
    appendUserMessage(text);
  } else {
    appendAssistantMessage(text);
  }
}

function setLoading(on) {
  loadingEl.classList.toggle("hidden", !on);
  sendBtn.disabled = on;
  inputEl.disabled = on;
  loadingEl.setAttribute("aria-busy", on ? "true" : "false");
  if (mascotEl) {
    mascotEl.classList.toggle("mascot--thinking", on);
  }
  if (on) {
    applyMascot(MASCOT_ASSETS.thinking, "Thinking");
    scrollMessagesSmooth();
  }
}

function markConversationStarted() {
  messagesEl.classList.remove("messages--initial");
}

async function sendMessage() {
  const message = inputEl.value.trim();
  if (!message) return;

  markConversationStarted();
  appendMessage("user", message);
  inputEl.value = "";
  autoGrowInput();
  setLoading(true);

  try {
    const sessionId = getSessionId();
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
    });

    const data = await res.json().catch(() => ({}));

    if (data.sessionId && typeof data.sessionId === "string") {
      try {
        localStorage.setItem(STORAGE_KEY, data.sessionId);
      } catch {
        /* ignore */
      }
    }

    if (!res.ok) {
      appendMessage("assistant", data.error || `Error ${res.status}: something went wrong.`);
      return;
    }

    setLoading(false);
    appendMessage("assistant", data.reply || "(No reply text)");
  } catch (err) {
    appendMessage("assistant", `Network error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    setLoading(false);
    syncMascotIdle();
    inputEl.focus();
    scrollMessagesSmooth();
  }
}

sendBtn.addEventListener("click", sendMessage);

inputEl.addEventListener("input", () => {
  autoGrowInput();
  syncMascotIdle();
  scheduleMascotViewportPosition();
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

appendWelcome();
autoGrowInput();
syncMascotIdle();
updateMascotViewportPosition();
window.addEventListener("resize", updateMascotViewportPosition);
window.addEventListener("scroll", scheduleMascotViewportPosition, true);
inputEl.focus();
