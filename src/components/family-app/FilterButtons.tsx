export function FilterButtons<T extends string>({
  options,
  value,
  onChange,
  activeBg,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  activeBg: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
            option === value
              ? `${activeBg} text-white`
              : "border border-card-border bg-card text-muted"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
