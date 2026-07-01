"use client";

import { useState, type SubmitEvent } from "react";
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
import { RewardsView } from "@/components/family-app/RewardsView";
import { TasksView } from "@/components/family-app/TasksView";
import { TodayView } from "@/components/family-app/TodayView";
import { avatarColor, toISODate } from "@/components/family-app/utils";

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

  const [activeTab, setActiveTab] = useState<ActiveTab>("היום");
  const [addKind, setAddKind] = useState<AddKind>("משימה");
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

  function handleFormSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formValues.title.trim()) return;

    const recurrence = formValues.isRecurring
      ? formValues.recurrence
      : "לא חוזרת";
    const points = Number(formValues.points) || 0;
    const isRide = formValues.type === "הסעה";

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
    familyMembers.forEach((member) => {
      snapshot[member.name] = cumulativePoints(member.name);
    });
    setWeeklyBaseline(snapshot);
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
