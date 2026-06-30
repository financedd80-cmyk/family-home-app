"use client";

import { useState, type FormEvent } from "react";

type Role = "admin" | "parent" | "child";
type TaskType = "משימת בית" | "הסעה" | "תור" | "אירוע" | "כללי";
type TaskStatus = "פתוחה" | "בוצעה" | "ממתינה לאישור" | "אושרה" | "בוטלה";
type Recurrence = "לא חוזרת" | "יומית" | "שבועית" | "חודשית" | "שנתית";

type FamilyMember = {
  name: string;
  role: Role;
};

type Task = {
  id: string;
  title: string;
  type: TaskType;
  assignedTo: string;
  date: string;
  time: string;
  status: TaskStatus;
  points: number;
  isRecurring: boolean;
  recurrence: Recurrence;
  notes: string;
};

type TaskFormValues = {
  title: string;
  type: TaskType;
  assignedTo: string;
  date: string;
  time: string;
  points: string;
  isRecurring: boolean;
  recurrence: Recurrence;
  notes: string;
  status: TaskStatus;
};

const CHILDREN = ["דניאל", "דור", "דוראל"];

const familyMembers: FamilyMember[] = [
  { name: "דיקלה", role: "admin" },
  { name: "דודו", role: "parent" },
  { name: "דניאל", role: "child" },
  { name: "דור", role: "child" },
  { name: "דוראל", role: "child" },
];

const currentUser = familyMembers.find((m) => m.name === "דיקלה")!;
const isAdmin = currentUser.role === "admin";

const TASK_TYPES: TaskType[] = ["משימת בית", "הסעה", "תור", "אירוע", "כללי"];
const TASK_STATUSES: TaskStatus[] = [
  "פתוחה",
  "בוצעה",
  "ממתינה לאישור",
  "אושרה",
  "בוטלה",
];
const RECURRENCES: Recurrence[] = [
  "לא חוזרת",
  "יומית",
  "שבועית",
  "חודשית",
  "שנתית",
];

const TIMEFRAMES = ["היום", "השבוע", "החודש", "השנה"] as const;
const MEMBER_FILTERS = [
  "כולם",
  "דניאל",
  "דור",
  "דוראל",
  "דיקלה",
  "דודו",
] as const;
const STATUS_FILTERS = [
  "כולם",
  "פתוחה",
  "ממתינה לאישור",
  "אושרה",
  "בוטלה",
] as const;

