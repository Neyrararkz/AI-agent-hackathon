import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiAttempts } from "../../api/endpoints";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

function toNum(x) {
  const n = Number(x);
  return Number.isNaN(n) ? null : n;
}
function pct(x) {
  const n = toNum(x);
  return n === null ? null : Math.round(n);
}
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export function AttemptsPage() {
  const nav = useNavigate();

  const attemptsQ = useQuery({
    queryKey: ["attempts", "my"],
    queryFn: apiAttempts.my,
  });


  const [status, setStatus] = useState("all"); 
  const [minScore, setMinScore] = useState(""); 
  const [maxScore, setMaxScore] = useState("");
  const [query, setQuery] = useState(""); 
  const [sort, setSort] = useState("new"); 

  const filtered = useMemo(() => {
    const list = attemptsQ.data || [];

    const min = minScore.trim() ? Number(minScore) : null;
    const max = maxScore.trim() ? Number(maxScore) : null;
    const q = query.trim().toLowerCase();

    let out = list.slice();

    if (status !== "all") {
      out = out.filter((a) => (status === "submitted" ? !!a.submitted_at : !a.submitted_at));
    }

    if (min !== null && !Number.isNaN(min)) {
      out = out.filter((a) => toNum(a.percent) !== null && toNum(a.percent) >= min);
    }

    if (max !== null && !Number.isNaN(max)) {
      out = out.filter((a) => toNum(a.percent) !== null && toNum(a.percent) <= max);
    }

    if (q) {
      out = out.filter((a) => {
        const idMatch = String(a.id).includes(q);
        const topics = a.ai_summary?.weak_topics;
        const topicMatch = Array.isArray(topics)
          ? topics.some((t) => String(t).toLowerCase().includes(q))
          : false;
        const testMatch = String(a.test_id).includes(q);
        return idMatch || topicMatch || testMatch;
      });
    }

    out.sort((a, b) => {
      if (sort === "new") return new Date(b.started_at) - new Date(a.started_at);
      if (sort === "old") return new Date(a.started_at) - new Date(b.started_at);

      const ap = toNum(a.percent) ?? -1;
      const bp = toNum(b.percent) ?? -1;
      if (sort === "score_desc") return bp - ap;
      if (sort === "score_asc") return ap - bp;
      return 0;
    });

    return out;
  }, [attemptsQ.data, status, minScore, maxScore, query, sort]);

  const stats = useMemo(() => {
    const list = attemptsQ.data || [];
    const submitted = list.filter((a) => a.submitted_at);
    const avg =
      submitted.length > 0
        ? Math.round(
            (submitted.reduce((acc, a) => acc + Number(a.percent || 0), 0) / submitted.length) * 10
          ) / 10
        : 0;
    return {
      total: list.length,
      done: submitted.length,
      avg,
    };
  }, [attemptsQ.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">My Attempts</h1>
          <p className="mt-1 text-gray-600">
            Total: <b>{stats.total}</b> • Submitted: <b>{stats.done}</b> • Avg: <b>{stats.avg}%</b>
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => nav("/student")}>Back</Button>
          <Button onClick={() => nav("/student/generate")}>New Test ⚡</Button>
        </div>
      </div>

     
      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="text-sm font-semibold text-gray-700">Search</div>
            <Input
              placeholder="attempt id, test id, weak topic..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700">Status</div>
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="inprogress">In progress</option>
            </select>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700">Min %</div>
            <Input value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="0" />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700">Max %</div>
            <Input value={maxScore} onChange={(e) => setMaxScore(e.target.value)} placeholder="100" />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700">Sort</div>
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="new">Newest</option>
              <option value="old">Oldest</option>
              <option value="score_desc">Score ↓</option>
              <option value="score_asc">Score ↑</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="soft"
            onClick={() => {
              setStatus("all");
              setMinScore("");
              setMaxScore("");
              setQuery("");
              setSort("new");
            }}
          >
            Reset filters
          </Button>
        </div>
      </Card>

    
      <Card className="p-5">
        {attemptsQ.isLoading && <div className="text-sm text-gray-600">Loading...</div>}
        {attemptsQ.isError && <div className="text-sm text-red-600">Failed to load attempts.</div>}

        {!attemptsQ.isLoading && !filtered.length && (
          <div className="text-sm text-gray-500">No attempts match the filters.</div>
        )}

        <div className="space-y-3">
          {filtered.map((a) => {
            const isDone = !!a.submitted_at;
            const p = pct(a.percent) ?? 0;
            const weak = Array.isArray(a.ai_summary?.weak_topics) ? a.ai_summary.weak_topics : [];

            return (
              <button
                key={a.id}
                className="w-full text-left rounded-2xl border border-gray-100 p-4 hover:bg-gray-50 transition"
                onClick={() => {
                  if (isDone) nav(`/student/result/${a.id}`);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">Attempt #{a.id}</div>
                    <div className="text-xs text-gray-500">
                      Test #{a.test_id} • {isDone ? `Submitted: ${formatDate(a.submitted_at)}` : `Started: ${formatDate(a.started_at)}`}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-black ${isDone ? "text-indigo-700" : "text-gray-400"}`}>
                      {isDone ? `${p}%` : "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isDone ? `${a.score}/${a.max_score}` : "In progress"}
                    </div>
                  </div>
                </div>

                {isDone && weak.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {weak.slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}