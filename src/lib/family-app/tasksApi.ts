import { supabase } from "@/lib/supabaseClient";
import type { Task, TaskFormValues } from "@/types/familyApp";
import {
  dbTaskToTask,
  taskFormValuesToDbInsert,
  taskFormValuesToDbUpdate,
  transportationValuesToDbPayload,
  type DbTask,
  type DbTransportationDetails,
} from "./supabaseMappers";

function requireSupabase() {
  if (!supabase) throw new Error("Supabase אינו מוגדר.");
  return supabase;
}

export async function fetchFamilyTasks(
  familyId: string,
  membersById: Map<string, string>
): Promise<Task[]> {
  const client = requireSupabase();

  const { data: taskRows, error: tasksError } = await client
    .from("tasks")
    .select("*")
    .eq("family_id", familyId)
    .order("date", { ascending: true });
  if (tasksError) throw new Error(tasksError.message);

  const rows = (taskRows ?? []) as DbTask[];
  const transportationTaskIds = rows
    .filter((row) => row.type === "transportation")
    .map((row) => row.id);

  const transportationByTaskId = new Map<string, DbTransportationDetails>();
  if (transportationTaskIds.length > 0) {
    const { data: detailRows, error: detailsError } = await client
      .from("transportation_details")
      .select("*")
      .in("task_id", transportationTaskIds);
    if (detailsError) throw new Error(detailsError.message);
    (detailRows ?? []).forEach((detail: DbTransportationDetails) =>
      transportationByTaskId.set(detail.task_id, detail)
    );
  }

  return rows.map((row) =>
    dbTaskToTask(row, transportationByTaskId.get(row.id) ?? null, membersById)
  );
}

async function upsertTransportationDetails(
  taskId: string,
  values: TaskFormValues,
  membersByName: Map<string, string>
) {
  const client = requireSupabase();
  const payload = transportationValuesToDbPayload(taskId, values, membersByName);

  const { data: existing, error: existingError } = await client
    .from("transportation_details")
    .select("id")
    .eq("task_id", taskId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const { error } = await client
      .from("transportation_details")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client.from("transportation_details").insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function insertFamilyTask(
  values: TaskFormValues,
  familyId: string,
  createdByMemberId: string,
  requiresApproval: boolean,
  membersByName: Map<string, string>
): Promise<string> {
  const client = requireSupabase();
  const payload = taskFormValuesToDbInsert(
    values,
    familyId,
    createdByMemberId,
    requiresApproval,
    membersByName
  );
  const { data, error } = await client
    .from("tasks")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (values.type === "הסעה") {
    await upsertTransportationDetails(data.id, values, membersByName);
  }
  return data.id;
}

export async function updateFamilyTask(
  taskId: string,
  values: TaskFormValues,
  membersByName: Map<string, string>
): Promise<void> {
  const client = requireSupabase();
  const payload = taskFormValuesToDbUpdate(values, membersByName);
  const { error } = await client.from("tasks").update(payload).eq("id", taskId);
  if (error) throw new Error(error.message);

  if (values.type === "הסעה") {
    await upsertTransportationDetails(taskId, values, membersByName);
  }
}

export async function updateTaskStatus(
  taskId: string,
  fields: Partial<{
    status: DbTask["status"];
    approved_by_member_id: string | null;
    approved_at: string | null;
  }>
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("tasks").update(fields).eq("id", taskId);
  if (error) throw new Error(error.message);
}
