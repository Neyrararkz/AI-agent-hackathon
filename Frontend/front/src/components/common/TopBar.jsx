import { Link, useNavigate } from "react-router-dom";
import { authStore } from "../../store/auth";
import { Button } from "../ui/Button";

export function TopBar({ authed = false }) {
  const nav = useNavigate();
  const { user, logout } = authStore();

  const displayName = user?.full_name || user?.email || "User";
  const letter = (user?.full_name || user?.name || "U").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600" />
          <div className="font-semibold text-gray-900">Adaptive Exam AI</div>
        </Link>

        {!authed && (
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm text-gray-700 hover:text-gray-900">
              Sign In
            </Link>
            <Button onClick={() => nav("/auth")}>Get Started</Button>
          </div>
        )}

        {authed && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-gray-600">
              {user?.role === "teacher" ? "Teacher Mode" : "AI Active"}
            </span>
            <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
              {letter}
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                nav("/");
              }}
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}