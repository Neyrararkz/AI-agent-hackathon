const { AI_URL } = require("../config/env");

async function postJSON(path, body) {
  const res = await fetch(`${AI_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI error ${res.status}: ${text}`);
  }

  return res.json();
}

async function aiGenerateTest({ subject, level, num_questions }) {
  return postJSON("/generate_test", { subject, level, num_questions });
}

async function aiGradeAndFeedback({ subject, questions, answers }) {
  return postJSON("/grade_and_feedback", { subject, questions, answers });
}

async function aiPredictReadiness({ percent, weak_topics_count, attempts_count }) {
  return postJSON("/predict_readiness", { percent, weak_topics_count, attempts_count });
}

module.exports = { aiGenerateTest, aiGradeAndFeedback, aiPredictReadiness };