"use client";

import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import {
  ADD_KIND_PRESETS,
  buildInitialTasks,
  currentUser,
  emptyFormValues,
  familyMembers,
  TABS,
} from "@/data/familyDemoData";
import type {
  ActiveTab,
  AddKind,
  FamilyMember,
  Task,
  TaskFormValues,
} from "@/types/familyApp";
import { AddView } from "@/components/family-app/tasks/AddView";
import { BottomNav } from "@/components/family-app/shared/BottomNav";
import { CalendarView } from "@/components/family-app/CalendarView";
import { FamilyView } from "@/components/family-app/family/FamilyView";
import { RewardsView } from "@/components/family-app/rewards/RewardsView";
import { TasksView } from "@/components/family-app/tasks/TasksView";
import { TodayView } from "@/components/family-app/TodayView";
import { avatarColor, toISODate } from "@/components/family-app/shared/utils";
import { useFamilySession } from "@/hooks/useFamilySession";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
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

  // The logged-in member's real role when connected; the demo admin
  // (דיקלה) otherwise. Both admin and parent can manage day-to-day tasks;
  // full/weekly point resets and family management stay admin-only (see
  // supabase/migrations/004_add_parent_permissions.sql for the matching
  // RLS split).
  const effectiveRole =
    !demoMode && familySession.currentMember
      ? familySession.currentMember.role
      : currentUser.role;
  const canManageTasks = effectiveRole === "admin" || effectiveRole === "parent";
  const isAdmin = effectiveRole === "admin";
  const isChild = effectiveRole === "child";

  // The logged-in member's own display name (demo admin otherwise). Used to
  // scope a child's "mark done" button and task list to their own tasks —
  // matches the RLS split in
  // supabase/migrations/005_add_child_permissions.sql, where a child can
  // only ever update a task assigned to them.
  const currentDisplayName =
    !demoMode && familySession.currentMember
      ? familySession.currentMember.displayName
      : currentUser.name;

  function canMarkTaskDone(task: Task) {
    return canManageTasks || task.assignedTo === currentDisplayName;
  }

  const visibleTabs = isChild
    ? TABS.filter((tab) => tab !== "הוספה" && tab !== "משפחה")
    : TABS;

  function tabLabel(tab: ActiveTab) {
    if (isChild && tab === "משימות") return "המשימות שלי";
    return tab;
  }

  // The real (or demo) member list, with roles — used by the add/edit form
  // to know who's a child (locks "requires approval" on) and, for a child
  // viewer, to restrict the assignee field to just themselves.
  const formMembers: FamilyMember[] = useMemo(() => {
    if (!demoMode && familySession.members) {
      return familySession.members.map((m) => ({
        name: m.displayName,
        role: m.role,
      }));
    }
    return familyMembers;
  }, [demoMode, familySession.members]);

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
    return formMembers.find((m) => m.name === assignedTo)?.role === "child";
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

  // Shared by both add-entry points below. Not called directly from any
  // onClick, since it takes arguments — a `<button onClick={...}>` would
  // otherwise pass its MouseEvent through as `kind`.
  function startAddForm(kind: AddKind, date: Date = today) {
    setEditingTaskId(null);
    setAddKind(kind);
    const base = emptyFormValues(toISODate(date));
    // A child may only ever add an item for themselves (see
    // supabase/migrations/006_calendar_creator_and_child_insert_policies.sql).
    const assignedTo = isChild ? currentDisplayName : base.assignedTo;
    setFormValues({
      ...base,
      ...ADD_KIND_PRESETS[kind],
      assignedTo,
      requiresApproval: computeRequiresApproval(assignedTo),
    });
    setActiveTab("הוספה");
  }

  function openAddForm() {
    startAddForm("משימה");
  }

  // Entry point from the "יומן" tab's "+" button — available to every role,
  // including a child (unlike the bottom-nav "הוספה" tab and TodayView's
  // quick-add, both of which stay admin/parent-only). Defaults the new
  // item's date to whichever day is currently selected in the calendar.
  function openAddFormForCalendarEvent(date: Date) {
    startAddForm("אירוע", date);
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
      location: task.location ?? "",
      points: String(task.points),
      isRecurring: task.isRecurring,
      recurrence: task.recurrence,
      notes: task.notes,
      status: task.status,
      requiresApproval: task.requiresApproval,
      rideRider: task.rideRider ?? "",
      rideDriverThere: task.rideDriverThere ?? "",
      rideDriverBack: task.rideDriverBack ?? "",
      pickupLocation: task.pickupLocation ?? "",
      returnLocation: task.returnLocation ?? "",
      ridePickupTime: task.ridePickupTime ?? "",
      rideReturnTime: task.rideReturnTime ?? "",
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
          await insertFamilyTask(
            submittedValues,
            familySession.family.id,
            familySession.currentMember.id,
            formValues.requiresApproval,
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
                location: formValues.location.trim() || undefined,
                points,
                isRecurring: formValues.isRecurring,
                recurrence,
                notes: formValues.notes.trim(),
                status: formValues.status,
                requiresApproval: formValues.requiresApproval,
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
                ridePickupTime: isRide
                  ? formValues.ridePickupTime || undefined
                  : undefined,
                rideReturnTime: isRide
                  ? formValues.rideReturnTime || undefined
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
        location: formValues.location.trim() || undefined,
        status: "פתוחה",
        points,
        isRecurring: formValues.isRecurring,
        recurrence,
        notes: formValues.notes.trim(),
        requiresApproval: formValues.requiresApproval,
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
        ridePickupTime: isRide
          ? formValues.ridePickupTime || undefined
          : undefined,
        rideReturnTime: isRide
          ? formValues.rideReturnTime || undefined
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

  // Available from the header regardless of role/tab, so a child (who has
  // no "משפחה" tab) can still sign out — that tab's own logout button (see
  // FamilyView) stays for admin/parent, this isn't a replacement for it.
  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-card-border/30 sm:flex sm:items-center sm:justify-center sm:py-8">
      <div className="mx-auto flex h-screen w-full max-w-md flex-col bg-background sm:h-[840px] sm:overflow-hidden sm:rounded-[2.5rem] sm:border sm:border-card-border sm:shadow-2xl">
        <header className="flex items-center justify-between border-b border-card-border bg-card px-4 py-3">
          <span className="text-lg font-bold">הבית שלנו</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-background px-2 py-1">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(
                  currentDisplayName
                )}`}
              >
                {currentDisplayName[0]}
              </span>
              <span className="text-xs font-medium">{currentDisplayName}</span>
            </div>
            {familySession.session && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-card-border px-2.5 py-1 text-[11px] font-medium text-muted"
              >
                יציאה
              </button>
            )}
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
              canManageTasks={canManageTasks}
              canMarkDone={canMarkTaskDone}
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
              canManageTasks={canManageTasks}
              canMarkDone={canMarkTaskDone}
              onMarkDone={handleMarkDone}
              onEdit={openEditForm}
              onAddEvent={openAddFormForCalendarEvent}
            />
          )}

          {activeTab === "משימות" && (
            <TasksView
              tasks={tasks}
              canManageTasks={canManageTasks}
              canMarkDone={canMarkTaskDone}
              onMarkDone={handleMarkDone}
              onEdit={openEditForm}
              ownTasksOnlyFor={isChild ? currentDisplayName : undefined}
            />
          )}

          {activeTab === "ניקוד" && (
            <RewardsView
              isAdmin={isAdmin}
              cumulativePoints={cumulativePoints}
              weeklyPointsFor={weeklyPointsFor}
              onResetWeekly={handleResetWeekly}
              onResetAllPoints={handleResetAllPoints}
              highlightName={isChild ? currentDisplayName : undefined}
            />
          )}

          {activeTab === "משפחה" && !isChild && (
            <FamilyView
              session={familySession.session}
              authChecked={familySession.authChecked}
              currentMember={familySession.currentMember}
              family={familySession.family}
              members={familySession.members}
              loading={familySession.loading}
              error={familySession.error}
              onGoToCalendar={() => setActiveTab("יומן")}
            />
          )}

          {activeTab === "הוספה" && (canManageTasks || isChild) && (
            <AddView
              isEditing={!!editingTaskId}
              addKind={addKind}
              onAddKindChange={handleAddKindChange}
              values={formValues}
              onChange={setFormValues}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              members={formMembers}
              restrictAssignedToName={isChild ? currentDisplayName : undefined}
            />
          )}
        </div>

        <BottomNav
          activeTab={activeTab}
          onTabClick={handleTabClick}
          tabs={visibleTabs}
          tabLabel={tabLabel}
        />
      </div>
    </div>
  );
}
