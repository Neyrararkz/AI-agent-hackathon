import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiAttempts } from "../../api/endpoints";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

function num(x, def = 0) {
  const n = Number(x);
  return Number.isNaN(n) ? def : n;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function Donut({ value = 0, label = "Your Score" }) {
  const pct = clamp(Math.round(num(value)), 0, 100);
  const angle = pct * 3.6;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: 160,
          height: 160,
          background: `conic-gradient(from 180deg, #4f46e5 ${angle}deg, #e5e7eb 0deg)`,
        }}
      >
        <div className="grid place-items-center rounded-full bg-white shadow-sm"
             style={{ width: 128, height: 128 }}>
          <div className="text-4xl font-black text-indigo-600">{pct}%</div>
          <div className="text-xs text-gray-500 -mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}

function Badge({ variant = "neutral", children }) {
  const styles = {
    good: "bg-green-50 text-green-700 border-green-100",
    bad: "bg-red-50 text-red-700 border-red-100",
    neutral: "bg-gray-50 text-gray-700 border-gray-100",
    info: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  );
}

export function TestResultPage() {
  const { resultId } = useParams(); 
  const attemptId = Number(resultId);
  const nav = useNavigate();

  const q = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => apiAttempts.get(attemptId),
    enabled: Number.isFinite(attemptId) && attemptId > 0,
  });

  const attempt = q.data?.attempt || null;
  const fb = Array.isArray(q.data?.per_question_feedback) ? q.data.per_question_feedback : [];

  const percent = num(attempt?.percent, 0);
  const score = num(attempt?.score, 0);
  const maxScore = num(attempt?.max_score, 0);

  const ai = attempt?.ai_summary || {};
  const weakTopics = Array.isArray(ai?.weak_topics) ? ai.weak_topics : [];
  const recommendations = Array.isArray(ai?.recommendations) ? ai.recommendations : [];
  const extraTasks = Array.isArray(ai?.extra_tasks) ? ai.extra_tasks : [];
  const readiness = num(ai?.readiness, null);
  const attemptsCount = num(ai?.attempts_count, null);

  const stats = useMemo(() => {
    const total = fb.length;
    const correct = fb.filter((x) => x.is_correct === true).length;
    const wrong = fb.filter((x) => x.is_correct === false).length;
    return { total, correct, wrong };
  }, [fb]);

  if (q.isLoading) return <div className="p-6">Loading result…</div>;
  if (q.isError)
    return (
      <div className="p-6 text-red-600">
        Failed to load result: {q.error?.response?.data?.error || q.error?.message}
      </div>
    );
  if (!attempt) return <div className="p-6 text-red-600">No attempt payload</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      <div className="flex items-center justify-between">
        <button className="text-sm text-indigo-600" onClick={() => nav("/student")}>
          ← Back to Dashboard
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => nav("/student/attempts")}>
            My Attempts
          </Button>
          <Button onClick={() => nav("/student/generate")}>Take Another Test ⚡</Button>
        </div>
      </div>

    
      <Card className="p-6 bg-gradient-to-b from-white to-indigo-50">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-indigo-600">Adaptive Exam AI</div>
            <h1 className="mt-1 text-3xl font-black text-gray-900">
              Attempt #{attempt.id}
            </h1>
            <div className="mt-2 text-sm text-gray-600">
              Started: {fmtDate(attempt.started_at)} • Submitted: {fmtDate(attempt.submitted_at)}
            </div>

            {!!weakTopics.length && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 mb-2">Weak topics</div>
                <div className="flex flex-wrap gap-2">
                  {weakTopics.slice(0, 12).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold text-indigo-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

         
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <Donut value={percent} />

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 min-w-[160px]">
                <div className="text-xs text-gray-500">Correct</div>
                <div className="text-2xl font-black text-green-700">{stats.correct}</div>
              </Card>
              <Card className="p-4 min-w-[160px]">
                <div className="text-xs text-gray-500">Incorrect</div>
                <div className="text-2xl font-black text-red-600">{stats.wrong}</div>
              </Card>
              <Card className="p-4 min-w-[160px]">
                <div className="text-xs text-gray-500">Score</div>
                <div className="text-2xl font-black text-gray-900">
                  {score}/{maxScore}
                </div>
              </Card>
              <Card className="p-4 min-w-[160px]">
                <div className="text-xs text-gray-500">Readiness</div>
                <div className="text-2xl font-black text-indigo-600">
                  {readiness === null ? "—" : `${readiness}/99`}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {attemptsCount === null ? "" : `Based on ${attemptsCount} attempts`}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Card>

    
      <div className="grid gap-4 lg:grid-cols-3">
      
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">AI Feedback & Explanations</div>
              <div className="text-sm text-gray-500">Detailed analysis of your answers</div>
            </div>
            <Badge variant="info">{fb.length} questions</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {!fb.length ? (
              <div className="text-sm text-gray-500">No per-question feedback yet.</div>
            ) : (
              fb.map((x) => {
                const topicCode = x?.meta?.topic_code || null;
                const isOk = x.is_correct === true;

                return (
                  <div key={`${x.attempt_id}-${x.question_id}`} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`grid h-7 w-7 place-items-center rounded-lg text-sm font-black ${isOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {x.q_index}
                        </div>
                        <div className="font-semibold text-gray-900">{x.prompt}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {topicCode && <Badge variant="neutral">{topicCode}</Badge>}
                        <Badge variant={isOk ? "good" : "bad"}>{isOk ? "Correct" : "Wrong"}</Badge>
                      </div>
                    </div>

                    {(x.explanation || x.recommendation) && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <div className="text-xs font-semibold text-gray-600">AI Explanation</div>
                          <div className="mt-1 text-sm text-gray-800">
                            {x.explanation || "—"}
                          </div>
                        </div>
                        <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                          <div className="text-xs font-semibold text-indigo-700">Recommendation</div>
                          <div className="mt-1 text-sm text-gray-800">
                            {x.recommendation || "—"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

      
        <div className="space-y-4">
          <Card className="p-5">
            <div className="font-bold">Your Progress</div>
            <div className="text-sm text-gray-500">Quick summary</div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Average score (this attempt)</div>
                <div className="font-black text-gray-900">{Math.round(percent)}%</div>
              </div>

              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600"
                  style={{ width: `${clamp(Math.round(percent), 0, 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-gray-100 p-3">
                  <div className="text-xs text-gray-500">Tests taken</div>
                  <div className="text-lg font-black">{attemptsCount ?? "—"}</div>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <div className="text-xs text-gray-500">Readiness</div>
                  <div className="text-lg font-black text-indigo-600">
                    {readiness === null ? "—" : `${readiness}/99`}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button className="w-full" onClick={() => nav("/student/generate")}>
                Keep Learning ⚡
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-bold">AI Recommendations</div>
            <div className="text-sm text-gray-500">What to do next</div>

            <div className="mt-4 space-y-3">
              {!!recommendations.length ? (
                recommendations.slice(0, 6).map((t, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 p-3">
                    <div className="text-sm font-semibold text-gray-900">Recommendation</div>
                    <div className="mt-1 text-sm text-gray-700">{String(t)}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No recommendations.</div>
              )}

              {!!extraTasks.length && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                  <div className="text-sm font-semibold text-indigo-700">Extra Tasks</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-gray-800 space-y-1">
                    {extraTasks.slice(0, 6).map((t, i) => (
                      <li key={i}>{String(t)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}