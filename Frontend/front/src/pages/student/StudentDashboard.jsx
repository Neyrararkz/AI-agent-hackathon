import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiAttempts, apiAuth } from "../../api/endpoints";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { authStore } from "../../store/auth";

function pct(x) {
  const n = Number(x);
  if (Number.isNaN(n)) return 0;
  return Math.round(n);
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function skillLabel(v) {
  if (v < 0.45) return { text: "Needs work", cls: "text-red-600 bg-red-50" };
  if (v < 0.7) return { text: "Improving", cls: "text-amber-700 bg-amber-50" };
  return { text: "Strong", cls: "text-green-700 bg-green-50" };
}

function SkillMapCard({ skillMap }) {
  const entries = useMemo(() => {
    const e = Object.entries(skillMap || {})
      .filter(([, v]) => typeof v === "number")
      .sort((a, b) => a[1] - b[1]); 
    return e;
  }, [skillMap]);

  const top = entries.slice(0, 8);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold">Knowledge Skill Map</div>
          <div className="text-sm text-gray-500">Your mastery across topics</div>
        </div>
        <span className="text-xs rounded-full px-2 py-1 bg-indigo-50 text-indigo-700 font-semibold">
          Live
        </span>
      </div>

      {!top.length ? (
        <div className="mt-4 text-sm text-gray-500">
          Пока пусто — сделай 1–2 теста, и карта начнёт заполняться.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {top.map(([code, v]) => {
            const p = Math.round(v * 100);
            const tag = skillLabel(v);

            return (
              <div key={code}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">{code}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tag.cls}`}>
                      {tag.text}
                    </span>
                    <div className="text-sm font-bold">{p}%</div>
                  </div>
                </div>

                <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600"
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function StudentDashboard() {
  const nav = useNavigate();
  const user = authStore((s) => s.user);


  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: apiAuth.me,
  });

  
  const attemptsQ = useQuery({
    queryKey: ["attempts", "my"],
    queryFn: apiAttempts.my,
  });

  const attempts = attemptsQ.data || [];

  const stats = useMemo(() => {
    const total = attempts.length;
    const submitted = attempts.filter((a) => a.submitted_at);
    const completed = submitted.length;

    const avg =
      completed === 0
        ? 0
        : Math.round(
            submitted.reduce((sum, a) => sum + Number(a.percent || 0), 0) / completed
          );

    return { total, completed, avg };
  }, [attempts]);

  const recent = useMemo(() => attempts.slice(0, 4), [attempts]);

  const skillMap = meQ.data?.user?.skill_map || user?.skill_map || {};

  const weakChips = useMemo(() => {
    const e = Object.entries(skillMap || {})
      .filter(([, v]) => typeof v === "number")
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([k]) => k);
    return e;
  }, [skillMap]);

  return (
    <div className="space-y-6">
      
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">
            Welcome back, {user?.full_name || "Student"}! 👋
          </h1>
          <p className="text-gray-600">Ready to continue your learning journey?</p>
        </div>

        <Button variant="ghost" onClick={() => nav("/student/generate")}>
          Quick Test ⚡
        </Button>
      </div>


      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Attempts Completed</div>
          <div className="text-2xl font-black">{stats.completed}</div>
          <div className="text-xs text-gray-400 mt-1">submitted attempts</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Average Score</div>
          <div className="text-2xl font-black">{stats.avg}%</div>
          <div className="text-xs text-gray-400 mt-1">submitted only</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Attempts</div>
          <div className="text-2xl font-black">{stats.total}</div>
          <div className="text-xs text-gray-400 mt-1">including in-progress</div>
        </Card>
      </div>

    
      <Card className="p-6 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-2xl font-black">Start Adaptive Test</div>
            <div className="text-sm opacity-90">
              AI will generate questions based on your current skill level
            </div>

            {!!weakChips.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {weakChips.map((c) => (
                  <span
                    key={c}
                    className="text-xs font-semibold px-2 py-1 rounded-full bg-white/15 border border-white/20"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button
            className="bg-white/90 hover:bg-white text-gray-900"
            variant="ghost"
            onClick={() => nav("/student/generate")}
          >
            Generate Test ⚡
          </Button>
        </div>
      </Card>

  
      <div className="grid gap-4 md:grid-cols-3">
        
        <Card className="p-5 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="font-bold">Recent Attempts</div>
            <Link to="/student/attempts" className="text-sm text-indigo-600">
              View All →
            </Link>
          </div>

          <div className="mt-4">
            {attemptsQ.isLoading && <div className="text-sm text-gray-500">Loading…</div>}
            {attemptsQ.isError && (
              <div className="text-sm text-red-600">
                Failed to load attempts (check GET /attempts)
              </div>
            )}

            {!attemptsQ.isLoading && !recent.length ? (
              <div className="text-sm text-gray-500">No attempts yet.</div>
            ) : (
              <div className="space-y-3">
                {recent.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => nav(`/student/result/${a.id}`)}
                    className="w-full text-left rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Attempt #{a.id}</div>
                      <div className="font-black text-indigo-600">
                        {a.submitted_at ? `${pct(a.percent)}%` : "In progress"}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Test #{a.test_id} • {a.submitted_at ? `Submitted: ${fmtDate(a.submitted_at)}` : `Started: ${fmtDate(a.started_at)}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

    
        <div className="space-y-4">
          <Card className="p-5">
            <div className="font-bold">Quick Actions</div>
            <div className="mt-3 space-y-2">
              <Button className="w-full" variant="soft" onClick={() => nav("/student/generate")}>
                Quick Test
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => nav("/student/attempts")}>
                My Attempts
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => {
                
                  nav("/student/generate");
                }}
              >
                Practice Weak Topics
              </Button>
            </div>
          </Card>

          <SkillMapCard skillMap={skillMap} />
        </div>
      </div>
    </div>
  );
}