import { useState } from "react";
import type { Task } from "@/types/familyApp";
import {
  buildGoogleCalendarUrl,
  downloadTaskAsICS,
  shareTaskICS,
} from "@/lib/family-app/calendarExport";
import { STATUS_STYLES, formatTimeLabel, rideSummary } from "./utils";

export function TaskCard({
  task,
  canEdit,
  canMarkDone,
  onMarkDone,
  onEdit,
}: {
  task: Task;
  canEdit: boolean;
  canMarkDone: boolean;
  onMarkDone: () => void;
  onEdit: () => void;
}) {
  const ride = rideSummary(task);
  // Local-only export/share — every viewer (admin/parent/child) can add any
  // item they can see to their own phone's calendar; none of this writes to
  // Supabase. One small toggle button keeps the card from getting crowded
  // with three separate buttons at all times.
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [showCalendarNotice, setShowCalendarNotice] = useState(false);

  function notifyCalendarActionDone() {
    setShowCalendarNotice(true);
    window.setTimeout(() => setShowCalendarNotice(false), 4000);
  }

  async function handleShareToPhone() {
    await shareTaskICS(task);
    notifyCalendarActionDone();
  }

  function handleAddToGoogleCalendar() {
    window.open(buildGoogleCalendarUrl(task), "_blank");
    notifyCalendarActionDone();
  }

  function handleDownloadIcsFile() {
    downloadTaskAsICS(task);
    notifyCalendarActionDone();
  }

  return (
    <li className="flex flex-col gap-2.5 rounded-2xl border border-card-border bg-card p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{task.title}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[task.status]}`}
        >
          {task.status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{task.assignedTo}</span>
        <span>{formatTimeLabel(task)}</span>
        <span className="rounded-full border border-card-border bg-background px-2 py-0.5">
          {task.type}
        </span>
        {task.isRecurring && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
            חוזרת {task.recurrence}
          </span>
        )}
      </div>
      {task.location && (
        <p className="text-xs text-muted">מיקום: {task.location}</p>
      )}
      {ride && <p className="text-xs text-muted">{ride}</p>}
      {task.notes && <p className="text-xs text-muted">{task.notes}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {task.points > 0 && (
          <span className="rounded-full bg-accent2-soft px-2.5 py-1 text-xs font-semibold text-accent2">
            {task.points} נק׳
          </span>
        )}
        {task.status === "פתוחה" && canMarkDone && (
          <button
            type="button"
            onClick={onMarkDone}
            className="rounded-full border border-accent2 px-3 py-1.5 text-xs font-semibold text-accent2"
          >
            סמן כבוצע
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted"
          >
            עריכה
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowCalendarOptions((prev) => !prev)}
          className="rounded-full border border-accent px-3 py-1.5 text-xs font-semibold text-accent"
        >
          הוסף ליומן
        </button>
      </div>
      {showCalendarOptions && (
        <div className="flex flex-wrap items-center gap-2 border-t border-card-border pt-2">
          <button
            type="button"
            onClick={handleShareToPhone}
            className="rounded-full border border-card-border px-2.5 py-1 text-[11px] font-medium text-muted"
          >
            שתף ליומן בטלפון
          </button>
          <button
            type="button"
            onClick={handleAddToGoogleCalendar}
            className="rounded-full border border-card-border px-2.5 py-1 text-[11px] font-medium text-muted"
          >
            הוסף ל-Google Calendar
          </button>
          <button
            type="button"
            onClick={handleDownloadIcsFile}
            className="rounded-full border border-card-border px-2.5 py-1 text-[11px] font-medium text-muted"
          >
            הורד קובץ יומן
          </button>
        </div>
      )}
      {showCalendarNotice && (
        <p className="text-[11px] text-accent2">
          פתחו את הקובץ/השיתוף ובחרו את אפליקציית היומן כדי להוסיף את האירוע.
        </p>
      )}
    </li>
  );
}
