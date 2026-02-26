import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { authStore } from "../store/auth";

import { PublicLayout } from "./layouts/PublicLayout";
import { AppLayout } from "./layouts/AppLayout";

import { LandingPage } from "../pages/common/LandingPage.jsx";
import { AuthPage } from "../pages/auth/AuthPage";

import { StudentDashboard } from "../pages/student/StudentDashboard";
import { GenerateTestPage } from "../pages/student/GenerateTestPage";
import { TestRunnerPage } from "../pages/student/TestRunnerPage";
import { TestResultPage } from "../pages/student/TestResultPage";
import { StudentAttemptsPage } from "../pages/student/StudentAttemptsPage";

import { TeacherDashboard } from "../pages/teacher/TeacherDashboard";

function RequireAuth({ children }) {
  const token = authStore((s) => s.token);
  return token ? children : <Navigate to="/auth" replace />;
}

function RequireRole({ role, children }) {
  const user = authStore((s) => s.user);
  if (!user) return <Navigate to="/auth" replace />;
  return user.role === role ? children : <Navigate to="/" replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Route>

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route
            path="/student"
            element={
              <RequireRole role="student">
                <StudentDashboard />
              </RequireRole>
            }
          />

         
          <Route
            path="/student/attempts"
            element={
              <RequireRole role="student">
                <StudentAttemptsPage />
              </RequireRole>
            }
          />

          <Route
            path="/student/generate"
            element={
              <RequireRole role="student">
                <GenerateTestPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/test/:testId"
            element={
              <RequireRole role="student">
                <TestRunnerPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/result/:resultId"
            element={
              <RequireRole role="student">
                <TestResultPage />
              </RequireRole>
            }
          />

          <Route
            path="/teacher"
            element={
              <RequireRole role="teacher">
                <TeacherDashboard />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}