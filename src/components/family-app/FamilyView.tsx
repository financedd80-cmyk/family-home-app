import { useState, type SubmitEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { familyMembers } from "@/data/familyDemoData";
import type {
  CurrentFamilyMember,
  FamilyMemberRecord,
  SupaFamily,
} from "@/hooks/useFamilySession";
import type { FamilyMember } from "@/types/familyApp";
import { avatarColor, getPermissions, roleLabel } from "./utils";

const CALENDAR_NOTES = [
  "כבר אפשר להוסיף אירוע בודד ליומן הטלפון — שיתוף, Google Calendar או הורדת קובץ — דרך כרטיס האירוע בטאב ׳יומן׳.",
  "מה שעדיין לא קיים הוא סנכרון מלא ודו-כיווני מול יומן iPhone/Android/Samsung, שדורש חיבור לספק היומן (Google/Apple/Samsung).",
  "כשהסנכרון המלא יתווסף, אירועים אישיים לא יוצגו למשפחה בלי אישור וסינון.",
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

export function FamilyView({
  session,
  authChecked,
  currentMember,
  family,
  members,
  loading,
  error,
  onGoToCalendar,
}: {
  session: Session | null;
  authChecked: boolean;
  currentMember: CurrentFamilyMember | null;
  family: SupaFamily | null;
  members: FamilyMemberRecord[] | null;
  loading: boolean;
  error: string | null;
  // Navigates to the "יומן" tab — the already-working internal calendar,
  // as opposed to the "coming soon" personal-calendar sync section below.
  onGoToCalendar: () => void;
}) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  async function handleLogin(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setLoginError(null);
    setLoginSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginSubmitting(false);
    if (signInError) {
      setLoginError(signInError.message);
      return;
    }
    setLoginPassword("");
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  const showingLiveData = !!(session && family && members);
  const displayMembers: FamilyMember[] = showingLiveData
    ? members!.map((m) => ({ name: m.displayName, role: m.role }))
    : familyMembers;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">משפחה</h1>

      {!isSupabaseConfigured && (
        <p className="rounded-2xl border border-dashed border-card-border bg-card p-3 text-xs text-muted">
          Supabase לא מוגדר במכשיר הזה (חסרים משתני סביבה). מציגים נתוני דמו
          בלבד. ראו <code>.env.local.example</code>.
        </p>
      )}

      {isSupabaseConfigured && authChecked && !session && (
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-2 rounded-2xl border border-card-border bg-card p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold">התחברות</h2>
          <input
            type="email"
            required
            placeholder="אימייל"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            placeholder="סיסמה"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
          />
          {loginError && <p className="text-xs text-red-600">{loginError}</p>}
          <button
            type="submit"
            disabled={loginSubmitting}
            className="rounded-2xl bg-accent2 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {loginSubmitting ? "מתחברת..." : "התחברות"}
          </button>
          <p className="text-[11px] text-muted">
            מציגים נתוני דמו למטה עד ההתחברות.
          </p>
        </form>
      )}

      {session && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">
              {currentMember
                ? `מחוברת כ-${currentMember.displayName}`
                : session.user.email}
            </span>
            {family && <span className="text-[10px] text-muted">{family.name}</span>}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-2xl border border-card-border bg-background px-3 py-1.5 text-xs font-medium"
          >
            יציאה
          </button>
        </div>
      )}

      {loading && (
        <p className="text-xs text-muted">טוענת נתוני משפחה מ-Supabase...</p>
      )}

      {error && (
        <p className="rounded-2xl border border-dashed border-card-border bg-card p-3 text-xs text-red-600">
          {error} מציגים נתוני דמו במקום.
        </p>
      )}

      <p className="text-xs text-muted">
        {showingLiveData
          ? "תפקידים והרשאות — נתונים חיים מ-Supabase."
          : "תפקידים והרשאות בדמו — currentUser = דיקלה (admin)."}
      </p>

      <ul className="flex flex-col gap-3">
        {displayMembers.map((member) => {
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
        <h2 className="text-base font-semibold">סנכרון מלא ליומן אישי — בקרוב</h2>
        <p className="text-xs text-muted">
          בינתיים אפשר להוסיף אירוע ליומן הטלפון מתוך כרטיס אירוע ביומן.
        </p>
        <button
          type="button"
          onClick={onGoToCalendar}
          className="w-full rounded-2xl bg-accent px-4 py-2.5 text-xs font-semibold text-white"
        >
          פתחי את היומן המשפחתי
        </button>
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
          סנכרון מלא ליומן אישי — בקרוב
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
