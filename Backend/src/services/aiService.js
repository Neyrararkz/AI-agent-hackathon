const { AI_URL } = require("../config/env");

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 25000);

async function postJSON(path, body, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(`${AI_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI error ${res.status}: ${text}`);
    }

    return res.json();
  } catch (e) {
    if (e?.name === "AbortError") throw new Error(`AI timeout after ${timeoutMs}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function aiGenerateTest({ subject, level, num_questions, skill_map, prefer_topics }) {
  const payload = { subject, level, num_questions };
  if (skill_map && typeof skill_map === "object") payload.skill_map = skill_map;
  if (Array.isArray(prefer_topics) && prefer_topics.length) payload.prefer_topics = prefer_topics;
  return postJSON("/generate_test", payload);
}

async function aiGradeAndFeedback({ subject, questions, answers }) {
  return postJSON("/grade_and_feedback", { subject, questions, answers });
}

async function aiPredictReadiness({ percent, weak_topics_count, attempts_count }) {
  return postJSON("/predict_readiness", { percent, weak_topics_count, attempts_count });
}

module.exports = { aiGenerateTest, aiGradeAndFeedback, aiPredictReadiness };