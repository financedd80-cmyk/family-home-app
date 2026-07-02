import type {
  Recurrence,
  Task,
  TaskFormValues,
  TaskStatus,
  TaskType,
} from "@/types/familyApp";

// DB <-> app enum values. The schema's `type` values don't share the app's
// Hebrew labels, so this is where that translation lives (medical <-> תור
// matches how the demo data used "תור" for appointment-style tasks).
export type DbTaskType =
  | "home_task"
  | "event"
  | "transportation"
  | "medical"
  | "general";

export type DbTaskStatus =
  | "open"
  | "done"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled";

export type DbRecurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

export const TASK_TYPE_TO_DB: Record<TaskType, DbTaskType> = {
  "משימת בית": "home_task",
  הסעה: "transportation",
  תור: "medical",
  אירוע: "event",
  כללי: "general",
};

export const DB_TYPE_TO_TASK_TYPE: Record<DbTaskType, TaskType> = {
  home_task: "משימת בית",
  transportation: "הסעה",
  medical: "תור",
  event: "אירוע",
  general: "כללי",
};

export const TASK_STATUS_TO_DB: Record<TaskStatus, DbTaskStatus> = {
  פתוחה: "open",
  בוצעה: "done",
  "ממתינה לאישור": "pending_approval",
  אושרה: "approved",
  נדחתה: "rejected",
  בוטלה: "cancelled",
};

export const DB_STATUS_TO_TASK_STATUS: Record<DbTaskStatus, TaskStatus> = {
  open: "פתוחה",
  done: "בוצעה",
  pending_approval: "ממתינה לאישור",
  approved: "אושרה",
  rejected: "נדחתה",
  cancelled: "בוטלה",
};

export const RECURRENCE_TO_DB: Record<Recurrence, DbRecurrence> = {
  "לא חוזרת": "none",
  יומית: "daily",
  שבועית: "weekly",
  חודשית: "monthly",
  שנתית: "yearly",
};

export const DB_RECURRENCE_TO_RECURRENCE: Record<DbRecurrence, Recurrence> = {
  none: "לא חוזרת",
  daily: "יומית",
  weekly: "שבועית",
  monthly: "חודשית",
  yearly: "שנתית",
};

export type DbTask = {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  type: DbTaskType;
  status: DbTaskStatus;
  assigned_to_member_id: string | null;
  created_by_member_id: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  points: number;
  requires_approval: boolean;
  approved_by_member_id: string | null;
  approved_at: string | null;
  is_recurring: boolean;
  recurrence: DbRecurrence;
  notes: string | null;
};

export type DbTransportationDetails = {
  id: string;
  task_id: string;
  passenger_member_id: string | null;
  pickup_by_member_id: string | null;
  return_by_member_id: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  pickup_time: string | null;
  return_time: string | null;
  notes: string | null;
};

function trimTime(value: string | null): string | undefined {
  // Postgres `time` columns come back as "HH:MM:SS"; the app's <input
  // type="time"> fields want "HH:MM".
  return value ? value.slice(0, 5) : undefined;
}

export function dbTaskToTask(
  row: DbTask,
  transportation: DbTransportationDetails | null,
  membersById: Map<string, string>
): Task {
  return {
    id: row.id,
    title: row.title,
    type: DB_TYPE_TO_TASK_TYPE[row.type],
    assignedTo: row.assigned_to_member_id
      ? membersById.get(row.assigned_to_member_id) ?? ""
      : "",
    date: row.date,
    time: trimTime(row.start_time) ?? "",
    endTime: trimTime(row.end_time),
    // The general "location" field from the calendar form reuses the
    // pre-existing (and previously unused) tasks.description column — no
    // schema change needed for it.
    location: row.description ?? undefined,
    status: DB_STATUS_TO_TASK_STATUS[row.status],
    points: row.points,
    isRecurring: row.is_recurring,
    recurrence: DB_RECURRENCE_TO_RECURRENCE[row.recurrence],
    notes: row.notes ?? "",
    requiresApproval: row.requires_approval,
    rideRider: transportation?.passenger_member_id
      ? membersById.get(transportation.passenger_member_id)
      : undefined,
    rideDriverThere: transportation?.pickup_by_member_id
      ? membersById.get(transportation.pickup_by_member_id)
      : undefined,
    rideDriverBack: transportation?.return_by_member_id
      ? membersById.get(transportation.return_by_member_id)
      : undefined,
    pickupLocation: transportation?.pickup_location ?? undefined,
    returnLocation: transportation?.dropoff_location ?? undefined,
    ridePickupTime: transportation?.pickup_time
      ? trimTime(transportation.pickup_time)
      : undefined,
    rideReturnTime: transportation?.return_time
      ? trimTime(transportation.return_time)
      : undefined,
  };
}

export function taskFormValuesToDbInsert(
  values: TaskFormValues,
  familyId: string,
  createdByMemberId: string,
  requiresApproval: boolean,
  membersByName: Map<string, string>
) {
  return {
    family_id: familyId,
    title: values.title.trim(),
    type: TASK_TYPE_TO_DB[values.type],
    status: TASK_STATUS_TO_DB["פתוחה"],
    assigned_to_member_id: membersByName.get(values.assignedTo) ?? null,
    created_by_member_id: createdByMemberId,
    date: values.date,
    start_time: values.time || null,
    end_time: values.endTime || null,
    description: values.location.trim() || null,
    points: Number(values.points) || 0,
    requires_approval: requiresApproval,
    is_recurring: values.isRecurring,
    recurrence:
      RECURRENCE_TO_DB[values.isRecurring ? values.recurrence : "לא חוזרת"],
    notes: values.notes.trim() || null,
  };
}

export function taskFormValuesToDbUpdate(
  values: TaskFormValues,
  membersByName: Map<string, string>
) {
  return {
    title: values.title.trim(),
    type: TASK_TYPE_TO_DB[values.type],
    status: TASK_STATUS_TO_DB[values.status],
    assigned_to_member_id: membersByName.get(values.assignedTo) ?? null,
    date: values.date,
    start_time: values.time || null,
    end_time: values.endTime || null,
    description: values.location.trim() || null,
    points: Number(values.points) || 0,
    requires_approval: values.requiresApproval,
    is_recurring: values.isRecurring,
    recurrence:
      RECURRENCE_TO_DB[values.isRecurring ? values.recurrence : "לא חוזרת"],
    notes: values.notes.trim() || null,
  };
}

export function transportationValuesToDbPayload(
  taskId: string,
  values: TaskFormValues,
  membersByName: Map<string, string>
) {
  return {
    task_id: taskId,
    passenger_member_id: membersByName.get(values.rideRider) ?? null,
    pickup_by_member_id: membersByName.get(values.rideDriverThere) ?? null,
    return_by_member_id: membersByName.get(values.rideDriverBack) ?? null,
    pickup_location: values.pickupLocation.trim() || null,
    dropoff_location: values.returnLocation.trim() || null,
    // Falls back to the task's general start/end time when the ride-specific
    // pickup/return time fields are left blank, matching the previous
    // behavior before those fields existed.
    pickup_time: values.ridePickupTime || values.time || null,
    return_time: values.rideReturnTime || values.endTime || null,
    notes: values.notes.trim() || null,
  };
}
