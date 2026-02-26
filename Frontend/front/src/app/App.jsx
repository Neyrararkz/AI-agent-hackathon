import { QueryProvider } from "./providers/QueryProvider";
import { AppRouter } from "./router";
import { AuthMeHydrator } from "./providers/AuthMeHydrator";

export default function App() {
  return (
    <QueryProvider>
         <AuthMeHydrator />
      <AppRouter />
    </QueryProvider>
  );
}