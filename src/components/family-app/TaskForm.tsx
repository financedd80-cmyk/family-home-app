import type { SubmitEvent } from "react";
import {
  RECURRENCES,
  TASK_STATUSES,
  TASK_TYPES,
  familyMembers,
} from "@/data/familyDemoData";
import type { Recurrence, TaskFormValues, TaskStatus, TaskType } from "@/types/familyApp";

export function TaskForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
}: {
  values: TaskFormValues;
  onChange: (values: TaskFormValues) => void;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  function update<K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K]
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          כותרת
          <input
            required
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          סוג
          <select
            value={values.type}
            onChange={(e) => update("type", e.target.value as TaskType)}
            className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm"
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
            className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm"
          >
            {familyMembers.map((member) => (
              <option key={member.name} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            תאריך
            <input
              type="date"
              required
              value={values.date}
              onChange={(e) => update("date", e.target.value)}
              className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            שעה
            <input
              type="time"
              value={values.time}
              onChange={(e) => update("time", e.target.value)}
              className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          שעת סיום (אם יש)
          <input
            type="time"
            value={values.endTime}
            onChange={(e) => update("endTime", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm"
          />
        </label>

        {values.type === "הסעה" && (
          <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-background/60 p-3">
            <p className="text-xs font-medium text-muted">פרטי הסעה</p>
            <label className="flex flex-col gap-1 text-sm">
              מי נוסע
              <input
                value={values.rideRider}
                onChange={(e) => update("rideRider", e.target.value)}
                className="rounded-lg border border-card-border bg-card px-3 py-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              מי לוקח
              <input
                value={values.rideDriverThere}
                onChange={(e) => update("rideDriverThere", e.target.value)}
                className="rounded-lg border border-card-border bg-card px-3 py-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              מי מחזיר
              <input
                value={values.rideDriverBack}
                onChange={(e) => update("rideDriverBack", e.target.value)}
                className="rounded-lg border border-card-border bg-card px-3 py-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              מקום איסוף
              <input
                value={values.pickupLocation}
                onChange={(e) => update("pickupLocation", e.target.value)}
                className="rounded-lg border border-card-border bg-card px-3 py-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              מקום חזרה
              <input
                value={values.returnLocation}
                onChange={(e) => update("returnLocation", e.target.value)}
                className="rounded-lg border border-card-border bg-card px-3 py-2.5 text-sm"
              />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          נקודות
          <input
            type="number"
            min={0}
            value={values.points}
            onChange={(e) => update("points", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm"
          />
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
            className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
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
              className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm"
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          הערות
          <textarea
            rows={2}
            value={values.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-card-border px-4 py-3 text-sm font-medium text-muted"
        >
          ביטול
        </button>
        <button
          type="submit"
          className="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          {isEditing ? "עדכון" : "שמירה"}
        </button>
      </div>
    </form>
  );
}
