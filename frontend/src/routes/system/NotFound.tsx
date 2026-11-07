import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">404</h1>
      <Link to="/" className="text-brand underline">
        Prohori
      </Link>
    </main>
  );
}
