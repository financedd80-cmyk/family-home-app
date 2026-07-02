import { useState } from "react";
import { HEBREW_DAY_NAMES, TIMEFRAMES } from "@/data/familyDemoData";
import type { Task } from "@/types/familyApp";
import { FilterButtons } from "./FilterButtons";
import { TaskCard } from "./TaskCard";
import {
  addDays,
  formatDateDisplay,
  groupTasksByDate,
  isInTimeframe,
  sortTasksForDay,
  startOfWeek,
  toISODate,
} from "./utils";

export function CalendarView({
  today,
  tasks,
  canManageTasks,
  canMarkDone,
  onMarkDone,
  onEdit,
  onAddEvent,
}: {
  today: Date;
  tasks: Task[];
  canManageTasks: boolean;
  canMarkDone: (task: Task) => boolean;
  onMarkDone: (id: string) => void;
  onEdit: (task: Task) => void;
  // Available to every connected role (admin/parent/child) — a child may add
  // their own calendar item even though the general "הוספה" tab stays
  // hidden for them (see supabase/migrations/006_calendar_creator_and_child_insert_policies.sql).
  onAddEvent: () => void;
}) {
  const [calendarView, setCalendarView] =
    useState<(typeof TIMEFRAMES)[number]>("השבוע");

  const todayISO = toISODate(today);
  const calendarTasks = tasks.filter((task) =>
    isInTimeframe(task.date, calendarView, today)
  );

  let calendarGroups: { date: string; tasks: Task[] }[];
  if (calendarView === "היום") {
    calendarGroups = [
      { date: todayISO, tasks: sortTasksForDay(calendarTasks) },
    ];
  } else if (calendarView === "השבוע") {
    const start = startOfWeek(today);
    calendarGroups = Array.from({ length: 7 }, (_, i) => {
      const iso = toISODate(addDays(start, i));
      return {
        date: iso,
        tasks: sortTasksForDay(
          calendarTasks.filter((task) => task.date === iso)
        ),
      };
    });
  } else {
    calendarGroups = groupTasksByDate(calendarTasks);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">יומן</h1>
      <FilterButtons
        options={TIMEFRAMES}
        value={calendarView}
        onChange={setCalendarView}
        activeBg="bg-accent"
      />
      <button
        type="button"
        onClick={onAddEvent}
        className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        + הוספת אירוע
      </button>
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-2xl border border-dashed border-card-border bg-card px-4 py-2.5 text-xs font-medium text-muted"
      >
        סנכרון מלא ליומן אישי — בקרוב
      </button>
      <div className="flex flex-col gap-4">
        {calendarGroups.map((group) => {
          const dateObj = new Date(`${group.date}T00:00:00`);
          return (
            <div key={group.date} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">
                  יום {HEBREW_DAY_NAMES[dateObj.getDay()]}
                </span>
                <span className="text-xs text-muted">
                  {formatDateDisplay(group.date)}
                </span>
              </div>
              {group.tasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-card-border bg-card p-3 text-center text-xs text-muted">
                  אין אירועים ביום הזה. אפשר להוסיף אירוע חדש.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {group.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canEdit={canManageTasks}
                      canMarkDone={canMarkDone(task)}
                      onMarkDone={() => onMarkDone(task.id)}
                      onEdit={() => onEdit(task)}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
