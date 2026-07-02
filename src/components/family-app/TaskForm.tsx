import type { SubmitEvent } from "react";
import {
  FAMILY_WIDE_ASSIGNEE,
  RECURRENCES,
  TASK_STATUSES,
  TASK_TYPES,
} from "@/data/familyDemoData";
import type {
  FamilyMember,
  Recurrence,
  TaskFormValues,
  TaskStatus,
  TaskType,
} from "@/types/familyApp";

export function TaskForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  members,
  restrictAssignedToName,
}: {
  values: TaskFormValues;
  onChange: (values: TaskFormValues) => void;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isEditing: boolean;
  // The real (or demo) family member list, with roles — used to pick a
  // sensible "requires approval" default/lock when the assignee is a child.
  members: FamilyMember[];
  // Set for a child adding their own item: locks the assignee field to just
  // their own name, since a child may only ever create items for themselves
  // (see supabase/migrations/006_calendar_creator_and_child_insert_policies.sql).
  restrictAssignedToName?: string;
}) {
  function update<K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K]
  ) {
    onChange({ ...values, [key]: value });
  }

  const assignableMembers = restrictAssignedToName
    ? members.filter((m) => m.name === restrictAssignedToName)
    : members;
  const isFamilyWideSelected = values.assignedTo === FAMILY_WIDE_ASSIGNEE;
  const assigneeRole = members.find((m) => m.name === values.assignedTo)?.role;
  // "Requires approval" isn't a free choice for either extreme: a child's
  // own task always needs approval (see supabase/migrations/005), and a
  // family-wide item has no single assignee to approve for at all (points
  // are hidden for it too — see the points field below).
  const forcedRequiresApproval = isFamilyWideSelected
    ? false
    : assigneeRole === "child"
      ? true
      : null;
  const requiresApprovalLocked = forcedRequiresApproval !== null;
  const requiresApprovalValue = forcedRequiresApproval ?? values.requiresApproval;

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
            onChange={(e) => {
              const type = e.target.value as TaskType;
              // Events don't earn points — clear any leftover value instead
              // of silently submitting it while the field is hidden below.
              onChange({
                ...values,
                type,
                points: type === "אירוע" ? "0" : values.points,
              });
            }}
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
          שייך ל / אחראי
          <select
            value={values.assignedTo}
            disabled={!!restrictAssignedToName}
            onChange={(e) => {
              const assignedTo = e.target.value;
              const isFamilyWide = assignedTo === FAMILY_WIDE_ASSIGNEE;
              const role = members.find((m) => m.name === assignedTo)?.role;
              onChange({
                ...values,
                assignedTo,
                requiresApproval: isFamilyWide ? false : role === "child",
                // Points aren't tracked per-person for a family-wide item
                // yet (see the points field below) — clear any leftover
                // value instead of silently submitting it while hidden.
                points: isFamilyWide ? "0" : values.points,
              });
            }}
            className="rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm disabled:opacity-60"
          >
            {assignableMembers.map((member) => (
              <option key={member.name} value={member.name}>
                {member.name}
              </option>
            ))}
            {/* A child may only ever add an item for themselves (see
                supabase/migrations/006), so this option is only offered
                when the assignee field isn't already locked to them. */}
            {!restrictAssignedToName && (
              <option value={FAMILY_WIDE_ASSIGNEE}>
                {FAMILY_WIDE_ASSIGNEE}
              </option>
            )}
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
        <label className="flex flex-col gap-1 text-sm">
          מיקום
          <input
            value={values.location}
            onChange={(e) => update("location", e.target.value)}
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
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                שעת איסוף
                <input
                  type="time"
                  value={values.ridePickupTime}
                  onChange={(e) => update("ridePickupTime", e.target.value)}
                  className="rounded-lg border border-card-border bg-card px-3 py-2.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                שעת חזרה
                <input
                  type="time"
                  value={values.rideReturnTime}
                  onChange={(e) => update("rideReturnTime", e.target.value)}
                  className="rounded-lg border border-card-border bg-card px-3 py-2.5 text-sm"
                />
              </label>
            </div>
          </div>
        )}

        {values.type !== "אירוע" && !isFamilyWideSelected && (
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
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={requiresApprovalValue}
            disabled={requiresApprovalLocked}
            onChange={(e) => update("requiresApproval", e.target.checked)}
          />
          דורש אישור הורה
          {requiresApprovalLocked && (
            <span className="text-[11px] text-muted">
              (
              {isFamilyWideSelected
                ? "לא רלוונטי למשימה משפחתית"
                : "תמיד נדרש אישור למשימות של ילד/ה"}
              )
            </span>
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
