import { useMemo, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiTests, apiAttempts } from "../../api/endpoints";
import { Card } from "../../components/ui/Card";
import { AiGeneratingOverlay } from "../../components/common/AiGeneratingOverlay";
import { Button } from "../../components/ui/Button";

export function TestRunnerPage() {
  const { testId } = useParams();
  const nav = useNavigate();

  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});

  const testQuery = useQuery({
    queryKey: ["test", Number(testId)],
    queryFn: () => apiTests.getById(Number(testId)),
    enabled: !!testId,
  });

  const test = testQuery.data?.test || null;
  const questions = useMemo(() => {
    const q = testQuery.data?.questions;
    return Array.isArray(q) ? q : [];
  }, [testQuery.data]);

  const startAttempt = useMutation({
    mutationFn: (tId) => apiAttempts.start(tId),
    onSuccess: (data) => {
      const idRaw = data?.attempt?.id ?? null;
      const id = idRaw == null ? null : Number(idRaw);
      setAttemptId(Number.isFinite(id) ? id : null);
    },
  });

  useEffect(() => {
    if (!testId) return;
    if (!testQuery.isSuccess) return;
    if (attemptId) return;
    if (startAttempt.isPending) return;
    if (startAttempt.isSuccess) return;

    startAttempt.mutate(Number(testId));
  }, [testId, testQuery.isSuccess, attemptId, startAttempt.isPending, startAttempt.isSuccess]);

  const submitAttempt = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error("Attempt is not started yet");
      return apiAttempts.submit(attemptId, answers);
    },
    onSuccess: (data) => {
      const id = Number(data?.attempt?.id ?? attemptId);
      nav(`/student/result/${id}`);
    },
  });

  if (testQuery.isLoading) return <div className="p-6">Loading test...</div>;
  if (testQuery.isError) {
    return (
      <div className="p-6 text-red-600">
        Failed to load test: {testQuery.error?.message}
      </div>
    );
  }
  if (!test) return <div className="p-6 text-red-600">No test payload</div>;

  const missing = questions
    .filter((q) => {
      const key = String(q.q_index);
      const v = answers[key];
      if (q.q_type === "mcq") return !(typeof v === "string" && v.trim());
      if (q.q_type === "short") return !(typeof v === "string" && v.trim());
      return false;
    })
    .map((q) => q.q_index);


const isBooting = testQuery.isLoading || startAttempt.isPending || (!attemptId && !startAttempt.isError);
  const answeredCount = Object.keys(answers).filter((k) => String(answers[k] ?? "").trim()).length;
  const canSubmit = !!attemptId && questions.length > 0;

  return (
      <>
         <AiGeneratingOverlay open={isBooting} title="Preparing Your Attempt" />
    <div className="mx-auto max-w-3xl">
      <button className="text-sm text-indigo-600" onClick={() => nav("/student")}>
        ← Back to Dashboard
      </button>

      <Card className="mt-6 p-6">
        <h1 className="text-2xl font-bold mb-4">{test.title || `Test #${test.id}`}</h1>

        {!attemptId && (
          <div className="mb-4 text-sm text-gray-600">
            {startAttempt.isError
              ? `Failed to start attempt: ${
                  startAttempt.error?.response?.data?.error || startAttempt.error?.message
                }`
              : "Starting attempt..."}
          </div>
        )}

        <div className="space-y-6">
          {questions.map((q) => {
            const key = String(q.q_index);
            const value = answers[key] ?? "";

            return (
              <div key={q.id ?? q.q_index} className="border-b pb-4">
                <div className="font-semibold">
                  {q.q_index}. {q.prompt}
                </div>

                {q.q_type === "mcq" && (
                  <div className="mt-2 space-y-2">
                    {(Array.isArray(q.options) ? q.options : []).map((opt, i) => (
                      <label key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`q_${q.q_index}`}
                          value={opt}
                          checked={value === opt}
                          onChange={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [key]: opt,
                            }))
                          }
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.q_type === "short" && (
                  <textarea
                    className="mt-2 w-full border rounded p-2"
                    rows={4}
                    value={value}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Answered: {answeredCount}/{questions.length}
          {missing.length ? (
            <div className="text-xs text-red-600 mt-1">Missing: {missing.join(", ")}</div>
          ) : null}
        </div>

        <Button
          className="mt-6 w-full"
          disabled={!canSubmit || submitAttempt.isPending}
          onClick={() => {
            if (missing.length) {
              alert(`Заполни ответы: ${missing.join(", ")}`);
              return;
            }
            submitAttempt.mutate();
          }}
        >
          {submitAttempt.isPending ? "Submitting..." : "Submit Test"}
        </Button>

        {submitAttempt.isError && (
          <div className="text-red-600 mt-3">
            Submit failed: {submitAttempt.error?.response?.data?.error || submitAttempt.error?.message}
          </div>
        )}
      </Card>
    </div>
    </>
  );
}