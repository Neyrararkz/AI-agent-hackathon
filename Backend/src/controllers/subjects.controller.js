const { pool } = require("../db/pool");

async function listSubjects(req, res) {
  const r = await pool.query("SELECT id, name FROM subjects ORDER BY name");
  res.json({ subjects: r.rows });
}

async function listTopics(req, res) {
  const subjectId = Number(req.params.subjectId);
  const r = await pool.query(
    "SELECT id, code, title FROM topics WHERE subject_id=$1 ORDER BY title",
    [subjectId]
  );
  res.json({ topics: r.rows });
}

module.exports = { listSubjects, listTopics };