const STATUS_STYLES: Record<TaskStatus, string> = {
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

function avatarColor(name: string) {
  const code = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return avatarColors[code % avatarColors.length];
}

function roleLabel(role: Role) {
  if (role === "child") return "ילד";
  if (role === "admin") return "הורה · מנהלת";
  return "הורה";
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function isInTimeframe(
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

function sortByDateTime(a: Task, b: Task) {
  return (a.date + a.time).localeCompare(b.date + b.time);
}

function buildInitialTasks(today: Date): Task[] {
  const d = (offset: number) => toISODate(addDays(today, offset));
  return [
    {
      id: "t1",
      title: "ניקוי שיניים",
      type: "כללי",
      assignedTo: "דוראל",
      date: d(0),
      time: "07:30",
      status: "פתוחה",
      points: 0,
      isRecurring: true,
      recurrence: "יומית",
      notes: "",
    },
    {
      id: "t2",
      title: "פינוי מדיח",
      type: "משימת בית",
      assignedTo: "דור",
      date: d(0),
      time: "08:00",
      status: "ממתינה לאישור",
      points: 1,
      isRecurring: true,
      recurrence: "יומית",
      notes: "",
    },
    {
      id: "t3",
      title: "קיפול כביסה",
      type: "משימת בית",
      assignedTo: "דניאל",
      date: d(0),
      time: "16:00",
      status: "ממתינה לאישור",
      points: 2,
      isRecurring: true,
      recurrence: "שבועית",
      notes: "",
    },
    {
      id: "t4",
      title: "החזרת בגדים לארון",
      type: "משימת בית",
      assignedTo: "דיקלה",
      date: d(0),
      time: "20:00",
      status: "פתוחה",
      points: 0,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
    },
    {
      id: "t5",
      title: "חברים בנגבה",
      type: "הסעה",
      assignedTo: "דניאל",
      date: d(0),
      time: "17:00",
      status: "פתוחה",
      points: 0,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "דיקלה לוקחת, דודו מחזיר",
    },
    {
      id: "t6",
      title: "לוקח לבדיקת דם",
      type: "תור",
      assignedTo: "דודו",
      date: d(1),
      time: "09:30",
      status: "פתוחה",
      points: 0,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "מרפאת קופת חולים",
    },
    {
      id: "t7",
      title: "מסיבת יום הולדת בגן",
      type: "אירוע",
      assignedTo: "דוראל",
      date: d(3),
      time: "16:30",
      status: "פתוחה",
      points: 0,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
    },
    {
      id: "t8",
      title: "סידור ארונות",
      type: "משימת בית",
      assignedTo: "דיקלה",
      date: d(6),
      time: "10:00",
      status: "פתוחה",
      points: 0,
      isRecurring: true,
      recurrence: "חודשית",
      notes: "",
    },
    {
      id: "t9",
      title: "ניקיון אביב",
      type: "כללי",
      assignedTo: "דיקלה",
      date: d(120),
      time: "10:00",
      status: "פתוחה",
      points: 0,
      isRecurring: true,
      recurrence: "שנתית",
      notes: "",
    },
    {
      id: "t10",
      title: "סידור חדר",
      type: "משימת בית",
      assignedTo: "דור",
      date: d(-2),
      time: "18:00",
      status: "אושרה",
      points: 2,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
    },
    {
      id: "t11",
      title: "שיעורי בית",
      type: "כללי",
      assignedTo: "דניאל",
      date: d(-1),
      time: "17:00",
      status: "אושרה",
      points: 3,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
    },
  ];
}

function emptyFormValues(dateStr: string): TaskFormValues {
  return {
    title: "",
    type: "כללי",
    assignedTo: CHILDREN[0],
    date: dateStr,
    time: "08:00",
    points: "1",
    isRecurring: false,
    recurrence: "לא חוזרת",
    notes: "",
    status: "פתוחה",
  };
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-card-border bg-card p-4 text-center shadow-sm">
      <span className="text-2xl font-bold text-accent2">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function FilterButtons<T extends string>({
  options,
  value,
  onChange,
  activeBg,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  activeBg: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            option === value
              ? `${activeBg} text-white`
              : "border border-card-border bg-card text-muted"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function TaskForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
}: {
  values: TaskFormValues;
  onChange: (values: TaskFormValues) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const isChildAssignee = CHILDREN.includes(values.assignedTo);

  function update<K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K]
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm"
    >
      <h3 className="text-base font-semibold">
        {isEditing ? "עריכת משימה" : "משימה חדשה"}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          כותרת
          <input
            required
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          סוג משימה
          <select
            value={values.type}
            onChange={(e) => update("type", e.target.value as TaskType)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          >
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          אחראי
          <select
            value={values.assignedTo}
            onChange={(e) => update("assignedTo", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          >
            {familyMembers.map((member) => (
              <option key={member.name} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          תאריך
          <input
            type="date"
            required
            value={values.date}
            onChange={(e) => update("date", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          שעה
          <input
            type="time"
            required
            value={values.time}
            onChange={(e) => update("time", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          נקודות
          <input
            type="number"
            min={0}
            disabled={!isChildAssignee}
            value={isChildAssignee ? values.points : "0"}
            onChange={(e) => update("points", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
          {!isChildAssignee && (
            <span className="text-xs text-muted">הורים לא צוברים ניקוד</span>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.isRecurring}
            onChange={(e) => update("isRecurring", e.target.checked)}
          />
          משימה חוזרת
        </label>
        <label className="flex flex-col gap-1 text-sm">
          תדירות חזרה
          <select
            disabled={!values.isRecurring}
            value={values.recurrence}
            onChange={(e) =>
              update("recurrence", e.target.value as Recurrence)
            }
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {RECURRENCES.map((recurrence) => (
              <option key={recurrence} value={recurrence}>
                {recurrence}
              </option>
            ))}
          </select>
        </label>
        {isEditing && (
          <label className="flex flex-col gap-1 text-sm">
            סטטוס
            <select
              value={values.status}
              onChange={(e) =>
                update("status", e.target.value as TaskStatus)
              }
              className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          הערות
          <textarea
            rows={2}
            value={values.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-card-border px-4 py-2 text-sm font-medium text-muted"
        >
          ביטול
        </button>
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          {isEditing ? "עדכון משימה" : "שמירה"}
        </button>
      </div>
    </form>
  );
}

function TaskCard({
  task,
  onMarkDone,
  onEdit,
}: {
  task: Task;
  onMarkDone: () => void;
  onEdit: () => void;
}) {
  const showPoints = CHILDREN.includes(task.assignedTo) && task.points > 0;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{task.title}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}
          >
            {task.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{task.assignedTo}</span>
          <span>
            {formatDateDisplay(task.date)} · {task.time}
          </span>
          <span className="rounded-full border border-card-border bg-background px-2 py-0.5">
            {task.type}
          </span>
          {task.isRecurring && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
              חוזרת {task.recurrence}
            </span>
          )}
        </div>
        {task.notes && <p className="text-xs text-muted">{task.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showPoints && (
          <span className="rounded-full bg-accent2-soft px-2.5 py-1 text-xs font-semibold text-accent2">
            {task.points} נק׳
          </span>
        )}
        {task.status === "פתוחה" && (
          <button
            type="button"
            onClick={onMarkDone}
            className="rounded-full border border-accent2 px-3 py-1.5 text-xs font-semibold text-accent2"
          >
            סמן כבוצע
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted"
          >
            עריכה
          </button>
        )}
      </div>
    </li>
  );
}

export default function Home() {
  const [today] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [tasks, setTasks] = useState<Task[]>(() => buildInitialTasks(today));
  const [weeklyBaseline, setWeeklyBaseline] = useState<Record<string, number>>(
    {}
  );

  const [timeframe, setTimeframe] =
    useState<(typeof TIMEFRAMES)[number]>("היום");
  const [memberFilter, setMemberFilter] =
    useState<(typeof MEMBER_FILTERS)[number]>("כולם");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("כולם");

  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<TaskFormValues>(() =>
    emptyFormValues(toISODate(today))
  );

  function cumulativePoints(name: string) {
    return tasks
      .filter((task) => task.assignedTo === name && task.status === "אושרה")
      .reduce((sum, task) => sum + task.points, 0);
  }

  function weeklyPointsFor(name: string) {
    return cumulativePoints(name) - (weeklyBaseline[name] ?? 0);
  }

  function openAddForm() {
    setEditingTaskId(null);
    setFormValues(emptyFormValues(toISODate(today)));
    setShowForm(true);
  }

  function openEditForm(task: Task) {
    setEditingTaskId(task.id);
    setFormValues({
      title: task.title,
      type: task.type,
      assignedTo: task.assignedTo,
      date: task.date,
      time: task.time,
      points: String(task.points),
      isRecurring: task.isRecurring,
      recurrence: task.recurrence,
      notes: task.notes,
      status: task.status,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTaskId(null);
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formValues.title.trim()) return;

    const isChildAssignee = CHILDREN.includes(formValues.assignedTo);
    const recurrence = formValues.isRecurring
      ? formValues.recurrence
      : "לא חוזרת";
    const points = isChildAssignee ? Number(formValues.points) || 0 : 0;

    if (editingTaskId) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: formValues.title.trim(),
                type: formValues.type,
                assignedTo: formValues.assignedTo,
                date: formValues.date,
                time: formValues.time,
                points,
                isRecurring: formValues.isRecurring,
                recurrence,
                notes: formValues.notes.trim(),
                status: formValues.status,
              }
            : task
        )
      );
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: formValues.title.trim(),
        type: formValues.type,
        assignedTo: formValues.assignedTo,
        date: formValues.date,
        time: formValues.time,
        status: "פתוחה",
        points,
        isRecurring: formValues.isRecurring,
        recurrence,
        notes: formValues.notes.trim(),
      };
      setTasks((prev) => [...prev, newTask]);
    }
    closeForm();
  }

  function handleMarkDone(id: string) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id || task.status !== "פתוחה") return task;
        return {
          ...task,
          status: CHILDREN.includes(task.assignedTo)
            ? "ממתינה לאישור"
            : "אושרה",
        };
      })
    );
  }

  function handleApprove(id: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: "אושרה" } : task
      )
    );
  }

  function handleReject(id: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: "בוטלה" } : task
      )
    );
  }

  function handleRevertToOpen(id: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: "פתוחה" } : task
      )
    );
  }

  function handleResetWeekly() {
    const snapshot: Record<string, number> = {};
    CHILDREN.forEach((name) => {
      snapshot[name] = cumulativePoints(name);
    });
    setWeeklyBaseline(snapshot);
  }

  const pendingApprovals = tasks
    .filter((task) => task.status === "ממתינה לאישור")
    .sort(sortByDateTime);

  const visibleTasks = tasks
    .filter((task) => isInTimeframe(task.date, timeframe, today))
    .filter(
      (task) => memberFilter === "כולם" || task.assignedTo === memberFilter
    )
    .filter(
      (task) => statusFilter === "כולם" || task.status === statusFilter
    )
    .sort(sortByDateTime);

  const openCount = tasks.filter((task) => task.status === "פתוחה").length;
  const pendingCount = tasks.filter(
    (task) => task.status === "ממתינה לאישור"
  ).length;
  const approvedCount = tasks.filter(
    (task) => task.status === "אושרה"
  ).length;
  const weeklyTotal = CHILDREN.reduce(
    (sum, name) => sum + weeklyPointsFor(name),
    0
  );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            היום בבית
          </h1>
          <p className="text-muted">
            כל המשימות, ההסעות והאירועים של המשפחה במקום אחד
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-card-border bg-card px-3 py-1.5 shadow-sm">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
              currentUser.name
            )}`}
          >
            {currentUser.name[0]}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">{currentUser.name}</span>
            <span className="text-[10px] text-muted">
              {roleLabel(currentUser.role)}
            </span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="משימות פתוחות" value={openCount} />
        <SummaryCard label="ממתינות לאישור" value={pendingCount} />
        <SummaryCard label="משימות שאושרו" value={approvedCount} />
        <SummaryCard label="ניקוד ילדים השבוע" value={weeklyTotal} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted">טווח תצוגה</p>
          <FilterButtons
            options={TIMEFRAMES}
            value={timeframe}
            onChange={setTimeframe}
            activeBg="bg-accent"
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted">בן משפחה</p>
          <FilterButtons
            options={MEMBER_FILTERS}
            value={memberFilter}
            onChange={setMemberFilter}
            activeBg="bg-accent2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted">סטטוס</p>
          <FilterButtons
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
            activeBg="bg-accent"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">רשימת משימות</h2>
          <button
            type="button"
            onClick={() =>
              showForm && !editingTaskId ? closeForm() : openAddForm()
            }
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            {showForm && !editingTaskId ? "סגירה" : "+ משימה חדשה"}
          </button>
        </div>

        {showForm && (
          <TaskForm
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleFormSubmit}
            onCancel={closeForm}
            isEditing={!!editingTaskId}
          />
        )}

        <ul className="flex flex-col gap-3">
          {visibleTasks.length === 0 && (
            <li className="rounded-2xl border border-dashed border-card-border bg-card p-6 text-center text-sm text-muted">
              אין משימות להצגה בטווח ובסינון שנבחרו
            </li>
          )}
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onMarkDone={() => handleMarkDone(task.id)}
              onEdit={() => openEditForm(task)}
            />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-accent-soft bg-accent-soft/40 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-accent">
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
                className="flex flex-col gap-2 rounded-xl bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{task.title}</span>
                  <span className="text-xs text-muted">
                    {task.assignedTo} · {formatDateDisplay(task.date)}{" "}
                    {task.time}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {task.points > 0 && (
                    <span className="rounded-full bg-accent2-soft px-2.5 py-1 text-xs font-semibold text-accent2">
                      {task.points} נק׳
                    </span>
                  )}
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(task.id)}
                        className="rounded-full bg-accent2 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        אשר
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(task.id)}
                        className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600"
                      >
                        דחה
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevertToOpen(task.id)}
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

      <section className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ניקוד ילדים</h2>
          {isAdmin && (
            <button
              type="button"
              onClick={handleResetWeekly}
              className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted"
            >
              איפוס ניקוד שבועי
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          ניקוד נצבר על ידי הילדים בלבד; הורים אינם מופיעים כאן.
        </p>
        <ul className="flex flex-col gap-3">
          {CHILDREN.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between gap-3 border-b border-card-border pb-3 last:border-none last:pb-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(
                    name
                  )}`}
                >
                  {name[0]}
                </span>
                <span className="text-sm font-medium">{name}</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex flex-col items-center">
                  <span className="font-semibold text-accent2">
                    {weeklyPointsFor(name)}
                  </span>
                  <span className="text-[10px] text-muted">השבוע</span>
                </span>
                <span className="flex flex-col items-center">
                  <span className="font-semibold text-accent">
                    {cumulativePoints(name)}
                  </span>
                  <span className="text-[10px] text-muted">מצטבר</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          איפוס הניקוד מאפס רק את הניקוד השבועי המוצג כאן; הניקוד המצטבר
          והמשימות עצמן נשמרים במלואם.
        </p>
      </section>
    </main>
  );
}
