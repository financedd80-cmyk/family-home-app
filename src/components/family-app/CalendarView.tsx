import { useState } from "react";
import {
  HEBREW_DAY_NAMES,
  HEBREW_MONTH_NAMES,
  MEMBER_FILTERS,
  TIMEFRAMES,
} from "@/data/familyDemoData";
import type { Task } from "@/types/familyApp";
import { CalendarAgendaList } from "./calendar/CalendarAgendaList";
import {
  addMonths,
  buildDayInfoMap,
  buildMonthWeeks,
  formatMonthYearHeading,
} from "./calendar/calendarGrid";
import { CalendarDayStrip } from "./calendar/CalendarDayStrip";
import { CalendarHeader } from "./calendar/CalendarHeader";
import { CalendarMemberFilter } from "./calendar/CalendarMemberFilter";
import { CalendarMonthGrid } from "./calendar/CalendarMonthGrid";
import { FilterButtons } from "./FilterButtons";
import { TaskCard } from "./TaskCard";
import {
  addDays,
  formatDateDisplay,
  groupTasksByDate,
  isInTimeframe,
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
  // Receives the currently selected day, so a new item defaults to that date.
  onAddEvent: (date: Date) => void;
}) {
  const [calendarView, setCalendarView] =
    useState<(typeof TIMEFRAMES)[number]>("השבוע");
  const [memberFilter, setMemberFilter] =
    useState<(typeof MEMBER_FILTERS)[number]>("כולם");
  // The date the calendar is currently browsing — not necessarily the real
  // today. Drives which day/week/month is shown; "today" stays around only
  // to know what to highlight as "today" and what "היום" resets back to.
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const todayISO = toISODate(today);
  const selectedISO = toISODate(selectedDate);

  const memberFilteredTasks = tasks.filter(
    (task) => memberFilter === "כולם" || task.assignedTo === memberFilter
  );
  const calendarTasks = memberFilteredTasks.filter((task) =>
    isInTimeframe(task.date, calendarView, selectedDate)
  );

  const weekDays = (() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return { date, iso: toISODate(date) };
    });
  })();

  const monthWeeks = buildMonthWeeks(selectedDate);
  const dayInfo = buildDayInfoMap(memberFilteredTasks);
  const yearGroups = groupTasksByDate(calendarTasks);

  function handleSelectDay(date: Date) {
    setSelectedDate(date);
  }

  function handleSelectDayFromGrid(date: Date) {
    setSelectedDate(date);
    setCalendarView("היום");
  }

  function handlePrevMonth() {
    setSelectedDate((prev) => addMonths(prev, -1));
  }

  function handleNextMonth() {
    setSelectedDate((prev) => addMonths(prev, 1));
  }

  function handleToday() {
    setSelectedDate(today);
  }

  const monthLabel = formatMonthYearHeading(selectedDate, HEBREW_MONTH_NAMES);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">יומן</h1>

      <CalendarHeader
        monthLabel={monthLabel}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onAddEvent={() => onAddEvent(selectedDate)}
      />

      <FilterButtons
        options={TIMEFRAMES}
        value={calendarView}
        onChange={setCalendarView}
        activeBg="bg-accent"
      />

      <CalendarMemberFilter
        options={MEMBER_FILTERS}
        value={memberFilter}
        onChange={setMemberFilter}
      />

      {calendarView === "היום" && (
        <>
          <CalendarDayStrip
            days={weekDays.map((day) => ({
              ...day,
              dotColors: dayInfo.get(day.iso)?.dotColors ?? [],
            }))}
            selectedIso={selectedISO}
            todayIso={todayISO}
            onSelectDay={handleSelectDay}
          />
          <CalendarAgendaList
            tasks={calendarTasks}
            canManageTasks={canManageTasks}
            canMarkDone={canMarkDone}
            onMarkDone={onMarkDone}
            onEdit={onEdit}
            emptyText="אין אירועים ביום הזה. אפשר להוסיף אירוע חדש."
          />
        </>
      )}

      {calendarView === "השבוע" && (
        <div className="flex flex-col gap-4">
          {weekDays.map((day) => {
            const dayTasks = calendarTasks.filter(
              (task) => task.date === day.iso
            );
            return (
              <div key={day.iso} className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">
                    יום {HEBREW_DAY_NAMES[day.date.getDay()]}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDateDisplay(day.iso)}
                  </span>
                </div>
                <CalendarAgendaList
                  tasks={dayTasks}
                  canManageTasks={canManageTasks}
                  canMarkDone={canMarkDone}
                  onMarkDone={onMarkDone}
                  onEdit={onEdit}
                  emptyText="אין אירועים"
                />
              </div>
            );
          })}
        </div>
      )}

      {calendarView === "החודש" && (
        <>
          <CalendarMonthGrid
            weeks={monthWeeks}
            selectedIso={selectedISO}
            todayIso={todayISO}
            dayInfo={dayInfo}
            onSelectDay={handleSelectDayFromGrid}
          />
          {calendarTasks.length === 0 && (
            <p className="rounded-xl border border-dashed border-card-border bg-card p-4 text-center text-xs text-muted">
              אין אירועים בחודש הזה. אפשר להוסיף אירוע חדש.
            </p>
          )}
        </>
      )}

      {calendarView === "השנה" && (
        <div className="flex flex-col gap-4">
          {yearGroups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-card-border bg-card p-4 text-center text-xs text-muted">
              אין אירועים בטווח הזה. אפשר להוסיף אירוע חדש.
            </p>
          ) : (
            yearGroups.map((group) => {
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
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
