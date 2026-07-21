"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-red-700">
        حصل خطأ في تحميل الصفحة
      </h2>
      <p className="mt-3 text-sm text-[var(--muted)]">
        غالباً المشكلة من قاعدة البيانات على Vercel (Turso). افتح{" "}
        <a className="text-[var(--accent)] underline" href="/api/health">
          /api/health
        </a>{" "}
        لمعرفة السبب.
      </p>
      {error?.digest && (
        <p className="mt-2 text-xs text-[var(--muted)]">digest: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
