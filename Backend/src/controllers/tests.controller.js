const { z } = require("zod");
const { pool } = require("../db/pool");
const { aiGenerateTest } = require("../services/aiService");

const GenerateSchema = z.object({
  subject_id: z.number().int().positive(),
  level: z.enum(["easy", "middle", "hard"]).default("middle"),
  num_questions: z.number().int().min(3).max(20).default(10)
});

function stubQuestions(num) {
  const arr = [];
  for (let i = 1; i <= num; i++) {
    const isMcq = i % 3 !== 0;
    if (isMcq) {
      arr.push({
        q_index: i,
        q_type: "mcq",
        prompt: `Stub question #${i}: Choose the correct option`,
        options: ["A", "B", "C", "D"],
        correct: { answer: "B" },
        topic_code: "STUB",
        topic_title: "Stub topic"
      });
    } else {
      arr.push({
        q_index: i,
        q_type: "short",
        prompt: `Stub question #${i}: Write a short answer`,
        options: [],
        correct: { answer_text: "stub" },
        topic_code: "STUB",
        topic_title: "Stub topic"
      });
    }
  }
  return arr;
}

async function generateTest(req, res) {
  const body = GenerateSchema.parse(req.body);

  const subjectR = await pool.query("SELECT id, name FROM subjects WHERE id=$1", [body.subject_id]);
  if (!subjectR.rowCount) return res.status(404).json({ error: "Subject not found" });
  const subjectName = subjectR.rows[0].name;

  const u = await pool.query("SELECT skill_map FROM users WHERE id=$1", [req.user.id]);
  const skill_map = u.rows[0]?.skill_map || {};

  const topicCodesR = await pool.query("SELECT code FROM topics WHERE subject_id=$1", [body.subject_id]);
  const subjectCodes = new Set(topicCodesR.rows.map((r) => r.code));

  const prefer_topics = Object.entries(skill_map)
    .filter(([k, v]) => subjectCodes.has(k) && typeof v === "number")
    .filter(([, v]) => v < 0.55)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([k]) => k);

  let ai;
  let questions;
  let generator = "ai";

  try {
    ai = await aiGenerateTest({
      subject: subjectName,
      level: body.level,
      num_questions: body.num_questions,
      skill_map,
      prefer_topics
    });

    questions = Array.isArray(ai.questions) ? ai.questions : [];
    if (!questions.length) throw new Error("AI returned empty questions");
  } catch (e) {
    generator = "stub";
    ai = {
      title: `${subjectName} ${body.level} test`,
      level: body.level,
      questions: stubQuestions(body.num_questions),
      error: String(e?.message || e)
    };
    questions = ai.questions;
  }

  const title = ai.title || `${subjectName} ${body.level} test`;

  const testMeta = {
    generator,
    subject: subjectName,
    level: body.level,
    ai_error: generator === "stub" ? ai.error : null,
    adaptive: generator === "ai",
    prefer_topics
  };

  const t = await pool.query(
    `
    INSERT INTO tests(student_id, subject_id, level, title, meta)
    VALUES ($1,$2,$3,$4,$5::jsonb)
    RETURNING id, student_id, subject_id, level, title, created_at, meta
    `,
    [req.user.id, body.subject_id, body.level, title, JSON.stringify(testMeta)]
  );

  const test = t.rows[0];
  const inserted = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    const q_index = (q.q_index || q.q_index === 0) ? Number(q.q_index) : (i + 1);
    const q_type = q.q_type || "mcq";
    const prompt = q.prompt || `Question #${q_index}`;
    const options = Array.isArray(q.options) ? q.options : [];
    const correct = (q.correct && typeof q.correct === "object") ? q.correct : {};

    let topic_id = null;
    if (q.topic_code) {
      const tp = await pool.query(
        "SELECT id FROM topics WHERE subject_id=$1 AND code=$2",
        [body.subject_id, q.topic_code]
      );
      if (tp.rowCount) topic_id = tp.rows[0].id;
    }

    const meta = {
      topic_code: q.topic_code || q.topic || null,
      topic_title: q.topic_title || null,
      generator
    };

    const r = await pool.query(
      `
      INSERT INTO questions (test_id, q_index, q_type, prompt, options, correct, topic_id, meta)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb)
      RETURNING id, q_index, q_type, prompt, options, topic_id, meta
      `,
      [
        test.id,
        q_index,
        q_type,
        prompt,
        JSON.stringify(options),
        JSON.stringify(correct),
        topic_id,
        JSON.stringify(meta)
      ]
    );

    inserted.push(r.rows[0]);
  }

  res.json({ test, questions: inserted });
}

async function getTest(req, res) {
  const testId = Number(req.params.testId);

  const t = await pool.query("SELECT * FROM tests WHERE id=$1 AND student_id=$2", [
    testId,
    req.user.id
  ]);
  if (!t.rowCount) return res.status(404).json({ error: "Test not found" });

  const q = await pool.query(
    "SELECT id, q_index, q_type, prompt, options, topic_id, meta FROM questions WHERE test_id=$1 ORDER BY q_index",
    [testId]
  );

  res.json({ test: t.rows[0], questions: q.rows });
}

module.exports = { generateTest, getTest };