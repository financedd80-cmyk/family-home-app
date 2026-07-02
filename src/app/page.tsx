"use client";

import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import {
  ADD_KIND_PRESETS,
  buildInitialTasks,
  CHILDREN,
  currentUser,
  emptyFormValues,
  familyMembers,
} from "@/data/familyDemoData";
import type {
  ActiveTab,
  AddKind,
  Task,
  TaskFormValues,
} from "@/types/familyApp";
import { AddView } from "@/components/family-app/AddView";
import { BottomNav } from "@/components/family-app/BottomNav";
import { CalendarView } from "@/components/family-app/CalendarView";
import { FamilyView } from "@/components/family-app/FamilyView";
import { RewardsView } from "@/components/family-app/RewardsView";
import { TasksView } from "@/components/family-app/TasksView";
import { TodayView } from "@/components/family-app/TodayView";
import { avatarColor, toISODate } from "@/components/family-app/utils";
import { useFamilySession } from "@/hooks/useFamilySession";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  fetchFamilyTasks,
  insertFamilyTask,
  updateFamilyTask,
  updateTaskStatus,
} from "@/lib/family-app/tasksApi";
import { ensureEarnedRewardTransaction } from "@/lib/family-app/rewardsApi";

export default function Home() {
  const [today] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const familySession = useFamilySession();

  // No Supabase configured, or auth resolved and there's no session: fall
  // back to local demo data. Otherwise (session present, or auth still
  // resolving) we never show demo tasks to what might be a logged-in user.
  const demoMode =
    !isSupabaseConfigured ||
    (familySession.authChecked && !familySession.session);

  const membersById = useMemo(
    () =>
      new Map((familySession.members ?? []).map((m) => [m.id, m.displayName])),
    [familySession.members]
  );
  const membersByName = useMemo(
    () =>
      new Map((familySession.members ?? []).map((m) => [m.displayName, m.id])),
    [familySession.members]
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Load either demo tasks or the family's real tasks, depending on mode.
  // Written as one async function invoked from the effect (rather than
  // setState calls directly in the effect body) to keep every state update
  // inside a callback, not the effect's synchronous execution.
  useEffect(() => {
    let cancelled = false;

    async function syncTasks() {
      if (demoMode) {
        if (!cancelled) {
          setTasks(buildInitialTasks(today));
          setTasksLoading(false);
          setTasksError(null);
        }
        return;
      }

      if (!familySession.currentMember || !familySession.family) {
        if (!cancelled) setTasksLoading(true);
        return;
      }

      if (!cancelled) {
        setTasksLoading(true);
        setTasksError(null);
      }
      try {
        const loaded = await fetchFamilyTasks(
          familySession.family.id,
          membersById
        );
        if (!cancelled) {
          setTasks(loaded);
          setTasksLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setTasksError(err instanceof Error ? err.message : String(err));
          setTasksLoading(false);
        }
      }
    }

    syncTasks();

    return () => {
      cancelled = true;
    };
  }, [
    demoMode,
    familySession.currentMember,
    familySession.family,
    membersById,
    today,
  ]);

  async function refreshTasks() {
    if (!familySession.family) return;
    try {
      const loaded = await fetchFamilyTasks(familySession.family.id, membersById);
      setTasks(loaded);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : String(err));
    }
  }

  function computeRequiresApproval(assignedTo: string): boolean {
    if (!demoMode) {
      const member = familySession.members?.find(
        (m) => m.displayName === assignedTo
      );
      if (member) return member.role === "child";
    }
    return CHILDREN.includes(assignedTo);
  }

  // TODO: points shown below and the two reset actions are still computed
  // purely from the in-memory `tasks` list (see rawPoints/cumulativePoints),
  // not from summing reward_transactions, and the resets are never
  // persisted as reward_transactions rows. Approving a task with points > 0
  // does record an `earned` transaction (see handleApprove), but that
  // ledger isn't the source of truth for balances yet — see supabase/README.md.
  const [weeklyBaseline, setWeeklyBaseline] = useState<Record<string, number>>(
    {}
  );
  const [allTimeBaseline, setAllTimeBaseline] = useState<
    Record<string, number>
  >({});

  const [activeTab, setActiveTab] = useState<ActiveTab>("היום");
  const [addKind, setAddKind] = useState<AddKind>("משימה");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<TaskFormValues>(() =>
    emptyFormValues(toISODate(today))
  );

  function rawPoints(name: string) {
    return tasks
      .filter((task) => task.assignedTo === name && task.status === "אושרה")
      .reduce((sum, task) => sum + task.points, 0);
  }

  function cumulativePoints(name: string) {
    return rawPoints(name) - (allTimeBaseline[name] ?? 0);
  }

  function weeklyPointsFor(name: string) {
    return cumulativePoints(name) - (weeklyBaseline[name] ?? 0);
  }

  function openAddForm() {
    setEditingTaskId(null);
    setAddKind("משימה");
    setFormValues(emptyFormValues(toISODate(today)));
    setActiveTab("הוספה");
  }

  function openEditForm(task: Task) {
    setEditingTaskId(task.id);
    setFormValues({
      title: task.title,
      type: task.type,
      assignedTo: task.assignedTo,
      date: task.date,
      time: task.time,
      endTime: task.endTime ?? "",
      points: String(task.points),
      isRecurring: task.isRecurring,
      recurrence: task.recurrence,
      notes: task.notes,
      status: task.status,
      rideRider: task.rideRider ?? "",
      rideDriverThere: task.rideDriverThere ?? "",
      rideDriverBack: task.rideDriverBack ?? "",
      pickupLocation: task.pickupLocation ?? "",
      returnLocation: task.returnLocation ?? "",
    });
    setActiveTab("הוספה");
  }

  function handleAddKindChange(kind: AddKind) {
    setAddKind(kind);
    setFormValues((prev) => ({ ...prev, ...ADD_KIND_PRESETS[kind] }));
  }

  function handleTabClick(tab: ActiveTab) {
    if (tab === "הוספה") {
      openAddForm();
      return;
    }
    setActiveTab(tab);
  }

  function handleFormCancel() {
    setEditingTaskId(null);
    setActiveTab("משימות");
  }

  async function handleFormSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formValues.title.trim()) return;

    const recurrence = formValues.isRecurring
      ? formValues.recurrence
      : "לא חוזרת";
    const points = Number(formValues.points) || 0;
    const isRide = formValues.type === "הסעה";
    const submittedValues: TaskFormValues = { ...formValues, recurrence };

    if (!demoMode && familySession.currentMember && familySession.family) {
      setTasksError(null);
      try {
        if (editingTaskId) {
          await updateFamilyTask(editingTaskId, submittedValues, membersByName);
        } else {
          const requiresApproval = computeRequiresApproval(
            formValues.assignedTo
          );
          await insertFamilyTask(
            submittedValues,
            familySession.family.id,
            familySession.currentMember.id,
            requiresApproval,
            membersByName
          );
        }
        await refreshTasks();
      } catch (err) {
        setTasksError(err instanceof Error ? err.message : String(err));
      }
      setEditingTaskId(null);
      setActiveTab("משימות");
      return;
    }

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
                endTime: formValues.endTime || undefined,
                points,
                isRecurring: formValues.isRecurring,
                recurrence,
                notes: formValues.notes.trim(),
                status: formValues.status,
                rideRider: isRide ? formValues.rideRider.trim() : undefined,
                rideDriverThere: isRide
                  ? formValues.rideDriverThere.trim()
                  : undefined,
                rideDriverBack: isRide
                  ? formValues.rideDriverBack.trim()
                  : undefined,
                pickupLocation: isRide
                  ? formValues.pickupLocation.trim()
                  : undefined,
                returnLocation: isRide
                  ? formValues.returnLocation.trim()
                  : undefined,
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
        endTime: formValues.endTime || undefined,
        status: "פתוחה",
        points,
        isRecurring: formValues.isRecurring,
        recurrence,
        notes: formValues.notes.trim(),
        requiresApproval: computeRequiresApproval(formValues.assignedTo),
        rideRider: isRide ? formValues.rideRider.trim() : undefined,
        rideDriverThere: isRide
          ? formValues.rideDriverThere.trim()
          : undefined,
        rideDriverBack: isRide ? formValues.rideDriverBack.trim() : undefined,
        pickupLocation: isRide
          ? formValues.pickupLocation.trim()
          : undefined,
        returnLocation: isRide
          ? formValues.returnLocation.trim()
          : undefined,
      };
      setTasks((prev) => [...prev, newTask]);
    }
    setEditingTaskId(null);
    setActiveTab("משימות");
  }

  async function handleMarkDone(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status !== "פתוחה") return;

    if (!demoMode) {
      setTasksError(null);
      try {
        await updateTaskStatus(id, {
          status: task.requiresApproval ? "pending_approval" : "approved",
        });
        await refreshTasks();
      } catch (err) {
        setTasksError(err instanceof Error ? err.message : String(err));
      }
      return;
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.status !== "פתוחה") return t;
        return {
          ...t,
          status: t.requiresApproval ? "ממתינה לאישור" : "אושרה",
        };
      })
    );
  }

  async function handleApprove(id: string) {
    if (!demoMode && familySession.currentMember && familySession.family) {
      const task = tasks.find((t) => t.id === id);
      setTasksError(null);
      try {
        await updateTaskStatus(id, {
          status: "approved",
          approved_by_member_id: familySession.currentMember.id,
          approved_at: new Date().toISOString(),
        });
        if (task && task.points > 0) {
          const memberId = membersByName.get(task.assignedTo);
          if (memberId) {
            await ensureEarnedRewardTransaction({
              familyId: familySession.family.id,
              memberId,
              taskId: id,
              points: task.points,
              reason: task.title,
              createdByMemberId: familySession.currentMember.id,
            });
          }
        }
        await refreshTasks();
      } catch (err) {
        setTasksError(err instanceof Error ? err.message : String(err));
      }
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: "אושרה" } : task
      )
    );
  }

  async function handleReject(id: string) {
    if (!demoMode) {
      setTasksError(null);
      try {
        await updateTaskStatus(id, { status: "rejected" });
        await refreshTasks();
      } catch (err) {
        setTasksError(err instanceof Error ? err.message : String(err));
      }
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: "נדחתה" } : task
      )
    );
  }

  async function handleRevertToOpen(id: string) {
    if (!demoMode) {
      setTasksError(null);
      try {
        await updateTaskStatus(id, { status: "open" });
        await refreshTasks();
      } catch (err) {
        setTasksError(err instanceof Error ? err.message : String(err));
      }
      return;
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, status: "פתוחה" } : task
      )
    );
  }

  function handleResetWeekly() {
    const snapshot: Record<string, number> = {};
    familyMembers.forEach((member) => {
      snapshot[member.name] = cumulativePoints(member.name);
    });
    setWeeklyBaseline(snapshot);
  }

  function handleResetAllPoints() {
    const confirmed = window.confirm(
      "האם את בטוחה? פעולה זו תאפס את כל הניקוד המצטבר של כל בני המשפחה."
    );
    if (!confirmed) return;

    const snapshot: Record<string, number> = {};
    familyMembers.forEach((member) => {
      snapshot[member.name] = rawPoints(member.name);
    });
    setAllTimeBaseline(snapshot);
    setWeeklyBaseline({});
  }

  return (
    <div className="min-h-screen bg-card-border/30 sm:flex sm:items-center sm:justify-center sm:py-8">
      <div className="mx-auto flex h-screen w-full max-w-md flex-col bg-background sm:h-[840px] sm:overflow-hidden sm:rounded-[2.5rem] sm:border sm:border-card-border sm:shadow-2xl">
        <header className="flex items-center justify-between border-b border-card-border bg-card px-4 py-3">
          <span className="text-lg font-bold">הבית שלנו</span>
          <div className="flex items-center gap-2 rounded-full bg-background px-2 py-1">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(
                currentUser.name
              )}`}
            >
              {currentUser.name[0]}
            </span>
            <span className="text-xs font-medium">{currentUser.name}</span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {!demoMode && tasksLoading && (
            <p className="mb-3 rounded-2xl border border-dashed border-card-border bg-card p-3 text-center text-xs text-muted">
              טוענת משימות מ-Supabase...
            </p>
          )}
          {!demoMode && tasksError && (
            <p className="mb-3 rounded-2xl border border-dashed border-rose-300 bg-card p-3 text-center text-xs text-rose-600">
              שגיאה מול Supabase: {tasksError}
            </p>
          )}

          {activeTab === "היום" && (
            <TodayView
              today={today}
              tasks={tasks}
              onQuickAdd={openAddForm}
              onMarkDone={handleMarkDone}
              onEdit={openEditForm}
              onApprove={handleApprove}
              onReject={handleReject}
              onRevertToOpen={handleRevertToOpen}
            />
          )}

          {activeTab === "יומן" && (
            <CalendarView
              today={today}
              tasks={tasks}
              onMarkDone={handleMarkDone}
              onEdit={openEditForm}
            />
          )}

          {activeTab === "משימות" && (
            <TasksView
              tasks={tasks}
              onMarkDone={handleMarkDone}
              onEdit={openEditForm}
            />
          )}

          {activeTab === "ניקוד" && (
            <RewardsView
              cumulativePoints={cumulativePoints}
              weeklyPointsFor={weeklyPointsFor}
              onResetWeekly={handleResetWeekly}
              onResetAllPoints={handleResetAllPoints}
            />
          )}

          {activeTab === "משפחה" && (
            <FamilyView
              session={familySession.session}
              authChecked={familySession.authChecked}
              currentMember={familySession.currentMember}
              family={familySession.family}
              members={familySession.members}
              loading={familySession.loading}
              error={familySession.error}
            />
          )}

          {activeTab === "הוספה" && (
            <AddView
              isEditing={!!editingTaskId}
              addKind={addKind}
              onAddKindChange={handleAddKindChange}
              values={formValues}
              onChange={setFormValues}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          )}
        </div>

        <BottomNav activeTab={activeTab} onTabClick={handleTabClick} />
      </div>
    </div>
  );
}
