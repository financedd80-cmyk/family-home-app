import type { SubmitEvent } from "react";
import { ADD_KINDS } from "@/data/familyDemoData";
import type { AddKind, TaskFormValues } from "@/types/familyApp";
import { FilterButtons } from "./FilterButtons";
import { TaskForm } from "./TaskForm";

export function AddView({
  isEditing,
  addKind,
  onAddKindChange,
  values,
  onChange,
  onSubmit,
  onCancel,
}: {
  isEditing: boolean;
  addKind: AddKind;
  onAddKindChange: (kind: AddKind) => void;
  values: TaskFormValues;
  onChange: (values: TaskFormValues) => void;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">
        {isEditing ? "עריכת פריט" : "הוספת פריט חדש"}
      </h1>
      {!isEditing && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted">מה להוסיף</p>
          <FilterButtons
            options={ADD_KINDS}
            value={addKind}
            onChange={onAddKindChange}
            activeBg="bg-accent"
          />
        </div>
      )}
      <TaskForm
        values={values}
        onChange={onChange}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isEditing={isEditing}
      />
    </div>
  );
}
