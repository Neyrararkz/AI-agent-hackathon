const { z } = require("zod");
const { pool } = require("../db/pool");
const { aiGradeAndFeedback, aiPredictReadiness } = require("../services/aiService");
const { updateSkillMap } = require("../services/skillMap.service");

const StartSchema = z.object({
  test_id: z.number().int().positive()
});

const SubmitSchema = z.object({
  answers: z.record(z.string(), z.any())
});

async function startAttempt(req, res) {
  const body = StartSchema.parse(req.body);

  const t = await pool.query(
    "SELECT id, student_id FROM tests WHERE id=$1 AND student_id=$2",
    [body.test_id, req.user.id]
  );
  if (!t.rowCount) return res.status(404).json({ error: "Test not found" });

  const a = await pool.query(
    `
    INSERT INTO attempts(test_id, student_id)
    VALUES ($1,$2)
    RETURNING id, test_id, student_id, started_at, submitted_at, score, max_score, percent, ai_summary
    `,
    [body.test_id, req.user.id]
  );

  res.json({ attempt: a.rows[0] });
}

async function submitAttempt(req, res) {
  const attemptId = Number(req.params.attemptId);
  const body = SubmitSchema.parse(req.body);

  const a = await pool.query("SELECT * FROM attempts WHERE id=$1 AND student_id=$2", [
    attemptId,
    req.user.id
  ]);
  if (!a.rowCount) return res.status(404).json({ error: "Attempt not found" });

  const attempt = a.rows[0];

  const subj = await pool.query(
    "SELECT s.name FROM tests t JOIN subjects s ON s.id=t.subject_id WHERE t.id=$1",
    [attempt.test_id]
  );
  const subjectName = subj.rows[0]?.name || "SQL";

  const q = await pool.query(
    "SELECT id, q_index, q_type, prompt, options, correct, meta FROM questions WHERE test_id=$1 ORDER BY q_index",
    [attempt.test_id]
  );

  const aiQuestions = q.rows.map((row) => ({
    q_index: row.q_index,
    q_type: row.q_type,
    prompt: row.prompt,
    options: row.options,
    correct: row.correct,
    topic_code: row.meta?.topic_code || null,
    topic_title: row.meta?.topic_title || null
  }));

  const ai = await aiGradeAndFeedback({
    subject: subjectName,
    questions: aiQuestions,
    answers: body.answers
  });

  await pool.query(
    `
    UPDATE attempts
    SET submitted_at=now(),
        score=$1,
        max_score=$2,
        percent=$3,
        answers=$4,
        ai_summary=$5
    WHERE id=$6
    `,
    [
      ai.score,
      ai.max_score,
      ai.percent,
      body.answers,
      {
        weak_topics: ai.weak_topics,
        recommendations: ai.recommendations,
        extra_tasks: ai.extra_tasks,
        readiness: ai.readiness
      },
      attemptId
    ]
  );

  await pool.query("DELETE FROM attempt_question_feedback WHERE attempt_id=$1", [attemptId]);

  const idxToQid = new Map(q.rows.map((r) => [r.q_index, r.id]));

  for (const f of ai.per_question_feedback) {
    const questionId = idxToQid.get(f.q_index);
    if (!questionId) continue;

    await pool.query(
      `
      INSERT INTO attempt_question_feedback
        (attempt_id, question_id, is_correct, earned, max_points, explanation, recommendation, meta)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        attemptId,
        questionId,
        f.is_correct,
        f.earned,
        f.max_points || 1,
        f.explanation,
        f.recommendation,
        { confidence: f.confidence, topic_code: f.topic_code || null }
      ]
    );
  }

  const u = await pool.query("SELECT id, skill_map FROM users WHERE id=$1", [req.user.id]);
  const currentSkill = u.rows[0]?.skill_map || {};
  const nextSkill = updateSkillMap(currentSkill, ai.weak_topics || []);

  await pool.query("UPDATE users SET skill_map=$1 WHERE id=$2", [nextSkill, req.user.id]);

  const attemptsCountR = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM attempts WHERE student_id=$1 AND submitted_at IS NOT NULL",
    [req.user.id]
  );
  const attempts_count = attemptsCountR.rows[0]?.cnt || 1;

  let readiness = ai.readiness;
  try {
    const aiR = await aiPredictReadiness({
      percent: ai.percent,
      weak_topics_count: (ai.weak_topics || []).length,
      attempts_count
    });
    if (aiR && typeof aiR.readiness === "number") readiness = aiR.readiness;
  } catch {}

  const finalSummary = {
    weak_topics: ai.weak_topics,
    recommendations: ai.recommendations,
    extra_tasks: ai.extra_tasks,
    readiness,
    attempts_count
  };

  await pool.query("UPDATE attempts SET ai_summary=$1 WHERE id=$2", [finalSummary, attemptId]);

  res.json({
    attempt: {
      id: attemptId,
      test_id: attempt.test_id,
      score: ai.score,
      max_score: ai.max_score,
      percent: ai.percent,
      ai_summary: finalSummary
    },
    per_question_feedback: ai.per_question_feedback,
    user_skill_map: nextSkill
  });
}

async function getAttempt(req, res) {
  const attemptId = Number(req.params.attemptId);

  const a = await pool.query("SELECT * FROM attempts WHERE id=$1 AND student_id=$2", [
    attemptId,
    req.user.id
  ]);
  if (!a.rowCount) return res.status(404).json({ error: "Attempt not found" });

  const fb = await pool.query(
    `
    SELECT aqf.*, q.q_index, q.prompt
    FROM attempt_question_feedback aqf
    JOIN questions q ON q.id = aqf.question_id
    WHERE aqf.attempt_id=$1
    ORDER BY q.q_index
    `,
    [attemptId]
  );

  res.json({ attempt: a.rows[0], per_question_feedback: fb.rows });
}

async function myAttempts(req, res) {
  const r = await pool.query(
    `
    SELECT id, test_id, started_at, submitted_at, score, max_score, percent, ai_summary
    FROM attempts
    WHERE student_id=$1
    ORDER BY started_at DESC
    `,
    [req.user.id]
  );

  res.json({ attempts: r.rows });
}

module.exports = { startAttempt, submitAttempt, getAttempt, myAttempts };