import { lazy, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";

import { ShellLayout } from "@/components/AppShell";
import { RootLayout } from "@/components/RootLayout";
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
const CaseQueue = lazy(() => import("@/routes/review/CaseQueue"));
const RepeatNumbers = lazy(() => import("@/routes/review/RepeatNumbers"));
const Campaigns = lazy(() => import("@/routes/review/Campaigns"));
const Reports = lazy(() => import("@/routes/review/Reports"));
const CaseDetail = lazy(() => import("@/routes/review/CaseDetail"));

// Admin screens load only for administrators (Doc 01 S30-S35, Doc 02 Section 6).
const AdminKnowledge = lazy(() => import("@/routes/admin/Knowledge"));
const AdminSafeActions = lazy(() => import("@/routes/admin/SafeActions"));
const AdminQuality = lazy(() => import("@/routes/admin/Quality"));
const AdminUsers = lazy(() => import("@/routes/admin/Users"));
const AdminApiKeys = lazy(() => import("@/routes/admin/ApiKeys"));
const AdminAuditLog = lazy(() => import("@/routes/admin/AuditLog"));

// Route groups (public/user/review/admin/system) from Doc 02 Section 6. Phase 04
// adds the auth and account screens (S03–S08, S22), the invite acceptance page,
// and the role-gated reviewer landing. Later phases fill /check and /review.
const staff = (roles: Array<"reviewer" | "admin">, page: ReactNode) => (
  <RequireRole roles={roles}>{page}</RequireRole>
);

// Route groups (public/user/review/admin/system) from Doc 02 Section 6.
// Screens drawn inside the app frame sit under ShellLayout, so the header,
// nav and footer stay mounted while only the page content changes.
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Landing /> },

      // Public auth screens (S03–S07) and reviewer invite acceptance.
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/verify-email", element: <VerifyEmail /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/accept-invite", element: <AcceptInvite /> },
      { path: "/s/:token", element: <SharedResult /> },
      {
        path: "/onboarding",
        element: (
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        ),
      },

      {
        element: <ShellLayout />,
        children: [
          // S09 is open to guests: no account is needed to check a message.
          { path: "/check", element: <CheckHome /> },
          { path: "/check/message", element: <MessageCheck /> },
          { path: "/check/payment", element: <PaymentCheck /> },
          { path: "/result/:id", element: <Result /> },
          { path: "/already-sent", element: <AlreadySent /> },
          { path: "/history", element: <History /> },
          { path: "/history/:id", element: <CheckDetail /> },
          { path: "/settings", element: <Settings /> },

          // Reviewer group (S24+). RequireRole is UX only; the API enforces roles.
          { path: "/review", element: staff(["reviewer", "admin"], <ReviewOverview />) },
          { path: "/review/cases", element: staff(["reviewer", "admin"], <CaseQueue />) },
          { path: "/review/numbers", element: staff(["reviewer", "admin"], <RepeatNumbers />) },
          { path: "/review/campaigns", element: staff(["reviewer", "admin"], <Campaigns />) },
          { path: "/review/reports", element: staff(["reviewer", "admin"], <Reports />) },
          { path: "/review/cases/:id", element: staff(["reviewer", "admin"], <CaseDetail />) },

          // Admin group (S30–S35). Role-gated for admins only.
          { path: "/admin", element: staff(["admin"], <AdminKnowledge />) },
          { path: "/admin/knowledge", element: staff(["admin"], <AdminKnowledge />) },
          { path: "/admin/safe-actions", element: staff(["admin"], <AdminSafeActions />) },
          { path: "/admin/quality", element: staff(["admin"], <AdminQuality />) },
          { path: "/admin/users", element: staff(["admin"], <AdminUsers />) },
          { path: "/admin/api-keys", element: staff(["admin"], <AdminApiKeys />) },
          { path: "/admin/audit", element: staff(["admin"], <AdminAuditLog />) },
        ],
      },

      { path: "*", element: <NotFound /> },
    ],
  },
]);
