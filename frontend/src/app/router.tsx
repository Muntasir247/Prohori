import { createBrowserRouter } from "react-router-dom";

import { RequireAuth } from "@/components/RequireAuth";
import ForgotPassword from "@/routes/public/ForgotPassword";
import Landing from "@/routes/public/Landing";
import Login from "@/routes/public/Login";
import Register from "@/routes/public/Register";
import ResetPassword from "@/routes/public/ResetPassword";
import VerifyEmail from "@/routes/public/VerifyEmail";
import NotFound from "@/routes/system/NotFound";
import Onboarding from "@/routes/user/Onboarding";
import Settings from "@/routes/user/Settings";

// Route groups (public/user/review/admin/system) from Doc 02 Section 6. Phase 04
// adds the auth and account screens (S03–S08, S22). Later phases add /check etc.
export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },

  // Public auth screens (S03–S07).
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/verify-email", element: <VerifyEmail /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },

  // Signed-in account screens (S08, S22).
  {
    path: "/onboarding",
    element: (
      <RequireAuth>
        <Onboarding />
      </RequireAuth>
    ),
  },
  {
    path: "/settings",
    element: (
      <RequireAuth>
        <Settings />
      </RequireAuth>
    ),
  },

  { path: "*", element: <NotFound /> },
]);
