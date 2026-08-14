export default function BrandMark({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <img
        src="/ducknote-icon.png"
        alt="DuckNote"
        className={
          compact
            ? "h-10 w-10 rounded-2xl object-cover shadow-lg shadow-rose-200"
            : "h-10 w-10 rounded-2xl object-cover shadow-lg shadow-rose-200"
        }
      />

      {!compact && (
        <span className="font-heading text-xl font-extrabold tracking-tight text-rose-950">
          DuckNote
        </span>
      )}
    </div>
  );
}