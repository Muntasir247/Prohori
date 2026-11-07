import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useSession, useSyncLanguage } from "@/features/auth/useSession";

// Gate for signed-in-only screens (Doc 02 Section 6). While the session query
// resolves we render nothing; an unauthenticated visitor is sent to /login.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useSession();
  const location = useLocation();
  useSyncLanguage(user);

  if (isLoading) return null;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
