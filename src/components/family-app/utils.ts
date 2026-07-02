import {
  FAMILY_WIDE_ASSIGNEE,
  HEBREW_DAY_NAMES,
  TIMEFRAMES,
} from "@/data/familyDemoData";
import type { Permissions, Role, Task, TaskStatus } from "@/types/familyApp";

export const STATUS_STYLES: Record<TaskStatus, string> = {
  פתוחה: "border border-card-border bg-background text-muted",
  בוצעה: "bg-sky-100 text-sky-700",
  "ממתינה לאישור": "bg-amber-100 text-amber-800",
  אושרה: "bg-accent2-soft text-accent2",
  נדחתה: "bg-rose-100 text-rose-600",
  בוטלה: "bg-rose-100 text-rose-600",
};

const avatarColors = [
  "bg-accent-soft text-accent",
  "bg-accent2-soft text-accent2",
];

export function avatarColor(name: string) {
  const code = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return avatarColors[code % avatarColors.length];
}

// A wider, more distinct palette than avatarColor's 2 shades — used to tag
// "whose event is this" across the app (task cards, calendar day-strip/grid
// dots, member filter chips), so the family calendar reads at a glance the
// way a color-coded calendar app does. `tag` and `dot` are paired per member
// so a person's dot color always matches their badge color.
const memberPalette = [
  { tag: "bg-accent-soft text-accent", dot: "bg-accent" },
  { tag: "bg-accent2-soft text-accent2", dot: "bg-accent2" },
  { tag: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  { tag: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { tag: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  { tag: "bg-fuchsia-100 text-fuchsia-700", dot: "bg-fuchsia-500" },
];

function memberPaletteEntry(name: string) {
  const code = name
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return memberPalette[code % memberPalette.length];
}

// A separate, fixed color (not from the per-member hash palette) for
// "כל המשפחה" — kept visually distinct from any individual member's color so
// it never gets confused with, say, דניאל's color by coincidence.
const FAMILY_WIDE_TAG_COLOR = "bg-indigo-100 text-indigo-700";
const FAMILY_WIDE_DOT_COLOR = "bg-indigo-500";

export function memberTagColor(name: string) {
  if (name === FAMILY_WIDE_ASSIGNEE) return FAMILY_WIDE_TAG_COLOR;
  return memberPaletteEntry(name).tag;
}

export function memberDotColor(name: string) {
  if (name === FAMILY_WIDE_ASSIGNEE) return FAMILY_WIDE_DOT_COLOR;
  return memberPaletteEntry(name).dot;
}

export function roleLabel(role: Role) {
  if (role === "child") return "ילד";
  if (role === "admin") return "הורה · מנהלת";
  return "הורה";
}

export function getPermissions(role: Role): Permissions {
  const isAdminRole = role === "admin";
  return {
    canEarnPoints: true,
    canEditPoints: isAdminRole,
    canResetPoints: isAdminRole,
    canApproveTasks: isAdminRole,
  };
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

export function formatDateHeading(date: Date) {
  return `יום ${HEBREW_DAY_NAMES[date.getDay()]}, ${formatDateDisplay(toISODate(date))}`;
}

export function formatTimeLabel(task: Task) {
  if (!task.time) return "ללא שעה";
  return task.endTime ? `${task.time}–${task.endTime}` : task.time;
}

export function rideSummary(task: Task) {
  const parts: string[] = [];
  if (task.rideRider) parts.push(`נוסע: ${task.rideRider}`);
  if (task.rideDriverThere) parts.push(`לוקח: ${task.rideDriverThere}`);
  if (task.rideDriverBack) parts.push(`מחזיר: ${task.rideDriverBack}`);
  if (task.pickupLocation) parts.push(`איסוף: ${task.pickupLocation}`);
  if (task.returnLocation) parts.push(`חזרה ל: ${task.returnLocation}`);
  return parts.length ? parts.join(" · ") : null;
}

export function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// `referenceDate` is whichever date the calendar is currently browsing (the
// user's selected date), NOT necessarily the real today — otherwise
// navigating to a different month/week/day would keep filtering against the
// real current date and nothing would ever change on screen.
export function isInTimeframe(
  dateStr: string,
  timeframe: (typeof TIMEFRAMES)[number],
  referenceDate: Date
) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (timeframe === "היום") {
    return toISODate(date) === toISODate(referenceDate);
  }
  if (timeframe === "השבוע") {
    return date >= startOfWeek(referenceDate) && date <= endOfWeek(referenceDate);
  }
  if (timeframe === "החודש") {
    return (
      date.getFullYear() === referenceDate.getFullYear() &&
      date.getMonth() === referenceDate.getMonth()
    );
  }
  return date.getFullYear() === referenceDate.getFullYear();
}

export function sortByDateTime(a: Task, b: Task) {
  return (a.date + a.time).localeCompare(b.date + b.time);
}

export function sortTasksForDay(list: Task[]) {
  return [...list].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

export function groupTasksByDate(list: Task[]) {
  const map = new Map<string, Task[]>();
  list.forEach((task) => {
    const existing = map.get(task.date) ?? [];
    existing.push(task);
    map.set(task.date, existing);
  });
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, items]) => ({ date, tasks: sortTasksForDay(items) }));
}
