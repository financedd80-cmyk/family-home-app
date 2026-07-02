import type { Task } from "@/types/familyApp";
import { TaskCard } from "./TaskCard";
import {
  formatDateDisplay,
  formatDateHeading,
  formatTimeLabel,
  sortByDateTime,
  toISODate,
} from "./utils";

function TaskListSection({
  title,
  tasks,
  emptyText,
  canEdit,
  canMarkDone,
  onMarkDone,
  onEdit,
}: {
  title: string;
  tasks: Task[];
  emptyText: string;
  canEdit: boolean;
  canMarkDone: (task: Task) => boolean;
  onMarkDone: (id: string) => void;
  onEdit: (task: Task) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-card-border bg-card p-3 text-center text-xs text-muted">
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canEdit={canEdit}
              canMarkDone={canMarkDone(task)}
              onMarkDone={() => onMarkDone(task.id)}
              onEdit={() => onEdit(task)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function TodayView({
  today,
  tasks,
  canManageTasks,
  canMarkDone,
  onQuickAdd,
  onMarkDone,
  onEdit,
  onApprove,
  onReject,
  onRevertToOpen,
}: {
  today: Date;
  tasks: Task[];
  canManageTasks: boolean;
  canMarkDone: (task: Task) => boolean;
  onQuickAdd: () => void;
  onMarkDone: (id: string) => void;
  onEdit: (task: Task) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRevertToOpen: (id: string) => void;
}) {
  const pendingApprovals = tasks
    .filter((task) => task.status === "ממתינה לאישור")
    .sort(sortByDateTime);

  const todayISO = toISODate(today);
  const todayTasks = tasks.filter((task) => task.date === todayISO);
  const openToday = todayTasks.filter(
    (task) =>
      task.status === "פתוחה" && task.type !== "הסעה" && task.type !== "אירוע"
  );
  const ridesToday = todayTasks.filter((task) => task.type === "הסעה");
  const eventsToday = todayTasks.filter((task) => task.type === "אירוע");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {formatDateHeading(today)}
        </h1>
        <p className="text-sm text-muted">מה קורה היום בבית</p>
      </div>

      {canManageTasks && (
        <button
          type="button"
          onClick={onQuickAdd}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm"
        >
          + הוספה מהירה
        </button>
      )}

      <TaskListSection
        title="משימות פתוחות להיום"
        tasks={openToday}
        emptyText="אין משימות פתוחות היום"
        canEdit={canManageTasks}
        canMarkDone={canMarkDone}
        onMarkDone={onMarkDone}
        onEdit={onEdit}
      />
      <TaskListSection
        title="הסעות היום"
        tasks={ridesToday}
        emptyText="אין הסעות היום"
        canEdit={canManageTasks}
        canMarkDone={canMarkDone}
        onMarkDone={onMarkDone}
        onEdit={onEdit}
      />
      <TaskListSection
        title="אירועים היום"
        tasks={eventsToday}
        emptyText="אין אירועים היום"
        canEdit={canManageTasks}
        canMarkDone={canMarkDone}
        onMarkDone={onMarkDone}
        onEdit={onEdit}
      />

      <section className="flex flex-col gap-3 rounded-2xl border border-accent-soft bg-accent-soft/40 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-accent">
          ממתין לאישור הורה
        </h2>
        {pendingApprovals.length === 0 ? (
          <p className="text-sm text-muted">
            אין משימות שממתינות לאישור כרגע
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingApprovals.map((task) => (
              <li
                key={task.id}
                className="flex flex-col gap-2 rounded-xl bg-card px-3 py-3 shadow-sm"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{task.title}</span>
                  <span className="text-xs text-muted">
                    {task.assignedTo} · {formatDateDisplay(task.date)}{" "}
                    {formatTimeLabel(task)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {task.points > 0 && (
                    <span className="rounded-full bg-accent2-soft px-2.5 py-1 text-xs font-semibold text-accent2">
                      {task.points} נק׳
                    </span>
                  )}
                  {canManageTasks ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onApprove(task.id)}
                        className="rounded-full bg-accent2 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        אשר
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(task.id)}
                        className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600"
                      >
                        דחה
                      </button>
                      <button
                        type="button"
                        onClick={() => onRevertToOpen(task.id)}
                        className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted"
                      >
                        החזר לפתוחה
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted">
                      ממתין לאישור הורה
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
