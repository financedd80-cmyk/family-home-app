import { HEBREW_DAY_LETTERS } from "@/data/familyDemoData";
import type { DayInfo, MonthGridDay } from "./calendarGrid";

export function CalendarMonthGrid({
  weeks,
  selectedIso,
  todayIso,
  dayInfo,
  onSelectDay,
}: {
  weeks: MonthGridDay[][];
  selectedIso: string;
  todayIso: string;
  dayInfo: Map<string, DayInfo>;
  onSelectDay: (date: Date) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted">
        {HEBREW_DAY_LETTERS.map((letter) => (
          <span key={letter}>{letter}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day) => {
          const info = dayInfo.get(day.iso);
          const isSelected = day.iso === selectedIso;
          const isToday = day.iso === todayIso;
          const overflow =
            info && info.totalCount > 3 ? info.totalCount - 3 : 0;

          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => onSelectDay(day.date)}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs ${
                day.inCurrentMonth ? "" : "opacity-40"
              } ${
                isSelected
                  ? "bg-accent text-white"
                  : isToday
                    ? "border border-accent text-accent"
                    : "text-foreground"
              }`}
            >
              <span className="font-medium">{day.date.getDate()}</span>
              <span className="flex h-1.5 items-center gap-0.5">
                {(info?.dotColors ?? []).map((color, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-white/80" : color
                    }`}
                  />
                ))}
              </span>
              {overflow > 0 && (
                <span className="text-[9px] leading-none">+{overflow}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
