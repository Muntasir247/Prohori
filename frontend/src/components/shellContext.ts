import { createContext, useContext } from "react";

// True inside ShellLayout. Pages and ErrorPage read this to avoid duplicating
// the app frame header or nesting <main> landmarks.
export const InShellContext = createContext(false);

export function useInShell(): boolean {
  return useContext(InShellContext);
}
