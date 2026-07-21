export default function Loading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      <p className="text-sm text-[var(--muted)]">جاري التحميل...</p>
    </div>
  );
}
