import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-lg text-center">
        <div className="text-7xl font-bold text-blue-900">404</div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Page not found
        </h1>

        <p className="mt-3 text-slate-600">
          The page you are looking for could not be found.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-blue-900 px-5 py-3 font-medium text-white"
        >
          Return to Ibemhal IAS
        </Link>
      </div>
    </main>
  );
}
