const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const subjectsRoutes = require("./routes/subjects.routes");
const testsRoutes = require("./routes/tests.routes");
const attemptsRoutes = require("./routes/attempts.routes");
const teacherRoutes = require("./routes/teacher.routes");

const { errorMiddleware } = require("./middleware/error");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/subjects", subjectsRoutes);
app.use("/tests", testsRoutes);
app.use("/attempts", attemptsRoutes);
app.use("/teacher", teacherRoutes);

app.use(errorMiddleware);

module.exports = app;