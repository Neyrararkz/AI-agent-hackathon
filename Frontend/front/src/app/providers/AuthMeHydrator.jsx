import { useEffect } from "react";
import { apiAuth } from "../../api/endpoints";
import { authStore } from "../../store/auth";

export function AuthMeHydrator() {
  const token = authStore((s) => s.token);
  const user = authStore((s) => s.user);
  const setSession = authStore((s) => s.setSession);
  const logout = authStore((s) => s.logout);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!token) return;         
      if (user?.id) return;      

      try {
        const data = await apiAuth.me(); 
        if (!alive) return;

    
        setSession({ token, user: data.user });
      } catch (e) {
   
        logout();
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [token]);

  return null;
}