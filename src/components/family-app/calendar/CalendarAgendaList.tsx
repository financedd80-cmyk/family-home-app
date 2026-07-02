import type { Task } from "@/types/familyApp";
import { TaskCard } from "../TaskCard";

// Shared by day view (one call, full detail) and week view (one call per
// day, shorter list) — splits into a time-sorted section (time shown as its
// own prominent side column) and an "כל היום" section for tasks with no
// start time, instead of mixing them together.
export function CalendarAgendaList({
  tasks,
  canManageTasks,
  canMarkDone,
  onMarkDone,
  onEdit,
  emptyText,
}: {
  tasks: Task[];
  canManageTasks: boolean;
  canMarkDone: (task: Task) => boolean;
  onMarkDone: (id: string) => void;
  onEdit: (task: Task) => void;
  emptyText: string;
}) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-card-border bg-card p-3 text-center text-xs text-muted">
        {emptyText}
      </p>
    );
  }

  const timed = tasks
    .filter((task) => task.time)
    .sort((a, b) => a.time.localeCompare(b.time));
  const allDay = tasks.filter((task) => !task.time);

  return (
    <div className="flex flex-col gap-3">
      {timed.length > 0 && (
        <ul className="flex flex-col gap-2">
          {timed.map((task) => (
            <li key={task.id} className="flex items-start gap-2">
              <span className="w-11 shrink-0 pt-3.5 text-right text-xs font-semibold text-accent">
                {task.time}
              </span>
              <div className="flex-1">
                <TaskCard
                  task={task}
                  canEdit={canManageTasks}
                  canMarkDone={canMarkDone(task)}
                  onMarkDone={() => onMarkDone(task.id)}
                  onEdit={() => onEdit(task)}
                  hideInlineTime
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {allDay.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted">כל היום</p>
          <ul className="flex flex-col gap-2">
            {allDay.map((task) => (
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
      )}
    </div>
  );
}
