import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import type { User } from "@/features/auth/api";
import { homeFor, useSession, useSyncLanguage } from "@/features/auth/useSession";

// Role gate (Doc 02 Sections 6–7). UX only — every reviewer/admin API route is
// enforced server-side by require_role. A guest goes to /login (and returns here
// after signing in); a signed-in user without the role goes to their own home.
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
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <>{children}</>;
}
