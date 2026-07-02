import { memberDotColor } from "../shared/utils";

export function CalendarMemberFilter<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const isActive = option === value;
        const isAll = option === "כולם";
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-accent2 text-white"
                : "border border-card-border bg-card text-muted"
            }`}
          >
            {!isAll && (
              <span className={`h-2 w-2 rounded-full ${memberDotColor(option)}`} />
            )}
            {option}
          </button>
        );
      })}
    </div>
  );
}
