import { Card } from "../ui/Card";

function clamp01(x) {
  const n = Number(x);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function percent01(x) {
  return Math.round(clamp01(x) * 100);
}

export function SkillMapCard({ skillMap = {} }) {
  const entries = Object.entries(skillMap || {})
    .filter(([, v]) => typeof v === "number")
 
    .sort((a, b) => a[1] - b[1])
    .slice(0, 8);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-black text-gray-900">Knowledge Skill Map</div>
          <div className="text-sm text-gray-500">Your mastery across topics</div>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Live
        </span>
      </div>

      {!entries.length ? (
        <div className="mt-4 text-sm text-gray-500">
          No skill map yet. Complete at least one test.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {entries.map(([code, v]) => {
            const p = percent01(v);
            return (
              <div key={code}>
                <div className="flex items-center justify-between text-sm">
                  <div className="font-semibold text-gray-900">{code}</div>
                  <div className="font-bold text-gray-900">{p}%</div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600"
                    style={{ width: `${p}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {p < 55 ? "Needs work" : p < 75 ? "Improving" : "Strong"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}