import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import { RequireAuth } from "@/components/RequireAuth";
import { RequireRole } from "@/components/RequireRole";
import AcceptInvite from "@/routes/public/AcceptInvite";
import ForgotPassword from "@/routes/public/ForgotPassword";
import Landing from "@/routes/public/Landing";
import Login from "@/routes/public/Login";
import Register from "@/routes/public/Register";
import ResetPassword from "@/routes/public/ResetPassword";
import VerifyEmail from "@/routes/public/VerifyEmail";
import SharedResult from "@/routes/public/SharedResult";
import NotFound from "@/routes/system/NotFound";
import AlreadySent from "@/routes/user/AlreadySent";
import CheckDetail from "@/routes/user/CheckDetail";
import CheckHome from "@/routes/user/CheckHome";
import History from "@/routes/user/History";
import MessageCheck from "@/routes/user/MessageCheck";
import Onboarding from "@/routes/user/Onboarding";
import PaymentCheck from "@/routes/user/PaymentCheck";
import Result from "@/routes/user/Result";
import Settings from "@/routes/user/Settings";

// Reviewer screens load only for signed-in staff (Doc 02 Section 6).
const ReviewOverview = lazy(() => import("@/routes/review/Overview"));
const RepeatNumbers = lazy(() => import("@/routes/review/RepeatNumbers"));
const Campaigns = lazy(() => import("@/routes/review/Campaigns"));
const Reports = lazy(() => import("@/routes/review/Reports"));

// Route groups (public/user/review/admin/system) from Doc 02 Section 6. Phase 04
// adds the auth and account screens (S03–S08, S22), the invite acceptance page,
// and the role-gated reviewer landing. Later phases fill /check and /review.
export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },

  // Public auth screens (S03–S07) and reviewer invite acceptance.
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/verify-email", element: <VerifyEmail /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/accept-invite", element: <AcceptInvite /> },

  // S09 is open to guests: no account is needed to check a message.
  { path: "/check", element: <CheckHome /> },
  { path: "/check/message", element: <MessageCheck /> },
  { path: "/check/payment", element: <PaymentCheck /> },
  { path: "/result/:id", element: <Result /> },
  { path: "/already-sent", element: <AlreadySent /> },
  { path: "/s/:token", element: <SharedResult /> },
  { path: "/history", element: <History /> },
  { path: "/history/:id", element: <CheckDetail /> },

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

  // Reviewer group (S24+). RequireRole is UX only; the API enforces roles.
  {
    path: "/review",
    element: (
      <RequireRole roles={["reviewer", "admin"]}>
        <Suspense fallback={null}>
          <ReviewOverview />
        </Suspense>
      </RequireRole>
    ),
  },
  {
    path: "/review/numbers",
    element: (
      <RequireRole roles={["reviewer", "admin"]}>
        <Suspense fallback={null}>
          <RepeatNumbers />
        </Suspense>
      </RequireRole>
    ),
  },
  {
    path: "/review/campaigns",
    element: (
      <RequireRole roles={["reviewer", "admin"]}>
        <Suspense fallback={null}>
          <Campaigns />
        </Suspense>
      </RequireRole>
    ),
  },
  {
    path: "/review/reports",
    element: (
      <RequireRole roles={["reviewer", "admin"]}>
        <Suspense fallback={null}>
          <Reports />
        </Suspense>
      </RequireRole>
    ),
  },

  { path: "*", element: <NotFound /> },
]);
