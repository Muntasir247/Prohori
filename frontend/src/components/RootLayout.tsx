import { Outlet, ScrollRestoration } from "react-router-dom";

/**
 * Root route layout. New pages start at the top; back and forward restore the
 * position the reader left. Keyed by path so query-string changes keep scroll.
 */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration getKey={(location) => location.pathname} />
      <Outlet />
    </>
  );
}
