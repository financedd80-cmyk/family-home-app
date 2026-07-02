import { familyMembers } from "@/data/familyDemoData";
import { avatarColor, roleLabel } from "./utils";

export function RewardsView({
  isAdmin,
  cumulativePoints,
  weeklyPointsFor,
  onResetWeekly,
  onResetAllPoints,
  highlightName,
}: {
  isAdmin: boolean;
  cumulativePoints: (name: string) => number;
  weeklyPointsFor: (name: string) => number;
  onResetWeekly: () => void;
  onResetAllPoints: () => void;
  // The viewer's own name (child view only) — their row gets emphasized
  // instead of hiding everyone else's, per the request that a child should
  // see "just their own points, or at least have them highlighted".
  highlightName?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">ניקוד</h1>
      <p className="text-xs text-muted">
        כל בני המשפחה יכולים לצבור נקודות. ניהול ואיפוס הניקוד פתוחים למנהל
        בלבד.
      </p>
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onResetWeekly}
            className="self-start rounded-full border border-card-border px-3 py-2 text-xs font-medium text-muted"
          >
            איפוס ניקוד שבועי
          </button>
          <button
            type="button"
            onClick={onResetAllPoints}
            className="self-start rounded-full border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600"
          >
            איפוס כל הנקודות
          </button>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {familyMembers.map((member) => (
          <li
            key={member.name}
            className={`flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm ${
              member.name === highlightName
                ? "border-accent2 bg-accent2-soft/40"
                : "border-card-border bg-card"
            }`}
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
            <div className="flex gap-4 text-sm">
              <span className="flex flex-col items-center">
                <span className="font-semibold text-accent2">
                  {weeklyPointsFor(member.name)}
                </span>
                <span className="text-[10px] text-muted">השבוע</span>
              </span>
              <span className="flex flex-col items-center">
                <span className="font-semibold text-accent">
                  {cumulativePoints(member.name)}
                </span>
                <span className="text-[10px] text-muted">מצטבר</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        איפוס ניקוד שבועי מאפס רק את הניקוד השבועי; הניקוד המצטבר והמשימות
        עצמן נשמרים במלואם.
      </p>
      {isAdmin && (
        <p className="text-xs text-muted">
          בדמו האיפוס מתבצע בזיכרון בלבד. בעתיד הפעולה תישמר בהיסטוריית ניקוד.
        </p>
      )}
    </div>
  );
}
