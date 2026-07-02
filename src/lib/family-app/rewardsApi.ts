import { supabase } from "@/lib/supabaseClient";

// Records one "earned" reward_transactions row for a just-approved task,
// unless one already exists for that task_id (so re-approving, or approving
// after a revert, never double-counts). Points display + weekly/all-time
// resets are NOT wired to this ledger yet — see the TODO in src/app/page.tsx.
export async function ensureEarnedRewardTransaction(params: {
  familyId: string;
  memberId: string;
  taskId: string;
  points: number;
  reason: string;
  createdByMemberId: string;
}): Promise<void> {
  if (!supabase) return;
  if (params.points <= 0) return;

  const { data: existing, error: existingError } = await supabase
    .from("reward_transactions")
    .select("id")
    .eq("task_id", params.taskId)
    .eq("transaction_type", "earned")
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check for existing reward transaction:", existingError.message);
    return;
  }
  if (existing) return;

  const { error } = await supabase.from("reward_transactions").insert({
    family_id: params.familyId,
    member_id: params.memberId,
    task_id: params.taskId,
    points: params.points,
    transaction_type: "earned",
    reason: params.reason,
    created_by_member_id: params.createdByMemberId,
  });

  if (error) {
    console.error("Failed to record reward transaction:", error.message);
  }
}
