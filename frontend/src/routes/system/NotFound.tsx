import { ErrorPage } from "@/routes/system/ErrorPage";

export default function NotFound() {
  return <ErrorPage code={404} />;
}
