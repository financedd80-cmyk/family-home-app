import { useState } from "react";
import { MEMBER_FILTERS, STATUS_FILTERS, TYPE_FILTERS } from "@/data/familyDemoData";
import type { Task } from "@/types/familyApp";
import { FilterButtons } from "./FilterButtons";
import { TaskCard } from "./TaskCard";
import { sortByDateTime } from "./utils";

export function TasksView({
  tasks,
  canManageTasks,
  canMarkDone,
  onMarkDone,
  onEdit,
  ownTasksOnlyFor,
}: {
  tasks: Task[];
  canManageTasks: boolean;
  canMarkDone: (task: Task) => boolean;
  onMarkDone: (id: string) => void;
  onEdit: (task: Task) => void;
  // When set (a child viewer), the list is locked to this member's own tasks
  // and the member filter is hidden — this view becomes "המשימות שלי".
  ownTasksOnlyFor?: string;
}) {
  const [memberFilter, setMemberFilter] =
    useState<(typeof MEMBER_FILTERS)[number]>("כולם");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("כולם");
  const [typeFilter, setTypeFilter] =
    useState<(typeof TYPE_FILTERS)[number]>("כולם");

  const baseTasks = ownTasksOnlyFor
    ? tasks.filter((task) => task.assignedTo === ownTasksOnlyFor)
    : tasks;

  const filteredTasks = baseTasks
    .filter(
      (task) =>
        ownTasksOnlyFor ||
        memberFilter === "כולם" ||
        task.assignedTo === memberFilter
    )
    .filter((task) => statusFilter === "כולם" || task.status === statusFilter)
    .filter((task) => typeFilter === "כולם" || task.type === typeFilter)
    .sort(sortByDateTime);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">
        {ownTasksOnlyFor ? "המשימות שלי" : "כל המשימות"}
      </h1>
      <div className="flex flex-col gap-3">
        {!ownTasksOnlyFor && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted">בן משפחה</p>
            <FilterButtons
              options={MEMBER_FILTERS}
              value={memberFilter}
              onChange={setMemberFilter}
              activeBg="bg-accent2"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted">סטטוס</p>
          <FilterButtons
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
            activeBg="bg-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted">סוג</p>
          <FilterButtons
            options={TYPE_FILTERS}
            value={typeFilter}
            onChange={setTypeFilter}
            activeBg="bg-accent"
          />
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {filteredTasks.length === 0 && (
          <li className="rounded-2xl border border-dashed border-card-border bg-card p-6 text-center text-sm text-muted">
            {baseTasks.length === 0
              ? ownTasksOnlyFor
                ? "אין לך עדיין משימות."
                : "אין עדיין משימות. הוסיפי משימה ראשונה."
              : "אין משימות תואמות לסינון"}
          </li>
        )}
        {filteredTasks.map((task) => (
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
}
