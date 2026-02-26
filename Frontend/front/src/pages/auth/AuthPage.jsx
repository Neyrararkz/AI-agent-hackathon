import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiAuth } from "../../api/endpoints";
import { authStore } from "../../store/auth";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  role: z.enum(["student", "teacher"]).default("student"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function AuthPage() {
  const [mode, setMode] = useState("signin"); 
  const nav = useNavigate();
  const setSession = authStore((s) => s.setSession);

  const schema = useMemo(
    () => (mode === "signin" ? signInSchema : signUpSchema),
    [mode]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues:
      mode === "signin"
        ? { email: "", password: "" }
        : { role: "student", full_name: "", email: "", password: "" },
  });

  function switchMode(nextMode) {
    setMode(nextMode);
    reset(
      nextMode === "signin"
        ? { email: "", password: "" }
        : { role: "student", full_name: "", email: "", password: "" }
    );
  }

  async function onSubmit(values) {
    let data;

    if (mode === "signin") {
      data = await apiAuth.login({
        email: values.email,
        password: values.password,
      });
    } else {
    
      data = await apiAuth.register({
        role: values.role,
        full_name: values.full_name,
        email: values.email,
        password: values.password,
      });
    }

    setSession({ token: data.token, user: data.user });

    if (data.user?.role === "teacher") nav("/teacher");
    else nav("/student");
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-white to-indigo-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-2">
     
        <div className="flex flex-col justify-center">
          <div className="text-sm font-semibold text-indigo-600">
            Adaptive Exam AI
          </div>

          <h1 className="mt-2 text-4xl font-black text-gray-900">
            Welcome back to your{" "}
            <span className="text-indigo-600">learning journey</span>
          </h1>

          <p className="mt-3 text-gray-600">
            AI-generated tests, instant feedback, and progress tracking.
          </p>

          <div className="mt-6 space-y-2 text-sm text-gray-700">
            <div>✨ AI-generated personalized tests</div>
            <div>⚡ Instant grading and feedback</div>
            <div>📈 Track your progress over time</div>
          </div>
        </div>

  
        <Card className="p-6">
          <div className="text-xl font-bold text-gray-900">Get Started</div>
          <div className="text-sm text-gray-500">
            Sign in to your account or create a new one
          </div>

          <div className="mt-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`rounded-lg py-2 text-sm font-semibold ${
                mode === "signin" ? "bg-white shadow" : "text-gray-600"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-lg py-2 text-sm font-semibold ${
                mode === "signup" ? "bg-white shadow" : "text-gray-600"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleSubmit(onSubmit)}>
            {mode === "signup" && (
              <>
                <label className="text-sm font-semibold text-gray-700">
                  Full Name
                </label>
                <Input placeholder="John Doe" {...register("full_name")} />
                {errors.full_name && (
                  <div className="text-xs text-red-600">
                    {errors.full_name.message}
                  </div>
                )}

                <label className="text-sm font-semibold text-gray-700">
                  Role
                </label>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                  {...register("role")}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
                {errors.role && (
                  <div className="text-xs text-red-600">
                    {errors.role.message}
                  </div>
                )}
              </>
            )}

            <label className="text-sm font-semibold text-gray-700">Email</label>
            <Input placeholder="student@university.edu" {...register("email")} />
            {errors.email && (
              <div className="text-xs text-red-600">{errors.email.message}</div>
            )}

            <label className="text-sm font-semibold text-gray-700">
              Password
            </label>
            <Input type="password" placeholder="••••••••" {...register("password")} />
            {errors.password && (
              <div className="text-xs text-red-600">
                {errors.password.message}
              </div>
            )}

            <Button className="w-full mt-2" disabled={isSubmitting} type="submit">
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Button>

            <button
              type="button"
              className="w-full text-center text-sm text-indigo-600"
              onClick={() => nav("/")}
            >
              ← Back to home
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}