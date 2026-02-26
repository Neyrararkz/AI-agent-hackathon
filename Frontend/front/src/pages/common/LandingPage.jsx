import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function LandingPage() {
  const nav = useNavigate();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-white to-indigo-50">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
            ✨ AI-Powered Learning Platform
          </div>

          <h1 className="mt-6 text-5xl font-black tracking-tight text-gray-900">
            Turn Exams into <span className="text-indigo-600">Personalized Learning</span>
          </h1>

          <p className="mt-4 max-w-2xl text-gray-600">
            AI-generated tests, instant feedback, and personalized learning paths that adapt to your needs.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => nav("/student/generate")}>Start Testing ⚡</Button>
            <Button variant="ghost" onClick={() => nav("/teacher")}>Teacher Dashboard</Button>
          </div>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <div className="text-lg font-bold">AI Test Generation</div>
            <div className="mt-1 text-sm text-gray-600">
              Create personalized tests that adapt to skill level and pace.
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-lg font-bold">Instant Grading</div>
            <div className="mt-1 text-sm text-gray-600">
              Immediate scoring and explanations for each answer.
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-lg font-bold">Smart Feedback</div>
            <div className="mt-1 text-sm text-gray-600">
              Focus areas + extra practice tasks generated from mistakes.
            </div>
          </Card>
        </div>

        <Card className="mt-12 p-8 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white">
          <div className="text-3xl font-black text-center">Ready to Transform Your Learning?</div>
          <div className="mt-2 text-center text-sm opacity-90">
            Join thousands of students and teachers already using AI.
          </div>
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              className="bg-white/90 hover:bg-white text-gray-900"
              onClick={() => nav("/auth")}
            >
              Get Started Free ✨
            </Button>
          </div>
        </Card>

        <div className="mt-10 text-center text-xs text-gray-400">
          © 2026 Adaptive Exam AI. All rights reserved.
        </div>
      </div>
    </div>
  );
}