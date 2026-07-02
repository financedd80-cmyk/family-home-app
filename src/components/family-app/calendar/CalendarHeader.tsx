export function CalendarHeader({
  monthLabel,
  onPrevMonth,
  onNextMonth,
  onToday,
  onAddEvent,
}: {
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onAddEvent: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="חודש קודם"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-card-border text-sm text-muted"
        >
          ‹
        </button>
        <span className="min-w-[92px] text-center text-sm font-semibold">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="חודש הבא"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-card-border text-sm text-muted"
        >
          ›
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted"
        >
          היום
        </button>
        <button
          type="button"
          onClick={onAddEvent}
          aria-label="הוספת אירוע"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-lg font-semibold leading-none text-white shadow-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}
