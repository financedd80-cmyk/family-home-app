import { HEBREW_DAY_NAMES, TIMEFRAMES } from "@/data/familyDemoData";
import type { Permissions, Role, Task, TaskStatus } from "@/types/familyApp";

export const STATUS_STYLES: Record<TaskStatus, string> = {
  פתוחה: "border border-card-border bg-background text-muted",
  בוצעה: "bg-sky-100 text-sky-700",
  "ממתינה לאישור": "bg-amber-100 text-amber-800",
  אושרה: "bg-accent2-soft text-accent2",
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

export function isInTimeframe(
  dateStr: string,
  timeframe: (typeof TIMEFRAMES)[number],
  today: Date
) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (timeframe === "היום") {
    return toISODate(date) === toISODate(today);
  }
  if (timeframe === "השבוע") {
    return date >= startOfWeek(today) && date <= endOfWeek(today);
  }
  if (timeframe === "החודש") {
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth()
    );
  }
  return date.getFullYear() === today.getFullYear();
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
