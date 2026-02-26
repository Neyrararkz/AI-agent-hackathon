import { Outlet } from "react-router-dom";
import { TopBar } from "../../components/common/TopBar";

export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <Outlet />
    </div>
  );
}