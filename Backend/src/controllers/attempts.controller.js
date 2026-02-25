const { z } = require("zod");
const { pool } = require("../db/pool");
const { aiGradeAndFeedback, aiPredictReadiness } = require("../services/aiService");

const SubmitSchema = z.object({ answers: z.record(z.any()) });

async function submitAttempt(req, res) {
  const attemptId = Number(req.params.attemptId);
  const body = SubmitSchema.parse(req.body);

  const a = await pool.query(
    "SELECT * FROM attempts WHERE id=$1 AND student_id=$2",
    [attemptId, req.user.id]
  );
  if (!a.rowCount) return res.status(404).json({ error: "Attempt not found" });
  const attempt = a.rows[0];

  const subj = await pool.query(
    `SELECT s.name
     FROM tests t JOIN subjects s ON s.id=t.subject_id
     WHERE t.id=$1`,
    [attempt.test_id]
  );
  const subjectName = subj.rows[0]?.name || "SQL";

  const q = await pool.query(
    `SELECT id, q_index, q_type, prompt, options, correct, meta
     FROM questions
     WHERE test_id=$1
     ORDER BY q_index`,
    [attempt.test_id]
  );

  const aiQuestions = q.rows.map(row => ({
    q_index: row.q_index,
    q_type: row.q_type,
    prompt: row.prompt,
    options: row.options,
    correct: row.correct,
    topic_code: row.meta?.topic_code || null,
    topic_title: row.meta?.topic_title || null,
  }));

  const ai = await aiGradeAndFeedback({
    subject: subjectName,
    questions: aiQuestions,
    answers: body.answers,
  });

  const ai_summary = {
    weak_topics: ai.weak_topics,
    recommendations: ai.recommendations,
    extra_tasks: ai.extra_tasks,
    readiness: ai.readiness,
  };

  await pool.query(
    `UPDATE attempts
     SET submitted_at=now(),
         score=$1,
         max_score=$2,
         percent=$3,
         answers=$4,
         ai_summary=$5
     WHERE id=$6`,
    [ai.score, ai.max_score, ai.percent, body.answers, ai_summary, attemptId]
  );

  await pool.query("DELETE FROM attempt_question_feedback WHERE attempt_id=$1", [attemptId]);

  const idxToQid = new Map(q.rows.map(r => [r.q_index, r.id]));

  for (const f of ai.per_question_feedback) {
    const questionId = idxToQid.get(f.q_index);
    if (!questionId) continue;

    await pool.query(
      `INSERT INTO attempt_question_feedback
       (attempt_id, question_id, is_correct, earned, max_points, explanation, recommendation, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
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

  res.json({
    attempt: {
      id: attemptId,
      test_id: attempt.test_id,
      score: ai.score,
      max_score: ai.max_score,
      percent: ai.percent,
      ai_summary,
    },
    per_question_feedback: ai.per_question_feedback,
  });
}

module.exports = { submitAttempt };