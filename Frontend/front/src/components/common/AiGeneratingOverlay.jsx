import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function AiGeneratingOverlay({ open, title = "AI is Generating Your Test" }) {
  const [p, setP] = useState(12);


  useEffect(() => {
    if (!open) return;
    setP(12);

    const t = setInterval(() => {
      setP((prev) => {
        const next =
          prev < 55 ? prev + 6 :
          prev < 80 ? prev + 3 :
          prev < 92 ? prev + 1 : prev;
        return clamp(next, 0, 92);
      });
    }, 450);

    return () => clearInterval(t);
  }, [open]);

  const steps = useMemo(() => {
    const s1 = p >= 28;
    const s2 = p >= 55;
    const s3 = p >= 82;
    return [
      { ok: s1, text: "Analyzing your performance history" },
      { ok: s2, text: "Selecting optimal difficulty level" },
      { ok: s3, text: "Generating personalized questions" },
    ];
  }, [p]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-gradient-to-b from-indigo-600/80 to-fuchsia-600/80 backdrop-blur-sm">
      <Card className="w-[min(520px,92vw)] p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-lg">
          
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l1.2 4.2L17.5 7.5l-4.3 1.3L12 13l-1.2-4.2L6.5 7.5l4.3-1.3L12 2z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M19 12l.7 2.4L22 15l-2.3.7L19 18l-.7-2.3L16 15l2.3-.6L19 12z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M6 14l.6 2L9 16.6l-2.4.7L6 19l-.6-1.7L3 16.6l2.4-.6L6 14z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 className="mt-5 text-2xl font-black text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-600">
            Creating personalized questions based on your skill level…
          </p>

       
          <div className="mt-6 w-full">
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 transition-[width] duration-500"
                style={{ width: `${p}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500">{p}% Complete</div>
          </div>

       
          <div className="mt-6 w-full space-y-2 text-left">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border ${
                    s.ok
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-gray-200 bg-gray-50 text-gray-400"
                  }`}
                >
                  {s.ok ? "✓" : "•"}
                </span>
                <span className={s.ok ? "text-gray-800" : "text-gray-400"}>
                  {s.text}
                </span>
              </div>
            ))}
          </div>

         
          <div className="mt-5 text-xs text-gray-500">
            Please wait<span className="inline-block animate-pulse">…</span>
          </div>
        </div>
      </Card>
    </div>
  );
}