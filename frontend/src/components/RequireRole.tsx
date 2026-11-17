import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import type { User } from "@/features/auth/api";
import { useSession, useSyncLanguage } from "@/features/auth/useSession";
import { ErrorPage } from "@/routes/system/ErrorPage";

// Role gate (Doc 02 Sections 6–7, Doc 01 S36). UX only — every reviewer/admin API
// route is enforced server-side by require_role. Guests go to /login; signed-in
// users without the required role see the S36 403 Forbidden page.
export function RequireRole({
  roles,
  children,
}: {
  roles: Array<User["role"]>;
  children: ReactNode;
}) {
  const { data: user, isLoading } = useSession();
  const location = useLocation();
  useSyncLanguage(user);

  if (isLoading) return null;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(user.role)) return <ErrorPage code={403} />;
  return <>{children}</>;
}
