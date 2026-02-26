import { Outlet } from "react-router-dom";
import { TopBar } from "../../components/common/TopBar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-white">
      <TopBar authed />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}