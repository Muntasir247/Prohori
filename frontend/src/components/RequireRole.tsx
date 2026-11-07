import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import type { User } from "@/features/auth/api";
import { useSession, useSyncLanguage } from "@/features/auth/useSession";

// Role gate (Doc 02 Section 7). A signed-in user without the role is redirected
// to their own home rather than shown a 403 page; a guest goes to /login.
export function RequireRole({
  roles,
  children,
}: {
  roles: Array<User["role"]>;
  children: ReactNode;
}) {
  const { data: user, isLoading } = useSession();
  useSyncLanguage(user);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/check" replace />;
  return <>{children}</>;
}
