export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="h-10 w-10 rounded-full border border-line bg-surface text-xl"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
        >
          −
        </button>
        <span className="w-6 text-center text-lg tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="h-10 w-10 rounded-full border border-line bg-surface text-xl"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
