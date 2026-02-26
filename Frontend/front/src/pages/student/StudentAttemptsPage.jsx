import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiAttempts } from "../../api/endpoints";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

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

export function StudentAttemptsPage() {
  const nav = useNavigate();

  const attemptsQ = useQuery({
    queryKey: ["attempts", "my"],
    queryFn: apiAttempts.my,
  });

  const attempts = attemptsQ.data || [];

  const [status, setStatus] = useState("all"); 
  const [q, setQ] = useState(""); 
  const [minPct, setMinPct] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim();
    const min = minPct === "" ? null : Number(minPct);

    return attempts.filter((a) => {
      if (status === "submitted" && !a.submitted_at) return false;
      if (status === "progress" && a.submitted_at) return false;

      if (qq) {
        const s = `${a.id} ${a.test_id}`.toLowerCase();
        if (!s.includes(qq.toLowerCase())) return false;
      }

      if (min !== null && a.submitted_at) {
        if (Number(a.percent || 0) < min) return false;
      }

      return true;
    });
  }, [attempts, status, q, minPct]);

  return (
    <div className="space-y-6">
      <button className="text-sm text-indigo-600" onClick={() => nav("/student")}>
        ← Back to Dashboard
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">My Attempts</h1>
          <p className="text-gray-600">History + quick filters</p>
        </div>
        <Button onClick={() => nav("/student/generate")}>New Test ⚡</Button>
      </div>

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-sm font-semibold text-gray-700">Status</div>
            <select
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="progress">In progress</option>
            </select>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700">Search (attempt/test id)</div>
            <Input className="mt-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. 26 or 25" />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700">Min percent (submitted)</div>
            <Input className="mt-2" value={minPct} onChange={(e) => setMinPct(e.target.value)} placeholder="e.g. 60" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        {attemptsQ.isLoading && <div className="text-sm text-gray-500">Loading…</div>}
        {attemptsQ.isError && (
          <div className="text-sm text-red-600">
            Failed to load (check GET /attempts)
          </div>
        )}

        {!attemptsQ.isLoading && !filtered.length ? (
          <div className="text-sm text-gray-500">No attempts found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
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
      </Card>
    </div>
  );
}