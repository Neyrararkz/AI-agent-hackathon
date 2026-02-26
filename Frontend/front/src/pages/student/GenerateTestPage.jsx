import { useMutation, useQuery } from "@tanstack/react-query";
import { apiSubjects, apiTests } from "../../api/endpoints";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { AiGeneratingOverlay } from "../../components/common/AiGeneratingOverlay";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function GenerateTestPage() {
  const nav = useNavigate();
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: apiSubjects.list });

  const [subjectId, setSubjectId] = useState("");
  const [level, setLevel] = useState("middle");
  const [num, setNum] = useState(20);

  const gen = useMutation({
    mutationFn: apiTests.generate,
    onSuccess: (data) => {
    
      const testId = data.test_id || data.id || data.test?.id;
      if (testId) nav(`/student/test/${testId}`);
      else alert("Generate вернул данные без test_id/id — поправь apiTests.generate()");
    },
  });

  return (
    <>
    <AiGeneratingOverlay open={gen.isPending} />
    <div className="mx-auto max-w-3xl">
      <button className="text-sm text-indigo-600" onClick={() => nav("/student")}>
        ← Back to Dashboard
      </button>

      <div className="mt-3">
        <h1 className="text-3xl font-black text-gray-900 text-center">Generate Adaptive Test</h1>
        <p className="text-center text-gray-600">Configure your personalized test parameters</p>
      </div>

      <Card className="mt-6 p-6">
        <div className="font-bold text-gray-900">Test Configuration</div>
        <div className="text-sm text-gray-500">Select preferences and let AI create the perfect test</div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-700">Subject</div>
            <select
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">Select a subject</option>
             {(subjects.data || []).map((s) => (
                <option key={s.id} value={s.id}>{s.title || s.name}</option>
              ))}
            </select>
            {subjects.isError && (
              <div className="text-xs text-red-600 mt-1">Не грузит subjects — проверь /subjects</div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">Difficulty Level</div>
              <span className="text-xs text-indigo-600">AI Recommended</span>
            </div>

            <div className="mt-2 grid gap-2">
              {[
                { key: "easy", label: "Beginner", desc: "Fundamental concepts and basic problems" },
                { key: "middle", label: "Intermediate", desc: "Mixed difficulty with moderate complexity" },
                { key: "hard", label: "Advanced", desc: "Complex problems and challenging scenarios" },
              ].map((x) => (
                <button
                  key={x.key}
                  onClick={() => setLevel(x.key)}
                  className={`rounded-2xl border px-4 py-3 text-left ${
                    level === x.key ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="font-semibold">{x.label}</div>
                  <div className="text-sm text-gray-600">{x.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-indigo-50 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Questions</div>
                <div className="font-bold">{num} questions</div>
              </div>
              <div>
                <div className="text-gray-500">Estimated Time</div>
                <div className="font-bold">{Math.round(num * 1.5)} minutes</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold text-gray-700">Number of questions</div>
              <input
                type="range"
                min={5}
                max={30}
                value={num}
                onChange={(e) => setNum(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <Button
            className="w-full py-3"
            disabled={!subjectId || gen.isPending}
            onClick={() => gen.mutate({ subject_id: Number(subjectId), level, num_questions: num })}
          >
            ⚡ Generate Adaptive Test
          </Button>

          {gen.isError && (
            <div className="text-sm text-red-600">
              Ошибка generate: {gen.error?.response?.data?.message || gen.error.message}
            </div>
          )}
        </div>
      </Card>
    </div>
    </>
  );
}