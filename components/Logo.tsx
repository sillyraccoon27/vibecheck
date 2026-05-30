export function Logo({ size = 22 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-lg bg-ink text-white flex items-center justify-center font-bold"
        style={{ width: size + 8, height: size + 8, fontSize: size * 0.6 }}
      >
        V
      </div>
      <span className="font-semibold text-ink" style={{ fontSize: size * 0.85 }}>
        VibeCheck
      </span>
    </div>
  );
}
