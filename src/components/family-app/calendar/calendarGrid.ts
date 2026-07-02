import { MEMBER_FILTERS } from "@/data/familyDemoData";
import type { Task } from "@/types/familyApp";
import { addDays, memberDotColor, startOfWeek, toISODate } from "../utils";

export type MonthGridDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
};

export type DayInfo = {
  dotColors: string[];
  totalCount: number;
};

// Adds whole calendar months, clamping the day-of-month to the target
// month's length (e.g. Jan 31 - 1 month -> Feb 28/29, not an overflowed
// March 3) so repeated prev/next clicks never drift to the wrong month.
export function addMonths(date: Date, delta: number): Date {
  const firstOfTarget = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  const lastDayOfTarget = new Date(
    firstOfTarget.getFullYear(),
    firstOfTarget.getMonth() + 1,
    0
  ).getDate();
  firstOfTarget.setDate(Math.min(date.getDate(), lastDayOfTarget));
  return firstOfTarget;
}

export function formatMonthYearHeading(
  date: Date,
  monthNames: readonly string[]
): string {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

// Builds a full grid of weeks (each exactly 7 days) covering the month that
// `monthAnchor` falls in, padded with the trailing days of the previous
// month and the leading days of the next month so every week row is
// complete — the same shape a native calendar month view uses.
export function buildMonthWeeks(monthAnchor: Date): MonthGridDay[][] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gridStart = startOfWeek(firstOfMonth);
  const totalDays = Math.ceil((firstOfMonth.getDay() + daysInMonth) / 7) * 7;

  const weeks: MonthGridDay[][] = [];
  for (let w = 0; w < totalDays / 7; w++) {
    const week: MonthGridDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(gridStart, w * 7 + d);
      week.push({
        date,
        iso: toISODate(date),
        inCurrentMonth: date.getMonth() === month,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

// Per-ISO-date summary used by both the day strip and the month grid: up to
// 3 distinct member dot colors (stable order, following MEMBER_FILTERS) plus
// the total event count, so the grid can show a "+N" when there's more going
// on that day than 3 dots can represent.
export function buildDayInfoMap(tasks: Task[]): Map<string, DayInfo> {
  const membersByDate = new Map<string, Set<string>>();
  const countByDate = new Map<string, number>();

  tasks.forEach((task) => {
    const members = membersByDate.get(task.date) ?? new Set<string>();
    members.add(task.assignedTo);
    membersByDate.set(task.date, members);
    countByDate.set(task.date, (countByDate.get(task.date) ?? 0) + 1);
  });

  // Known family members show first, in a stable order; anyone whose
  // assignedTo doesn't match the known list (shouldn't normally happen, but
  // better than silently dropping their dot) is appended after.
  const orderedKnown: string[] = MEMBER_FILTERS.filter(
    (name) => name !== "כולם"
  );
  const map = new Map<string, DayInfo>();
  membersByDate.forEach((members, iso) => {
    const known = orderedKnown.filter((name) => members.has(name));
    const unknown = Array.from(members).filter(
      (name) => !orderedKnown.includes(name)
    );
    const dotColors = [...known, ...unknown]
      .slice(0, 3)
      .map((name) => memberDotColor(name));
    map.set(iso, { dotColors, totalCount: countByDate.get(iso) ?? 0 });
  });
  return map;
}
