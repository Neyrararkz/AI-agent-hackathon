const { z } = require("zod");
const { pool } = require("../db/pool");

const CreateGroupSchema = z.object({ name: z.string().min(2) });
const AddMemberSchema = z.object({
  student_email: z.string().email()
});

async function createGroup(req, res) {
  const body = CreateGroupSchema.parse(req.body);
  const r = await pool.query(
    `INSERT INTO groups(name, teacher_id) VALUES ($1,$2)
     RETURNING id, name, teacher_id, created_at`,
    [body.name, req.user.id]
  );
  res.json({ group: r.rows[0] });
}

async function listGroups(req, res) {
  const r = await pool.query(
    "SELECT id, name, created_at FROM groups WHERE teacher_id=$1 ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json({ groups: r.rows });
}

async function addMember(req, res) {
  const groupId = Number(req.params.groupId);
  const body = AddMemberSchema.parse(req.body);

  const g = await pool.query("SELECT id FROM groups WHERE id=$1 AND teacher_id=$2", [groupId, req.user.id]);
  if (!g.rowCount) return res.status(404).json({ error: "Group not found" });

  const u = await pool.query("SELECT id, role FROM users WHERE email=$1", [body.student_email]);
  if (!u.rowCount) return res.status(404).json({ error: "Student not found" });
  if (u.rows[0].role !== "student") return res.status(400).json({ error: "User is not a student" });

  await pool.query(
    `INSERT INTO group_members(group_id, student_id)
     VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [groupId, u.rows[0].id]
  );

  res.json({ ok: true });
}

async function listMembers(req, res) {
  const groupId = Number(req.params.groupId);

  const r = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.skill_map
     FROM group_members gm
     JOIN users u ON u.id = gm.student_id
     JOIN groups g ON g.id = gm.group_id
     WHERE gm.group_id=$1 AND g.teacher_id=$2
     ORDER BY u.full_name`,
    [groupId, req.user.id]
  );

  res.json({ members: r.rows });
}

async function overview(req, res) {
  const groupId = Number(req.params.groupId);

  const r = await pool.query(
    `SELECT
        COUNT(DISTINCT gm.student_id) AS students_count,
        COUNT(a.id) FILTER (WHERE a.submitted_at IS NOT NULL) AS attempts_count,
        COALESCE(ROUND(AVG(a.percent) FILTER (WHERE a.submitted_at IS NOT NULL), 2), 0) AS avg_percent
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     LEFT JOIN attempts a ON a.student_id = gm.student_id
     WHERE g.id=$1 AND g.teacher_id=$2`,
    [groupId, req.user.id]
  );

  res.json({ overview: r.rows[0] });
}

async function weakTopics(req, res) {
  const groupId = Number(req.params.groupId);
  const limit = Math.min(20, Number(req.query.limit || 5));

  const r = await pool.query(
    `SELECT
       COALESCE(tp.title, 'Unknown topic') AS topic,
       COUNT(*) FILTER (WHERE aqf.is_correct = false) AS wrong_count
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     JOIN tests t ON t.student_id = gm.student_id
     JOIN questions q ON q.test_id = t.id
     JOIN attempts a ON a.test_id = t.id AND a.student_id = gm.student_id
     JOIN attempt_question_feedback aqf ON aqf.attempt_id = a.id AND aqf.question_id = q.id
     LEFT JOIN topics tp ON tp.id = q.topic_id
     WHERE g.id=$1 AND g.teacher_id=$2 AND a.submitted_at IS NOT NULL
     GROUP BY tp.title
     ORDER BY wrong_count DESC
     LIMIT $3`,
    [groupId, req.user.id, limit]
  );

  res.json({ weak_topics: r.rows });
}
async function trend(req, res) {
  const groupId = Number(req.params.groupId);

  const r = await pool.query(
    `SELECT
       date_trunc('day', a.submitted_at) AS day,
       ROUND(AVG(a.percent), 2) AS avg_percent
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     JOIN attempts a ON a.student_id = gm.student_id
     WHERE g.id=$1 AND g.teacher_id=$2 AND a.submitted_at IS NOT NULL
     GROUP BY day
     ORDER BY day`,
    [groupId, req.user.id]
  );

  res.json({ trend: r.rows });
}
async function atRisk(req, res) {
  const groupId = Number(req.params.groupId);
  const threshold = Number(req.query.threshold || 50);

  const r = await pool.query(
    `WITH last_attempt AS (
       SELECT DISTINCT ON (a.student_id)
         a.student_id, a.percent, a.submitted_at
       FROM attempts a
       JOIN group_members gm ON gm.student_id = a.student_id
       WHERE gm.group_id = $1 AND a.submitted_at IS NOT NULL
       ORDER BY a.student_id, a.submitted_at DESC
     )
     SELECT u.id, u.full_name, u.email, la.percent, la.submitted_at
     FROM last_attempt la
     JOIN users u ON u.id = la.student_id
     JOIN groups g ON g.id=$1
     WHERE g.teacher_id=$2 AND la.percent < $3
     ORDER BY la.percent ASC`,
    [groupId, req.user.id, threshold]
  );

  res.json({ at_risk: r.rows });
}

module.exports = {
  createGroup, listGroups, addMember, listMembers,
  overview, weakTopics, trend, atRisk
};