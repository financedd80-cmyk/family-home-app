import { HEBREW_DAY_LETTERS } from "@/data/familyDemoData";

export function CalendarDayStrip({
  days,
  selectedIso,
  todayIso,
  onSelectDay,
}: {
  days: { date: Date; iso: string; dotColors: string[] }[];
  selectedIso: string;
  todayIso: string;
  onSelectDay: (date: Date) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {days.map((day) => {
        const isSelected = day.iso === selectedIso;
        const isToday = day.iso === todayIso;
        return (
          <button
            key={day.iso}
            type="button"
            onClick={() => onSelectDay(day.date)}
            className={`flex min-w-[44px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 ${
              isSelected
                ? "bg-accent text-white"
                : isToday
                  ? "border border-accent text-accent"
                  : "border border-card-border text-muted"
            }`}
          >
            <span className="text-[10px] font-medium">
              {HEBREW_DAY_LETTERS[day.date.getDay()]}
            </span>
            <span className="text-sm font-semibold">{day.date.getDate()}</span>
            <span className="flex h-1.5 items-center gap-0.5">
              {day.dotColors.map((color, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    isSelected ? "bg-white/80" : color
                  }`}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
