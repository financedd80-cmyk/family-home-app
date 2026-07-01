import { familyMembers } from "@/data/familyDemoData";
import { avatarColor, getPermissions, roleLabel } from "./utils";

const CALENDAR_NOTES = [
  "חיבור יומן מובנה בטלפון יתווסף בשלב מתקדם.",
  "בשלב ראשון נוסיף אפשרות ‘הוסף ליומן בטלפון’.",
  "סנכרון מלא עם יומן iPhone/Samsung דורש אפליקציה Native או חיבור לספק היומן.",
  "אירועים אישיים לא יוצגו למשפחה בלי אישור וסינון.",
];

const FUTURE_CALENDAR_FILTERS = [
  "סינון לפי יומן",
  "סינון לפי מילת מפתח",
  "סינון לפי בן משפחה",
  "הצגה כפרטי / משפחתי",
  "אישור ידני לפני הכנסת אירוע לאפליקציה",
];

function PermissionRow({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 font-medium ${
          granted
            ? "bg-accent2-soft text-accent2"
            : "border border-card-border bg-background text-muted"
        }`}
      >
        {granted ? "כן" : "לא"}
      </span>
    </div>
  );
}

export function FamilyView() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">משפחה</h1>
      <p className="text-xs text-muted">
        תפקידים והרשאות בדמו — currentUser = דיקלה (admin). בעתיד יתווספו
        התחברות אמיתית וניהול הרשאות מלא.
      </p>

      <ul className="flex flex-col gap-3">
        {familyMembers.map((member) => {
          const permissions = getPermissions(member.role);
          return (
            <li
              key={member.name}
              className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(
                    member.name
                  )}`}
                >
                  {member.name[0]}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium">{member.name}</span>
                  <span className="text-[10px] text-muted">
                    {roleLabel(member.role)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 border-t border-card-border pt-3">
                <PermissionRow
                  label="יכול/ה לצבור נקודות"
                  granted={permissions.canEarnPoints}
                />
                <PermissionRow
                  label="יכול/ה לערוך ניקוד"
                  granted={permissions.canEditPoints}
                />
                <PermissionRow
                  label="יכול/ה לאפס ניקוד"
                  granted={permissions.canResetPoints}
                />
                <PermissionRow
                  label="יכול/ה לאשר משימות"
                  granted={permissions.canApproveTasks}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <section className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">חיבור יומן אישי</h2>
        <ul className="flex flex-col gap-1.5">
          {CALENDAR_NOTES.map((note) => (
            <li key={note} className="text-xs text-muted">
              {note}
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-2xl border border-dashed border-card-border bg-background px-4 py-2.5 text-xs font-medium text-muted"
        >
          הוסף ליומן בטלפון — בקרוב
        </button>
        <div className="flex flex-col gap-1.5 border-t border-card-border pt-3">
          <p className="text-xs font-medium text-muted">
            סינונים שיתווספו בהמשך
          </p>
          <ul className="flex flex-wrap gap-2">
            {FUTURE_CALENDAR_FILTERS.map((filter) => (
              <li
                key={filter}
                className="rounded-full border border-card-border bg-background px-2.5 py-1 text-[11px] text-muted"
              >
                {filter}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
